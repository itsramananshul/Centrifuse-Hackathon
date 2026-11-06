import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/signup
 *
 * Server-side signup that:
 * 1. Creates auth user (with email confirmation disabled)
 * 2. Creates app_users row with email
 * 3. Signs the user in
 * 4. Returns session
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { success: false, message: "Server configuration error" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { email, password, role: requestedRole, name, age, condition } = body;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { success: false, message: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const supabase = createClient(url, serviceKey);

  // Check if email already exists in app_users
  const { data: existing } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, message: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Create auth user with auto-confirm (hackathon — no email service configured)
  let authUser;
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name || undefined },
    });

    if (error) {
      const { data: fallbackData, error: fallbackError } =
        await supabase.auth.signUp({
          email: email.toLowerCase(),
          password,
          options: { data: { full_name: name || undefined } },
        });
      if (fallbackError) {
        return NextResponse.json(
          { success: false, message: fallbackError.message },
          { status: 400 }
        );
      }
      authUser = fallbackData.user;
    } else {
      authUser = data.user;
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to create account" },
      { status: 500 }
    );
  }

  // Determine role (default to patient)
  const userRole = requestedRole === "clinician" || requestedRole === "super" ? requestedRole : "patient";

  // Insert into app_users (service role bypasses RLS)
  const { error: insertError } = await supabase.from("app_users").insert({
    auth_id: authUser?.id || null,
    email: email.toLowerCase(),
    role: userRole,
  });

  if (insertError) {
    console.error("[Signup] app_users insert error:", insertError.message);
  }

  // If role is patient, also create a patient record
  if (userRole === "patient" && authUser?.id) {
    const patientName = name || email.split("@")[0];
    const patientAge = age ? Number(age) : 30;
    const patientCondition = condition || "General";
    const trialId = `TRIAL-VX-${Date.now().toString(36).toUpperCase()}`;

    const { error: patientError } = await supabase.from("patients").insert({
      name: patientName,
      age: patientAge,
      condition: patientCondition,
      trial_id: trialId,
      status: "active",
      user_id: authUser.id,
    });

    if (patientError) {
      console.error("[Signup] patient record insert error:", patientError.message);
    }
  }

  // Sign the user in to get a session
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

  if (signInError) {
    return NextResponse.json({
      success: true,
      message: "Account created. Please sign in.",
      data: { session: null },
    });
  }

  return NextResponse.json({
    success: true,
    message: "Account created",
    data: { session: signInData.session },
  });
}
