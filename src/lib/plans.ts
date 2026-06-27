export const PLAN_LIMITS = {
  free:     { consultations: 9,    docGeneration: 3,    docReview: 1  },
  standard: { consultations: 29,   docGeneration: 19,   docReview: 9  },
  premium:  { consultations: 9999, docGeneration: 9999, docReview: 99 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
