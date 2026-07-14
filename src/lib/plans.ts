export const PLAN_LIMITS = {
  free:     { consultations: 9,    docGeneration: 1,    docReview: 1,  docTemplates: 20  },
  standard: { consultations: 29,   docGeneration: 9,    docReview: 9,  docTemplates: 50  },
  premium:  { consultations: 199,  docGeneration: 99,   docReview: 99, docTemplates: 200 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
