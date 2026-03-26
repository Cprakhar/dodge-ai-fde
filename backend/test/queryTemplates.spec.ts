import { describe, expect, it } from "vitest";
import { resolveTemplate } from "../src/query/queryTemplates.js";

describe("query templates", () => {
  it("resolves top products by billing docs template", () => {
    const out = resolveTemplate(
      "Which products are associated with the highest number of billing documents?"
    );

    expect(out).not.toBeNull();
    expect(out?.cypher).toContain("MATCH (b:BillingDocument)");
  });

  it("resolves billing trace template with billing id", () => {
    const out = resolveTemplate(
      "Trace the full flow of billing document 90504248"
    );

    expect(out).not.toBeNull();
    expect(out?.params.billingId).toBe("billingdocument:90504248");
  });
});
