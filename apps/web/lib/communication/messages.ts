// ============================================================
// In-memory messaging store (session-only, demo-safe)
// ============================================================

export type MessageType =
  | "reminder"
  | "checkin_prompt"
  | "medication_guidance"
  | "followup_request"
  | "reassurance"
  | "urgent_review"
  | "patient_reply";

export type SenderRole = "doctor" | "patient";

export interface Message {
  id: string;
  threadId: string;
  patientId: string;
  senderRole: SenderRole;
  type: MessageType;
  content: string;
  timestamp: string;
  aiSuggested?: boolean;
}

// ── In-memory store ─────────────────────────────────────────

const messageStore: Map<string, Message[]> = new Map();
let msgCounter = 0;

function uid(): string {
  return `msg-${++msgCounter}-${Date.now().toString(36)}`;
}

/**
 * Get all messages for a patient thread (oldest first).
 */
export function getThread(patientId: string): Message[] {
  return messageStore.get(patientId) ?? [];
}

/**
 * Send a message in a patient thread.
 */
export function sendMessage(opts: {
  patientId: string;
  senderRole: SenderRole;
  type: MessageType;
  content: string;
  aiSuggested?: boolean;
}): Message {
  const msg: Message = {
    id: uid(),
    threadId: `thread-${opts.patientId}`,
    patientId: opts.patientId,
    senderRole: opts.senderRole,
    type: opts.type,
    content: opts.content,
    timestamp: new Date().toISOString(),
    aiSuggested: opts.aiSuggested,
  };

  const existing = messageStore.get(opts.patientId) ?? [];
  existing.push(msg);
  messageStore.set(opts.patientId, existing);

  return msg;
}

/**
 * Simulate a patient reply (for demo purposes).
 */
export function simulatePatientReply(
  patientId: string,
  content: string
): Message {
  return sendMessage({
    patientId,
    senderRole: "patient",
    type: "patient_reply",
    content,
  });
}

// ── Quick templates ─────────────────────────────────────────

export interface QuickTemplate {
  id: string;
  label: string;
  type: MessageType;
  content: string;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "med-reminder",
    label: "Medication Reminder",
    type: "medication_guidance",
    content:
      "Hi, this is a friendly reminder to take your prescribed medication today. Consistent dosing is important for accurate trial results. Please let us know if you have any questions.",
  },
  {
    id: "checkin-request",
    label: "Check-in Request",
    type: "checkin_prompt",
    content:
      "We haven't heard from you in a while. Could you please complete a brief voice check-in when you have a moment? It helps us monitor your progress and ensure your wellbeing.",
  },
  {
    id: "symptom-followup",
    label: "Symptom Follow-up",
    type: "followup_request",
    content:
      "We noticed some changes in your recent symptoms. How are you feeling today? Please share any updates on pain levels, side effects, or general wellbeing.",
  },
  {
    id: "side-effect-check",
    label: "Side Effect Check",
    type: "followup_request",
    content:
      "We'd like to follow up on the side effects you reported. Have they improved, stayed the same, or worsened? Your feedback helps us adjust your care plan.",
  },
  {
    id: "wellness-check",
    label: "Wellness Check",
    type: "reassurance",
    content:
      "Just checking in to see how you're doing overall. Your participation in this trial is valued and we're here to support you. Please don't hesitate to reach out with any concerns.",
  },
  {
    id: "urgent-followup",
    label: "Urgent Follow-up",
    type: "urgent_review",
    content:
      "We've flagged some concerning signals from your recent data. Please respond at your earliest convenience or contact the trial coordinator directly if you're experiencing any acute symptoms.",
  },
];

// ── Demo patient replies (auto-generated after doctor messages) ──

const PATIENT_REPLIES: Record<MessageType, string[]> = {
  medication_guidance: [
    "Thank you for the reminder. I took my medication this morning.",
    "I missed yesterday's dose but took it today. Sorry about that.",
    "I've been taking it on time. The nausea is a bit worse though.",
  ],
  checkin_prompt: [
    "I'll do my check-in today. Been a bit busy but I'm feeling okay.",
    "Sorry for the delay. I forgot to check in. Will do it now.",
    "I've been meaning to check in. Pain has been manageable this week.",
  ],
  followup_request: [
    "The pain is about the same as last time. Maybe slightly better.",
    "Side effects are still bothering me but they're not as bad as before.",
    "I'm feeling more tired than usual but otherwise okay.",
  ],
  reassurance: [
    "Thank you, I appreciate the support. I'm doing okay overall.",
    "That means a lot. I'm committed to staying in the trial.",
  ],
  urgent_review: [
    "I had some chest tightness yesterday but it went away. Should I be worried?",
    "I'm okay now but the symptoms scared me. Can we schedule a call?",
  ],
  reminder: [
    "Got it, thank you!",
    "Will do. Thanks for keeping track.",
  ],
  patient_reply: [],
};

/**
 * Get a random patient reply for a given message type (demo only).
 */
export function getDemoPatientReply(type: MessageType): string {
  const replies = PATIENT_REPLIES[type] ?? PATIENT_REPLIES.reassurance;
  if (replies.length === 0) return "Thank you for letting me know.";
  return replies[Math.floor(Math.random() * replies.length)];
}
