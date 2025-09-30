import type { Flow, EdgeSpec, NodeSpec } from '@plugn/types';
import { FLOW_SCHEMA_VERSION } from '@plugn/types';
import { createNodeSpec } from './nodeRegistry';
import { v4 as uuid } from 'uuid';

export function createEmptyFlow(name: string): Flow {
  return {
    id: uuid(),
    name,
    version: FLOW_SCHEMA_VERSION,
    nodes: [],
    edges: []
  };
}

export function createTemplateFlow(): Flow {
  const flow = createEmptyFlow('RAG Template');
  const nodes: NodeSpec[] = [];

  const localFiles = createNodeSpec('source.local.files', { x: 0, y: 0 });
  localFiles.params.directory = './docs';
  nodes.push(localFiles);

  const parse = createNodeSpec('transform.parse', { x: 220, y: 0 });
  nodes.push(parse);

  const chunk = createNodeSpec('transform.chunk', { x: 440, y: 0 });
  nodes.push(chunk);

  const embed = createNodeSpec('ml.embed', { x: 660, y: 0 });
  nodes.push(embed);

  const createIndex = createNodeSpec('store.vector.create', { x: 660, y: 200 });
  nodes.push(createIndex);

  const upsert = createNodeSpec('store.vector.upsert', { x: 880, y: 0 });
  nodes.push(upsert);

  const queryInput = createNodeSpec('io.input', { x: 0, y: 220 });
  queryInput.params.label = 'User Query';
  queryInput.params.value = 'What is inside these docs?';
  nodes.push(queryInput);

  const queryEmbed = createNodeSpec('ml.embed', { x: 220, y: 220 });
  nodes.push(queryEmbed);

  const retrieve = createNodeSpec('rag.retrieve', { x: 440, y: 220 });
  nodes.push(retrieve);

  const prompt = createNodeSpec('ai.generate', { x: 660, y: 220 });
  nodes.push(prompt);

  const output = createNodeSpec('io.output', { x: 880, y: 220 });
  nodes.push(output);

  const edges: EdgeSpec[] = [
    { id: uuid(), from: { nodeId: localFiles.id, port: 'files' }, to: { nodeId: parse.id, port: 'files' } },
    { id: uuid(), from: { nodeId: parse.id, port: 'documents' }, to: { nodeId: chunk.id, port: 'documents' } },
    { id: uuid(), from: { nodeId: chunk.id, port: 'chunks' }, to: { nodeId: embed.id, port: 'chunks' } },
    { id: uuid(), from: { nodeId: embed.id, port: 'embeddings' }, to: { nodeId: upsert.id, port: 'embeddings' } },
    { id: uuid(), from: { nodeId: createIndex.id, port: 'index' }, to: { nodeId: upsert.id, port: 'index' } },
    { id: uuid(), from: { nodeId: queryInput.id, port: 'value' }, to: { nodeId: queryEmbed.id, port: 'chunks' } },
    { id: uuid(), from: { nodeId: queryEmbed.id, port: 'embeddings' }, to: { nodeId: retrieve.id, port: 'vector' } },
    { id: uuid(), from: { nodeId: retrieve.id, port: 'documents' }, to: { nodeId: prompt.id, port: 'context' } },
    { id: uuid(), from: { nodeId: queryInput.id, port: 'value' }, to: { nodeId: prompt.id, port: 'prompt' } },
    { id: uuid(), from: { nodeId: prompt.id, port: 'response' }, to: { nodeId: output.id, port: 'value' } }
  ];

  return { ...flow, nodes, edges };
}
