const DOMAIN_TERMS = [
  "order",
  "sales",
  "delivery",
  "billing",
  "invoice",
  "payment",
  "journal",
  "customer",
  "product",
  "plant",
  "sap",
  "o2c",
  "graph",
  "document"
];

export interface GuardrailDecision {
  allowed: boolean;
  reason: string;
}

export const REFUSAL_TEXT =
  "This system is designed to answer questions related to the provided dataset only.";

export function evaluateDomainQuestion(question: string): GuardrailDecision {
  const normalized = question.toLowerCase();
  const hasDomainTerm = DOMAIN_TERMS.some((term) => normalized.includes(term));

  if (!hasDomainTerm) {
    return {
      allowed: false,
      reason: REFUSAL_TEXT
    };
  }

  return {
    allowed: true,
    reason: "in-domain"
  };
}
