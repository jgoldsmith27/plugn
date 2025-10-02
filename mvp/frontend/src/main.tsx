import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getProfile,
  ProfileResponse,
  IngestResponse,
  runQuery,
  QueryResponse,
  extractErrorMessage
} from "./api";
import { UploadPanel } from "./components/UploadPanel";
import { SuggestionsPanel } from "./components/SuggestionsPanel";
import { RulesPanel } from "./components/RulesPanel";
import { QueryPanel, QueryMode } from "./components/QueryPanel";
import { ResultsTable } from "./components/ResultsTable";

import "./styles.css";

type ProfileStatus = "idle" | "loading" | "ready" | "error";

function App() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileState, setProfileState] = useState<ProfileStatus>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [lastIngest, setLastIngest] = useState<IngestResponse | null>(null);
  const [results, setResults] = useState<QueryResponse | null>(null);
  const [suggestionRefresh, setSuggestionRefresh] = useState(0);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  async function refreshProfile() {
    try {
      setProfileState("loading");
      const data = await getProfile();
      setProfile(data);
      setProfileState("ready");
      setProfileError(null);
    } catch (error) {
      console.error(error);
      setProfileState("error");
      setProfileError(extractErrorMessage(error, "Unable to load profile metrics."));
    }
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  async function handleIngest(response: IngestResponse) {
    setLastIngest(response);
    setSuggestionRefresh((value) => value + 1);
    await refreshProfile();
  }

  async function handleQuery(queryText: string, mode: QueryMode) {
    try {
      setQueryError(null);
      setQueryLoading(true);
      const data = await runQuery({ query_text: queryText, mode });
      setResults(data);
    } catch (error) {
      console.error(error);
      setResults(null);
      setQueryError(extractErrorMessage(error, "Query failed. Check rule constraints and try again."));
    } finally {
      setQueryLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header" style={{ marginBottom: "32px" }}>
        <h1>Tenant Ontology Intelligence</h1>
        <p>
          Rule-first ingestion, ontology-aware event extraction, and explainable answers with exact citations.
          Ingest documents, curate the ontology, refine rules, then ask policy-compliant questions.
        </p>
      </header>

      <div className="grid two-column">
        <UploadPanel onComplete={handleIngest} />

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Data Profile</h2>
              <p className="card-subtitle">Snapshot of documents and facts currently indexed in Neo4j.</p>
            </div>
          </header>

          {profileState === "loading" && <div className="alert alert-info">Loading profile metrics…</div>}
          {profileState === "error" && profileError && <div className="alert alert-error">{profileError}</div>}
          {profileState === "ready" && profile && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <div className="badge-inline">Documents: {profile.documents}</div>
                <div className="badge-inline">Events: {profile.events}</div>
                <div className="badge-inline">Organisations: {profile.organizations}</div>
                <div className="badge-inline">Regulations: {profile.regulations}</div>
              </div>
              {profile.fields.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: "8px" }}>Detected Fields</h3>
                  <ul style={{ paddingLeft: "20px", margin: 0 }}>
                    {profile.fields.map((field) => (
                      <li key={field.name} style={{ marginBottom: "4px" }}>
                        <strong>{field.name}</strong> → {field.detected_type ?? "unknown"}
                        {field.sample_values.length > 0 && (
                          <span style={{ color: "var(--color-muted)", marginLeft: "8px" }}>
                            Samples: {field.sample_values.join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lastIngest && (
                <div className="alert alert-success">
                  Latest ingest processed {lastIngest.documents_processed} document(s), extracted {lastIngest.events_created} events,
                  and proposed {lastIngest.suggestions_generated} suggestion(s).
                </div>
              )}
            </>
          )}
        </section>

        <SuggestionsPanel refreshToken={suggestionRefresh} />
        <RulesPanel />
      </div>

      <div className="grid full" style={{ marginTop: "32px" }}>
        <QueryPanel onSubmit={handleQuery} loading={queryLoading} error={queryError} />
        <ResultsTable result={results} error={queryError} />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
