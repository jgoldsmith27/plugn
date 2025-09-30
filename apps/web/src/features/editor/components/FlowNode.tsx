import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import type { NodeSpec, ValidationIssue } from '@plugn/types';
import type { NodeTypeSchema } from '@plugn/types';
import { Badge } from '@/components/ui/badge';
import { cn, categoryColors } from '@/lib/utils';
import type { FlowRunResult } from '@plugn/types';

export type FlowNodeData = {
  spec: NodeSpec;
  schema: NodeTypeSchema;
  issues: ValidationIssue[];
  status?: FlowRunResult['status'];
  onSelect: (id: string) => void;
};

function statusColor(status?: FlowRunResult['status']) {
  switch (status) {
    case 'running':
      return 'bg-amber-500 text-amber-50';
    case 'success':
      return 'bg-emerald-500 text-emerald-50';
    case 'error':
      return 'bg-red-500 text-red-50';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

const FlowNode = memo<NodeProps<FlowNodeData>>(({ id, data, selected }) => {
  const { spec, schema, issues, status } = data;
  const gradient = categoryColors[schema.category] ?? 'from-slate-500 to-slate-600';
  const hasErrors = issues.some(issue => issue.severity === 'error');
  const hasWarnings = issues.some(issue => issue.severity === 'warning');

  return (
    <div
      onClick={() => data.onSelect(id)}
      className={cn(
        'group relative min-w-[220px] rounded-2xl border bg-card text-left shadow-lg ring-2 ring-transparent transition-all',
        selected && 'ring-primary',
        hasErrors && 'border-destructive',
        !hasErrors && 'border-border'
      )}
    >
      <div className={cn('rounded-t-2xl px-4 py-3 text-sm font-semibold text-white', `bg-gradient-to-r ${gradient}`)}>
        {spec.label ?? schema.label}
      </div>
      <div className="flex flex-col gap-3 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{schema.category}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusColor(status))}>
            {status ?? 'idle'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {schema.inputs.map(port => (
            <Badge key={port.name} variant="outline">
              ⬅ {port.name}
            </Badge>
          ))}
          {schema.outputs.map(port => (
            <Badge key={port.name} variant="outline">
              ➡ {port.name}
            </Badge>
          ))}
        </div>
        <div className="space-y-1 text-xs">
          {hasErrors && <div className="text-destructive">{issues.find(issue => issue.severity === 'error')?.message}</div>}
          {!hasErrors && hasWarnings && <div className="text-amber-600">{issues.find(issue => issue.severity === 'warning')?.message}</div>}
          {!hasErrors && !hasWarnings && <div className="text-muted-foreground">{schema.params.length} params</div>}
        </div>
      </div>
      <div className="absolute left-0 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-2">
        {schema.inputs.map(port => (
          <Handle
            key={port.name}
            id={port.name}
            type="target"
            position={Position.Left}
            className="h-3 w-3 rounded-full border-2 border-background bg-muted"
            title={`${port.name}${port.dtype ? ` (${port.dtype})` : ''}`}
          />
        ))}
      </div>
      <div className="absolute right-0 top-1/2 flex translate-x-1/2 -translate-y-1/2 flex-col gap-2">
        {schema.outputs.map(port => (
          <Handle
            key={port.name}
            id={port.name}
            type="source"
            position={Position.Right}
            className="h-3 w-3 rounded-full border-2 border-background bg-muted"
            title={`${port.name}${port.dtype ? ` (${port.dtype})` : ''}`}
          />
        ))}
      </div>
    </div>
  );
});

export default FlowNode;
