import type { NodeSpec, NodeTypeSchema, ParamSchema, PortSpec, ValidationIssue } from '@plugn/types';
import { v4 as uuid } from 'uuid';

export const NodeRegistry: Record<string, NodeTypeSchema> = {
  'io.input': {
    type: 'io.input',
    category: 'IO',
    label: 'Input',
    inputs: [],
    outputs: [{ name: 'value', kind: 'data', dtype: 'any' }],
    params: [
      { name: 'label', label: 'Label', type: 'string', default: 'Input' },
      { name: 'value', label: 'Default Value', type: 'json', help: 'Seed value for the pipeline.' }
    ]
  },
  'io.output': {
    type: 'io.output',
    category: 'IO',
    label: 'Output',
    inputs: [{ name: 'value', kind: 'data', dtype: 'any' }],
    outputs: [],
    params: [
      { name: 'label', label: 'Label', type: 'string', default: 'Output' }
    ]
  },
  'source.local.files': {
    type: 'source.local.files',
    category: 'Source',
    label: 'Local Files',
    inputs: [],
    outputs: [{ name: 'files', kind: 'data', dtype: 'File[]' }],
    params: [
      {
        name: 'directory',
        label: 'Directory',
        type: 'string',
        required: true,
        help: 'Mock directory path for sampling files.'
      }
    ]
  },
  'source.http.fetch': {
    type: 'source.http.fetch',
    category: 'Source',
    label: 'HTTP Fetch',
    inputs: [],
    outputs: [{ name: 'response', kind: 'data', dtype: 'HttpResponse' }],
    params: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' }
        ],
        default: 'GET'
      }
    ]
  },
  'transform.parse': {
    type: 'transform.parse',
    category: 'Transform',
    label: 'Parse',
    inputs: [{ name: 'files', kind: 'data', dtype: 'File[]' }],
    outputs: [{ name: 'documents', kind: 'data', dtype: 'Document[]' }],
    params: [
      {
        name: 'format',
        label: 'Format',
        type: 'select',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Text', value: 'text' },
          { label: 'CSV', value: 'csv' }
        ],
        default: 'auto'
      }
    ]
  },
  'transform.chunk': {
    type: 'transform.chunk',
    category: 'Transform',
    label: 'Chunk',
    inputs: [{ name: 'documents', kind: 'data', dtype: 'Document[]' }],
    outputs: [{ name: 'chunks', kind: 'data', dtype: 'Chunk[]' }],
    params: [
      { name: 'size', label: 'Chunk Size', type: 'number', required: true, default: 400 },
      { name: 'overlap', label: 'Overlap', type: 'number', default: 40 }
    ],
    validate: params => {
      const issues: ValidationIssue[] = [];
      const size = Number(params.size ?? 0);
      const overlap = Number(params.overlap ?? 0);
      if (!Number.isFinite(size) || size <= 0) {
        issues.push({ path: 'size', message: 'Size must be positive.', severity: 'error' });
      }
      if (overlap < 0) {
        issues.push({ path: 'overlap', message: 'Overlap must be >= 0.', severity: 'error' });
      }
      if (overlap >= size) {
        issues.push({ path: 'overlap', message: 'Overlap should be smaller than size.', severity: 'warning' });
      }
      return issues;
    }
  },
  'ml.embed': {
    type: 'ml.embed',
    category: 'AI',
    label: 'Embed',
    inputs: [{ name: 'chunks', kind: 'data', dtype: 'Chunk[]' }],
    outputs: [{ name: 'embeddings', kind: 'data', dtype: 'Embedding[]' }],
    params: [
      { name: 'modelRef', label: 'Model', type: 'modelRef', required: true },
      { name: 'dim', label: 'Dimension', type: 'number', default: 1536 }
    ]
  },
  'rag.retrieve': {
    type: 'rag.retrieve',
    category: 'AI',
    label: 'Retrieve',
    inputs: [
      { name: 'vector', kind: 'data', dtype: 'Embedding' }
    ],
    outputs: [{ name: 'documents', kind: 'data', dtype: 'Document[]' }],
    params: [
      { name: 'indexRef', label: 'Vector Index', type: 'connectionRef', required: true },
      { name: 'k', label: 'Top K', type: 'number', default: 3 }
    ]
  },
  'ai.generate': {
    type: 'ai.generate',
    category: 'AI',
    label: 'Generate',
    inputs: [
      { name: 'prompt', kind: 'data', dtype: 'string' },
      { name: 'context', kind: 'data', dtype: 'Document[]' }
    ],
    outputs: [{ name: 'response', kind: 'data', dtype: 'string' }],
    params: [
      { name: 'modelRef', label: 'Model', type: 'modelRef', required: true },
      {
        name: 'promptTemplate',
        label: 'Prompt Template',
        type: 'json',
        default: 'You are a helpful assistant. Context: {{context}}\nPrompt: {{prompt}}'
      }
    ]
  },
  'store.vector.create': {
    type: 'store.vector.create',
    category: 'Store',
    label: 'Create Vector Index',
    inputs: [],
    outputs: [{ name: 'index', kind: 'data', dtype: 'VectorIndex' }],
    params: [
      { name: 'backend', label: 'Backend', type: 'select', options: [
        { label: 'MockDB', value: 'mockdb' },
        { label: 'Chroma', value: 'chroma' }
      ], default: 'mockdb' },
      { name: 'dim', label: 'Dimension', type: 'number', required: true, default: 1536 }
    ]
  },
  'store.vector.upsert': {
    type: 'store.vector.upsert',
    category: 'Store',
    label: 'Vector Upsert',
    inputs: [
      { name: 'embeddings', kind: 'data', dtype: 'Embedding[]' },
      { name: 'index', kind: 'data', dtype: 'VectorIndex' }
    ],
    outputs: [{ name: 'result', kind: 'data', dtype: 'UpsertResult' }],
    params: [
      { name: 'indexRef', label: 'Index Connection', type: 'connectionRef' }
    ]
  },
  'control.branch': {
    type: 'control.branch',
    category: 'Control',
    label: 'Branch',
    inputs: [{ name: 'input', kind: 'data', dtype: 'any' }],
    outputs: [
      { name: 'true', kind: 'control', dtype: 'boolean' },
      { name: 'false', kind: 'control', dtype: 'boolean' }
    ],
    params: [
      { name: 'expression', label: 'Expression', type: 'string', required: true, default: 'true' }
    ]
  }
};

