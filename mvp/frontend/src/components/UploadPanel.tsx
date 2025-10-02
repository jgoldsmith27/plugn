import { useState } from "react";
import { ingest, IngestResponse } from "../api";

type Props = {
  onComplete: (response: IngestResponse) => void;
};

type StatusKind = "success" | "error" | "info";

type Status = {
  kind: StatusKind;
  message: string;
} | null;

export function UploadPanel({ onComplete }: Props) {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function handleIngest() {
    try {
      setLoading(true);
      setStatus({ kind: "info", message: "Scanning data directory and extracting events…" });
      const result = await ingest();
      setStatus({
        kind: "success",
        message: `Processed ${result.documents_processed} document(s), extracted ${result.events_created} event(s), and captured ${result.spans_indexed} citation span(s).`
      });
      onComplete(result);
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", message: "Ingest failed. Check backend logs for details." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Ingest Documents</h2>
          <p className="card-subtitle">Pull SEC filings, CSVs, and TXT notes from <code>backend/data</code>.</p>
        </div>
        <button className="button button-primary" onClick={handleIngest} disabled={loading}>
          {loading ? "Running ingest…" : "Run ingest"}
        </button>
      </header>
      <ul className="chip-list">
        <li className="chip">PDF parsing via pypdf</li>
        <li className="chip">Regex-driven event extraction</li>
        <li className="chip">Provenance spans for citations</li>
      </ul>
      {status && (
        <div className={`alert alert-${status.kind}`}>
          {status.message}
        </div>
      )}
    </section>
  );
}
