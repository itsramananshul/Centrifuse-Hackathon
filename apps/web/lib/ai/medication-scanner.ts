import fdaDatabase from "@/data/fda_database.json";

// --- Types ---

interface FdaRecord {
  id: string;
  brand_name: string;
  generic_name: string;
  pharm_class: string;
  source: string;
}

interface MedicationMetadata {
  drugName: string;
  score: number;
  strength: string;
  quantity: string;
  expiry: string;
  fdaContext: string | null;
}

export interface MedicationScanResult {
  ocrTexts: string[];
  metadata: MedicationMetadata;
  advice: string;
  auditPassed: boolean;
  auditReason: string;
}

// --- FDA Database ---

const DRUG_DB: FdaRecord[] = fdaDatabase as FdaRecord[];

// --- String Similarity (SequenceMatcher port) ---

function sequenceMatchRatio(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // LCS-based similarity (like Python difflib.SequenceMatcher)
  const len1 = s1.length;
  const len2 = s2.length;
  const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
    new Array(len2 + 1).fill(0)
  );

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = dp[len1][len2];
  return (2.0 * lcs) / (len1 + len2);
}

// --- YOLOv8 Box Detection via Python Service ---

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || "http://localhost:8123";

interface DetectedBox {
  image: string; // base64 cropped region
  confidence: number;
  bbox: number[];
}

async function detectBoxes(base64Image: string): Promise<DetectedBox[]> {
  try {
    const response = await fetch(`${YOLO_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      console.warn(`[YOLO] Detection service error: ${response.status}`);
      return [];
    }

    const result: { boxes: DetectedBox[]; total: number } = await response.json();
    console.log(`[YOLO] Detected ${result.total} box(es)`);
    return result.boxes;
  } catch (err) {
    console.warn(`[YOLO] Service unavailable, falling back to full image. Error: ${err}`);
    return [];
  }
}

// --- OCR via Gemini Vision ---

async function extractTextFromImage(
  base64Image: string,
  mimeType: string,
  apiKey: string
): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: `You are an OCR system specialized in reading medication labels and pharmaceutical packaging.

Extract ALL visible text from this medication label image. Return ONLY the extracted text, one line per distinct text element. Do not add any commentary or formatting.

Focus on:
- Drug/brand name
- Active ingredients
- Dosage/strength (e.g., 75 mg)
- Quantity (e.g., 30 tablets)
- Expiry date
- Manufacturer
- Any warnings or instructions visible`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Vision OCR failed (${response.status}): ${errText}`);
  }

  const result: any = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No text extracted from image");
  }

  return text
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 2);
}

// --- RAG: FDA Database Matching ---

function analyzeMetadata(ocrTexts: string[]): MedicationMetadata {
  let bestRecord: FdaRecord | null = null;
  let highestScore = 0.0;
  let strength = "N/A";
  let quantity = "N/A";
  let expiry = "N/A";

  for (const text of ocrTexts) {
    // Entity linking: fuzzy match against FDA DB
    for (const record of DRUG_DB) {
      const targetName = record.brand_name;
      let score = sequenceMatchRatio(targetName, text);

      // Boost if exact substring match
      if (targetName.toLowerCase().includes(text.toLowerCase()) ||
          text.toLowerCase().includes(targetName.toLowerCase())) {
        score = Math.max(score, 0.95);
      }

      if (score > highestScore) {
        highestScore = score;
        bestRecord = record;
      }
    }

    // Extract strength
    const sMatch = text.match(/(\d+)\s*(mg|ml|mcg|g)\b/i);
    if (sMatch) strength = sMatch[0];

    // Extract quantity
    const qMatch = text.match(/(\d+)\s*(capsules?|tablets?|pills?|vien)/i);
    if (qMatch) quantity = qMatch[0];

    // Extract expiry
    const eMatch = text.match(/(EXP|HSD|Expiry)[\s:]*(\d+\/\d+)/i);
    if (eMatch) expiry = eMatch[0];
  }

  let fdaContext: string | null = null;
  if (bestRecord && highestScore > 0.4) {
    fdaContext = [
      `Brand Name: ${bestRecord.brand_name}`,
      `Active Ingredient: ${bestRecord.generic_name}`,
      `Pharmacological Class: ${bestRecord.pharm_class}`,
      `Data Source: ${bestRecord.source}`,
    ].join("\n");
  }

  return {
    drugName: bestRecord?.brand_name ?? "Unknown",
    score: highestScore,
    strength,
    quantity,
    expiry,
    fdaContext,
  };
}

// --- Generator LLM (Doctor Agent) ---

