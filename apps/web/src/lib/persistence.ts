import { del, get, set } from 'idb-keyval';
import type { Flow } from '@plugn/types';

const FLOW_INDEX_KEY = 'flows:index';

export type FlowSummary = {
  id: string;
  name: string;
  updatedAt: number;
};

async function readIndex(): Promise<FlowSummary[]> {
  return ((await get(FLOW_INDEX_KEY)) as FlowSummary[] | undefined) ?? [];
}

async function writeIndex(index: FlowSummary[]) {
  await set(FLOW_INDEX_KEY, index);
}

export async function listFlows(): Promise<FlowSummary[]> {
  const index = await readIndex();
  return index.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveFlow(flow: Flow): Promise<void> {
  const index = await readIndex();
  const summary: FlowSummary = {
    id: flow.id,
    name: flow.name,
    updatedAt: Date.now()
  };
  const filtered = index.filter(item => item.id !== flow.id);
  await Promise.all([
    set(`flow:${flow.id}`, flow),
    writeIndex([summary, ...filtered])
  ]);
}

export async function getFlow(id: string): Promise<Flow | undefined> {
  return (await get(`flow:${id}`)) as Flow | undefined;
}

export async function deleteFlow(id: string): Promise<void> {
  const index = await readIndex();
  await Promise.all([
    del(`flow:${id}`),
    writeIndex(index.filter(item => item.id !== id))
  ]);
}
