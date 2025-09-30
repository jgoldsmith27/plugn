import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { NodeSpec, ValidationIssue } from '@plugn/types';
import type { NodeTypeSchema, ParamSchema } from '@plugn/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export type InspectorProps = {
  node?: NodeSpec;
  schema?: NodeTypeSchema;
  issues: ValidationIssue[];
  onChange: (params: Record<string, unknown>) => void;
  onLabelChange: (label: string) => void;
  cacheEnabled: boolean;
  onToggleCache: () => void;
  connectionOptions: { label: string; value: string }[];
  modelOptions: { label: string; value: string }[];
};

export default function Inspector({
  node,
  schema,
  issues,
  onChange,
  cacheEnabled,
  onToggleCache,
  onLabelChange,
  connectionOptions,
  modelOptions
}: InspectorProps) {
  const form = useForm<Record<string, unknown>>({
    defaultValues: node?.params ?? {}
  });

  useEffect(() => {
    form.reset(node?.params ?? {});
  }, [node?.id]);

  useEffect(() => {
    const subscription = form.watch(values => {
      const next: Record<string, unknown> = {};
      for (const param of schema?.params ?? []) {
        const value = (values as any)[param.name];
        if (param.type === 'json') {
          try {
            next[param.name] = value ? JSON.parse(value as string) : undefined;
          } catch (error) {
            next[param.name] = value;
          }
        } else {
          next[param.name] = value;
        }
      }
      onChange(next);
    });
    return () => subscription.unsubscribe();
  }, [form, schema, onChange]);

  const fieldIssues = (name: string) => issues.filter(issue => issue.path === name);

  if (!node || !schema) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground">
        <p>Select a node to configure its parameters.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card/80 p-4">
      <div>
        <h3 className="text-lg font-semibold">Inspector</h3>
        <p className="text-xs text-muted-foreground">{schema.label}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="node-label">Display Label</Label>
        <Input
          id="node-label"
          value={node.label ?? ''}
          onChange={event => onLabelChange(event.target.value)}
          placeholder={schema.label}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
        <div>
          <div className="text-sm font-medium">Cache node output</div>
          <div className="text-xs text-muted-foreground">Reuse results for identical inputs.</div>
        </div>
        <Switch checked={cacheEnabled} onCheckedChange={onToggleCache} />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {schema.params.map(param => {
          const value = form.watch(param.name);
          const errors = fieldIssues(param.name);
          return (
            <div key={param.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`param-${param.name}`}>{param.label}</Label>
                {param.required && <Badge variant="outline">Required</Badge>}
              </div>
              <ParamField
                param={param}
                value={value}
                onChange={next => form.setValue(param.name, next)}
                connectionOptions={connectionOptions}
                modelOptions={modelOptions}
              />
              {errors.map(issue => (
                <div
                  key={issue.message}
                  className={issue.severity === 'error' ? 'text-xs text-destructive' : 'text-xs text-amber-600'}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          );
        })}
        {schema.params.length === 0 && <p className="text-sm text-muted-foreground">This node has no configurable parameters.</p>}
      </div>
    </div>
  );
}

type FieldProps = {
  param: ParamSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  connectionOptions: { label: string; value: string }[];
  modelOptions: { label: string; value: string }[];
};

function ParamField({ param, value, onChange, connectionOptions, modelOptions }: FieldProps) {
  switch (param.type) {
    case 'string':
      return <Input id={`param-${param.name}`} value={(value as string) ?? ''} onChange={event => onChange(event.target.value)} />;
    case 'number':
      return (
        <Input
          id={`param-${param.name}`}
          type="number"
          value={value !== undefined ? Number(value) : ''}
          onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
        />
      );
    case 'boolean':
      return <Switch checked={Boolean(value)} onCheckedChange={checked => onChange(checked)} />;
    case 'select':
      return (
        <Select
          value={(value as string) ?? (param.options?.[0]?.value ?? '')}
          options={param.options ?? []}
          onChange={event => onChange(event.target.value)}
        />
      );
    case 'json':
      return (
        <Textarea
          id={`param-${param.name}`}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={event => onChange(event.target.value)}
        />
      );
    case 'connectionRef':
      return (
        <Select
          value={(value as string) ?? ''}
          options={connectionOptions}
          onChange={event => onChange(event.target.value)}
        />
      );
    case 'modelRef':
      return (
        <Select
          value={(value as string) ?? ''}
          options={modelOptions}
          onChange={event => onChange(event.target.value)}
        />
      );
    default:
      return <Input id={`param-${param.name}`} value={(value as string) ?? ''} onChange={event => onChange(event.target.value)} />;
  }
}
