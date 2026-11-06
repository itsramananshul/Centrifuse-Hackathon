export const homeQuestions = {
  cough: { question: "Did you wake up coughing?", label: "Night cough" },
  activity: { question: "Did symptoms limit usual activities?", label: "Activity limited" },
  headache: { question: "Did you have a headache?", label: "Headache" },
  school: { question: "Did you miss school because of symptoms?", label: "School missed" },
} as const;

export type HomeQuestion = keyof typeof homeQuestions;

export function questionsFor(condition: string): HomeQuestion[] {
  if (/asthma/i.test(condition)) return ["cough", "activity"];
  if (/headache|migraine/i.test(condition)) return ["headache", "activity", "school"];
  return ["activity", "headache", "cough", "school"];
}

export function writeHomeAnswers(answers: Partial<Record<HomeQuestion, string>>) {
  return Object.entries(homeQuestions).flatMap(([key, item]) => {
    const answer = answers[key as HomeQuestion];
    return answer === "Yes" || answer === "No" ? ["Home tracker · " + item.label + ": " + answer + "."] : [];
  });
}

export function readHomeAnswers(transcript: string) {
  const values: Partial<Record<HomeQuestion, number>> = {};
  for (const [key, item] of Object.entries(homeQuestions)) {
    const line = transcript.split("\n").findLast((candidate) => candidate.startsWith("Home tracker · " + item.label + ": "));
    if (line?.endsWith(": Yes.")) values[key as HomeQuestion] = 1;
    if (line?.endsWith(": No.")) values[key as HomeQuestion] = 0;
  }
  return values;
}
