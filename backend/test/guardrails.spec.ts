import { describe, expect, it } from "vitest";
import { evaluateDomainQuestion, REFUSAL_TEXT } from "../src/guardrails/domainGuard.js";

describe("domain guardrail", () => {
  it("allows in-domain O2C question", () => {
    const result = evaluateDomainQuestion("Show sales orders with delivery issues");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("in-domain");
  });

  it("rejects out-of-domain prompt", () => {
    const result = evaluateDomainQuestion("Write me a poem about mountains");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(REFUSAL_TEXT);
  });
});
