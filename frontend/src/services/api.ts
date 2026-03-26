import type {
  GraphNeighborsResponse,
  GraphSnapshotResponse,
  QueryResponse
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function runIngestion(reset = false): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/ingest?reset=${reset ? "true" : "false"}`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Ingestion failed with status ${response.status}`);
  }

  return response.json();
}

export async function askQuestion(question: string): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    throw new Error(`Query failed with status ${response.status}`);
  }

  return response.json() as Promise<QueryResponse>;
}

export async function getNeighbors(nodeId: string): Promise<GraphNeighborsResponse> {
  const response = await fetch(`${API_BASE}/graph/neighbors/${encodeURIComponent(nodeId)}`);

  if (!response.ok) {
    throw new Error(`Neighbors request failed with status ${response.status}`);
  }

  return response.json() as Promise<GraphNeighborsResponse>;
}

export async function getFullGraph(): Promise<GraphSnapshotResponse> {
  const response = await fetch(`${API_BASE}/graph/all`);

  if (!response.ok) {
    throw new Error(`Graph request failed with status ${response.status}`);
  }

  return response.json() as Promise<GraphSnapshotResponse>;
}
