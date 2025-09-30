import { describe, expect, it } from 'vitest';
import { NodeRegistry, createNodeSpec, validateNodeParams } from '../nodeRegistry';

const REQUIRED_TYPES = [
  'io.input',
  'io.output',
  'source.local.files',
  'source.http.fetch',
  'transform.parse',
  'transform.chunk',
  'ml.embed',
  'rag.retrieve',
  'ai.generate',
  'store.vector.create',
  'store.vector.upsert',
  'control.branch'
];

describe('NodeRegistry', () => {
  it('includes required node types', () => {
    for (const type of REQUIRED_TYPES) {
      expect(NodeRegistry[type]).toBeDefined();
    }
  });

  it('applies default params when creating node specs', () => {
    const spec = createNodeSpec('transform.chunk');
    expect(spec.params.size).toBe(400);
    expect(spec.params.overlap).toBe(40);
  });

  it('validates missing required params', () => {
    const errors = validateNodeParams('rag.retrieve', {});
    expect(errors.some(issue => issue.path === 'indexRef' && issue.severity === 'error')).toBe(true);
  });
});
