import { del, get, set } from 'idb-keyval';

export type Connection = {
  id: string;
  name: string;
  type: string;
};

export type ModelRef = {
  id: string;
  provider: string;
  name: string;
  kind: 'embedding' | 'chat' | 'completion';
};

const CONNECTIONS_KEY = 'connections';
const MODELS_KEY = 'models';

export async function listConnections(): Promise<Connection[]> {
  return ((await get(CONNECTIONS_KEY)) as Connection[] | undefined) ?? [];
}

export async function createConnection(connection: Connection): Promise<void> {
  const connections = await listConnections();
  await set(CONNECTIONS_KEY, [connection, ...connections.filter(c => c.id !== connection.id)]);
}

export async function deleteConnection(id: string): Promise<void> {
  const connections = await listConnections();
  await set(CONNECTIONS_KEY, connections.filter(conn => conn.id !== id));
}

export async function listModels(): Promise<ModelRef[]> {
  return ((await get(MODELS_KEY)) as ModelRef[] | undefined) ?? [];
}

export async function createModel(model: ModelRef): Promise<void> {
  const models = await listModels();
  await set(MODELS_KEY, [model, ...models.filter(m => m.id !== model.id)]);
}

export async function deleteModel(id: string): Promise<void> {
  const models = await listModels();
  await set(MODELS_KEY, models.filter(model => model.id !== id));
}
