// ============================================================
// Disease Database — 27 common diseases
// ============================================================

export interface Disease {
  id: string;
  name: string;
  category: string;
  description: string;
  symptoms: string[];
  treatments: string[];
  riskFactors: string[];
  prevalence: string;
  imageUrl: string;
}

const DISEASES: Disease[] = [
  {
    id: "gastritis",
    name: "Gastritis",
    category: "Gastrointestinal",
    description:
      "Inflammation of the stomach lining that can cause pain, nausea, and indigestion. Often triggered by infection, medication overuse, or stress.",
    symptoms: ["Stomach pain", "Nausea", "Bloating", "Indigestion", "Loss of appetite", "Vomiting"],
    treatments: ["Antacids", "Proton pump inhibitors", "H. pylori antibiotics", "Dietary changes"],
    riskFactors: ["H. pylori infection", "NSAID use", "Alcohol", "Stress", "Autoimmune disorders"],
    prevalence: "Affects ~50% of the global population",
    imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80",
  },
  {
    id: "ibs",
    name: "Irritable Bowel Syndrome (IBS)",
    category: "Gastrointestinal",
    description:
      "A chronic disorder affecting the large intestine, causing cramping, abdominal pain, bloating, gas, and changes in bowel habits.",
    symptoms: ["Abdominal cramps", "Bloating", "Gas", "Diarrhea", "Constipation", "Mucus in stool"],
    treatments: ["Dietary modifications", "Fiber supplements", "Anti-spasmodics", "Probiotics", "Stress management"],
    riskFactors: ["Stress", "Food sensitivities", "Hormonal changes", "Family history", "Gut infections"],
    prevalence: "Affects 10-15% of adults worldwide",
    imageUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&q=80",
  },
  {
    id: "gerd",
    name: "GERD (Acid Reflux)",
    category: "Gastrointestinal",
    description:
      "Gastroesophageal reflux disease occurs when stomach acid flows back into the esophagus, causing heartburn and irritation.",
    symptoms: ["Heartburn", "Chest pain", "Difficulty swallowing", "Regurgitation", "Chronic cough", "Sore throat"],
    treatments: ["Antacids", "H2 blockers", "Proton pump inhibitors", "Lifestyle changes", "Surgery (severe cases)"],
    riskFactors: ["Obesity", "Hiatal hernia", "Smoking", "Pregnancy", "Certain foods"],
    prevalence: "Affects 20% of the U.S. population",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80",
  },
  {
    id: "conjunctivitis",
    name: "Conjunctivitis (Pink Eye)",
    category: "Ophthalmology",
    description:
      "Inflammation of the transparent membrane that lines the eyelid and covers the white part of the eye, causing redness and discharge.",
    symptoms: ["Red eyes", "Itching", "Tearing", "Discharge", "Crusting", "Burning sensation"],
    treatments: ["Antibiotic eye drops", "Antihistamine drops", "Cold compresses", "Artificial tears"],
    riskFactors: ["Viral/bacterial exposure", "Allergies", "Contact lens use", "Weak immune system"],
    prevalence: "6 million cases per year in the U.S.",
    imageUrl: "https://images.unsplash.com/photo-1494869042583-f6c911f04b4c?w=400&q=80",
  },
  {
    id: "glaucoma",
    name: "Glaucoma",
    category: "Ophthalmology",
    description:
      "A group of eye conditions that damage the optic nerve, often due to abnormally high pressure in the eye. A leading cause of blindness.",
    symptoms: ["Gradual vision loss", "Tunnel vision", "Eye pain", "Halos around lights", "Blurred vision", "Headache"],
    treatments: ["Eye drops", "Laser therapy", "Microsurgery", "Oral medications"],
    riskFactors: ["Age over 60", "Family history", "High eye pressure", "Diabetes", "Myopia"],
    prevalence: "Affects 3 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=400&q=80",
  },
  {
    id: "migraine",
    name: "Migraine",
    category: "Neurological",
    description:
      "A neurological condition that can cause severe throbbing pain, typically on one side of the head, often accompanied by nausea, vomiting, and sensitivity to light.",
    symptoms: ["Severe headache", "Nausea", "Light sensitivity", "Aura", "Throbbing pain", "Dizziness"],
    treatments: ["Triptans", "Anti-nausea medication", "Preventive medications", "Botox", "Lifestyle modifications"],
    riskFactors: ["Family history", "Hormonal changes", "Stress", "Sleep changes", "Certain foods"],
    prevalence: "Affects 12% of the population",
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80",
  },
  {
    id: "tension-headache",
    name: "Tension Headache",
    category: "Neurological",
    description:
      "The most common type of headache, causing a dull, aching sensation all over the head, often described as a tight band around the forehead.",
    symptoms: ["Dull aching pain", "Pressure on forehead", "Tenderness on scalp", "Neck pain", "Tightness", "Fatigue"],
    treatments: ["OTC pain relievers", "Muscle relaxants", "Stress management", "Physical therapy", "Relaxation techniques"],
    riskFactors: ["Stress", "Poor posture", "Eye strain", "Dehydration", "Jaw clenching"],
    prevalence: "Affects 40% of the population",
    imageUrl: "https://images.unsplash.com/photo-1616012480717-fd9867059ca0?w=400&q=80",
  },
  {
    id: "eczema",
    name: "Eczema (Atopic Dermatitis)",
    category: "Dermatology",
    description:
      "A chronic skin condition that makes the skin red, itchy, and inflamed. Common in children but can occur at any age.",
    symptoms: ["Itching", "Red patches", "Dry skin", "Cracking", "Swelling", "Oozing or crusting"],
    treatments: ["Moisturizers", "Topical corticosteroids", "Antihistamines", "Phototherapy", "Immunosuppressants"],
    riskFactors: ["Family history", "Allergies", "Asthma", "Dry environments", "Irritants"],
    prevalence: "Affects 31.6 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1612349316228-5b7717696007?w=400&q=80",
  },
  {
    id: "psoriasis",
    name: "Psoriasis",
    category: "Dermatology",
    description:
      "An autoimmune condition that causes rapid skin cell buildup, resulting in scaling on the skin surface. Patches can be itchy and sometimes painful.",
    symptoms: ["Red patches with scales", "Dry cracking skin", "Itching", "Burning", "Thick nails", "Stiff joints"],
    treatments: ["Topical corticosteroids", "Vitamin D analogues", "Biologics", "Light therapy", "Methotrexate"],
    riskFactors: ["Family history", "Stress", "Obesity", "Smoking", "Infections"],
    prevalence: "Affects 2-3% of the global population",
    imageUrl: "https://images.unsplash.com/photo-1579154341098-e4e158cc7f55?w=400&q=80",
  },
  {
    id: "acne",
    name: "Acne Vulgaris",
    category: "Dermatology",
    description:
      "A skin condition that occurs when hair follicles become clogged with oil and dead skin cells, causing whiteheads, blackheads, or pimples.",
    symptoms: ["Pimples", "Blackheads", "Whiteheads", "Cysts", "Oily skin", "Scarring"],
    treatments: ["Benzoyl peroxide", "Retinoids", "Antibiotics", "Hormonal therapy", "Isotretinoin"],
    riskFactors: ["Hormonal changes", "Genetics", "Stress", "Diet", "Oily cosmetics"],
    prevalence: "Affects 85% of teens and young adults",
    imageUrl: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&q=80",
  },
  {
    id: "type2-diabetes",
    name: "Type 2 Diabetes",
    category: "Metabolic",
    description:
      "A chronic condition that affects the way the body processes blood sugar (glucose). The body either resists the effects of insulin or does not produce enough.",
    symptoms: ["Increased thirst", "Frequent urination", "Increased hunger", "Fatigue", "Blurred vision", "Slow-healing wounds"],
    treatments: ["Metformin", "Insulin therapy", "GLP-1 agonists", "Diet management", "Exercise"],
    riskFactors: ["Obesity", "Sedentary lifestyle", "Family history", "Age over 45", "High blood pressure"],
    prevalence: "Affects 37.3 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1593491034932-844ab981ed7c?w=400&q=80",
  },
  {
    id: "hypertension",
    name: "Hypertension (High Blood Pressure)",
    category: "Cardiovascular",
    description:
      "A common condition where the force of blood against artery walls is consistently too high, increasing the risk of heart disease and stroke.",
    symptoms: ["Often asymptomatic", "Headaches", "Shortness of breath", "Nosebleeds", "Dizziness", "Chest pain"],
    treatments: ["ACE inhibitors", "Diuretics", "Beta-blockers", "Calcium channel blockers", "Lifestyle changes"],
    riskFactors: ["Obesity", "High salt intake", "Stress", "Family history", "Sedentary lifestyle"],
    prevalence: "Affects 1.28 billion adults worldwide",
    imageUrl: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&q=80",
  },
  {
    id: "coronary-artery-disease",
    name: "Coronary Artery Disease",
    category: "Cardiovascular",
    description:
      "The most common type of heart disease, caused by plaque buildup in the coronary arteries, reducing blood flow to the heart.",
    symptoms: ["Chest pain (angina)", "Shortness of breath", "Fatigue", "Heart attack", "Dizziness", "Nausea"],
    treatments: ["Statins", "Aspirin", "Beta-blockers", "Angioplasty", "Bypass surgery"],
    riskFactors: ["High cholesterol", "Hypertension", "Diabetes", "Smoking", "Obesity"],
    prevalence: "Leading cause of death globally",
    imageUrl: "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=400&q=80",
  },
  {
    id: "asthma",
    name: "Asthma",
    category: "Respiratory",
    description:
      "A chronic disease that inflames and narrows the airways, causing wheezing, shortness of breath, chest tightness, and coughing.",
    symptoms: ["Wheezing", "Shortness of breath", "Chest tightness", "Coughing", "Difficulty breathing at night", "Fatigue"],
    treatments: ["Inhaled corticosteroids", "Bronchodilators", "Leukotriene modifiers", "Allergy medications", "Biologic therapy"],
    riskFactors: ["Allergies", "Family history", "Respiratory infections", "Air pollution", "Obesity"],
    prevalence: "Affects 262 million people worldwide",
    imageUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&q=80",
  },
  {
    id: "depression",
    name: "Major Depressive Disorder",
    category: "Mental Health",
    description:
      "A mood disorder that causes persistent feelings of sadness and loss of interest, affecting how you feel, think, and handle daily activities.",
    symptoms: ["Persistent sadness", "Loss of interest", "Fatigue", "Sleep changes", "Appetite changes", "Difficulty concentrating"],
    treatments: ["SSRIs", "Psychotherapy (CBT)", "SNRIs", "Exercise", "Mindfulness"],
    riskFactors: ["Family history", "Trauma", "Chronic illness", "Substance abuse", "Social isolation"],
    prevalence: "Affects 280 million people globally",
    imageUrl: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=400&q=80",
  },
  {
    id: "anxiety",
    name: "Generalized Anxiety Disorder",
    category: "Mental Health",
    description:
      "A condition characterized by persistent and excessive worry about various aspects of life, often disproportionate to the actual situation.",
    symptoms: ["Excessive worry", "Restlessness", "Fatigue", "Difficulty concentrating", "Muscle tension", "Sleep disturbance"],
    treatments: ["CBT", "SSRIs", "Buspirone", "Relaxation techniques", "Mindfulness", "Exercise"],
    riskFactors: ["Family history", "Traumatic events", "Chronic stress", "Substance abuse", "Other mental health disorders"],
    prevalence: "Affects 6.8 million adults in the U.S.",
    imageUrl: "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=400&q=80",
  },
  {
    id: "rheumatoid-arthritis",
    name: "Rheumatoid Arthritis",
    category: "Autoimmune",
    description:
      "An autoimmune disease that causes chronic inflammation of the joints, leading to pain, swelling, stiffness, and potential joint damage.",
    symptoms: ["Joint pain", "Swelling", "Stiffness", "Fatigue", "Fever", "Weight loss"],
    treatments: ["DMARDs", "Biologics", "Corticosteroids", "Physical therapy", "Surgery"],
    riskFactors: ["Family history", "Female sex", "Smoking", "Obesity", "Age 40-60"],
    prevalence: "Affects 1.3 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80",
  },
  {
    id: "lupus",
    name: "Systemic Lupus Erythematosus (Lupus)",
    category: "Autoimmune",
    description:
      "A chronic autoimmune disease where the immune system attacks its own tissues, potentially affecting joints, skin, kidneys, blood cells, brain, heart, and lungs.",
    symptoms: ["Butterfly rash", "Joint pain", "Fatigue", "Fever", "Skin lesions", "Kidney problems"],
    treatments: ["NSAIDs", "Antimalarials", "Corticosteroids", "Immunosuppressants", "Biologics"],
    riskFactors: ["Female sex", "Age 15-45", "Family history", "African/Asian descent", "UV exposure"],
    prevalence: "Affects 1.5 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80",
  },
  {
    id: "celiac",
    name: "Celiac Disease",
    category: "Gastrointestinal",
    description:
      "An immune reaction to eating gluten that damages the small intestine lining, interfering with nutrient absorption.",
    symptoms: ["Diarrhea", "Bloating", "Gas", "Fatigue", "Weight loss", "Anemia"],
    treatments: ["Strict gluten-free diet", "Vitamin supplements", "Corticosteroids (refractory cases)", "Monitoring"],
    riskFactors: ["Family history", "Type 1 diabetes", "Autoimmune disorders", "Down syndrome"],
    prevalence: "Affects 1% of the global population",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80",
  },
  {
    id: "osteoarthritis",
    name: "Osteoarthritis",
    category: "Musculoskeletal",
    description:
      "The most common form of arthritis, occurring when the protective cartilage on the ends of bones wears down over time.",
    symptoms: ["Joint pain", "Stiffness", "Tenderness", "Loss of flexibility", "Grating sensation", "Bone spurs"],
    treatments: ["Acetaminophen", "NSAIDs", "Physical therapy", "Joint replacement", "Cortisone injections"],
    riskFactors: ["Older age", "Obesity", "Joint injuries", "Genetics", "Bone deformities"],
    prevalence: "Affects 32.5 million adults in the U.S.",
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80",
  },
  {
    id: "chronic-kidney-disease",
    name: "Chronic Kidney Disease",
    category: "Metabolic",
    description:
      "A gradual loss of kidney function over time, affecting the body's ability to filter waste and excess fluids from the blood.",
    symptoms: ["Fatigue", "Swollen ankles", "Nausea", "Decreased urination", "Shortness of breath", "Confusion"],
    treatments: ["Blood pressure management", "Dialysis", "Kidney transplant", "Dietary changes", "Medications"],
    riskFactors: ["Diabetes", "Hypertension", "Heart disease", "Obesity", "Family history"],
    prevalence: "Affects 37 million Americans",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80",
  },
  {
    id: "allergic-rhinitis",
    name: "Allergic Rhinitis (Hay Fever)",
    category: "Immunology",
    description:
      "An allergic response causing cold-like symptoms such as runny nose, itchy eyes, congestion, and sneezing, triggered by allergens.",
    symptoms: ["Sneezing", "Runny nose", "Itchy eyes", "Congestion", "Watery eyes", "Postnasal drip"],
    treatments: ["Antihistamines", "Nasal corticosteroids", "Decongestants", "Allergy shots", "Avoidance"],
    riskFactors: ["Family history of allergies", "Asthma", "Eczema", "Environmental exposures"],
    prevalence: "Affects 400 million people worldwide",
    imageUrl: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&q=80",
  },
  {
    id: "anemia",
    name: "Iron Deficiency Anemia",
    category: "Hematology",
    description:
      "A condition in which the blood lacks enough healthy red blood cells due to insufficient iron, leading to fatigue and weakness.",
    symptoms: ["Fatigue", "Weakness", "Pale skin", "Dizziness", "Cold hands/feet", "Brittle nails"],
    treatments: ["Iron supplements", "Dietary changes", "IV iron", "Treating underlying cause", "Blood transfusion (severe)"],
    riskFactors: ["Heavy menstruation", "Poor diet", "Pregnancy", "GI bleeding", "Vegetarian diet"],
    prevalence: "Affects 1.62 billion people globally",
    imageUrl: "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&q=80",
  },
  {
    id: "copd",
    name: "Chronic Obstructive Pulmonary Disease",
    category: "Respiratory",
    description:
      "A group of progressive lung diseases, including emphysema and chronic bronchitis, that obstruct airflow and make breathing difficult.",
    symptoms: ["Chronic cough", "Shortness of breath", "Wheezing", "Chest tightness", "Mucus production", "Fatigue"],
    treatments: ["Bronchodilators", "Inhaled steroids", "Oxygen therapy", "Pulmonary rehabilitation", "Surgery"],
    riskFactors: ["Smoking", "Air pollution", "Occupational dust", "Genetics", "Asthma history"],
    prevalence: "Affects 380 million people worldwide",
    imageUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&q=80",
  },
  {
    id: "urinary-tract-infection",
    name: "Urinary Tract Infection (UTI)",
    category: "Infectious",
    description:
      "An infection in any part of the urinary system, most commonly affecting the bladder and urethra. More common in women.",
    symptoms: ["Burning urination", "Frequent urination", "Cloudy urine", "Pelvic pain", "Strong urine odor", "Blood in urine"],
    treatments: ["Antibiotics", "Increased fluid intake", "Pain relievers", "Cranberry products", "Preventive antibiotics"],
    riskFactors: ["Female anatomy", "Sexual activity", "Menopause", "Urinary tract abnormalities", "Immune suppression"],
    prevalence: "150 million cases per year globally",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80",
  },
  {
    id: "fibromyalgia",
    name: "Fibromyalgia",
    category: "Musculoskeletal",
    description:
      "A condition characterized by widespread musculoskeletal pain accompanied by fatigue, sleep, memory, and mood issues.",
    symptoms: ["Widespread pain", "Fatigue", "Cognitive difficulty", "Sleep problems", "Headaches", "Depression"],
    treatments: ["Pain relievers", "Antidepressants", "Anti-seizure drugs", "Physical therapy", "Stress management"],
    riskFactors: ["Female sex", "Family history", "Lupus or RA", "PTSD", "Repetitive injuries"],
    prevalence: "Affects 4 million U.S. adults",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80",
  },
  {
    id: "hypothyroidism",
    name: "Hypothyroidism",
    category: "Metabolic",
    description:
      "A condition where the thyroid gland does not produce enough thyroid hormones, leading to slowed metabolism and various symptoms.",
    symptoms: ["Fatigue", "Weight gain", "Cold sensitivity", "Dry skin", "Constipation", "Depression"],
    treatments: ["Levothyroxine", "Regular monitoring", "Dietary adjustments", "Selenium supplements"],
    riskFactors: ["Female sex", "Age over 60", "Autoimmune disease", "Family history", "Radiation therapy"],
    prevalence: "Affects 5% of the U.S. population",
    imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80",
  },
];

export function getAllDiseases(): Disease[] {
  return DISEASES;
}

export function getPopularDiseases(): Disease[] {
  return DISEASES;
}

export function getDiseaseById(id: string): Disease | undefined {
  return DISEASES.find((d) => d.id === id);
}

export function searchDiseases(query: string): Disease[] {
  const lower = query.toLowerCase();
  return DISEASES.filter(
    (d) =>
      d.name.toLowerCase().includes(lower) ||
      d.category.toLowerCase().includes(lower) ||
      d.symptoms.some((s) => s.toLowerCase().includes(lower)) ||
      d.description.toLowerCase().includes(lower)
  );
}
