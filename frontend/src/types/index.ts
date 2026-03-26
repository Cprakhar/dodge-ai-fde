export interface QueryResponse {
  generatedQuery: string;
  rows: Record<string, unknown>[];
  answer: string;
  guardrail: {
    allowed: boolean;
    reason: string;
  };
  referencedNodeIds: string[];
}

export interface GraphNeighborsResponse {
  rows: Array<{
    n?: { id?: string; labels?: string[]; properties?: Record<string, unknown> };
    neighbors?: Array<{ relType: string; neighbor: { id?: string; labels?: string[]; properties?: Record<string, unknown> } | null }>;
  }>;
}

export interface GraphSnapshotResponse {
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
}

export interface VisualNode {
  id: string;
  label: string;
  entityType: string;
  properties: Record<string, unknown>;
  degree: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface VisualLink {
  source: string;
  target: string;
  type: string;
}
