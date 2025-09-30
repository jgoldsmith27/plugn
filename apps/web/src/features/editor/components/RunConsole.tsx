import { useState } from 'react';
import type { FlowRunResult } from '@plugn/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type RunConsoleProps = {
  results: Record<string, FlowRunResult>;
  logs: Record<string, string[]>;
  nodeOrder: { id: string; label: string }[];
};

function statusBadge(status?: FlowRunResult['status']) {
  switch (status) {
    case 'running':
      return 'bg-amber-500 text-white';
    case 'success':
      return 'bg-emerald-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function RunConsole({ results, logs, nodeOrder }: RunConsoleProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-border bg-card/80 shadow-sm">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide">Run Console</h3>
          <p className="text-xs text-muted-foreground">Synthetic execution logs and previews.</p>
        </div>
        <Button variant="ghost" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'Show'}
        </Button>
      </header>
      {expanded && (
        <div className="max-h-72 space-y-4 overflow-y-auto px-4 pb-4">
          {nodeOrder.map(node => {
            const result = results[node.id];
            const nodeLogs = logs[node.id] ?? [];
            return (
              <section key={node.id} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{node.label}</div>
                  <Badge className={statusBadge(result?.status)}>{result?.status ?? 'idle'}</Badge>
                </div>
                {result?.error && <p className="text-xs text-destructive">{result.error}</p>}
                {result?.output && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted/30 p-2 text-xs">
                    {JSON.stringify(result.output, null, 2)}
                  </pre>
                )}
                {nodeLogs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {nodeLogs.map((log, index) => (
                      <li key={index}>{log}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {nodeOrder.length === 0 && <p className="text-sm text-muted-foreground">No nodes to display.</p>}
        </div>
      )}
    </div>
  );
}
