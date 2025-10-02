import { useEffect, useState } from "react";
import { acceptSuggestions, extractErrorMessage, getSuggestions, Suggestion } from "../api";

type Props = {
  refreshToken: number;
};

type Status = {
  kind: "success" | "error";
  message: string;
} | null;

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function badgeClass(kind: Suggestion["kind"]): string {
  return kind === "merge" ? "badge badge-merge" : "badge badge-field_type";
}

export function SuggestionsPanel({ refreshToken }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSuggestions() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSuggestions();
      setSuggestions(data);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err, "Unable to load suggestions."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuggestions();
  }, [refreshToken]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function accept() {
    if (selected.size === 0) {
      return;
    }
    try {
      setLoading(true);
      const updated = await acceptSuggestions(Array.from(selected));
      setSuggestions(updated);
      setSelected(new Set());
      setStatus({ kind: "success", message: "Suggestions applied. Ontology files updated." });
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: extractErrorMessage(err, "Failed to accept suggestions.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Ontology Suggestions</h2>
          <p className="card-subtitle">Merge aliases and confirm field typings generated from the latest ingest.</p>
        </div>
        <div className="button-group" style={{ display: "flex", gap: "12px" }}>
          <button className="button button-muted" onClick={loadSuggestions} disabled={loading}>
            Refresh
          </button>
          <button className="button button-primary" onClick={accept} disabled={loading || selected.size === 0}>
            Apply selected
          </button>
        </div>
      </header>

      {status && <div className={`alert alert-${status.kind}`}>{status.message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid" style={{ gap: "16px" }}>
        {loading && <div className="alert alert-info">Loading suggestions…</div>}
        {!loading && suggestions.length === 0 && <div className="alert alert-info">No pending suggestions right now.</div>}

        {suggestions.map((suggestion) => (
          <article key={suggestion.suggestion_id} className="card" style={{ boxShadow: "none", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <span className={badgeClass(suggestion.kind)}>{suggestion.kind.toUpperCase()}</span>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={selected.has(suggestion.suggestion_id)}
                  onChange={() => toggle(suggestion.suggestion_id)}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Select</span>
              </label>
            </div>
            <dl className="key-value">
              <dt>Confidence</dt>
              <dd>{(suggestion.confidence * 100).toFixed(1)}%</dd>
              <dt>Created</dt>
              <dd>{formatTimestamp(suggestion.created_at)}</dd>
            </dl>
            <pre style={{ margin: 0, background: "rgba(37,99,235,0.06)", padding: "12px", borderRadius: "12px" }}>
{JSON.stringify(suggestion.payload, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
