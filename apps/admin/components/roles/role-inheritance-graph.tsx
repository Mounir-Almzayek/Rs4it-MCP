"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RoleDefinition } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface RoleInheritanceGraphProps {
  roles: RoleDefinition[];
  selectedRoleId: string | null;
  onSelectRole: (id: string | null) => void;
}

function buildGraph(roles: RoleDefinition[]): { nodes: Node[]; edges: Edge[] } {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const nodes: Node[] = [];
  const edgeSet = new Set<string>();

  roles.forEach((r, i) => {
    nodes.push({
      id: r.id,
      type: "default",
      position: { x: 0, y: 0 },
      data: {
        label: r.name ?? r.id,
        roleId: r.id,
      },
      className: "font-mono text-xs rounded-lg border-2 border-border bg-card",
    });
  });

  const cols = Math.ceil(Math.sqrt(roles.length)) || 1;
  nodes.forEach((n, i) => {
    n.position = { x: (i % cols) * 180, y: Math.floor(i / cols) * 80 };
  });

  roles.forEach((r) => {
    (r.inherits ?? []).forEach((parentId) => {
      if (!byId.has(parentId)) return;
      edgeSet.add(`${parentId}->${r.id}`);
    });
  });

  const edges: Edge[] = Array.from(edgeSet).map((key) => {
    const [source, target] = key.split("->");
    return {
      id: key,
      source,
      target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
    };
  });

  return { nodes, edges };
}

export function RoleInheritanceGraph({
  roles,
  selectedRoleId,
  onSelectRole,
}: RoleInheritanceGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(roles),
    [roles]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const isSelected = n.id === selectedRoleId;
        return {
          ...n,
          className: cn(
            "font-mono text-xs rounded-lg border-2",
            isSelected
              ? "border-primary bg-primary/10 shadow-md"
              : "border-border bg-card"
          ),
          style: isSelected ? { zIndex: 10 } : undefined,
        };
      })
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: e.source === selectedRoleId || e.target === selectedRoleId,
      }))
    );
  }, [selectedRoleId, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const roleId = node.data?.roleId as string | undefined;
      if (roleId) onSelectRole(selectedRoleId === roleId ? null : roleId);
    },
    [selectedRoleId, onSelectRole]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2}
      defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
      onPaneClick={() => onSelectRole(null)}
    >
      <Background />
      <Controls />
      <MiniMap />
      <Panel position="top-left" className="text-xs text-muted-foreground bg-card/90 rounded px-2 py-1">
        Click a node to highlight. Arrow: child → parent (inherits).
      </Panel>
    </ReactFlow>
  );
}
