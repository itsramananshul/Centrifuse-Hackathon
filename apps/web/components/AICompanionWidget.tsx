"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Patient, CheckIn } from "@trialpulse/types";
import { api } from "@/lib/api";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Minimize2,
  FileText,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "patient" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    symptomDetected?: string;
    confirmationPending?: boolean;
    logged?: boolean;
    provider?: string;
  };
}

// ── Symptom keywords for client-side detection ──────────────

const SYMPTOM_KEYWORDS = [
  "dizzy", "dizziness", "nausea", "nauseous", "headache", "fatigue",
  "tired", "exhausted", "pain", "ache", "rash", "itchy", "swelling",
  "vomit", "weak", "weakness", "insomnia", "can't sleep", "blurry",
  "chest", "breathing", "heart racing", "numbness", "tingling",
  "fever", "chills", "appetite", "weight",
];

const NEGATION_PATTERNS = ["no ", "not ", "don't ", "doesn't ", "without ", "never ", "haven't ", "deny ", "denies "];

function detectSymptoms(text: string): string[] {
  const lower = text.toLowerCase();
  return SYMPTOM_KEYWORDS.filter((kw) => {
    const idx = lower.indexOf(kw);
    if (idx === -1) return false;
    const prefix = lower.slice(Math.max(0, idx - 15), idx);
    return !NEGATION_PATTERNS.some((neg) => prefix.includes(neg));
  });
}

// ── Component ───────────────────────────────────────────────

export function AICompanionWidget({ patient }: { patient: Patient | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello${patient ? `, ${patient.name.split(" ")[0]}` : ""}. I'm your Care Assistant. I can help you log symptoms, answer questions about your check-in process, or guide you through reporting side effects. How can I help you today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSymptom, setPendingSymptom] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Build patient context for AI ────────────────────────

  const buildContext = useCallback(() => {
    if (!patient) return undefined;
    return {
      patientName: patient.name,
      condition: patient.condition,
    };
  }, [patient]);

  // ── Send message ────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "patient",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Check for symptom confirmation response
    if (pendingSymptom) {
      const lower = text.toLowerCase();
      if (lower.includes("yes") || lower.includes("log") || lower.includes("add") || lower.includes("confirm")) {
        const confirmMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: "assistant",
          content: `I've noted "${pendingSymptom}" for your care team to review. This has been added to your report. If you notice any changes, please let me know.`,
          timestamp: new Date().toISOString(),
          metadata: { symptomDetected: pendingSymptom, logged: true },
        };
        setMessages((prev) => [...prev, confirmMsg]);
        setPendingSymptom(null);
        setIsLoading(false);
        return;
      } else if (lower.includes("no") || lower.includes("skip") || lower.includes("cancel")) {
        const skipMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: "assistant",
          content: "No problem — nothing has been logged. Let me know if there's anything else I can help with.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, skipMsg]);
        setPendingSymptom(null);
        setIsLoading(false);
        return;
      }
      setPendingSymptom(null); // Clear if response is ambiguous
    }

    // Client-side symptom detection
    const detected = detectSymptoms(text);

    try {
      // Build conversation history for context (last 20 messages)
      const currentMessages = [...messages, userMsg];
      const history = currentMessages
        .filter((m) => m.role !== "system")
        .slice(-20)
        .map((m) => ({
          role: m.role === "patient" ? "user" : "assistant",
          content: m.content,
        }));

      const res = await fetch("/api/ai/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          patientContext: buildContext(),
        }),
      });

      const json = await res.json();
      let replyText = json.data?.reply || "I'm sorry, I couldn't process that. Please try again.";

      // If symptoms detected but AI didn't suggest logging, add suggestion
      if (detected.length > 0 && !replyText.toLowerCase().includes("log") && !replyText.toLowerCase().includes("record")) {
        const symptomName = detected[0];
        replyText += `\n\nI noticed you mentioned "${symptomName}." Would you like me to add this to today's report for your care team?`;
        setPendingSymptom(symptomName);
      } else if (replyText.toLowerCase().includes("would you like me to add") || replyText.toLowerCase().includes("would you like me to log")) {
        // AI suggested logging — set pending
        if (detected.length > 0) {
          setPendingSymptom(detected[0]);
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
        metadata: {
          provider: json.data?.provider,
          symptomDetected: detected.length > 0 ? detected[0] : undefined,
          confirmationPending: !!pendingSymptom || detected.length > 0,
        },
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble connecting right now. You can still use the daily check-in to record your symptoms, and your care team will review them.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Summarize conversation ──────────────────────────────

  const handleSummarize = async () => {
    if (messages.length < 3) return; // Need at least a few messages
    setSummarizing(true);
    try {
      const history = messages
        .filter((m) => m.role !== "system" && m.id !== "welcome")
        .map((m) => ({
          role: m.role === "patient" ? "user" : "assistant",
          content: m.content,
        }));
      const result = await api.summarizeConversation(history);
      const summaryMsg: ChatMessage = {
        id: `summary-${Date.now()}`,
        role: "assistant",
        content: `📋 **Conversation Summary:**\n${result.summary}`,
        timestamp: new Date().toISOString(),
        metadata: { provider: result.provider },
      };
      setMessages((prev) => [...prev, summaryMsg]);
    } catch {
      // Silently fail — not critical
    } finally {
      setSummarizing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 flex items-center justify-center transition-all hover:scale-105"
        aria-label="Open Care Assistant"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="workspace-panel fixed bottom-4 right-4 z-40 flex h-[min(540px,calc(100dvh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden !p-0 shadow-2xl sm:bottom-6 sm:right-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <div className="text-sm font-semibold">Care Assistant</div>
            <div className="text-[10px] text-primary-200">
              Guidance &amp; symptom logging support
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 3 && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Summarize conversation"
            >
              {summarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200">
        <p className="text-[9px] text-amber-700 leading-tight">
          This assistant provides guidance only. It does not replace your doctor
          or care team. For urgent concerns, contact them directly.
        </p>
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "patient" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "assistant"
                  ? "bg-primary-100"
                  : "bg-slate-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-3.5 h-3.5 text-primary-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 ${
                msg.role === "patient"
                  ? "bg-primary-50 border border-primary-200"
                  : "bg-slate-50 border border-slate-200"
              }`}
            >
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>

              {/* Logged badge */}
              {msg.metadata?.logged && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Logged to your report
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-1 text-[9px] text-clinical-muted">
                <Clock className="w-2 h-2" />
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                <span className="text-[11px] text-clinical-muted">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Pending confirmation banner ────────────────── */}
      {pendingSymptom && (
        <div className="flex-shrink-0 px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center gap-2 text-[11px] text-blue-700">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>
              Awaiting confirmation to log &quot;{pendingSymptom}&quot;. Nothing saved
              yet.
            </span>
          </div>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask a question or describe a symptom..."
            className="flex-1 text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 flex items-center justify-center transition-all"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
