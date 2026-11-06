export function checkInNarrative(transcript: string) {
  return transcript
    .replace(/^(?:Pain level:|Home tracker ·).*$/gm, "")
    .replace(/^Side effects:\s*/gm, "")
    .toLowerCase()
    .replaceAll("’", "'");
}

const explicitDenial = /\b(?:no(?: longer)?|without|den(?:y|ies|ied)|(?:don't|doesn't|didn't|do not|does not|did not)\s+(?:have|feel|experience|notice|report)|(?:not|no longer)\s+(?:having|feeling|experiencing|noticing|reporting))\s+(?:(?:any|more|current|new|ongoing|further|chest|shortness of|trouble|difficulty|severe|sharp|burning)\s+)*$/;

export function hasUnnegatedMention(text: string, term: string) {
  let index = text.indexOf(term);
  while (index !== -1) {
    if (!explicitDenial.test(text.slice(Math.max(0, index - 96), index))) return true;
    index = text.indexOf(term, index + term.length);
  }
  return false;
}
