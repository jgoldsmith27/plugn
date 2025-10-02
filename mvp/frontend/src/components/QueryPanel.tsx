import { useState } from "react";

export type QueryMode = "auto" | "list" | "count";

type Props = {
  onSubmit: (queryText: string, mode: QueryMode) => Promise<void>;
  loading: boolean;
  error: string | null;
};

const EXAMPLES = [
  "How many SEC 10b-5 actions against ACME in 2024 over $1M?",
  "List SEC enforcement actions under 240.10b-5 last year",
  "Show actions by SEC against Zenith over $2M"
];

export function QueryPanel({ onSubmit, loading, error }: Props) {
  const [queryText, setQueryText] = useState("");
  const [mode, setMode] = useState<QueryMode>("auto");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!queryText.trim()) {
      return;
    }
    await onSubmit(queryText, mode);
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Ask a Question</h2>
          <p className="card-subtitle">Natural-language query → slot fill → Cypher plan → curated answer with citations.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid" style={{ gap: "16px" }}>
        <div className="form-control">
          <label htmlFor="query-input">Query</label>
          <input
            id="query-input"
            className="text-input"
            type="text"
            placeholder="e.g., How many SEC 10b-5 actions against ACME in 2024 over $1M?"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
          />
        </div>

        <div>
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-muted)" }}>Mode</span>
          <div className="segmented" style={{ marginTop: "8px" }}>
            {["auto", "list", "count"].map((option) => (
              <label key={option}>
                <input type="radio" value={option} checked={mode === option} onChange={() => setMode(option as QueryMode)} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example}
              className="button button-muted"
              style={{ fontSize: "0.85rem" }}
              onClick={() => setQueryText(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="button button-primary" disabled={loading || !queryText.trim()}>
            {loading ? "Running query…" : "Run query"}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      <div className="alert alert-info">
        The system extracts organisations, regulations, dates, monetary thresholds, and compiles them with the
        current rule set. If constraints eliminate all matches, you will see a polite message explaining why.
      </div>
    </section>
  );
}
