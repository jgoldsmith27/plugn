import { Fragment, useMemo, useState } from "react";
import { Citation, QueryResponse } from "../api";

type Props = {
  result: QueryResponse | null;
  error: string | null;
};

const friendlyMode: Record<QueryResponse["mode"], string> = {
  count: "Count",
  list: "List"
};

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function ResultsTable({ result, error }: Props) {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const slotEntries = useMemo(() => {
    if (!result) {
      return [];
    }
    return Object.entries(result.explain.slots).map(([key, value]) => [key, String(value)] as const);
  }, [result]);

  const validatorEntries = useMemo(() => {
    if (!result) {
      return [];
    }
    return Object.entries(result.explain.validators).map(([key, value]) => [key, value] as const);
  }, [result]);

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Answer &amp; Citations</h2>
          <p className="card-subtitle">Every row surfaces the enforcing event, key fields, and provenance sentence.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && !result && <div className="alert alert-info">Run a query to see structured answers with citations.</div>}

      {!error && result && (
        <div className="grid" style={{ gap: "18px" }}>
          <div className="alert alert-info">
            <strong>{friendlyMode[result.mode]} mode</strong> · {result.count} matching event{result.count === 1 ? "" : "s"}. Applied rule version <code>{result.applied_rules_version}</code>.
          </div>

          {result.notice && <div className="alert alert-error">{result.notice}</div>}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Date</th>
                  <th>Penalty</th>
                  <th>Regulation</th>
                  <th>Target Organisation</th>
                  <th>Citations</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--color-muted)" }}>
                      No events satisfied the current rule constraints.
                    </td>
                  </tr>
                )}
                {result.rows.map((row) => (
                  <tr key={row.event_id}>
                    <td>{row.event_id}</td>
                    <td>{row.date ?? "—"}</td>
                    <td>{formatCurrency(row.penalty_amount)}</td>
                    <td>{row.regulation ?? "—"}</td>
                    <td>{row.target_org ?? "—"}</td>
                    <td>
                      <ul className="chip-list">
                        {row.citations.map((citation, index) => (
                          <li key={`${row.event_id}-${index}`} className="chip" style={{ cursor: "pointer" }} onClick={() => setActiveCitation(citation)}>
                            View source #{citation.sent_idx + 1}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="explain-panel">
            <h3 style={{ marginTop: 0 }}>Planner Trace</h3>
            <p style={{ color: "var(--color-muted)", marginTop: "4px" }}>
              Slots are filled from the natural-language query (lexicon + regex). Validators run after the Cypher query to
              enforce policy (e.g. citation counts, negation filters).
            </p>
            <div className="grid" style={{ gap: "18px" }}>
              <div>
                <h4 style={{ marginBottom: "8px" }}>Slots</h4>
                {slotEntries.length === 0 ? (
                  <p style={{ color: "var(--color-muted)" }}>No slot hints detected.</p>
                ) : (
                  <dl className="key-value">
                    {slotEntries.map(([key, value]) => (
                      <Fragment key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </Fragment>
                    ))}
                  </dl>
                )}
              </div>
              <div>
                <h4 style={{ marginBottom: "8px" }}>Validators</h4>
                {validatorEntries.length === 0 ? (
                  <p style={{ color: "var(--color-muted)" }}>No validators configured.</p>
                ) : (
                  <ul className="chip-list">
                    {validatorEntries.map(([key, value]) => (
                      <li key={key} className="chip" style={{ background: value ? "rgba(4, 120, 87, 0.18)" : "rgba(220, 38, 38, 0.18)", color: value ? "#047857" : "#991b1b" }}>
                        {key}: {value ? "pass" : "fail"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: "8px" }}>Cypher Plan</h4>
              <pre style={{ margin: 0 }}>{result.explain.cypher}</pre>
            </div>
          </div>
        </div>
      )}

      {activeCitation && (
        <div className="modal-overlay" onClick={() => setActiveCitation(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Source snippet</h3>
            <p style={{ marginTop: 0 }}>
              <strong>Document:</strong> {activeCitation.doc_path}
              <br />
              <strong>Section:</strong> {activeCitation.section ?? "—"}
              <br />
              <strong>Sentence #</strong> {activeCitation.sent_idx + 1}
            </p>
            <p style={{ background: "rgba(255, 247, 237, 0.7)", padding: "12px", borderRadius: "12px" }}>{activeCitation.text}</p>
            <button className="button button-primary" onClick={() => setActiveCitation(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
