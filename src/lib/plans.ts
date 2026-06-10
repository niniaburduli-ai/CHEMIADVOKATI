export const PLAN_LIMITS = {
  free:     { consultations: 1,    docGeneration: 1,   docReview: 1  },
  standard: { consultations: 9,    docGeneration: 5,   docReview: 3  },
  premium:  { consultations: 9999, docGeneration: 9999, docReview: 99 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
