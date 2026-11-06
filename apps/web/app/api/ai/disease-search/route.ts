import { createClient } from "@/lib/supabase/server";
import { getAllDiseases, type Disease } from "@/lib/disease-data";
import { NextResponse } from "next/server";

function successResponse(data: unknown, message = "OK") {
  return NextResponse.json({ success: true, message, data });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

interface SearchResult {
  disease: Disease;
  matchPercent: number;
  matchedSymptoms?: string[];
  reason?: string;
}

/**
 * POST /api/ai/disease-search
 * Searches diseases by symptom keywords. Uses local matching first,
 * then falls back to AI if available.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { query } = body;

  if (!query || typeof query !== "string") {
    return errorResponse("query is required");
  }

  const diseases = getAllDiseases();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower
    .split(/[\s,;.]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);

  // Score each disease based on symptom/name/description matches
  const scored: SearchResult[] = [];

  for (const disease of diseases) {
    const allText = [
      disease.name,
      ...disease.symptoms,
      disease.description,
      disease.category,
    ]
      .join(" ")
      .toLowerCase();

    let matchCount = 0;
    const matchedSymptoms: string[] = [];

    for (const word of queryWords) {
      if (allText.includes(word)) {
        matchCount++;
      }
      // Check specific symptom matches
      for (const symptom of disease.symptoms) {
        if (
          symptom.toLowerCase().includes(word) &&
          !matchedSymptoms.includes(symptom)
        ) {
          matchedSymptoms.push(symptom);
        }
      }
    }

    if (matchCount > 0 || matchedSymptoms.length > 0) {
      const matchPercent = Math.min(
        95,
        Math.round(
          ((matchCount + matchedSymptoms.length) /
            (queryWords.length + disease.symptoms.length)) *
            100 *
            2
        )
      );

      scored.push({
        disease,
        matchPercent: Math.max(matchPercent, 15),
        matchedSymptoms:
          matchedSymptoms.length > 0 ? matchedSymptoms : undefined,
        reason: `Matches ${matchCount} of ${queryWords.length} symptom keywords`,
      });
    }
  }

  // Sort by match percent descending
  scored.sort((a, b) => b.matchPercent - a.matchPercent);

  // Take top 10
  const results = scored.slice(0, 10);

  return successResponse({
    results,
    aiPowered: false,
    query,
  });
}
