import Groq from "groq-sdk";
import { env } from "../config/env.js";
import { GraphRepository } from "../graph/repository.js";
import {
  evaluateDomainQuestion,
  REFUSAL_TEXT
} from "../guardrails/domainGuard.js";
import type { QueryResult } from "../types.js";
import { resolveTemplate } from "./queryTemplates.js";

interface LlmCypherResponse {
  cypher: string;
  explanation: string;
}

export class QueryService {
  private readonly groq: Groq | null;

  public constructor(private readonly repository: GraphRepository) {
    this.groq = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;
  }

  private async generateCypherWithLlm(question: string): Promise<string> {
    if (this.groq === null) {
      return "MATCH (n) RETURN n.id AS id LIMIT 25";
    }

    const schemaPrompt = `
You are generating Cypher for a Neo4j graph with these node labels:
SalesOrder, SalesOrderItem, Delivery, DeliveryItem, BillingDocument, BillingDocumentItem,
JournalEntry, Payment, Customer, Product, Plant, Address.

Relationships:
HAS_ITEM, REFERENCES_SALES_ORDER, REFERENCES_DELIVERY, REFERENCES_BILLING_DOCUMENT,
BILLED_BY, PAID_BY, ORDERED_BY_CUSTOMER, FOR_PRODUCT, SHIPPED_FROM_PLANT, HAS_ADDRESS.

Rules:
- Return valid Cypher only.
- Max 100 rows.
- Never mutate data.
- If uncertain, return a broad read-only query.
`;

    const completion = await this.groq.chat.completions.create({
      model: env.GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: schemaPrompt
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.1,
      max_tokens: 400
    });

    return completion.choices[0]?.message?.content?.trim() ?? "MATCH (n) RETURN n LIMIT 25";
  }

  private extractReferencedNodeIds(rows: Record<string, unknown>[]): string[] {
    const ids = new Set<string>();

    for (const row of rows) {
      for (const value of Object.values(row)) {
        if (typeof value === "string" && value.includes(":")) {
          ids.add(value);
        }

        if (Array.isArray(value)) {
          for (const nested of value) {
            if (typeof nested === "string" && nested.includes(":")) {
              ids.add(nested);
            }
          }
        }
      }
    }

    return Array.from(ids);
  }

  private composeGroundedAnswer(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) {
      return "No matching records were found in the dataset.";
    }

    const preview = rows.slice(0, 3);
    return `Found ${rows.length} row(s). Sample: ${JSON.stringify(preview)}`;
  }

  public async executeQuestion(question: string): Promise<QueryResult> {
    const guardrailDecision = evaluateDomainQuestion(question);

    if (!guardrailDecision.allowed) {
      return {
        generatedQuery: "",
        rows: [],
        answer: REFUSAL_TEXT,
        guardrail: guardrailDecision,
        referencedNodeIds: []
      };
    }

    const template = resolveTemplate(question);
    const generatedQuery =
      template?.cypher ?? (await this.generateCypherWithLlm(question));
    const rows = await this.repository.runCypher(generatedQuery, template?.params ?? {});

    return {
      generatedQuery,
      rows,
      answer: this.composeGroundedAnswer(rows),
      guardrail: guardrailDecision,
      referencedNodeIds: this.extractReferencedNodeIds(rows)
    };
  }
}
