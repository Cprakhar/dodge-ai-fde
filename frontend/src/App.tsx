import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { GraphExplorer } from "./components/GraphExplorer";
import {
  askQuestion,
  getFullGraph,
  getNeighbors,
  runIngestion
} from "./services/api";
import type { QueryResponse, VisualLink, VisualNode } from "./types";

interface NodeLike {
  id?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
}

function pickNodeId(node: NodeLike | null | undefined): string | null {
  if (!node) {
    return null;
  }

  if (typeof node.id === "string") {
    return node.id;
  }

  if (node.properties && typeof node.properties.id === "string") {
    return node.properties.id;
  }

  return null;
}

function toLabel(node: NodeLike): string {
  if (node.labels && node.labels.length > 0) {
    return `${node.labels[0]}\n${pickNodeId(node) ?? ""}`;
  }

  return pickNodeId(node) ?? "Node";
}

export function App(): ReactElement {
  const [nodesById, setNodesById] = useState<Record<string, VisualNode>>({});
  const [links, setLinks] = useState<VisualLink[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("billingdocument:90504248");
  const [latestResult, setLatestResult] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [ingestMessage, setIngestMessage] = useState("Not ingested in this session.");

  const nodes = useMemo(() => Object.values(nodesById), [nodesById]);

  async function loadFullGraph(): Promise<void> {
    const snapshot = await getFullGraph();

    const allNodes: Record<string, VisualNode> = {};
    for (const node of snapshot.nodes) {
      allNodes[node.id] = {
        id: node.id,
        label: `${node.label}\n${node.id}`,
        entityType: node.label,
        properties: node.properties,
        degree: node.degree
      };
    }

    setNodesById(allNodes);
    setLinks(snapshot.edges);

    if (snapshot.nodes.length > 0 && !snapshot.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(snapshot.nodes[0].id);
    }
  }

  useEffect(() => {
    void loadFullGraph();
  }, []);

  async function loadNeighbors(nodeId: string): Promise<void> {
    setSelectedNodeId(nodeId);
    const response = await getNeighbors(nodeId);

    const nextNodes = { ...nodesById };
    const nextLinks = [...links];

    for (const row of response.rows) {
      const center = row.n;
      const centerId = pickNodeId(center);
      if (center && centerId) {
        nextNodes[centerId] = {
          id: centerId,
          label: toLabel(center),
          entityType: center.labels?.[0] ?? nextNodes[centerId]?.entityType ?? "Unknown",
          properties: center.properties ?? {},
          degree: nextNodes[centerId]?.degree ?? 0
        };
      }

      const neighbors = row.neighbors;
      if (!Array.isArray(neighbors)) {
        continue;
      }

      for (const neighborBundle of neighbors) {
        if (!neighborBundle || typeof neighborBundle !== "object") {
          continue;
        }

        const relType = String((neighborBundle as { relType?: string }).relType ?? "RELATED_TO");
        const neighbor = (neighborBundle as { neighbor?: NodeLike }).neighbor;
        const neighborId = pickNodeId(neighbor);

        if (!centerId || !neighbor || !neighborId) {
          continue;
        }

        nextNodes[neighborId] = {
          id: neighborId,
          label: toLabel(neighbor),
          entityType: neighbor.labels?.[0] ?? nextNodes[neighborId]?.entityType ?? "Unknown",
          properties: neighbor.properties ?? {},
          degree: nextNodes[neighborId]?.degree ?? 0
        };

        const exists = nextLinks.some(
          (link) =>
            link.type === relType &&
            ((link.source === centerId && link.target === neighborId) ||
              (link.source === neighborId && link.target === centerId))
        );

        if (!exists) {
          nextLinks.push({ source: centerId, target: neighborId, type: relType });
        }
      }
    }

    setNodesById(nextNodes);
    setLinks(nextLinks);
  }

  async function handleRunQuestion(question: string): Promise<void> {
    try {
      setBusy(true);
      const result = await askQuestion(question);
      setLatestResult(result);

      if (result.referencedNodeIds.length > 0) {
        await loadNeighbors(result.referencedNodeIds[0]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleIngest(): Promise<void> {
    try {
      setBusy(true);
      const result = await runIngestion(false);
      setIngestMessage(`Ingestion completed. Summary: ${JSON.stringify(result).slice(0, 240)}...`);
      await loadFullGraph();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Order-to-Cash Graph Navigator</h1>
          <p>Explore relationships and query the dataset with grounded answers only.</p>
        </div>
        <button className="ingest-button" disabled={busy} onClick={() => void handleIngest()}>
          {busy ? "Working..." : "Run Ingestion"}
        </button>
      </header>

      <section className="workspace">
        <div className="graph-pane">
          <div className="pane-toolbar">
            <strong>Graph Explorer</strong>
            <span>Selected: {selectedNodeId}</span>
            <button disabled={busy} onClick={() => void loadNeighbors(selectedNodeId)}>
              Expand Selected Node
            </button>
            <button disabled={busy} onClick={() => void loadFullGraph()}>
              Reload Full Graph
            </button>
          </div>
          <GraphExplorer
            nodes={nodes}
            links={links}
            highlightedNodeIds={latestResult?.referencedNodeIds ?? []}
            queryExecuted={latestResult !== null}
            onSelectNode={(nodeId) => {
              void loadNeighbors(nodeId);
            }}
          />
          <p className="status-line">{ingestMessage}</p>
        </div>

        <ChatPanel
          onSubmit={handleRunQuestion}
          latestResult={latestResult}
          loading={busy}
        />
      </section>
    </main>
  );
}
