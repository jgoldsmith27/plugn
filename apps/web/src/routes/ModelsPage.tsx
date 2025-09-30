import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listModels, createModel, deleteModel } from '@/lib/mockApi';
import { v4 as uuid } from 'uuid';

export default function ModelsPage() {
  const queryClient = useQueryClient();
  const { data: models } = useQuery({ queryKey: ['models'], queryFn: listModels });
  const [name, setName] = useState('text-embedding-3-small');
  const [provider, setProvider] = useState('openai');
  const [kind, setKind] = useState<'embedding' | 'chat' | 'completion'>('embedding');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createModel({ id: uuid(), name, provider, kind });
    queryClient.invalidateQueries({ queryKey: ['models'] });
  };

  const handleDelete = async (id: string) => {
    await deleteModel(id);
    queryClient.invalidateQueries({ queryKey: ['models'] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Models</h1>
        <p className="text-sm text-muted-foreground">Define mock model references for adapter forms.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/80 p-4">
        <Input value={provider} onChange={event => setProvider(event.target.value)} placeholder="Provider" className="w-36" />
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Model name" className="flex-1" />
        <Input value={kind} onChange={event => setKind(event.target.value as any)} placeholder="Kind" className="w-40" />
        <Button type="submit">Add Model</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(models ?? []).map(model => (
          <Card key={model.id}>
            <CardHeader>
              <CardTitle className="text-base">{model.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{model.provider} · {model.kind}</span>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(model.id)}>
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
        {(models ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No models yet.
          </div>
        )}
      </div>
    </div>
  );
}
