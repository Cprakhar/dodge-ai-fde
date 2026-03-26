import type { Driver, Session } from "neo4j-driver";
import neo4j from "neo4j-driver";
import type { GraphNode, GraphRelation } from "../types.js";

export class GraphRepository {
  public constructor(private readonly driver: Driver) {}

  private sanitizeValue(value: unknown): unknown {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitizeValue(entry));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private sanitizeProperties(
    properties: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      sanitized[key] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  private openSession(): Session {
    return this.driver.session();
  }

  public async ensureConstraints(): Promise<void> {
    const session = this.openSession();

    try {
      const labels = [
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

      for (const label of labels) {
        await session.run(
          `CREATE CONSTRAINT ${label.toLowerCase()}_id_unique IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`
        );
      }
    } finally {
      await session.close();
    }
  }

  public async upsertNode(node: GraphNode): Promise<void> {
    const session = this.openSession();

    try {
      await session.run(
        `MERGE (n:${node.label} {id: $id}) SET n += $properties`,
        {
          id: node.id,
          properties: this.sanitizeProperties(node.properties)
        }
      );
    } finally {
      await session.close();
    }
  }

  public async upsertRelationship(relation: GraphRelation): Promise<void> {
    const session = this.openSession();

    try {
      await session.run(
        `
        MATCH (a:${relation.fromLabel} {id: $fromId})
        MATCH (b:${relation.toLabel} {id: $toId})
        MERGE (a)-[r:${relation.type}]->(b)
        SET r += $properties
        `,
        {
          fromId: relation.fromId,
          toId: relation.toId,
          properties: this.sanitizeProperties(relation.properties ?? {})
        }
      );
    } finally {
      await session.close();
    }
  }

  public async clearGraph(): Promise<void> {
    const session = this.openSession();

    try {
      await session.run("MATCH (n) DETACH DELETE n");
    } finally {
      await session.close();
    }
  }

  public async runCypher(
    query: string,
    params: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>[]> {
    const session = this.openSession();

    try {
      const result = await session.run(query, params);
      return result.records.map((record) => {
        const row: Record<string, unknown> = {};

        for (const key of record.keys) {
          const keyName = String(key);
          const value = record.get(key as string);
          row[keyName] = neo4j.isInt(value) ? value.toNumber() : value;
        }

        return row;
      });
    } finally {
      await session.close();
    }
  }

  public async getNodeAndNeighbors(nodeId: string): Promise<Record<string, unknown>[]> {
    const query = `
      MATCH (n {id: $nodeId})
      OPTIONAL MATCH (n)-[r]-(m)
      RETURN n, collect({ relType: type(r), neighbor: m }) AS neighbors
    `;

    return this.runCypher(query, { nodeId });
  }

  public async getFullGraph(): Promise<{
    nodes: Array<{
      id: string;
      label: string;
      properties: Record<string, unknown>;
      degree: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  }> {
    const nodeRows = await this.runCypher(`
      MATCH (n)
      WITH n, COUNT { (n)--() } AS degree
      RETURN n.id AS id, head(labels(n)) AS label, properties(n) AS properties, degree
    `);

    const edgeRows = await this.runCypher(`
      MATCH (a)-[r]->(b)
      RETURN a.id AS source, b.id AS target, type(r) AS type
    `);

    const nodes = nodeRows
      .filter((row) => typeof row.id === "string")
      .map((row) => ({
        id: String(row.id),
        label: String(row.label ?? "Node"),
        properties:
          typeof row.properties === "object" && row.properties !== null
            ? (row.properties as Record<string, unknown>)
            : {},
        degree: typeof row.degree === "number" ? row.degree : 0
      }));

    const edges = edgeRows
      .filter(
        (row) => typeof row.source === "string" && typeof row.target === "string"
      )
      .map((row) => ({
        source: String(row.source),
        target: String(row.target),
        type: String(row.type ?? "RELATED_TO")
      }));

    return { nodes, edges };
  }
}
