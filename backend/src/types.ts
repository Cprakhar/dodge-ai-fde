export type NodeLabel =
  | "SalesOrder"
  | "SalesOrderItem"
  | "Delivery"
  | "DeliveryItem"
  | "BillingDocument"
  | "BillingDocumentItem"
  | "JournalEntry"
  | "Payment"
  | "Customer"
  | "Product"
  | "Plant"
  | "Address";

export type RelationType =
  | "HAS_ITEM"
  | "REFERENCES_SALES_ORDER"
  | "REFERENCES_DELIVERY"
  | "REFERENCES_BILLING_DOCUMENT"
  | "BILLED_BY"
  | "PAID_BY"
  | "ORDERED_BY_CUSTOMER"
  | "FOR_PRODUCT"
  | "SHIPPED_FROM_PLANT"
  | "HAS_ADDRESS";

export interface GraphNode {
  label: NodeLabel;
  id: string;
  properties: Record<string, unknown>;
}

export interface GraphRelation {
  fromLabel: NodeLabel;
  fromId: string;
  toLabel: NodeLabel;
  toId: string;
  type: RelationType;
  properties?: Record<string, unknown>;
}

export interface IngestStats {
  nodes: Record<NodeLabel, number>;
  relationships: Record<RelationType, number>;
  warnings: string[];
}

export interface QueryResult {
  generatedQuery: string;
  rows: Record<string, unknown>[];
  answer: string;
  guardrail: {
    allowed: boolean;
    reason: string;
  };
  referencedNodeIds: string[];
}
