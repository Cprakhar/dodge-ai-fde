import type { GraphNode, GraphRelation, NodeLabel } from "../types.js";

export interface MapOutput {
  nodes: GraphNode[];
  relationships: GraphRelation[];
  warnings: string[];
}

const EMPTY_OUTPUT: MapOutput = { nodes: [], relationships: [], warnings: [] };

function asString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function hasValue(value: unknown): boolean {
  return asString(value).length > 0;
}

function nodeId(label: NodeLabel, rawId: string): string {
  return `${label.toLowerCase()}:${rawId}`;
}

function pickId(
  row: Record<string, unknown>,
  keys: string[],
  warningContext: string
): { value: string; warning?: string } {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value.length > 0) {
      return { value };
    }
  }

  return {
    value: "",
    warning: `Missing keys [${keys.join(", ")}] while mapping ${warningContext}`
  };
}

export function mapRow(folder: string, row: Record<string, unknown>): MapOutput {
  switch (folder) {
    case "sales_order_headers": {
      const salesOrder = asString(row.salesOrder);
      if (salesOrder.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: ["Skipped sales_order_headers row: missing salesOrder"]
        };
      }

      const customer = asString(row.soldToParty);
      const salesOrderId = nodeId("SalesOrder", salesOrder);
      const nodes: GraphNode[] = [
        {
          label: "SalesOrder",
          id: salesOrderId,
          properties: {
            ...row,
            id: salesOrderId,
            sourceId: salesOrder
          }
        }
      ];

      const relationships: GraphRelation[] = [];

      if (customer.length > 0) {
        const customerId = nodeId("Customer", customer);
        nodes.push({
          label: "Customer",
          id: customerId,
          properties: {
            id: customerId,
            sourceId: customer
          }
        });
        relationships.push({
          fromLabel: "SalesOrder",
          fromId: salesOrderId,
          toLabel: "Customer",
          toId: customerId,
          type: "ORDERED_BY_CUSTOMER"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "sales_order_items": {
      const salesOrder = asString(row.salesOrder);
      const salesOrderItem = asString(row.salesOrderItem || row.referenceSdDocumentItem);

      if (salesOrder.length === 0 || salesOrderItem.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped sales_order_items row: missing salesOrder or salesOrderItem"
          ]
        };
      }

      const salesOrderId = nodeId("SalesOrder", salesOrder);
      const itemId = nodeId("SalesOrderItem", `${salesOrder}-${salesOrderItem}`);
      const nodes: GraphNode[] = [
        {
          label: "SalesOrderItem",
          id: itemId,
          properties: {
            ...row,
            id: itemId,
            sourceId: `${salesOrder}-${salesOrderItem}`
          }
        }
      ];
      const relationships: GraphRelation[] = [
        {
          fromLabel: "SalesOrder",
          fromId: salesOrderId,
          toLabel: "SalesOrderItem",
          toId: itemId,
          type: "HAS_ITEM"
        }
      ];

      const material = asString(row.material);
      if (material.length > 0) {
        const productId = nodeId("Product", material);
        nodes.push({
          label: "Product",
          id: productId,
          properties: {
            id: productId,
            sourceId: material
          }
        });
        relationships.push({
          fromLabel: "SalesOrderItem",
          fromId: itemId,
          toLabel: "Product",
          toId: productId,
          type: "FOR_PRODUCT"
        });
      }

      const plant = asString(row.productionPlant);
      if (plant.length > 0) {
        const plantId = nodeId("Plant", plant);
        nodes.push({
          label: "Plant",
          id: plantId,
          properties: {
            id: plantId,
            sourceId: plant
          }
        });
        relationships.push({
          fromLabel: "SalesOrderItem",
          fromId: itemId,
          toLabel: "Plant",
          toId: plantId,
          type: "SHIPPED_FROM_PLANT"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "outbound_delivery_headers": {
      const deliveryDocument = asString(row.deliveryDocument);
      if (deliveryDocument.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped outbound_delivery_headers row: missing deliveryDocument"
          ]
        };
      }

      const deliveryId = nodeId("Delivery", deliveryDocument);
      return {
        nodes: [
          {
            label: "Delivery",
            id: deliveryId,
            properties: {
              ...row,
              id: deliveryId,
              sourceId: deliveryDocument
            }
          }
        ],
        relationships: [],
        warnings: []
      };
    }

    case "outbound_delivery_items": {
      const deliveryDocument = asString(row.deliveryDocument);
      const deliveryDocumentItem = asString(row.deliveryDocumentItem);

      if (deliveryDocument.length === 0 || deliveryDocumentItem.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped outbound_delivery_items row: missing deliveryDocument or deliveryDocumentItem"
          ]
        };
      }

      const deliveryId = nodeId("Delivery", deliveryDocument);
      const itemId = nodeId(
        "DeliveryItem",
        `${deliveryDocument}-${deliveryDocumentItem}`
      );
      const nodes: GraphNode[] = [
        {
          label: "DeliveryItem",
          id: itemId,
          properties: {
            ...row,
            id: itemId,
            sourceId: `${deliveryDocument}-${deliveryDocumentItem}`
          }
        }
      ];
      const relationships: GraphRelation[] = [
        {
          fromLabel: "Delivery",
          fromId: deliveryId,
          toLabel: "DeliveryItem",
          toId: itemId,
          type: "HAS_ITEM"
        }
      ];

      const refOrder = asString(row.referenceSdDocument);
      const refOrderItem = asString(row.referenceSdDocumentItem);
      if (refOrder.length > 0 && refOrderItem.length > 0) {
        relationships.push({
          fromLabel: "DeliveryItem",
          fromId: itemId,
          toLabel: "SalesOrderItem",
          toId: nodeId("SalesOrderItem", `${refOrder}-${refOrderItem}`),
          type: "REFERENCES_SALES_ORDER"
        });
      }

      const plant = asString(row.plant);
      if (plant.length > 0) {
        const plantId = nodeId("Plant", plant);
        nodes.push({
          label: "Plant",
          id: plantId,
          properties: {
            id: plantId,
            sourceId: plant
          }
        });
        relationships.push({
          fromLabel: "DeliveryItem",
          fromId: itemId,
          toLabel: "Plant",
          toId: plantId,
          type: "SHIPPED_FROM_PLANT"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "billing_document_headers": {
      const billingDocument = asString(row.billingDocument);
      if (billingDocument.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped billing_document_headers row: missing billingDocument"
          ]
        };
      }

      const billingId = nodeId("BillingDocument", billingDocument);
      const nodes: GraphNode[] = [
        {
          label: "BillingDocument",
          id: billingId,
          properties: {
            ...row,
            id: billingId,
            sourceId: billingDocument
          }
        }
      ];
      const relationships: GraphRelation[] = [];

      const accountingDocument = asString(row.accountingDocument);
      const companyCode = asString(row.companyCode);
      const fiscalYear = asString(row.fiscalYear);
      if (
        accountingDocument.length > 0 &&
        companyCode.length > 0 &&
        fiscalYear.length > 0
      ) {
        const journalId = nodeId(
          "JournalEntry",
          `${companyCode}-${fiscalYear}-${accountingDocument}`
        );
        nodes.push({
          label: "JournalEntry",
          id: journalId,
          properties: {
            id: journalId,
            sourceId: `${companyCode}-${fiscalYear}-${accountingDocument}`,
            companyCode,
            fiscalYear,
            accountingDocument
          }
        });
        relationships.push({
          fromLabel: "BillingDocument",
          fromId: billingId,
          toLabel: "JournalEntry",
          toId: journalId,
          type: "BILLED_BY"
        });
      }

      const customer = asString(row.soldToParty);
      if (customer.length > 0) {
        const customerId = nodeId("Customer", customer);
        nodes.push({
          label: "Customer",
          id: customerId,
          properties: {
            id: customerId,
            sourceId: customer
          }
        });
        relationships.push({
          fromLabel: "BillingDocument",
          fromId: billingId,
          toLabel: "Customer",
          toId: customerId,
          type: "ORDERED_BY_CUSTOMER"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "billing_document_items": {
      const billingDocument = asString(row.billingDocument);
      const billingDocumentItem = asString(row.billingDocumentItem);
      if (billingDocument.length === 0 || billingDocumentItem.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped billing_document_items row: missing billingDocument or billingDocumentItem"
          ]
        };
      }

      const billingId = nodeId("BillingDocument", billingDocument);
      const itemId = nodeId(
        "BillingDocumentItem",
        `${billingDocument}-${billingDocumentItem}`
      );

      const nodes: GraphNode[] = [
        {
          label: "BillingDocumentItem",
          id: itemId,
          properties: {
            ...row,
            id: itemId,
            sourceId: `${billingDocument}-${billingDocumentItem}`
          }
        }
      ];
      const relationships: GraphRelation[] = [
        {
          fromLabel: "BillingDocument",
          fromId: billingId,
          toLabel: "BillingDocumentItem",
          toId: itemId,
          type: "HAS_ITEM"
        }
      ];

      const refDelivery = asString(row.referenceSdDocument);
      const refDeliveryItem = asString(row.referenceSdDocumentItem);
      if (refDelivery.length > 0 && refDeliveryItem.length > 0) {
        relationships.push({
          fromLabel: "BillingDocumentItem",
          fromId: itemId,
          toLabel: "DeliveryItem",
          toId: nodeId("DeliveryItem", `${refDelivery}-${refDeliveryItem}`),
          type: "REFERENCES_DELIVERY"
        });
      }

      const material = asString(row.material);
      if (material.length > 0) {
        const productId = nodeId("Product", material);
        nodes.push({
          label: "Product",
          id: productId,
          properties: {
            id: productId,
            sourceId: material
          }
        });
        relationships.push({
          fromLabel: "BillingDocumentItem",
          fromId: itemId,
          toLabel: "Product",
          toId: productId,
          type: "FOR_PRODUCT"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "journal_entry_items_accounts_receivable": {
      const accountingDocument = asString(row.accountingDocument);
      const companyCode = asString(row.companyCode);
      const fiscalYear = asString(row.fiscalYear);
      if (
        accountingDocument.length === 0 ||
        companyCode.length === 0 ||
        fiscalYear.length === 0
      ) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped journal_entry row: missing accountingDocument/companyCode/fiscalYear"
          ]
        };
      }

      const journalId = nodeId(
        "JournalEntry",
        `${companyCode}-${fiscalYear}-${accountingDocument}`
      );
      const nodes: GraphNode[] = [
        {
          label: "JournalEntry",
          id: journalId,
          properties: {
            ...row,
            id: journalId,
            sourceId: `${companyCode}-${fiscalYear}-${accountingDocument}`
          }
        }
      ];
      const relationships: GraphRelation[] = [];

      const refBilling = asString(row.referenceDocument);
      if (refBilling.length > 0) {
        relationships.push({
          fromLabel: "JournalEntry",
          fromId: journalId,
          toLabel: "BillingDocument",
          toId: nodeId("BillingDocument", refBilling),
          type: "REFERENCES_BILLING_DOCUMENT"
        });
      }

      const customer = asString(row.customer);
      if (customer.length > 0) {
        const customerId = nodeId("Customer", customer);
        nodes.push({
          label: "Customer",
          id: customerId,
          properties: {
            id: customerId,
            sourceId: customer
          }
        });
        relationships.push({
          fromLabel: "JournalEntry",
          fromId: journalId,
          toLabel: "Customer",
          toId: customerId,
          type: "ORDERED_BY_CUSTOMER"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "payments_accounts_receivable": {
      const paymentDoc = pickId(
        row,
        ["clearingAccountingDocument", "accountingDocument"],
        "payments_accounts_receivable"
      );
      const paymentItem = asString(row.accountingDocumentItem) || "0";

      if (paymentDoc.value.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [paymentDoc.warning ?? "Skipped payment row"]
        };
      }

      const paymentId = nodeId("Payment", `${paymentDoc.value}-${paymentItem}`);
      const nodes: GraphNode[] = [
        {
          label: "Payment",
          id: paymentId,
          properties: {
            ...row,
            id: paymentId,
            sourceId: `${paymentDoc.value}-${paymentItem}`
          }
        }
      ];
      const relationships: GraphRelation[] = [];

      const customer = asString(row.customer);
      if (customer.length > 0) {
        const customerId = nodeId("Customer", customer);
        nodes.push({
          label: "Customer",
          id: customerId,
          properties: {
            id: customerId,
            sourceId: customer
          }
        });
        relationships.push({
          fromLabel: "Payment",
          fromId: paymentId,
          toLabel: "Customer",
          toId: customerId,
          type: "PAID_BY"
        });
      }

      const billing = asString(row.invoiceReference);
      if (billing.length > 0) {
        relationships.push({
          fromLabel: "Payment",
          fromId: paymentId,
          toLabel: "BillingDocument",
          toId: nodeId("BillingDocument", billing),
          type: "REFERENCES_BILLING_DOCUMENT"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    case "business_partners": {
      const customer = asString(row.customer || row.businessPartner);
      if (customer.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: ["Skipped business_partner row: missing customer/businessPartner"]
        };
      }

      const customerId = nodeId("Customer", customer);
      return {
        nodes: [
          {
            label: "Customer",
            id: customerId,
            properties: {
              ...row,
              id: customerId,
              sourceId: customer
            }
          }
        ],
        relationships: [],
        warnings: []
      };
    }

    case "business_partner_addresses": {
      const businessPartner = asString(row.businessPartner);
      const addressIdRaw = asString(row.addressId || row.addressUuid);
      if (businessPartner.length === 0 || addressIdRaw.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: [
            "Skipped business_partner_addresses row: missing businessPartner or addressId"
          ]
        };
      }

      const customerId = nodeId("Customer", businessPartner);
      const addressId = nodeId("Address", `${businessPartner}-${addressIdRaw}`);

      return {
        nodes: [
          {
            label: "Address",
            id: addressId,
            properties: {
              ...row,
              id: addressId,
              sourceId: `${businessPartner}-${addressIdRaw}`
            }
          }
        ],
        relationships: [
          {
            fromLabel: "Customer",
            fromId: customerId,
            toLabel: "Address",
            toId: addressId,
            type: "HAS_ADDRESS"
          }
        ],
        warnings: []
      };
    }

    case "products": {
      const product = asString(row.product);
      if (product.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: ["Skipped product row: missing product"]
        };
      }

      const productId = nodeId("Product", product);
      return {
        nodes: [
          {
            label: "Product",
            id: productId,
            properties: {
              ...row,
              id: productId,
              sourceId: product
            }
          }
        ],
        relationships: [],
        warnings: []
      };
    }

    case "plants": {
      const plant = asString(row.plant);
      if (plant.length === 0) {
        return {
          ...EMPTY_OUTPUT,
          warnings: ["Skipped plant row: missing plant"]
        };
      }

      const plantId = nodeId("Plant", plant);
      const nodes: GraphNode[] = [
        {
          label: "Plant",
          id: plantId,
          properties: {
            ...row,
            id: plantId,
            sourceId: plant
          }
        }
      ];
      const relationships: GraphRelation[] = [];

      const addressIdRaw = asString(row.addressId);
      if (addressIdRaw.length > 0) {
        const addressId = nodeId("Address", `plant-${addressIdRaw}`);
        nodes.push({
          label: "Address",
          id: addressId,
          properties: {
            id: addressId,
            sourceId: `plant-${addressIdRaw}`
          }
        });
        relationships.push({
          fromLabel: "Plant",
          fromId: plantId,
          toLabel: "Address",
          toId: addressId,
          type: "HAS_ADDRESS"
        });
      }

      return { nodes, relationships, warnings: [] };
    }

    default:
      return EMPTY_OUTPUT;
  }
}
