import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  name: string;
  email: string;
  role: "patient" | "clinician" | "super";
}

export async function GET() {
  // Auth client (cookie-based, for current user)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Service role client (for admin lookups)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey);

  // Determine current user's role
  const metaRole = user.user_metadata?.voxvitals_role;
  let role: string = metaRole || "patient";
  if (!metaRole) {
    const { data: appUser } = await admin
      .from("app_users")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();
    role = appUser?.role || "patient";
  }

  const contacts: Contact[] = [];
  const seenIds = new Set<string>();

  const addContact = (c: Contact) => {
    if (c.id === user.id || seenIds.has(c.id)) return;
    seenIds.add(c.id);
    contacts.push(c);
  };

  if (role === "patient") {
    // Patient sees: assigned doctor + all lead doctors
    const { data: myPatient } = await admin
      .from("patients")
      .select("doctor_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (myPatient?.doctor_id) {
      const { data: docUser } = await admin.auth.admin.getUserById(myPatient.doctor_id);
      if (docUser?.user) {
        addContact({
          id: docUser.user.id,
          name: docUser.user.user_metadata?.full_name || docUser.user.email?.split("@")[0] || "Doctor",
          email: docUser.user.email || "",
          role: "clinician",
        });
      }
    }

    // Find lead doctors (super role in metadata)
    const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 100 });
    for (const u of allUsers?.users || []) {
      if (u.user_metadata?.voxvitals_role === "super") {
        addContact({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Lead Doctor",
          email: u.email || "",
          role: "super",
        });
      }
    }

  } else if (role === "clinician") {
    // Doctor sees: assigned patients (who have user accounts) + lead doctors
    const { data: myPatients } = await admin
      .from("patients")
      .select("user_id, name")
      .eq("doctor_id", user.id)
      .not("user_id", "is", null);

    for (const p of myPatients || []) {
      if (p.user_id) {
        const { data: patUser } = await admin.auth.admin.getUserById(p.user_id);
        addContact({
          id: p.user_id,
          name: patUser?.user?.user_metadata?.full_name || p.name,
          email: patUser?.user?.email || "",
          role: "patient",
        });
      }
    }

    // Find lead doctors
    const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 100 });
    for (const u of allUsers?.users || []) {
      if (u.user_metadata?.voxvitals_role === "super") {
        addContact({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Lead Doctor",
          email: u.email || "",
          role: "super",
        });
      }
    }

  } else {
    // Lead doctor (super) sees: all doctors + all patients with accounts
    const { data: clinicians } = await admin
      .from("app_users")
      .select("auth_id, email")
      .eq("role", "clinician");

    for (const c of clinicians || []) {
      if (c.auth_id) {
        const { data: docUser } = await admin.auth.admin.getUserById(c.auth_id);
        addContact({
          id: c.auth_id,
          name: docUser?.user?.user_metadata?.full_name || c.email.split("@")[0],
          email: c.email,
          role: "clinician",
        });
      }
    }

    // All patients with user accounts
    const { data: patients } = await admin
      .from("patients")
      .select("user_id, name")
      .not("user_id", "is", null);

    for (const p of patients || []) {
      if (p.user_id) {
        const { data: patUser } = await admin.auth.admin.getUserById(p.user_id);
        addContact({
          id: p.user_id,
          name: patUser?.user?.user_metadata?.full_name || p.name,
          email: patUser?.user?.email || "",
          role: "patient",
        });
      }
    }
  }

  return NextResponse.json({ success: true, data: contacts });
}
