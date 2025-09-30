import type { EdgeSpec, Flow, FlowRunResult, NodeSpec } from '@plugn/types';
import type { NodeAdapter } from '@plugn/types';
import { getAdapter } from '@plugn/adapters-mock';

export type RunHandlers = {
  onStatus: (result: FlowRunResult) => void;
  onLog: (nodeId: string, message: string) => void;
};

export type NodeCacheStore = Map<string, Map<string, Record<string, unknown>>>;

export type ExecuteOptions = {
  handlers: RunHandlers;
  cacheStore: NodeCacheStore;
  cacheEnabled: Record<string, boolean>;
};

function topologicalSort(flow: Flow): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  flow.nodes.forEach(node => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });
  flow.edges.forEach(edge => {
    indegree.set(edge.to.nodeId, (indegree.get(edge.to.nodeId) ?? 0) + 1);
    adjacency.get(edge.from.nodeId)?.push(edge.to.nodeId);
  });
  const queue: string[] = [];
  indegree.forEach((value, key) => {
    if (value === 0) queue.push(key);
  });
  const order: string[] = [];
  while (queue.length) {
    const nodeId = queue.shift()!;
    order.push(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const nextValue = (indegree.get(neighbor) ?? 0) - 1;
      indegree.set(neighbor, nextValue);
      if (nextValue === 0) {
        queue.push(neighbor);
      }
    }
  }
  if (order.length !== flow.nodes.length) {
    throw new Error('Flow contains cycles. Please resolve them before running.');
  }
  return order;
}

function gatherInputs(node: NodeSpec, edges: EdgeSpec[], outputs: Record<string, Record<string, unknown>>) {
  const incoming = edges.filter(edge => edge.to.nodeId === node.id);
  const inputs: Record<string, unknown> = {};
  for (const edge of incoming) {
    const value = outputs[edge.from.nodeId]?.[edge.from.port];
    if (inputs[edge.to.port] === undefined) {
      inputs[edge.to.port] = value;
    } else if (Array.isArray(inputs[edge.to.port])) {
      (inputs[edge.to.port] as unknown[]).push(value);
    } else {
      inputs[edge.to.port] = [inputs[edge.to.port], value];
    }
  }
  return inputs;
}

function makeCacheKey(params: Record<string, unknown>, inputs: Record<string, unknown>) {
  return JSON.stringify({ params, inputs });
}

export async function executeFlow(flow: Flow, options: ExecuteOptions) {
  const { handlers, cacheStore, cacheEnabled } = options;
  const outputs: Record<string, Record<string, unknown>> = {};
  const order = topologicalSort(flow);

  for (const nodeId of order) {
    const node = flow.nodes.find(item => item.id === nodeId);
    if (!node) continue;
    const adapter = getAdapter(node.type);
    const inputValues = gatherInputs(node, flow.edges, outputs);
    const cacheKey = makeCacheKey(node.params, inputValues);
    const isCacheable = cacheEnabled[node.id];
    const nodeCache = cacheStore.get(node.id) ?? new Map<string, Record<string, unknown>>();
    cacheStore.set(node.id, nodeCache);

    handlers.onStatus({ nodeId: node.id, status: 'running' });

    const context = {
      log: (_: string, message: string) => {
        handlers.onLog(node.id, message);
      },
      cache: async <T,>(key: string, producer: () => Promise<T>) => {
        const scopedKey = `${cacheKey}:${key}`;
        if (isCacheable && nodeCache.has(scopedKey)) {
          return nodeCache.get(scopedKey) as T;
        }
        const value = await producer();
        if (isCacheable) {
          nodeCache.set(scopedKey, value as Record<string, unknown>);
        }
        return value;
      }
    } satisfies Parameters<NodeAdapter['run']>[0];

    try {
      let result: Record<string, unknown>;
      if (isCacheable && nodeCache.has(cacheKey)) {
        result = nodeCache.get(cacheKey)!;
        handlers.onLog(node.id, 'Cache hit');
      } else {
        result = await adapter.run(context as any, node.params, inputValues);
        if (isCacheable) {
          nodeCache.set(cacheKey, result);
        }
      }
      outputs[node.id] = result;
      handlers.onStatus({ nodeId: node.id, status: 'success', output: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      handlers.onLog(node.id, message);
      handlers.onStatus({ nodeId: node.id, status: 'error', error: message });
      throw error;
    }
  }

  return outputs;
}
