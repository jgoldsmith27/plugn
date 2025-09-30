import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Background,
  Connection,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import { v4 as uuid } from 'uuid';
import type { Flow, FlowRunResult, EdgeSpec, NodeSpec, ValidationIssue } from '@plugn/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Palette from '@/features/editor/components/Palette';
import Inspector from '@/features/editor/components/Inspector';
import RunConsole from '@/features/editor/components/RunConsole';
import FlowNode, { type FlowNodeData } from '@/features/editor/components/FlowNode';
import { createNodeSpec, getPortSpec, NodeRegistry, validateNodeParams } from '@/lib/nodeRegistry';
import { executeFlow, type NodeCacheStore } from '@/lib/executor';
import { createEmptyFlow, createTemplateFlow } from '@/lib/templates';
import { useFlowsStore } from '@/store/flowsStore';
import { useEditorStore } from '@/store/editorStore';
import { listConnections, listModels } from '@/lib/mockApi';

import 'reactflow/dist/style.css';

const nodeTypes = { block: FlowNode };

function FlowEditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
  const { data: models } = useQuery({ queryKey: ['models'], queryFn: listModels });
  const [copiedNode, setCopiedNode] = useState<NodeSpec | null>(null);
  const cacheRef = useRef<NodeCacheStore>(new Map());

  const {
    flow,
    dirty,
    selectedNodeId,
    nodeCache,
    runState,
    loadFlow,
    setFlowName,
    setSelectedNode,
    setSelectedEdges,
    addNode,
    updateNode,
    updateNodePosition,
    removeNodes,
    addEdge,
    removeEdges,
    undo,
    redo,
    markSaved,
    toggleCache,
    resetRun,
    setRunning,
    updateRunResult,
    appendLog
  } = useEditorStore();
  const upsertFlow = useFlowsStore(state => state.upsert);
  const getFlow = useFlowsStore(state => state.get);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const stored = await getFlow(id);
      if (stored) {
        loadFlow(stored);
      } else {
        const fallback = createEmptyFlow('Untitled Flow');
        fallback.id = id;
        loadFlow(fallback);
        void upsertFlow(fallback);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!flow) return;
    const timeout = setTimeout(() => {
      if (dirty) {
        void upsertFlow(flow).then(() => markSaved());
      }
    }, 750);
    return () => clearTimeout(timeout);
  }, [flow, dirty]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          if (flow) {
            void upsertFlow(flow).then(() => markSaved());
          }
        }
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (event.key.toLowerCase() === 'c' && selectedNodeId) {
          const node = flow?.nodes.find(n => n.id === selectedNodeId) ?? null;
          if (node) {
            setCopiedNode({ ...node, id: uuid(), position: { x: node.position.x + 40, y: node.position.y + 40 } });
          }
        }
        if (event.key.toLowerCase() === 'v' && copiedNode) {
          event.preventDefault();
          addNode({ ...copiedNode, id: uuid() });
        }
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        removeNodes([selectedNodeId]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flow, selectedNodeId, copiedNode]);

  const issuesMap = useMemo(() => {
    if (!flow) return {} as Record<string, ValidationIssue[]>;
    return Object.fromEntries(flow.nodes.map(node => [node.id, validateNodeParams(node.type, node.params)]));
  }, [flow?.nodes, flow?.edges]);

  const onCreateNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const spec = createNodeSpec(type, position);
      addNode(spec);
    },
    []
  );

  const onRun = useCallback(async () => {
    if (!flow) return;
    const hasBlockingIssues = Object.values(issuesMap).some(issues =>
      issues.some(issue => issue.severity === 'error')
    );
    if (hasBlockingIssues) {
      window.alert('Resolve validation errors before running.');
      return;
    }
    resetRun();
    setRunning(true);
    try {
      await executeFlow(flow, {
        cacheStore: cacheRef.current,
        cacheEnabled: nodeCache,
        handlers: {
          onLog: (nodeId, message) => appendLog(nodeId, message),
          onStatus: status => updateRunResult(status)
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  }, [flow, nodeCache, issuesMap]);

  const onExport = useCallback(() => {
    if (!flow) return;
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${flow.name ?? 'flow'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [flow]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(String(reader.result)) as Flow;
          loadFlow(imported);
          void upsertFlow(imported);
        } catch (error) {
          console.error('Failed to import flow', error);
        }
      };
      reader.readAsText(file);
    },
    []
  );

  if (!flow) {
    return <div className="text-muted-foreground">Loading flow…</div>;
  }

  const nodeOrder = flow.nodes.map(node => ({ id: node.id, label: node.label ?? NodeRegistry[node.type]?.label ?? node.id }));
  const connectionOptions = (connections ?? []).map(connection => ({ label: connection.name, value: connection.id }));
  const modelOptions = (models ?? []).map(model => ({ label: `${model.provider} · ${model.name}`, value: model.id }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input className="w-72" value={flow.name} onChange={event => setFlowName(event.target.value)} placeholder="Flow name" />
        <Badge variant="outline">v{flow.version}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const template = createTemplateFlow();
              loadFlow(template);
              void upsertFlow(template);
              navigate(`/flows/${template.id}/editor`);
            }}
          >
            Load Template
          </Button>
          <Button variant="outline" onClick={onExport}>
            Export JSON
          </Button>
          <div>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={onImport} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </Button>
          </div>
          <Button onClick={onRun} disabled={runState.running}>
            {runState.running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Palette onCreate={type => onCreateNode(type, { x: 0, y: 0 })} />
        <ReactFlowProvider>
          <EditorCanvas
            flow={flow}
            runResults={runState.results}
            issuesMap={issuesMap}
            onSelectNode={setSelectedNode}
            onSelectEdges={setSelectedEdges}
            onCreateNode={onCreateNode}
            onUpdateNodePosition={updateNodePosition}
            onRemoveNodes={removeNodes}
            onAddEdge={addEdge}
            onRemoveEdges={removeEdges}
          />
        </ReactFlowProvider>
        <Inspector
          node={flow.nodes.find(node => node.id === selectedNodeId)}
          schema={selectedNodeId ? NodeRegistry[flow.nodes.find(node => node.id === selectedNodeId)!.type] : undefined}
          issues={selectedNodeId ? issuesMap[selectedNodeId] ?? [] : []}
          onChange={params => {
            if (!selectedNodeId) return;
            updateNode(selectedNodeId, node => {
              node.params = { ...node.params, ...params };
            });
          }}
          onLabelChange={label => {
            if (!selectedNodeId) return;
            updateNode(selectedNodeId, node => {
              node.label = label;
            });
          }}
          cacheEnabled={selectedNodeId ? nodeCache[selectedNodeId] ?? true : true}
          onToggleCache={() => {
            if (selectedNodeId) toggleCache(selectedNodeId);
          }}
          connectionOptions={connectionOptions}
          modelOptions={modelOptions}
        />
      </div>
      <RunConsole results={runState.results} logs={runState.logs} nodeOrder={nodeOrder} />
    </div>
  );
}

function EditorCanvas({
  flow,
  runResults,
  issuesMap,
  onSelectNode,
  onSelectEdges,
  onCreateNode,
  onUpdateNodePosition,
  onRemoveNodes,
  onAddEdge,
  onRemoveEdges
}: {
  flow: Flow;
  runResults: Record<string, FlowRunResult>;
  issuesMap: Record<string, ValidationIssue[]>;
  onSelectNode: (id?: string) => void;
  onSelectEdges: (ids: string[]) => void;
  onCreateNode: (type: string, position: { x: number; y: number }) => void;
  onUpdateNodePosition: (id: string, position: { x: number; y: number }) => void;
  onRemoveNodes: (ids: string[]) => void;
  onAddEdge: (edge: EdgeSpec) => void;
  onRemoveEdges: (ids: string[]) => void;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();

  const nodes = useMemo(() => {
    return flow.nodes.map(node => ({
      id: node.id,
      type: 'block',
      position: node.position,
      data: {
        spec: node,
        schema: NodeRegistry[node.type],
        issues: issuesMap[node.id] ?? [],
        status: runResults[node.id]?.status,
        onSelect: onSelectNode
      } satisfies FlowNodeData
    }));
  }, [flow.nodes, runResults, issuesMap, onSelectNode]);

  const edges = useMemo(
    () =>
      flow.edges.map(edge => ({
        id: edge.id,
        source: edge.from.nodeId,
        sourceHandle: edge.from.port,
        target: edge.to.nodeId,
        targetHandle: edge.to.port,
        animated: false,
        type: 'smoothstep'
      })),
    [flow.edges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
      const sourceNode = flow.nodes.find(node => node.id === connection.source);
      const targetNode = flow.nodes.find(node => node.id === connection.target);
      if (!sourceNode || !targetNode) return;
      const sourcePort = getPortSpec(sourceNode, 'output', connection.sourceHandle);
      const targetPort = getPortSpec(targetNode, 'input', connection.targetHandle);
      if (!sourcePort || !targetPort) return;
      if (sourcePort.kind !== targetPort.kind) {
        window.alert('Cannot connect data ports to control ports.');
        return;
      }
      if (sourcePort.dtype && targetPort.dtype && sourcePort.dtype !== targetPort.dtype) {
        window.alert(`Type mismatch: ${sourcePort.dtype} → ${targetPort.dtype}`);
      }
      const edge: EdgeSpec = {
        id: uuid(),
        from: { nodeId: connection.source, port: connection.sourceHandle },
        to: { nodeId: connection.target, port: connection.targetHandle }
      };
      onAddEdge(edge);
    },
    [flow.nodes]
  );

  const onNodesChange = useCallback(
    (changes: any[]) => {
      changes.forEach(change => {
        if (change.type === 'position' && change.position) {
          onUpdateNodePosition(change.id, change.position);
        }
        if (change.type === 'remove') {
          onRemoveNodes([change.id]);
        }
        if (change.type === 'select') {
          onSelectNode(change.selected ? change.id : undefined);
        }
      });
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: any[]) => {
      const removed = changes.filter(change => change.type === 'remove').map(change => change.id as string);
      if (removed.length) {
        onRemoveEdges(removed);
      }
    },
    []
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = reactFlow.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      });
      onCreateNode(type, position);
    },
    [reactFlow]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div ref={reactFlowWrapper} className="h-[600px] overflow-hidden rounded-2xl border border-border bg-grid-pattern bg-grid">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        snapToGrid
        onSelectionChange={selection => {
          const nodeId = selection?.nodes?.[0]?.id;
          const edgeIds = selection?.edges?.map(edge => edge.id) ?? [];
          onSelectNode(nodeId);
          onSelectEdges(edgeIds);
        }}
      >
        <MiniMap />
        <Controls />
        <Background gap={16} color="rgba(148, 163, 184, 0.3)" />
      </ReactFlow>
    </div>
  );
}

export default function FlowEditorPage() {
  return <FlowEditorInner />;
}