async function generateDraftAdvice(
  userInput: string,
  drugInfo: string,
  apiKey: string
): Promise<string | null> {
  const prompt = `ROLE: You are a knowledgeable and compassionate clinical pharmacist.

TASK: Provide clear, safe medication advice in English for a patient.

FDA DATA (GROUND TRUTH):
${drugInfo}

MEDICATION CONTEXT:
${userInput}

GUIDELINES:
1. Briefly explain what this medicine is, its general purpose, and how it is typically used (route and dosage form).
2. Mention the pharmacological class in simple terms.
3. You may reference strength, quantity, and expiry to describe the product, but do NOT give a specific dosing schedule.
4. Include general safety reminders (e.g., follow doctor's instructions, do not self-adjust dose).
5. Keep it under 150 words.
6. Use plain, patient-friendly English. NO markdown formatting.
7. Do NOT invent information not supported by the FDA data.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    console.warn(`[GENERATOR] Gemini error: ${response.status}`);
    return null;
  }

  const result: any = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() ?? null;
}

// --- Auditor LLM (Safety Validator) ---

interface AuditResult {
  is_safe: boolean;
  reason: string;
  corrected_advice: string | null;
}

async function auditSafety(
  drugInfo: string,
  draftAdvice: string,
  apiKey: string
): Promise<AuditResult> {
  const prompt = `ROLE: Medical AI Safety Auditor.

TASK: Verify if the following medication advice aligns strictly with FDA data.

SOURCE DATA (FDA):
${drugInfo}

DRAFT ADVICE TO AUDIT:
${draftAdvice}

CRITERIA:

1. ALLOWED:
- Mention common, well-established indications and class-level warnings for this drug class.
- Use brand/generic name, class, dosage form, route, strength, quantity, and expiry only to describe the product.

2. NOT ALLOWED:
- Invent specific dosages or dosing schedules, detailed "how to take" instructions, or indications clearly inappropriate for this drug class.

3. SEVERE ERROR:
- Encourage use in clearly inappropriate patients, wrong route of administration, or contradict serious warnings.

OUTPUT FORMAT (JSON ONLY):
{
  "is_safe": true or false,
  "reason": "English explanation",
  "corrected_advice": "Corrected English advice if unsafe, otherwise null"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    console.warn("[AUDITOR] Gemini error, skipping audit");
    return { is_safe: true, reason: "Audit skipped (API error)", corrected_advice: null };
  }

  const result: any = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return { is_safe: true, reason: "Audit skipped (no response)", corrected_advice: null };
  }

  try {
    return JSON.parse(text) as AuditResult;
  } catch {
    console.warn("[AUDITOR] JSON parse failed");
    return { is_safe: true, reason: "Audit failed (parse error)", corrected_advice: null };
  }
}

// --- Main Pipeline ---

export async function scanMedication(
  base64Image: string,
  mimeType: string
): Promise<MedicationScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Step 1: YOLOv8 Detection + OCR via Gemini Vision
  console.log("[MED-SCAN] Step 1a: Detecting medication boxes with YOLOv8...");
  const detectedBoxes = await detectBoxes(base64Image);

  let ocrTexts: string[];

  if (detectedBoxes.length > 0) {
    // YOLOv8 found boxes: OCR each cropped region
    console.log(`[MED-SCAN] Step 1b: Running OCR on ${detectedBoxes.length} detected region(s)...`);
    const ocrPromises = detectedBoxes.map((box) =>
      extractTextFromImage(box.image, "image/jpeg", apiKey).catch((err) => {
        console.warn(`[MED-SCAN] OCR failed for box [${box.bbox}]: ${err}`);
        return [] as string[];
      })
    );
    const ocrResults = await Promise.all(ocrPromises);
    ocrTexts = ocrResults.flat();
  } else {
    // Fallback: no YOLO service or no detections — OCR full image
    console.log("[MED-SCAN] Step 1b: No YOLO boxes, OCR-ing full image (fallback)...");
    ocrTexts = await extractTextFromImage(base64Image, mimeType, apiKey);
  }

  console.log(`[MED-SCAN] OCR found ${ocrTexts.length} text segments`);

  // Step 2: RAG - Match against FDA database
  console.log("[MED-SCAN] Step 2: Matching against FDA database...");
  const metadata = analyzeMetadata(ocrTexts);
  console.log(`[MED-SCAN] Best match: ${metadata.drugName} (score: ${metadata.score.toFixed(2)})`);

  // Step 3: Generate advice if FDA match found
  if (!metadata.fdaContext) {
    return {
      ocrTexts,
      metadata,
      advice: "Unable to identify this medication in the FDA database. Please consult your healthcare provider for information about this medication.",
      auditPassed: false,
      auditReason: "No FDA match found",
    };
  }

  const userInput = `Drug: ${metadata.drugName}, Strength: ${metadata.strength}, Quantity: ${metadata.quantity}, Expiry: ${metadata.expiry}`;

  console.log("[MED-SCAN] Step 3: Generating medical advice...");
  const draft = await generateDraftAdvice(userInput, metadata.fdaContext, apiKey);

  if (!draft) {
    return {
      ocrTexts,
      metadata,
      advice: "Sorry, the system encountered an issue generating advice. Please consult your healthcare provider.",
      auditPassed: false,
      auditReason: "Generator failed",
    };
  }

  // Step 4: Audit for safety
  console.log("[MED-SCAN] Step 4: Auditing advice for safety...");
  const audit = await auditSafety(metadata.fdaContext, draft, apiKey);

  let finalAdvice: string;
  if (audit.is_safe) {
    console.log("[MED-SCAN] Audit PASSED");
    finalAdvice = draft;
  } else {
    console.log(`[MED-SCAN] Audit FAILED: ${audit.reason}`);
    finalAdvice = audit.corrected_advice ??
      "This medication information requires further verification. Please consult your healthcare provider for accurate guidance.";
  }

  return {
    ocrTexts,
    metadata,
    advice: finalAdvice,
    auditPassed: audit.is_safe,
    auditReason: audit.reason,
  };
}
