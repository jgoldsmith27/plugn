import type { NodeAdapter } from '@plugn/types';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hash(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

const adapters: NodeAdapter[] = [
  {
    type: 'io.input',
    run: async (_ctx, params) => {
      await sleep(50);
      return { value: params.value ?? null };
    }
  },
  {
    type: 'io.output',
    run: async (ctx, _params, inputs) => {
      await sleep(50);
      ctx.log('io.output', 'Output captured');
      return { value: inputs.value };
    }
  },
  {
    type: 'source.local.files',
    run: async (ctx, params) => {
      await sleep(150);
      const directory = (params.directory as string) ?? './data';
      ctx.log('source.local.files', `Reading files from ${directory}`);
      return {
        files: [
          { path: `${directory}/intro.txt`, content: 'Welcome to plugn! This is a mock file.' },
          { path: `${directory}/usage.txt`, content: 'Use nodes to build flows. This data is synthetic.' }
        ]
      };
    }
  },
  {
    type: 'source.http.fetch',
    run: async (ctx, params) => {
      await sleep(120);
      const url = params.url as string;
      ctx.log('source.http.fetch', `Fetching ${url}`);
      return {
        response: {
          status: 200,
          body: `Mock response from ${url}`,
          headers: { 'x-mock': 'true' }
        }
      };
    }
  },
  {
    type: 'transform.parse',
    run: async (ctx, params, inputs) => {
      await sleep(80);
      const files = (inputs.files as any[]) ?? [];
      ctx.log('transform.parse', `Parsing ${files.length} files`);
      const format = (params.format as string) ?? 'auto';
      const documents = files.map(file => ({
        id: hash(file.path),
        path: file.path,
        text: file.content,
        format
      }));
      return { documents };
    }
  },
  {
    type: 'transform.chunk',
    run: async (ctx, params, inputs) => {
      await sleep(80);
      const documents = (inputs.documents as any[]) ?? [];
      const size = Number(params.size ?? 400);
      const overlap = Number(params.overlap ?? 40);
      ctx.log('transform.chunk', `Chunking ${documents.length} docs`);
      const chunks: any[] = [];
      for (const doc of documents) {
        const text: string = doc.text ?? '';
        for (let i = 0; i < text.length; i += size - overlap) {
          const slice = text.slice(i, i + size);
          if (!slice) continue;
          chunks.push({
            id: `${doc.id}:${i}`,
            text: slice,
            document: doc
          });
        }
      }
      return { chunks };
    }
  },
  {
    type: 'ml.embed',
    run: async (ctx, params, inputs) => {
      await sleep(120);
      const dim = Number(params.dim ?? 8);
      const chunks = (inputs.chunks as any[]) ?? [];
      const embeddings = chunks.map((chunk, index) => ({
        id: `${chunk.id ?? index}`,
        text: chunk.text,
        vector: Array.from({ length: dim }, (_, i) => Math.sin((index + i + 1) * 0.37)),
        metadata: chunk.document ?? null
      }));
      ctx.log('ml.embed', `Generated ${embeddings.length} embeddings with dim ${dim}`);
      return { embeddings };
    }
  },
  {
    type: 'rag.retrieve',
    run: async (ctx, params, inputs) => {
      await sleep(100);
      const embeddings = (inputs.embeddings as any[]) ?? (inputs.vector ? [inputs.vector] : []);
      const k = Number(params.k ?? 3);
      ctx.log('rag.retrieve', `Selecting top ${k} matches`);
      const documents = embeddings.slice(0, k).map((embedding: any, index: number) => ({
        id: `${embedding.id ?? index}`,
        score: 1 - index * 0.1,
        text: embedding.text ?? 'Mock retrieved chunk',
        metadata: embedding.metadata ?? null
      }));
      return { documents };
    }
  },
  {
    type: 'ai.generate',
    run: async (ctx, params, inputs) => {
      await sleep(150);
      const prompt = inputs.prompt ?? '';
      const contextDocs = (inputs.context as any[]) ?? [];
      ctx.log('ai.generate', `Synthesizing response from ${contextDocs.length} context docs`);
      const response = `Mock completion using ${params.modelRef ?? 'mock-model'}\nPrompt: ${prompt}\nContext: ${contextDocs
        .map((doc: any) => doc.text)
        .join(' ')
        .slice(0, 180)}...`;
      return { response };
    }
  },
  {
    type: 'store.vector.create',
    run: async (ctx, params) => {
      await sleep(90);
      const id = `index-${Math.random().toString(16).slice(2, 8)}`;
      ctx.log('store.vector.create', `Created index ${id}`);
      return { index: { id, backend: params.backend ?? 'mockdb', dim: params.dim ?? 1536 } };
    }
  },
  {
    type: 'store.vector.upsert',
    run: async (ctx, params, inputs) => {
      await sleep(110);
      const embeddings = (inputs.embeddings as any[]) ?? [];
      const index = inputs.index ?? { id: params.indexRef ?? 'mock-index' };
      ctx.log('store.vector.upsert', `Upserting ${embeddings.length} embeddings`);
      return { result: { index, count: embeddings.length } };
    }
  },
  {
    type: 'control.branch',
    run: async (ctx, params, inputs) => {
      await sleep(40);
      const expression = (params.expression as string) ?? 'true';
      const input = inputs.input;
      let outcome = true;
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('input', `return (${expression});`);
        outcome = Boolean(fn(input));
      } catch (error) {
        ctx.log('control.branch', `Expression error: ${String(error)}`);
      }
      ctx.log('control.branch', `Branch evaluated to ${outcome}`);
      return { [outcome ? 'true' : 'false']: outcome } as Record<string, any>;
    }
  }
];

export const mockAdapterMap = new Map(adapters.map(adapter => [adapter.type, adapter]));

export function getAdapter(type: string) {
  const adapter = mockAdapterMap.get(type);
  if (!adapter) {
    throw new Error(`No adapter registered for ${type}`);
  }
  return adapter;
}

export { adapters as mockAdapters };
