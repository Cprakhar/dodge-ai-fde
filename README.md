# O2C Graph-Based Data Modeling and Query MVP

This repository contains an MVP for a graph-driven Order-to-Cash (O2C) exploration and query system over the provided SAP-style dataset.

## Implemented MVP Features
- End-to-end ingestion from JSONL dataset into Neo4j with idempotent upserts
- Graph explorer that loads all nodes and edges
- Interactive graph controls: zoom in/out, pan, node hover tooltip, click-to-expand
- Entity-based node coloring
- Query-result-aware highlighting behavior:
	- Before any query: all nodes are faded, hover highlights node + neighbors
	- After query: only result nodes + neighbors are highlighted
- Chat-based natural language query endpoint with domain guardrails
- Out-of-domain refusal and empty-result grounded response behavior

## Stack
- Backend: Node.js + TypeScript + Express
- Graph DB: Neo4j
- LLM: Groq (optional key; template query fallback provided)
- Frontend: React + D3
- Deployment: Docker Compose

## Live Deployment
- Frontend (Vercel): https://dodge-ai-fde-rouge.vercel.app/
- Backend (Render): https://dodge-ai-fde-qxzy.onrender.com

## Render Backend Start / Trigger Guide
Render free web services can sleep after inactivity. If backend APIs look unresponsive, wake the backend first:

1. Trigger backend wake-up by opening:
	 - https://dodge-ai-fde-qxzy.onrender.com/health
2. Wait 20-60 seconds for cold start on first request.
3. Verify graph API is ready:
	 - https://dodge-ai-fde-qxzy.onrender.com/graph/all
4. If data is missing, run ingestion once:

```bash
curl -X POST "https://dodge-ai-fde-qxzy.onrender.com/ingest?reset=false"
```

5. Test query endpoint:

```bash
curl -X POST "https://dodge-ai-fde-qxzy.onrender.com/query" \
	-H "Content-Type: application/json" \
	-d '{"question":"Which products are associated with the highest number of billing documents?"}'
```

### Recommended Render Service Configuration (Backend)
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables:
	- `GROQ_API_KEY`
	- `GROQ_MODEL`
	- `NEO4J_URI`
	- `NEO4J_USER`
	- `NEO4J_PASSWORD`
	- `DATASET_ROOT` (for Render monorepo setup, typically `../sap-o2c-data`)

## Architecture
- Backend API in [backend/src/index.ts](backend/src/index.ts)
- Ingestion in [backend/src/ingestion/ingestionService.ts](backend/src/ingestion/ingestionService.ts)
- Graph storage access in [backend/src/graph/repository.ts](backend/src/graph/repository.ts)
- Guardrails in [backend/src/guardrails/domainGuard.ts](backend/src/guardrails/domainGuard.ts)
- Query orchestration in [backend/src/query/queryService.ts](backend/src/query/queryService.ts)
- Frontend app state in [frontend/src/App.tsx](frontend/src/App.tsx)
- Graph rendering and interaction in [frontend/src/components/GraphExplorer.tsx](frontend/src/components/GraphExplorer.tsx)
- Chat UI in [frontend/src/components/ChatPanel.tsx](frontend/src/components/ChatPanel.tsx)

## Graph Model
### Node labels
SalesOrder, SalesOrderItem, Delivery, DeliveryItem, BillingDocument, BillingDocumentItem, JournalEntry, Payment, Customer, Product, Plant, Address

### Relationship types
HAS_ITEM, REFERENCES_SALES_ORDER, REFERENCES_DELIVERY, REFERENCES_BILLING_DOCUMENT, BILLED_BY, PAID_BY, ORDERED_BY_CUSTOMER, FOR_PRODUCT, SHIPPED_FROM_PLANT, HAS_ADDRESS

## API
- `POST /ingest`: Reads `sap-o2c-data/**/*.jsonl` and upserts nodes/edges
- `POST /query`: Accepts `{ "question": "..." }`, applies guardrails, generates/executes Cypher, returns answer + rows + referenced node IDs
- `GET /graph/neighbors/:nodeId`: Returns selected node and immediate neighbors
- `GET /graph/all`: Returns full graph snapshot (`nodes`, `edges`) for initial UI load

## Frontend Behavior
- Two-pane fixed horizontal layout: graph explorer + chat
- Graph explorer supports:
	- Mouse zoom/pan and explicit +/- zoom buttons
	- Hover tooltip with node properties and connected node count
	- Entity-specific node colors
	- Result-aware highlight logic (idle hover vs query mode)
- Chat panel shows:
	- Final grounded answer
	- Guardrail decision
	- Generated Cypher
	- Result row preview

## Guardrails
Out-of-domain questions are blocked with:

`This system is designed to answer questions related to the provided dataset only.`

If query results are empty, the response is:

`No matching records were found in the dataset.`

## Run Locally (without Docker)
1. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Then run ingestion once from UI or via API:
```bash
curl -X POST "http://localhost:4000/ingest?reset=true"
```

## Run with Docker
```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000/health
- Neo4j Browser: http://localhost:7474

Optional quick API checks:
```bash
curl http://localhost:4000/graph/all
curl -X POST http://localhost:4000/query -H "Content-Type: application/json" -d '{"question":"Which products are associated with the highest number of billing documents?"}'
```

## Tests
Backend tests include:
- Mapper correctness
- Guardrail intent filtering
- Representative query template flows

Run:
```bash
cd backend
npm test
```

## Notes
- Groq API key is optional for this MVP. If unset, `/query` still works with rule/template-based Cypher fallback.
- Ingestion is idempotent through Neo4j `MERGE` upserts.
- Neo4j property sanitization is applied during ingest to handle nested JSON structures.
- Render free tier may cold start; use `/health` to trigger backend before demoing UI interactions.
