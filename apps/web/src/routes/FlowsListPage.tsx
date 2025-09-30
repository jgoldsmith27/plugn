import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createEmptyFlow, createTemplateFlow } from '@/lib/templates';
import { useFlowsStore } from '@/store/flowsStore';
import { formatDate } from '@/lib/utils';

export default function FlowsListPage() {
  const navigate = useNavigate();
  const { flows, load, upsert } = useFlowsStore(state => ({
    flows: state.flows,
    load: state.load,
    upsert: state.upsert
  }));

  useEffect(() => {
    void load();
  }, []);

  const handleCreateFlow = async () => {
    const flow = createEmptyFlow('Untitled Flow');
    await upsert(flow);
    navigate(`/flows/${flow.id}/editor`);
  };

  const handleCreateTemplate = async () => {
    const flow = createTemplateFlow();
    await upsert(flow);
    navigate(`/flows/${flow.id}/editor`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flows</h1>
          <p className="text-sm text-muted-foreground">Autosaved locally with import/export support.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCreateTemplate}>
            Start from Template
          </Button>
          <Button onClick={handleCreateFlow}>New Flow</Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {flows.map(flow => (
          <Card key={flow.id} className="transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <Link to={`/flows/${flow.id}/editor`} className="hover:underline">
                  {flow.name}
                </Link>
                <Badge variant="outline">v0.1.0</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div>Last updated {formatDate(flow.updatedAt)}</div>
              <Button asChild className="mt-4 w-full">
                <Link to={`/flows/${flow.id}/editor`}>Open Editor</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {flows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No flows yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
