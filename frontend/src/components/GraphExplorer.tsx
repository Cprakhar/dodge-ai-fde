import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import * as d3 from "d3";
import type { VisualLink, VisualNode } from "../types";

interface GraphExplorerProps {
  nodes: VisualNode[];
  links: VisualLink[];
  highlightedNodeIds: string[];
  queryExecuted: boolean;
  onSelectNode: (nodeId: string) => void;
}

const ENTITY_COLORS: Record<string, string> = {
  SalesOrder: "#1d4ed8",
  SalesOrderItem: "#3b82f6",
  Delivery: "#f97316",
  DeliveryItem: "#fb923c",
  BillingDocument: "#dc2626",
  BillingDocumentItem: "#f43f5e",
  JournalEntry: "#7c3aed",
  Payment: "#14b8a6",
  Customer: "#059669",
  Product: "#16a34a",
  Plant: "#a16207",
  Address: "#64748b",
  Unknown: "#1f6feb"
};

function getNodeColor(node: VisualNode): string {
  return ENTITY_COLORS[node.entityType] ?? ENTITY_COLORS.Unknown;
}

export function GraphExplorer(props: GraphExplorerProps): ReactElement {
  const { nodes, links, highlightedNodeIds, queryExecuted, onSelectNode } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const highlighted = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const [hoveredNode, setHoveredNode] = useState<VisualNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  function linkEndId(end: unknown): string {
    if (typeof end === "string") {
      return end;
    }

    if (typeof end === "object" && end !== null && "id" in end) {
      const value = (end as { id?: unknown }).id;
      if (typeof value === "string") {
        return value;
      }
    }

    return "";
  }

  useEffect(() => {
    if (svgRef.current === null) {
      return;
    }

    const width = 900;
    const height = 680;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const zoomLayer = svg.append("g");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => (d as VisualNode).id)
          .distance(130)
      )
      .force("charge", d3.forceManyBody().strength(-360))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const linkSelection = zoomLayer
      .append("g")
      .attr("stroke", "#3b5475")
      .selectAll<SVGLineElement, VisualLink>("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    const nodeSelection = zoomLayer
      .append("g")
      .selectAll<SVGCircleElement, VisualNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => (highlighted.has(d.id) ? 17 : 13))
      .attr("fill", (d) => (highlighted.has(d.id) ? "#ef4444" : getNodeColor(d)))
      .attr("stroke", "#d8e9ff")
      .attr("stroke-width", (d) => (highlighted.has(d.id) ? 2.4 : 1.4))
      .on("click", (_event, d) => {
        onSelectNode(d.id);
      })
      .on("mouseenter", (event, d) => {
        const containerRect = wrapperRef.current?.getBoundingClientRect();
        if (containerRect) {
          setHoverPos({
            x: event.clientX - containerRect.left + 14,
            y: event.clientY - containerRect.top + 14
          });
        }
        setHoveredNode(d);
        applyVisualState(d.id);
      })
      .on("mousemove", (event) => {
        const containerRect = wrapperRef.current?.getBoundingClientRect();
        if (containerRect) {
          setHoverPos({
            x: event.clientX - containerRect.left + 14,
            y: event.clientY - containerRect.top + 14
          });
        }
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        setHoverPos(null);
        applyVisualState(null);
      })
      .call(
        d3
          .drag<SVGCircleElement, VisualNode>()
          .on("start", (event, d) => {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          })
      );

    function collectActiveNodeIds(hoveredId: string | null): Set<string> {
      const active = new Set<string>();
      const seedIds = new Set<string>();

      if (queryExecuted) {
        for (const id of highlighted) {
          seedIds.add(id);
        }
      } else if (hoveredId) {
        seedIds.add(hoveredId);
      }

      for (const id of seedIds) {
        active.add(id);
      }

      for (const link of links) {
        const sourceId = linkEndId(link.source);
        const targetId = linkEndId(link.target);

        if (seedIds.has(sourceId) && targetId.length > 0) {
          active.add(targetId);
        }

        if (seedIds.has(targetId) && sourceId.length > 0) {
          active.add(sourceId);
        }
      }

      return active;
    }

    function applyVisualState(hoveredId: string | null): void {
      const activeIds = collectActiveNodeIds(hoveredId);
      const hasActive = activeIds.size > 0;

      nodeSelection
        .attr("fill", (d) => (queryExecuted && highlighted.has(d.id) ? "#ef4444" : getNodeColor(d)))
        .attr("r", (d) => {
          if (queryExecuted && highlighted.has(d.id)) {
            return 17;
          }

          if (hasActive && activeIds.has(d.id)) {
            return 14;
          }

          return 12;
        })
        .attr("stroke-width", (d) => {
          if (queryExecuted && highlighted.has(d.id)) {
            return 2.4;
          }

          if (hasActive && activeIds.has(d.id)) {
            return 1.8;
          }

          return 1.1;
        })
        .attr("opacity", (d) => {
          if (!hasActive) {
            return 0.2;
          }

          return activeIds.has(d.id) ? 1 : 0.12;
        });

      linkSelection.attr("stroke-opacity", (d) => {
        const sourceId = linkEndId(d.source);
        const targetId = linkEndId(d.target);

        if (!hasActive) {
          return 0.08;
        }

        return activeIds.has(sourceId) && activeIds.has(targetId) ? 0.9 : 0.05;
      });
    }

    applyVisualState(null);

    simulation.on("tick", () => {
      linkSelection
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum).y ?? 0);

      nodeSelection
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onSelectNode, highlighted, queryExecuted]);

  function zoomIn(): void {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 1.2);
    }
  }

  function zoomOut(): void {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 0.8);
    }
  }

  return (
    <div ref={wrapperRef} className="graph-wrapper">
      <div className="zoom-controls">
        <button type="button" onClick={zoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out">
          -
        </button>
      </div>
      <svg ref={svgRef} className="graph-canvas" aria-label="graph explorer" />
      {hoveredNode && hoverPos && (
        <div
          className="graph-tooltip"
          style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
        >
          <div className="tooltip-title">{hoveredNode.id}</div>
          <div>Connected nodes: {hoveredNode.degree}</div>
          <div className="tooltip-data">
            {JSON.stringify(hoveredNode.properties, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
