"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Patient } from "@trialpulse/types";
import { api } from "@/lib/api";

// Doctor type from API
interface Doctor {
  id: string;
  name: string;
  email: string;
  authId: string | null;
}
import { toast } from "sonner";
import {
  UserPlus,
  Search,
  User,
  Mail,
  Calendar,
  Stethoscope,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";

// ── Status badge colors ──────────────────────────────────────

const patientStatusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  flagged: "bg-red-50 text-red-700 ring-red-200",
  dropped: "bg-slate-100 text-slate-500 ring-slate-200",
  completed: "bg-primary-50 text-primary-300 ring-primary-200",
};

// ── Searchable Dropdown ──────────────────────────────────────

function SearchableDropdown<T extends { id: string; name: string }>({
  items,
  placeholder,
  selected,
  onSelect,
  renderItem,
}: {
  items: T[];
  placeholder: string;
  selected: T | null;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input pl-9 pr-8"
        />
        {selected && (
          <button
            onClick={() => {
              onSelect(null as unknown as T);
              setQuery("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-clinical-card rounded-lg border border-clinical-border shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                selected?.id === item.id ? "bg-primary-50" : ""
              }`}
            >
              {renderItem(item)}
              {selected?.id === item.id && (
                <CheckCircle2 className="w-4 h-4 text-primary-400 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-clinical-card rounded-lg border border-clinical-border shadow-lg p-4 text-center text-sm text-clinical-muted">
          No results found
        </div>
      )}
    </div>
  );
}

// ── Profile Cards ────────────────────────────────────────────

function DoctorProfileCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="card animate-fade-in-up mt-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-7 h-7 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-900 truncate">{doctor.name}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
              Clinician
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{doctor.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientProfileCard({
  patient,
  assignedDoctor,
}: {
  patient: Patient;
  assignedDoctor?: string;
}) {
  return (
    <div className="card animate-fade-in-up mt-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Heart className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-900 truncate">{patient.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ring-1 ${patientStatusStyle[patient.status] || patientStatusStyle.active}`}>
              {patient.status}
            </span>
          </div>
          <p className="text-sm text-emerald-600 font-medium mb-3">{patient.condition}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Age {patient.age}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{patient.trialId}</span>
            </div>
          </div>

          {assignedDoctor && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Currently assigned to <strong>{assignedDoctor}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function AssignPatientPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, docRes] = await Promise.all([
        api.getPatients(),
        fetch("/api/doctors").then((r) => r.json()),
      ]);
      setPatients(p);
      if (docRes.success) setDoctors(docRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Find the doctor name if patient is already assigned
  const assignedDoctorName = selectedPatient?.doctorId
    ? doctors.find((d) => d.id === selectedPatient.doctorId)?.name
    : undefined;

  const handleAssign = async () => {
    if (!selectedDoctor || !selectedPatient) return;

    setAssigning(true);
    try {
      // Write to DB — doctor IDs are now real UUIDs
      const res = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctor.id }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Failed to assign patient");
        return;
      }

      // Update local state
      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient.id ? { ...p, doctorId: selectedDoctor.id } : p
        )
      );
      setSelectedPatient({ ...selectedPatient, doctorId: selectedDoctor.id });

      toast.success(`${selectedPatient.name} assigned to ${selectedDoctor.name}`);
    } catch {
      toast.error("Failed to assign patient");
    } finally {
      setAssigning(false);
    }
  };

  const canAssign = selectedDoctor && selectedPatient && !assigning;
  const alreadyAssigned =
    selectedDoctor &&
    selectedPatient &&
    selectedPatient.doctorId === selectedDoctor.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-purple-600" />
          Assign Patient to Doctor
        </h1>
        <p className="text-xs text-clinical-muted mt-0.5">
          Select a doctor and a patient, then assign them together
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Doctor Selection */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Select Doctor
            </h2>
          </div>
          <SearchableDropdown
            items={doctors}
            placeholder="Search doctor..."
            selected={selectedDoctor}
            onSelect={setSelectedDoctor}
            renderItem={(doc) => (
              <>
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                  <div className="text-xs text-clinical-muted">{doc.email}</div>
                </div>
              </>
            )}
          />
          {selectedDoctor && <DoctorProfileCard doctor={selectedDoctor} />}
        </div>

        {/* RIGHT: Patient Selection */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Select Patient
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-clinical-muted py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading patients...
            </div>
          ) : (
            <SearchableDropdown
              items={patients}
              placeholder="Search patient..."
              selected={selectedPatient}
              onSelect={setSelectedPatient}
              renderItem={(p) => (
                <>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-clinical-muted">{p.condition} &middot; Age {p.age}</div>
                  </div>
                </>
              )}
            />
          )}
          {selectedPatient && (
            <PatientProfileCard
              patient={selectedPatient}
              assignedDoctor={assignedDoctorName}
            />
          )}
        </div>
      </div>

      {/* Assign Button */}
      <div className="pt-2">
        {alreadyAssigned ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {selectedPatient?.name} is already assigned to {selectedDoctor?.name}
          </div>
        ) : (
          <button
            onClick={handleAssign}
            disabled={!canAssign}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {assigning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            {assigning ? "Assigning..." : "Assign Patient to Doctor"}
          </button>
        )}
      </div>
    </div>
  );
}
