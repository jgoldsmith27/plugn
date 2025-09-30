import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { nodeCategories } from '@/lib/nodeRegistry';
import { Badge } from '@/components/ui/badge';

export type PaletteProps = {
  onCreate: (type: string) => void;
};

export default function Palette({ onCreate }: PaletteProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    if (!lower) return nodeCategories;
    return nodeCategories
      .map(group => ({
        ...group,
        nodes: group.nodes.filter(node => node.label.toLowerCase().includes(lower) || node.type.toLowerCase().includes(lower))
      }))
      .filter(group => group.nodes.length > 0);
  }, [query]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">Palette</h3>
        <p className="text-xs text-muted-foreground">Drag blocks onto the canvas to compose a flow.</p>
      </div>
      <Input placeholder="Search nodes" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        {filtered.map(group => (
          <section key={group.category} className="space-y-3">
            <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{group.category}</span>
              <Badge variant="outline">{group.nodes.length}</Badge>
            </header>
            <div className="space-y-2">
              {group.nodes.map(node => (
                <button
                  key={node.type}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/5"
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.setData('application/reactflow', node.type);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDoubleClick={() => onCreate(node.type)}
                >
                  <div className="font-medium">{node.label}</div>
                  <div className="text-xs text-muted-foreground">{node.type}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No blocks match your search.</p>}
      </div>
    </div>
  );
}
