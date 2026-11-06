import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/messages?with={userId} — get conversation with a user
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const withUserId = url.searchParams.get("with");
  if (!withUserId) return errorResponse("'with' query param required", 400);

  // Fetch messages between the two users (both directions)
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user.id})`)
    .order("created_at", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  // Mark unread messages from the other user as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("sender_id", withUserId)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  return successResponse(
    (messages || []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      isRead: m.is_read,
      createdAt: m.created_at,
      isMine: m.sender_id === user.id,
    }))
  );
}

// POST /api/messages — send a message
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { receiverId, content } = body;

  if (!receiverId || !content?.trim()) {
    return errorResponse("receiverId and content are required", 400);
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse({
    id: data.id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    content: data.content,
    isRead: data.is_read,
    createdAt: data.created_at,
    isMine: true,
  }, "Message sent", 201);
}