export function createNodeSpec(type: string, position = { x: 0, y: 0 }): NodeSpec {
  const schema = NodeRegistry[type];
  if (!schema) {
    throw new Error(`Unknown node type: ${type}`);
  }
  const params: Record<string, unknown> = {};
  for (const param of schema.params) {
    if (param.default !== undefined) {
      params[param.name] = param.default;
    }
  }
  return {
    id: uuid(),
    type: schema.type,
    label: schema.label,
    position,
    inputs: schema.inputs.map(port => ({ ...port })),
    outputs: schema.outputs.map(port => ({ ...port })),
    params
  };
}

export const nodeCategories = Array.from(
  Object.values(NodeRegistry).reduce((acc, schema) => {
    const existing = acc.get(schema.category) ?? [];
    existing.push(schema);
    acc.set(schema.category, existing);
    return acc;
  }, new Map<NodeTypeSchema['category'], NodeTypeSchema[]>()),
  ([category, nodes]) => ({
    category,
    nodes: nodes.sort((a, b) => a.label.localeCompare(b.label))
  })
).sort((a, b) => a.category.localeCompare(b.category));

export function validateNodeParams(type: string, params: Record<string, unknown>) {
  const schema = NodeRegistry[type];
  if (!schema) return [];
  const missing = schema.params
    .filter(param => param.required && (params[param.name] === undefined || params[param.name] === ''))
    .map<ValidationIssue>(param => ({
      path: param.name,
      message: 'Required field',
      severity: 'error'
    }));
  const custom = schema.validate ? schema.validate(params) : [];
  return [...missing, ...custom];
}

export function getPortSpec(node: NodeSpec, direction: 'input' | 'output', portName: string): PortSpec | undefined {
  const list = direction === 'input' ? node.inputs ?? [] : node.outputs ?? [];
  return list.find(port => port.name === portName);
}
