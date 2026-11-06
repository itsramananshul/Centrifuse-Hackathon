"use client";

import { useState, useCallback } from "react";
import { getPopularDiseases, type Disease } from "@/lib/disease-data";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  Brain,
  Shield,
  Stethoscope,
  X,
  Eye,
  Pill,
  Thermometer,
  Info,
  CheckCircle2,
} from "lucide-react";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Autoimmune: Shield,
  Cardiovascular: Heart,
  Metabolic: Activity,
  Musculoskeletal: Stethoscope,
  Respiratory: Activity,
  "Mental Health": Brain,
  Neurological: Brain,
  Gastrointestinal: Pill,
  Ophthalmology: Eye,
  Infectious: Thermometer,
  Dermatology: Shield,
  Immunology: Shield,
  Hematology: Heart,
};

const categoryColors: Record<string, string> = {
  Autoimmune: "bg-purple-100 text-purple-700",
  Cardiovascular: "bg-red-100 text-red-700",
  Metabolic: "bg-amber-100 text-amber-700",
  Musculoskeletal: "bg-blue-100 text-blue-700",
  Respiratory: "bg-teal-100 text-teal-700",
  "Mental Health": "bg-indigo-100 text-indigo-700",
  Neurological: "bg-pink-100 text-pink-700",
  Gastrointestinal: "bg-orange-100 text-orange-700",
  Ophthalmology: "bg-cyan-100 text-cyan-700",
  Infectious: "bg-rose-100 text-rose-700",
  Dermatology: "bg-violet-100 text-violet-700",
  Immunology: "bg-lime-100 text-lime-700",
  Hematology: "bg-fuchsia-100 text-fuchsia-700",
};

interface SearchResult {
  disease: Disease;
  matchPercent: number;
  matchedSymptoms?: string[];
  reason?: string;
}

export default function BrowseDiseasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const popularDiseases = getPopularDiseases();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter symptoms to search");
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/ai/disease-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data.results || []);
        setAiPowered(json.data.aiPowered || false);
      } else {
        toast.error(json.message || "Search failed");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Browse Diseases</h1>
        <p className="text-sm text-clinical-muted mt-1">Search by symptoms or browse common conditions</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-semibold text-slate-900">AI Symptom Search</h2>
        </div>
        <p className="text-xs text-clinical-muted mb-3">Describe your symptoms and our AI will find matching conditions with explanations.</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="input pl-10" placeholder="e.g., stomach pain, diarrhea, nausea, fever..." />
            {searchQuery && (<button onClick={() => { setSearchQuery(""); setResults([]); setHasSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>)}
          </div>
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="btn-primary flex items-center gap-2 px-5">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Search Results {results.length > 0 && <span className="text-clinical-muted font-normal ml-2">({results.length} match{results.length !== 1 ? "es" : ""})</span>}</h2>
            {aiPowered && <span className="flex items-center gap-1 text-[10px] font-semibold text-primary-400 bg-primary-50 px-2 py-0.5 rounded-full"><Sparkles className="w-2.5 h-2.5" />AI-Powered</span>}
          </div>
          {results.length === 0 ? (
            <div className="card text-center py-8"><p className="text-sm text-clinical-muted">No matching diseases found. Try different symptoms.</p></div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => <SearchResultCard key={r.disease.id} result={r} expanded={expandedId === `s-${r.disease.id}`} onToggle={() => toggleExpand(`s-${r.disease.id}`)} />)}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Popular Diseases <span className="text-sm font-normal text-clinical-muted ml-2">({popularDiseases.length})</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularDiseases.map((d) => <DiseaseCard key={d.id} disease={d} expanded={expandedId === d.id} onToggle={() => toggleExpand(d.id)} />)}
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({ result, expanded, onToggle }: { result: SearchResult; expanded: boolean; onToggle: () => void }) {
  const { disease, matchPercent, matchedSymptoms, reason } = result;
  const catColor = categoryColors[disease.category] || "bg-slate-100 text-slate-700";
  return (
    <div className="card hover:shadow-md transition-shadow">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100">
            <img src={disease.imageUrl} alt={disease.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-slate-900">{disease.name}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catColor}`}>{disease.category}</span>
            </div>
            {reason && <div className="flex items-start gap-1.5 mt-1"><Info className="w-3 h-3 text-primary-500 mt-0.5 flex-shrink-0" /><p className="text-xs text-primary-300 leading-relaxed">{reason}</p></div>}
            {matchedSymptoms && matchedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {matchedSymptoms.map((s) => <span key={s} className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-2.5 h-2.5" />{s}</span>)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className={`text-xl font-bold ${matchPercent >= 70 ? "text-red-600" : matchPercent >= 40 ? "text-amber-600" : "text-blue-600"}`}>{matchPercent}%</div>
              <div className="text-[9px] text-clinical-muted font-medium">match</div>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </button>
      {expanded && <DiseaseDetail disease={disease} />}
    </div>
  );
}

function DiseaseCard({ disease, expanded, onToggle }: { disease: Disease; expanded: boolean; onToggle: () => void }) {
  const catColor = categoryColors[disease.category] || "bg-slate-100 text-slate-700";
  return (
    <div className="card hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative h-36 -mx-4 -mt-4 mb-3 bg-slate-100 overflow-hidden">
        <img src={disease.imageUrl} alt={disease.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute top-2 right-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm bg-clinical-card/80 ${catColor}`}>{disease.category}</span></div>
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">{disease.name}</h3>
      <p className="text-xs text-clinical-muted line-clamp-2 mb-2">{disease.description}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {disease.symptoms.slice(0, 4).map((s) => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{s}</span>)}
        {disease.symptoms.length > 4 && <span className="text-[9px] px-1.5 py-0.5 text-clinical-muted">+{disease.symptoms.length - 4} more</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-clinical-muted">{disease.prevalence}</span>
        <button onClick={onToggle} className="text-xs text-primary-400 font-medium hover:text-primary-300 flex items-center gap-0.5">
          {expanded ? "Less" : "Details"}{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {expanded && <DiseaseDetail disease={disease} />}
    </div>
  );
}

function DiseaseDetail({ disease }: { disease: Disease }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      <p className="text-xs text-slate-600 leading-relaxed">{disease.description}</p>
      <div><h4 className="text-xs font-semibold text-slate-700 mb-1.5">Common Symptoms</h4><div className="flex flex-wrap gap-1">{disease.symptoms.map((s) => <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{s}</span>)}</div></div>
      <div><h4 className="text-xs font-semibold text-slate-700 mb-1.5">Treatments</h4><div className="flex flex-wrap gap-1">{disease.treatments.map((t) => <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-300">{t}</span>)}</div></div>
      <div><h4 className="text-xs font-semibold text-slate-700 mb-1.5">Risk Factors</h4><div className="flex flex-wrap gap-1">{disease.riskFactors.map((f) => <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{f}</span>)}</div></div>
      <div className="text-xs text-clinical-muted">Prevalence: {disease.prevalence}</div>
    </div>
  );
}
