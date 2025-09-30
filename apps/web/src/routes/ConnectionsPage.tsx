import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listConnections, createConnection, deleteConnection } from '@/lib/mockApi';
import { v4 as uuid } from 'uuid';

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: listConnections });
  const [name, setName] = useState('');
  const [type, setType] = useState('vector');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createConnection({ id: uuid(), name, type });
    setName('');
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const handleDelete = async (id: string) => {
    await deleteConnection(id);
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">Mock credentials stored locally for demo fields.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/80 p-4">
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Connection name" className="flex-1" />
        <Input value={type} onChange={event => setType(event.target.value)} placeholder="Type" className="w-40" />
        <Button type="submit">Add Connection</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(connections ?? []).map(connection => (
          <Card key={connection.id}>
            <CardHeader>
              <CardTitle className="text-base">{connection.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{connection.type}</span>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(connection.id)}>
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
        {(connections ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No connections yet.
          </div>
        )}
      </div>
    </div>
  );
}
