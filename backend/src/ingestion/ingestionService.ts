import path from "node:path";
import { env } from "../config/env.js";
import { GraphRepository } from "../graph/repository.js";
import type { IngestStats, NodeLabel, RelationType } from "../types.js";
import { listDatasetFiles, readJsonlRows } from "./jsonlReader.js";
import { mapRow } from "./mapper.js";

const NODE_LABELS: NodeLabel[] = [
  "SalesOrder",
  "SalesOrderItem",
  "Delivery",
  "DeliveryItem",
  "BillingDocument",
  "BillingDocumentItem",
  "JournalEntry",
  "Payment",
  "Customer",
  "Product",
  "Plant",
  "Address"
];

const REL_TYPES: RelationType[] = [
  "HAS_ITEM",
  "REFERENCES_SALES_ORDER",
  "REFERENCES_DELIVERY",
  "REFERENCES_BILLING_DOCUMENT",
  "BILLED_BY",
  "PAID_BY",
  "ORDERED_BY_CUSTOMER",
  "FOR_PRODUCT",
  "SHIPPED_FROM_PLANT",
  "HAS_ADDRESS"
];

function initializeStats(): IngestStats {
  const nodes = Object.fromEntries(NODE_LABELS.map((k) => [k, 0])) as Record<
    NodeLabel,
    number
  >;
  const relationships = Object.fromEntries(
    REL_TYPES.map((k) => [k, 0])
  ) as Record<RelationType, number>;

  return {
    nodes,
    relationships,
    warnings: []
  };
}

export class IngestionService {
  public constructor(private readonly repository: GraphRepository) {}

  public async ingestAll(options?: { reset?: boolean }): Promise<IngestStats> {
    const stats = initializeStats();
    const datasetRoot = path.resolve(process.cwd(), env.DATASET_ROOT);

    if (options?.reset) {
      await this.repository.clearGraph();
    }

    await this.repository.ensureConstraints();

    const files = await listDatasetFiles(datasetRoot);
    for (const file of files) {
      for await (const row of readJsonlRows(file.path)) {
        const mapped = mapRow(file.folder, row);

        if (mapped.warnings.length > 0) {
          stats.warnings.push(...mapped.warnings);
        }

        for (const node of mapped.nodes) {
          await this.repository.upsertNode(node);
          stats.nodes[node.label] += 1;
        }

        for (const relation of mapped.relationships) {
          await this.repository.upsertRelationship(relation);
          stats.relationships[relation.type] += 1;
        }
      }
    }

    return stats;
  }
}
