import { create } from 'zustand';
import type { Flow } from '@plugn/types';
import { deleteFlow, FlowSummary, getFlow, listFlows, saveFlow } from '@/lib/persistence';

export type FlowsState = {
  flows: FlowSummary[];
  loading: boolean;
  load: () => Promise<void>;
  get: (id: string) => Promise<Flow | undefined>;
  upsert: (flow: Flow) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useFlowsStore = create<FlowsState>((set, get) => ({
  flows: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    const flows = await listFlows();
    set({ flows, loading: false });
  },
  get: async id => getFlow(id),
  upsert: async flow => {
    await saveFlow(flow);
    await get().load();
  },
  remove: async id => {
    await deleteFlow(id);
    await get().load();
  }
}));
