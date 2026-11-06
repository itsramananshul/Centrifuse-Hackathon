"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  Stethoscope,
  Shield,
  ArrowLeft,
  Search,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
}

// ── Role badge colors ────────────────────────────────────────

const roleBadge: Record<string, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  patient: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Patient", icon: User },
  clinician: { bg: "bg-primary-50", text: "text-primary-300", label: "Doctor", icon: Stethoscope },
  super: { bg: "bg-purple-50", text: "text-purple-700", label: "Lead Doctor", icon: Shield },
};

const followUpLabels = ["Care update", "Action requested", "Care alert"] as const;

function followUpLabel(content: string) {
  return followUpLabels.find((label) => content.startsWith(label + ": "));
}

// ── Contact List ─────────────────────────────────────────────

function ContactList({
  contacts,
  selected,
  onSelect,
  search,
  onSearchChange,
}: {
  contacts: Contact[];
  selected: Contact | null;
  onSelect: (c: Contact) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-clinical-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts..."
            className="input pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-clinical-muted">
            No contacts found
          </div>
        ) : (
          filtered.map((contact) => {
            const badge = roleBadge[contact.role] || roleBadge.patient;
            const initials = contact.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <button
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-clinical-border/50 ${
                  selected?.id === contact.id
                    ? "bg-primary-50 border-l-2 border-l-primary-500"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${badge.bg} ${badge.text}`}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{contact.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Chat Thread ──────────────────────────────────────────────

function ChatThread({
  contact,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  onBack,
}: {
  contact: Contact;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onBack?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const badge = roleBadge[contact.role] || roleBadge.patient;
  const BadgeIcon = badge.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-clinical-border bg-clinical-card">
        {onBack && (
          <button onClick={onBack} className="md:hidden btn-ghost p-1.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${badge.bg}`}>
          <BadgeIcon className={`w-4.5 h-4.5 ${badge.text}`} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wide ${badge.text}`}>
            {badge.label}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-clinical-muted py-12">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.isMine
                  ? "bg-primary-600 text-white rounded-br-md"
                  : "bg-clinical-card border border-clinical-border text-slate-800 rounded-bl-md shadow-sm"
              }`}
            >
              {followUpLabel(msg.content) && (
                <p className="mb-1 font-semibold">{followUpLabel(msg.content)}</p>
              )}
              <p className="whitespace-pre-wrap break-words">{followUpLabel(msg.content) ? msg.content.slice(followUpLabel(msg.content)!.length + 2) : msg.content}</p>
              <div
                className={`text-[10px] mt-1 ${
                  msg.isMine ? "text-primary-200" : "text-clinical-muted"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-clinical-border bg-clinical-card">
        {contact.role === "patient" && (
          <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Care follow-up options">
            {followUpLabels.map((label) => (
              <button key={label} type="button" disabled={sending} className="btn-secondary min-h-11 text-xs"
                onClick={() => {
                  const current = followUpLabel(draft);
                  const body = current ? draft.slice(current.length + 2) : draft;
                  onDraftChange(label + ": " + body);
                }}>{label}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Type a message..."
            className="input flex-1 py-2.5 text-sm"
            disabled={sending}
          />
          <button
            onClick={onSend}
            disabled={!draft.trim() || sending}
            className="btn-primary px-4 flex items-center gap-1.5"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Load contacts
  useEffect(() => {
    setLoading(true);
    api
      .getContacts()
      .then((c) => {
        setContacts(c);
        const target = new URLSearchParams(window.location.search).get("with");
        const contact = c.find((item) => item.id === target);
        if (contact) {
          setSelectedContact(contact);
          setMobileShowChat(true);
        }
      })
      .catch(() => toast.error("Failed to load contacts"))
      .finally(() => setLoading(false));
  }, []);

  // Load messages for selected contact
  const loadMessages = useCallback(async () => {
    if (!selectedContact) return;
    try {
      const msgs = await api.getMessages(selectedContact.id);
      setMessages(msgs);
    } catch {
      // Silent fail on poll
    }
  }, [selectedContact]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedContact, loadMessages]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setMessages([]);
    setDraft("");
    setMobileShowChat(true);
  };

  const handleSend = async () => {
    if (!selectedContact || !draft.trim() || sending) return;
    const label = followUpLabel(draft);
    if (label && !draft.slice(label.length + 2).trim()) {
      toast.error("Add a message for the patient.");
      return;
    }
    setSending(true);
    try {
      const msg = await api.sendMessage(selectedContact.id, draft.trim());
      setMessages((prev) => [...prev, { ...msg, isRead: false }]);
      setDraft("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-primary-400" />
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Messages</h1>
        <span className="text-xs text-clinical-muted">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex rounded-xl border border-clinical-border bg-clinical-card overflow-hidden min-h-0">
        {/* Left: Contacts */}
        <div className={`w-full md:w-80 md:border-r border-clinical-border flex-shrink-0 ${
          mobileShowChat ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}>
          <ContactList
            contacts={contacts}
            selected={selectedContact}
            onSelect={handleSelectContact}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Right: Chat */}
        <div className={`flex-1 flex flex-col min-w-0 ${
          !mobileShowChat ? "hidden md:flex" : "flex"
        }`}>
          {selectedContact ? (
            <ChatThread
              contact={selectedContact}
              messages={messages}
              draft={draft}
              onDraftChange={setDraft}
              onSend={handleSend}
              sending={sending}
              onBack={() => setMobileShowChat(false)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">
                  Select a conversation
                </h3>
                <p className="text-sm text-clinical-muted">
                  Choose a contact from the left to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
