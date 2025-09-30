export type Flow = {
  id: string;
  name: string;
  version: string;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
};

export type NodeSpec = {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  inputs?: PortSpec[];
  outputs?: PortSpec[];
  params: Record<string, unknown>;
};

export type EdgeSpec = {
  id: string;
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
};

export type PortSpec = {
  name: string;
  kind: 'data' | 'control';
  dtype?: string;
};

export type ParamSchema = {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'connectionRef' | 'modelRef';
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  help?: string;
};

export type NodeTypeSchema = {
  type: string;
  category: 'Source' | 'Transform' | 'AI' | 'Store' | 'Control' | 'IO';
  label: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  params: ParamSchema[];
  validate?: (p: Record<string, unknown>) => ValidationIssue[];
  sampleOutput?: () => Promise<unknown>;
};

export type ValidationIssue = {
  path: string;
  message: string;
  severity: 'error' | 'warning';
};

export type NodeAdapter = {
  type: string;
  run: (
    ctx: ExecutionContext,
    params: Record<string, unknown>,
    inputs: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
};

export type ExecutionContext = {
  log: (nodeId: string, message: string) => void;
  cache: <T>(nodeId: string, key: string, producer: () => Promise<T>) => Promise<T>;
};

export type FlowRunResult = {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  output?: Record<string, unknown>;
};

export const FLOW_SCHEMA_VERSION = '0.1.0';
