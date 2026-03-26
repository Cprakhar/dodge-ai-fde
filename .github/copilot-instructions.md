# Copilot Instructions for This Repository

## Objective
Build an MVP for a graph-based Order-to-Cash (O2C) exploration and query system from the dataset in `sap-o2c-data/`.

The MVP must include:
- Data ingestion and graph construction
- Interactive graph visualization
- Chat-based natural language query interface
- Guardrails to restrict answers to dataset/domain-backed responses

## Tech Preferences
- Backend: TypeScript + Node.js (object-oriented design)
- Database: Prefer Neo4j for graph traversal and explainability
- LLM provider: Groq (free-tier friendly)
- Frontend: React + D3.js
- Deployment: Docker

If a tradeoff is needed, prioritize:
1. Correctness and groundedness
2. Simplicity and maintainability
3. Delivery speed

## MVP Scope Boundaries
- Build only what is needed for the assignment evaluation criteria.
- Avoid auth, RBAC, and non-essential platform features.
- Keep UI clean and functional, not over-engineered.
- Favor depth in core flow over many shallow features.

## Domain Modeling Requirements
Model entities as graph nodes and business links as relationships.

### Minimum Node Labels
- SalesOrder
- SalesOrderItem
- Delivery
- DeliveryItem
- BillingDocument
- BillingDocumentItem
- JournalEntry
- Payment
- Customer
- Product
- Plant
- Address

### Minimum Relationship Types
- `HAS_ITEM` (header to item)
- `REFERENCES_SALES_ORDER`
- `REFERENCES_DELIVERY`
- `REFERENCES_BILLING_DOCUMENT`
- `BILLED_BY`
- `PAID_BY`
- `ORDERED_BY_CUSTOMER`
- `FOR_PRODUCT`
- `SHIPPED_FROM_PLANT`
- `HAS_ADDRESS`

When source data lacks direct links, create explicit mapping logic and document assumptions.

## Data Ingestion Rules
- Read all `*.jsonl` files under `sap-o2c-data/`.
- Implement deterministic ID strategy per node type.
- Use idempotent upserts for re-runs.
- Normalize dates, currency values, and key identifiers.
- Log ingest counts per entity and relationship.
- Fail fast on schema-breaking issues, warn on non-critical row issues.

## Query Interface Behavior
For user questions:
1. Classify intent (in-domain vs out-of-domain)
2. For in-domain questions, generate graph query (Cypher preferred)
3. Execute query and return concise, evidence-backed answer
4. Include key entities/IDs used to derive answer when available

Responses must be grounded in query results. Do not fabricate data.

## Guardrails (Mandatory)
- Reject unrelated prompts (general knowledge, creative writing, etc.)
- Use standard refusal text:
  - "This system is designed to answer questions related to the provided dataset only."
- Never answer from model priors when query returns no data.
- If results are empty, state clearly that no matching records were found.

## Suggested Backend Structure
- `src/ingestion/` file readers, parsers, mappers
- `src/graph/` node and edge builders, cypher helpers
- `src/query/` NL intent parser, query generator, answer composer
- `src/guardrails/` domain checks and refusal policies
- `src/api/` HTTP routes for ingest, query, and graph exploration
- `src/config/` env and runtime configuration

Use small classes/interfaces, dependency injection where useful, and clear module boundaries.

## API Expectations (MVP)
- `POST /ingest` triggers dataset ingestion
- `POST /query` accepts natural language question and returns:
  - generated structured query
  - result rows
  - final natural language answer
  - guardrail decision metadata
- `GET /graph/neighbors/:nodeId` returns node + immediate neighbors for UI expansion

## Frontend Expectations (MVP)
- Two-pane layout: graph explorer + chat panel
- Click node to inspect metadata
- Expand node to fetch neighbors
- Display query, result summary, and final response in chat
- Highlight nodes referenced in latest answer if available

## Quality Bar
- Strong typing across backend code (avoid `any`)
- Input validation on all API routes
- Basic tests for:
  - mapper correctness
  - guardrail intent filtering
  - at least 2 representative query flows
- README must explain architecture, modeling choices, prompt strategy, and guardrails

## Non-Goals for MVP
- Full-text semantic retrieval pipelines
- Complex agent orchestration
- Multi-tenant design
- Enterprise-level observability

## Definition of Done
- Ingestion runs end-to-end from provided dataset
- Graph can be explored interactively
- At least the three example business questions are answerable
- Out-of-domain prompts are rejected with required guardrail message
- App runs locally with Docker and has clear setup instructions
