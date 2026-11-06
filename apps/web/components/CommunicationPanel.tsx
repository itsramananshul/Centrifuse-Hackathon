"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { CheckIn, Alert } from "@trialpulse/types";
import type { RiskScoredPatient } from "@/lib/risk-scoring";
import type { DropoutPrediction } from "@/lib/dropout-risk";
import {
  getThread,
  sendMessage,
  simulatePatientReply,
  getDemoPatientReply,
  QUICK_TEMPLATES,
  type Message,
  type MessageType,
} from "@/lib/communication/messages";
import { generateFollowUpSuggestions, type FollowUpSuggestion } from "@/lib/communication/ai-followups";
import {
  Send,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronDown,
  User,
  Stethoscope,
  Clock,
  Lightbulb,
} from "lucide-react";

// ── Message type badge config ───────────────────────────────

const typeBadge: Record<string, string> = {
  reminder: "bg-blue-100 text-blue-700",
  checkin_prompt: "bg-emerald-100 text-emerald-700",
  medication_guidance: "bg-purple-100 text-purple-700",
  followup_request: "bg-amber-100 text-amber-700",
  reassurance: "bg-slate-100 text-slate-600",
  urgent_review: "bg-red-100 text-red-700",
  patient_reply: "bg-slate-100 text-slate-600",
};

const typeLabel: Record<string, string> = {
  reminder: "Reminder",
  checkin_prompt: "Check-in",
  medication_guidance: "Medication",
  followup_request: "Follow-up",
  reassurance: "Support",
  urgent_review: "Urgent",
  patient_reply: "Reply",
};

// ── Priority color ──────────────────────────────────────────

const priorityColor: Record<string, string> = {
  high: "border-l-red-500 bg-red-50/30",
  medium: "border-l-amber-500 bg-amber-50/20",
  low: "border-l-slate-300 bg-clinical-card",
};

// ── Main component ──────────────────────────────────────────

export function CommunicationPanel({
  scored,
  checkins,
  alerts,
  dropoutPrediction,
}: {
  scored: RiskScoredPatient;
  checkins: CheckIn[];
  alerts: Alert[];
  dropoutPrediction: DropoutPrediction;
}) {
  const { patient } = scored;
  const [messages, setMessages] = useState<Message[]>(() =>
    getThread(patient.id)
  );
  const [draft, setDraft] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Refresh thread when patient changes
  useEffect(() => {
    setMessages(getThread(patient.id));
  }, [patient.id]);

  // Auto-scroll
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // AI suggestions
  const suggestions = useMemo(
    () => generateFollowUpSuggestions(scored, checkins, alerts, dropoutPrediction),
    [scored, checkins, alerts, dropoutPrediction]
  );

  // ── Handlers ──────────────────────────────────────────

  const handleSend = (content: string, type: MessageType = "followup_request", aiSuggested = false) => {
    if (!content.trim()) return;
    const msg = sendMessage({
      patientId: patient.id,
      senderRole: "doctor",
      type,
      content: content.trim(),
      aiSuggested,
    });
    setMessages((prev) => [...prev, msg]);
    setDraft("");

    // Simulate patient reply after short delay (demo)
    setTimeout(() => {
      const reply = simulatePatientReply(
        patient.id,
        getDemoPatientReply(type)
      );
      setMessages((prev) => [...prev, reply]);
    }, 1500 + Math.random() * 1500);
  };

  const handleTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setDraft(tmpl.content);
    setShowTemplates(false);
  };

  const handleSuggestion = (sug: FollowUpSuggestion) => {
    handleSend(sug.suggestedMessage, sug.type, true);
  };

  return (
    <div className="card flex flex-col" style={{ maxHeight: 480 }}>
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-primary-400" />
        Communication
        {messages.length > 0 && (
          <span className="badge-neutral">{messages.length}</span>
        )}
      </h3>

      {/* ── AI Suggestions ─────────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">
              AI-Suggested Follow-ups
            </span>
          </div>
          <div className="space-y-1.5">
            {suggestions.slice(0, 3).map((sug) => (
              <button
                key={sug.id}
                onClick={() => handleSuggestion(sug)}
                className={`w-full text-left p-2.5 rounded-lg border border-l-2 transition-all hover:shadow-sm cursor-pointer ${priorityColor[sug.priority]}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-slate-800">
                    {sug.title}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    sug.priority === "high" ? "bg-red-100 text-red-700" : sug.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {sug.priority}
                  </span>
                </div>
                <p className="text-[10px] text-clinical-muted leading-relaxed">
                  {sug.reason}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Thread ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-[120px] space-y-2 mb-3 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-xs text-clinical-muted">
              No messages yet. Use a template or AI suggestion to start.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.senderRole === "doctor" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.senderRole === "doctor"
                    ? "bg-primary-100"
                    : "bg-slate-100"
                }`}
              >
                {msg.senderRole === "doctor" ? (
                  <Stethoscope className="w-3 h-3 text-primary-400" />
                ) : (
                  <User className="w-3 h-3 text-slate-500" />
                )}
              </div>
              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.senderRole === "doctor"
                    ? "bg-primary-50 border border-primary-200"
                    : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[9px] font-semibold uppercase px-1 py-0.5 rounded ${typeBadge[msg.type]}`}>
                    {typeLabel[msg.type]}
                  </span>
                  {msg.aiSuggested && (
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  <span className="text-[9px] text-clinical-muted flex items-center gap-0.5 ml-auto">
                    <Clock className="w-2 h-2" />
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={threadEndRef} />
      </div>

      {/* ── Composer ───────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-100 pt-2">
        {/* Quick templates toggle */}
        <div className="mb-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[10px] text-primary-400 font-medium flex items-center gap-1 hover:text-primary-300"
          >
            <Lightbulb className="w-3 h-3" />
            Quick templates
            <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
          </button>
          {showTemplates && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplate(t)}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input + send */}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(draft)}
            placeholder="Type a message..."
            className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          <button
            onClick={() => handleSend(draft)}
            disabled={!draft.trim()}
            className="btn-primary px-3 py-2 text-xs flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
