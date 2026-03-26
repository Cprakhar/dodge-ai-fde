export interface TemplateMatch {
  cypher: string;
  params: Record<string, unknown>;
}

function extractBillingDoc(question: string): string | null {
  const match = question.match(/billing\s+document\s+([0-9]+)/i);
  return match?.[1] ?? null;
}

export function resolveTemplate(question: string): TemplateMatch | null {
  const q = question.toLowerCase();

  if (
    q.includes("highest number of billing") ||
    (q.includes("products") && q.includes("billing document"))
  ) {
    return {
      cypher: `
        MATCH (b:BillingDocument)-[:HAS_ITEM]->(:BillingDocumentItem)-[:FOR_PRODUCT]->(p:Product)
        WITH p, count(DISTINCT b.id) AS billingCount
        RETURN p.id AS productId, billingCount
        ORDER BY billingCount DESC
        LIMIT 10
      `,
      params: {}
    };
  }

  if (q.includes("broken") || q.includes("incomplete flow")) {
    return {
      cypher: `
        MATCH (so:SalesOrder)-[:HAS_ITEM]->(soi:SalesOrderItem)
        OPTIONAL MATCH (di:DeliveryItem)-[:REFERENCES_SALES_ORDER]->(soi)
        OPTIONAL MATCH (bdi:BillingDocumentItem)-[:REFERENCES_DELIVERY]->(di)
        WITH so.id AS salesOrderId,
             count(DISTINCT di.id) AS deliveries,
             count(DISTINCT bdi.id) AS billings
        WHERE (deliveries > 0 AND billings = 0) OR (deliveries = 0 AND billings > 0)
        RETURN salesOrderId, deliveries, billings
        ORDER BY salesOrderId
        LIMIT 100
      `,
      params: {}
    };
  }

  if (q.includes("trace") && q.includes("billing")) {
    const billing = extractBillingDoc(question);
    if (billing !== null) {
      return {
        cypher: `
          MATCH (bd:BillingDocument {id: $billingId})
          OPTIONAL MATCH (bd)-[:HAS_ITEM]->(bdi:BillingDocumentItem)
          OPTIONAL MATCH (bdi)-[:REFERENCES_DELIVERY]->(di:DeliveryItem)
          OPTIONAL MATCH (di)-[:REFERENCES_SALES_ORDER]->(soi:SalesOrderItem)
          OPTIONAL MATCH (bd)-[:BILLED_BY]->(je:JournalEntry)
          RETURN bd.id AS billingDocumentId,
                 collect(DISTINCT bdi.id) AS billingItems,
                 collect(DISTINCT di.id) AS deliveryItems,
                 collect(DISTINCT soi.id) AS salesOrderItems,
                 collect(DISTINCT je.id) AS journalEntries
        `,
        params: { billingId: `billingdocument:${billing}` }
      };
    }
  }

  return null;
}
