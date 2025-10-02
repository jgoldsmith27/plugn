import { useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import {
  getRuleBlocks,
  getRules,
  RuleBlocks,
  RuleSet,
  saveRules,
  generateRules,
  validateQuickRules,
  QuickRules
} from "../api";
import { extractErrorMessage } from "../api";

type Status = {
  kind: "success" | "error";
  message: string;
} | null;

const formatCurrency = (value: number | null | undefined): string =>
  value !== null && value !== undefined ? `$${value.toLocaleString()}` : "—";

const formatNumber = (value: number | null | undefined): string =>
  value !== null && value !== undefined ? value.toString() : "—";

const formatAverage = (value: number | null | undefined): string =>
  value !== null && value !== undefined ? value.toFixed(1) : "—";

function rulesToQuick(rules: RuleSet, blocks?: RuleBlocks | null): QuickRules {
  const sourceFallback = blocks?.source_orgs?.length ? [blocks.source_orgs[0]] : [];
  const sources = rules.must?.source_org ?? sourceFallback;
  const statutes = rules.must?.statute_ids ?? [];
  const start = rules.time_window?.start ?? undefined;
  const end = rules.time_window?.end ?? undefined;
  const penalty = rules.thresholds?.penalty_amount_min ?? undefined;
  const minCitationsValue = (() => {
    const raw = rules.quality?.min_citations;
    if (typeof raw === "number") {
      return raw;
    }
    if (typeof raw === "string" && raw.trim().length) {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  })();
  const excludeNegatedRaw = rules.quality?.exclude_negated;

  return {
    sources,
    statutes,
    date: { from: start, to: end },
    penalty_min: penalty,
    min_citations: minCitationsValue ?? 1,
    include_subsidiaries: Boolean(rules.include_subsidiaries),
    exclude_negated: typeof excludeNegatedRaw === "boolean" ? excludeNegatedRaw : true
  };
}

export function RulesPanel() {
  const [yamlText, setYamlText] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<RuleBlocks | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [quickRules, setQuickRules] = useState<QuickRules | null>(null);
  const [quickSummary, setQuickSummary] = useState<string>("");
  const [quickLoading, setQuickLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [rulesData, blockData] = await Promise.all([getRules(), getRuleBlocks()]);
        if (cancelled) {
          return;
        }
        setBlocks(blockData);
        setBlockError(null);
        const hydrated = rulesToQuick(rulesData, blockData);
        setQuickRules(hydrated);
        try {
          const validation = await validateQuickRules(hydrated);
          if (!cancelled) {
            setQuickSummary(validation.summary);
            setYamlText(yaml.dump(validation.rules));
          }
        } catch (validationError) {
          console.error(validationError);
          if (!cancelled) {
            setYamlText(yaml.dump(rulesData));
          }
        }
        if (!cancelled) {
          setStatus(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setStatus({ kind: "error", message: extractErrorMessage(error, "Unable to load rules.") });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    try {
      setLoading(true);
      const parsed = yaml.load(yamlText) as RuleSet;
      await saveRules(parsed);
      setStatus({ kind: "success", message: "Rules updated. New constraints will apply to the next query." });
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", message: extractErrorMessage(error, "Invalid YAML or rule payload.") });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setLoading(true);
      const generated = await generateRules({});
      setYamlText(yaml.dump(generated));
      setStatus({ kind: "success", message: "Generated rule set from current data footprint." });
      if (blocks) {
        const hydrated = rulesToQuick(generated, blocks);
        setQuickRules(hydrated);
        const validation = await validateQuickRules(hydrated);
        setQuickSummary(validation.summary);
        setYamlText(yaml.dump(validation.rules));
      }
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", message: extractErrorMessage(error, "Unable to generate rules.") });
    } finally {
      setLoading(false);
    }
  }

  async function applyQuickRules() {
    if (!quickRules) {
      return;
    }
    try {
      setQuickLoading(true);
      const validation = await validateQuickRules(quickRules);
      setQuickSummary(validation.summary);
      setYamlText(yaml.dump(validation.rules));
      setStatus({ kind: "success", message: "Quick rules applied. Save to persist." });
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", message: extractErrorMessage(error, "Unable to apply quick rules.") });
    } finally {
      setQuickLoading(false);
    }
  }

  const sourceOptions = useMemo(() => {
    const options = new Set<string>();
    if (blocks?.source_orgs) {
      blocks.source_orgs.forEach((value) => options.add(value));
    }
    if (quickRules?.sources) {
      quickRules.sources.forEach((value) => options.add(value));
    }
    return Array.from(options);
  }, [blocks, quickRules]);

  const statuteOptions = useMemo(() => {
    const options = new Set<string>();
    blocks?.regulations?.forEach((reg) => {
      if (reg.reg_id) {
        options.add(reg.reg_id);
      }
    });
    if (quickRules?.statutes) {
      quickRules.statutes.forEach((value) => options.add(value));
    }
    return Array.from(options);
  }, [blocks, quickRules]);

  const toggleChip = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Rulebook</h2>
          <p className="card-subtitle">Tenant policy expressed as YAML. Each block compiles into Cypher filters and validators.</p>
        </div>
        <div className="button-group" style={{ display: "flex", gap: "12px" }}>
          <button className="button button-muted" onClick={handleGenerate} disabled={loading || quickLoading}>
            {loading ? "Generating…" : "Generate from data"}
          </button>
          <button className="button button-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save rules"}
          </button>
        </div>
      </header>

      <div className="alert alert-info">
        <strong>How rules are applied:</strong> Every query inherits these constraints. <code>must.*</code> entries become <em>WHERE</em> filters, <code>time_window</code> constrains dates, <code>thresholds</code> set numeric minimums, and <code>quality</code> runs post-query validators (e.g. citation counts, negation checks).
      </div>

      {quickRules && (
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--color-border)", gap: "12px" }}>
          <h3 style={{ margin: 0 }}>Quick configuration</h3>
          <div className="grid" style={{ gap: "12px" }}>
            <div>
              <strong>Sources</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {sourceOptions.map((source) => {
                  const selected = quickRules.sources.includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      className="button button-muted"
                      style={{
                        backgroundColor: selected ? "var(--color-primary)" : undefined,
                        color: selected ? "#fff" : undefined
                      }}
                      onClick={() =>
                        setQuickRules((prev) =>
                          prev ? { ...prev, sources: toggleChip(prev.sources, source) } : prev
                        )
                      }
                    >
                      {source}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <strong>Statutes</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {statuteOptions.map((statute) => {
                  const selected = quickRules.statutes.includes(statute);
                  return (
                    <button
                      key={statute}
                      type="button"
                      className="button button-muted"
                      style={{
                        backgroundColor: selected ? "var(--color-primary)" : undefined,
                        color: selected ? "#fff" : undefined
                      }}
                      onClick={() =>
                        setQuickRules((prev) =>
                          prev ? { ...prev, statutes: toggleChip(prev.statutes, statute) } : prev
                        )
                      }
                    >
                      {statute}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid" style={{ gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <label className="form-control">
                <span>From (date)</span>
                <input
                  type="date"
                  className="text-input"
                  value={quickRules.date?.from ?? ""}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            date: { ...prev.date, from: event.target.value || undefined }
                          }
                        : prev
                    )
                  }
                />
              </label>
              <label className="form-control">
                <span>To (date)</span>
                <input
                  type="date"
                  className="text-input"
                  value={quickRules.date?.to ?? ""}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            date: { ...prev.date, to: event.target.value || undefined }
                          }
                        : prev
                    )
                  }
                />
              </label>
              <label className="form-control">
                <span>Penalty minimum</span>
                <input
                  type="number"
                  className="text-input"
                  min={0}
                  value={quickRules.penalty_min ?? ""}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            penalty_min: event.target.value ? Number(event.target.value) : undefined
                          }
                        : prev
                    )
                  }
                  placeholder="e.g. 1000000"
                />
              </label>
              <label className="form-control">
                <span>Minimum citations</span>
                <input
                  type="number"
                  className="text-input"
                  min={0}
                  max={5}
                  value={quickRules.min_citations ?? 0}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            min_citations: event.target.value ? Number(event.target.value) : 0
                          }
                        : prev
                    )
                  }
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={quickRules.include_subsidiaries}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev ? { ...prev, include_subsidiaries: event.target.checked } : prev
                    )
                  }
                />
                Include subsidiaries
              </label>
              <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={quickRules.exclude_negated}
                  onChange={(event) =>
                    setQuickRules((prev) =>
                      prev ? { ...prev, exclude_negated: event.target.checked } : prev
                    )
                  }
                />
                Exclude negated events
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-primary"
                onClick={applyQuickRules}
                disabled={quickLoading}
              >
                {quickLoading ? "Applying…" : "Apply quick rules"}
              </button>
              {quickSummary && <span className="badge-inline">{quickSummary}</span>}
            </div>
          </div>
        </div>
      )}

      {blockError && <div className="alert alert-error">{blockError}</div>}
      {blocks && (
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--color-border)" }}>
          <h3 style={{ marginTop: 0 }}>Data-driven blocks</h3>
          <div className="grid" style={{ gap: "12px" }}>
            <div>
              <strong>Source organisations</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                {blocks.source_orgs.map((org) => (
                  <li key={org}>{org}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Regulations</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                {blocks.regulations.map((reg) => (
                  <li key={reg.reg_id ?? reg.label ?? "unknown"}>
                    {reg.reg_id}
                    {reg.label ? ` · ${reg.label}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="key-value" style={{ marginTop: "8px" }}>
              <dt>Date coverage</dt>
              <dd>
                {blocks.action_date.start ?? "—"} → {blocks.action_date.end ?? "—"}
              </dd>
              <dt>Penalty range</dt>
              <dd>
                {formatCurrency(blocks.penalty_amount.min)} → {formatCurrency(blocks.penalty_amount.max)}
              </dd>
              <dt>Citation count</dt>
              <dd>
                min {formatNumber(blocks.citation_counts.min)} · avg {formatAverage(blocks.citation_counts.avg)} · max {formatNumber(blocks.citation_counts.max)}
              </dd>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ boxShadow: "none", border: "1px solid var(--color-border)", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Advanced YAML (optional)</h3>
        <textarea
          className="textarea-input"
          value={yamlText}
          onChange={(event) => setYamlText(event.target.value)}
          spellCheck={false}
          rows={14}
        />
      </div>

      {status && <div className={`alert alert-${status.kind}`}>{status.message}</div>}
    </section>
  );
}
