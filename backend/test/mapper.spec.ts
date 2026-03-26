import { describe, expect, it } from "vitest";
import { mapRow } from "../src/ingestion/mapper.js";

describe("mapper", () => {
  it("maps sales order header into SalesOrder + Customer and relation", () => {
    const out = mapRow("sales_order_headers", {
      salesOrder: "740506",
      soldToParty: "310000108"
    });

    const labels = out.nodes.map((n) => n.label);
    expect(labels).toContain("SalesOrder");
    expect(labels).toContain("Customer");
    expect(out.relationships.some((r) => r.type === "ORDERED_BY_CUSTOMER")).toBe(true);
  });

  it("maps billing document item with delivery reference", () => {
    const out = mapRow("billing_document_items", {
      billingDocument: "90504298",
      billingDocumentItem: "10",
      referenceSdDocument: "80738109",
      referenceSdDocumentItem: "10",
      material: "MAT-1"
    });

    expect(out.nodes.some((n) => n.label === "BillingDocumentItem")).toBe(true);
    expect(out.relationships.some((r) => r.type === "REFERENCES_DELIVERY")).toBe(true);
    expect(out.relationships.some((r) => r.type === "FOR_PRODUCT")).toBe(true);
  });
});
