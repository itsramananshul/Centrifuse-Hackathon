/**
 * Normalize a phrase for comparison:
 * - lowercase
 * - trim
 * - collapse whitespace
 * - strip punctuation
 */
function normalize(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Compare a spoken transcript against the expected phrase.
 * Returns true if they match after normalization.
 */
export function phraseMatches(
  transcript: string,
  expected: string
): { matches: boolean; normalizedTranscript: string; normalizedExpected: string } {
  const normalizedTranscript = normalize(transcript);
  const normalizedExpected = normalize(expected);

  // Exact match after normalization
  if (normalizedTranscript === normalizedExpected) {
    return { matches: true, normalizedTranscript, normalizedExpected };
  }

  // Check if expected phrase is contained in transcript
  // (user might say extra words before/after the phrase)
  if (normalizedTranscript.includes(normalizedExpected)) {
    return { matches: true, normalizedTranscript, normalizedExpected };
  }

  return { matches: false, normalizedTranscript, normalizedExpected };
}
