import { create } from 'zustand';
import type { EdgeSpec, Flow, NodeSpec, FlowRunResult } from '@plugn/types';

export type EditorRunState = {
  running: boolean;
  results: Record<string, FlowRunResult>;
  logs: Record<string, string[]>;
};

export type EditorState = {
  flow: Flow | null;
  dirty: boolean;
  history: Flow[];
  future: Flow[];
  selectedNodeId?: string;
  selectedEdgeIds: string[];
  nodeCache: Record<string, boolean>;
  runState: EditorRunState;
  loadFlow: (flow: Flow) => void;
  setFlowName: (name: string) => void;
  setSelectedNode: (id?: string) => void;
  setSelectedEdges: (ids: string[]) => void;
  addNode: (node: NodeSpec) => void;
  updateNode: (nodeId: string, updater: (node: NodeSpec) => void) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  removeNodes: (nodeIds: string[]) => void;
  addEdge: (edge: EdgeSpec) => void;
  removeEdges: (edgeIds: string[]) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
  toggleCache: (nodeId: string) => void;
  resetRun: () => void;
  setRunning: (running: boolean) => void;
  updateRunResult: (result: FlowRunResult) => void;
  appendLog: (nodeId: string, message: string) => void;
};

const initialRunState: EditorRunState = {
  running: false,
  results: {},
  logs: {}
};

function cloneNode(node: NodeSpec): NodeSpec {
  return {
    ...node,
    position: { ...node.position },
    inputs: node.inputs?.map(port => ({ ...port })) ?? [],
    outputs: node.outputs?.map(port => ({ ...port })) ?? [],
    params: { ...node.params }
  };
}

function cloneFlow(flow: Flow): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map(cloneNode),
    edges: flow.edges.map(edge => ({
      ...edge,
      from: { ...edge.from },
      to: { ...edge.to }
    }))
  };
}

function pushHistory(history: Flow[], flow: Flow) {
  const next = [cloneFlow(flow), ...history];
  return next.slice(0, 50);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  flow: null,
  dirty: false,
  history: [],
  future: [],
  selectedNodeId: undefined,
  selectedEdgeIds: [],
  nodeCache: {},
  runState: initialRunState,
  loadFlow: flow => {
    set({
      flow: cloneFlow(flow),
      dirty: false,
      history: [],
      future: [],
      selectedNodeId: undefined,
      selectedEdgeIds: [],
      nodeCache: Object.fromEntries(flow.nodes.map(node => [node.id, true])),
      runState: { ...initialRunState, results: {}, logs: {} }
    });
  },
  setFlowName: name => {
    set(state => {
      if (!state.flow) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.name = name;
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: []
      };
    });
  },
  setSelectedNode: id => set({ selectedNodeId: id }),
  setSelectedEdges: ids => set({ selectedEdgeIds: ids }),
  addNode: node => {
    set(state => {
      if (!state.flow) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.nodes.push(cloneNode(node));
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: [],
        nodeCache: { ...state.nodeCache, [node.id]: true }
      };
    });
  },
  updateNode: (nodeId, updater) => {
    set(state => {
      if (!state.flow) return state;
      const index = state.flow.nodes.findIndex(node => node.id === nodeId);
      if (index === -1) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      updater(next.nodes[index]);
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: []
      };
    });
  },
  updateNodePosition: (nodeId, position) => {
    set(state => {
      if (!state.flow) return state;
      const index = state.flow.nodes.findIndex(node => node.id === nodeId);
      if (index === -1) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.nodes[index].position = { ...position };
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: []
      };
    });
  },
  removeNodes: nodeIds => {
    set(state => {
      if (!state.flow) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.nodes = next.nodes.filter(node => !nodeIds.includes(node.id));
      next.edges = next.edges.filter(edge => !nodeIds.includes(edge.from.nodeId) && !nodeIds.includes(edge.to.nodeId));
      const nodeCache = { ...state.nodeCache };
      nodeIds.forEach(id => delete nodeCache[id]);
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: [],
        selectedNodeId: undefined,
        nodeCache
      };
    });
  },
  addEdge: edge => {
    set(state => {
      if (!state.flow) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.edges = next.edges.filter(existing => existing.id !== edge.id);
      next.edges.push({
        ...edge,
        from: { ...edge.from },
        to: { ...edge.to }
      });
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: []
      };
    });
  },
  removeEdges: edgeIds => {
    set(state => {
      if (!state.flow) return state;
      const prev = state.flow;
      const next = cloneFlow(state.flow);
      next.edges = next.edges.filter(edge => !edgeIds.includes(edge.id));
      return {
        ...state,
        flow: next,
        dirty: true,
        history: pushHistory(state.history, prev),
        future: []
      };
    });
  },
  markSaved: () => set({ dirty: false }),
  undo: () => {
    set(state => {
      if (!state.flow || state.history.length === 0) return state;
      const [previous, ...rest] = state.history;
      return {
        ...state,
        flow: cloneFlow(previous),
        history: rest,
        future: [cloneFlow(state.flow), ...state.future],
        dirty: true
      };
    });
  },
  redo: () => {
    set(state => {
      if (!state.flow || state.future.length === 0) return state;
      const [nextFlow, ...rest] = state.future;
      return {
        ...state,
        flow: cloneFlow(nextFlow),
        future: rest,
        history: [cloneFlow(state.flow), ...state.history],
        dirty: true
      };
    });
  },
  toggleCache: nodeId => {
    set(state => ({
      nodeCache: { ...state.nodeCache, [nodeId]: !state.nodeCache[nodeId] }
    }));
  },
  resetRun: () => set({ runState: { ...initialRunState, results: {}, logs: {} } }),
  setRunning: running => set(state => ({ runState: { ...state.runState, running } })),
  updateRunResult: result => {
    set(state => ({
      runState: {
        ...state.runState,
        results: { ...state.runState.results, [result.nodeId]: result }
      }
    }));
  },
  appendLog: (nodeId, message) => {
    set(state => {
      const logs = state.runState.logs[nodeId] ?? [];
      return {
        runState: {
          ...state.runState,
          logs: {
            ...state.runState.logs,
            [nodeId]: [...logs, message]
          }
        }
      };
    });
  }
}));
