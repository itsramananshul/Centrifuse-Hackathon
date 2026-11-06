"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { fromExistingPatient, type ReviewCase } from "@/lib/visit-review";
import { VisitReview } from "@/components/VisitReview";

export default function PatientReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<{ id: string; patient?: ReviewCase; error?: string }>();

  useEffect(() => {
    let current = true;
    Promise.all([api.getPatient(id), api.getPatientCheckIns(id)])
      .then(([patient, checkins]) => {
        if (current) setResult({ id, patient: fromExistingPatient(patient, checkins) });
      })
      .catch(() => {
        if (current) setResult({ id, error: "This patient's review could not be loaded." });
      });
    return () => { current = false; };
  }, [id]);

  return (
    <div className="space-y-4">
      <Link href={"/patient/" + id} className="inline-block text-sm text-primary-300 hover:underline">Back to patient</Link>
      {result?.id !== id ? <p role="status">Loading visit review…</p> : result.patient ?
        <VisitReview key={id} cases={[result.patient]} /> :
        <p role="alert">{result.error}</p>}
    </div>
  );
}
