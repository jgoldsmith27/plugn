import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_BASE as string | undefined;

const fallbackBase = (() => {
  if (configuredBaseURL?.trim()) {
    return configuredBaseURL.trim();
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8000";
})();

const api = axios.create({
  baseURL: fallbackBase
});

export type IngestResponse = {
  documents_processed: number;
  events_created: number;
  spans_indexed: number;
  suggestions_generated: number;
};

export type ProfileResponse = {
  documents: number;
  events: number;
  organizations: number;
  regulations: number;
  fields: { name: string; detected_type?: string; sample_values: string[] }[];
};

export type Suggestion = {
  suggestion_id: string;
  kind: "merge" | "field_type";
  payload: Record<string, string>;
  confidence: number;
  created_at: string;
};

export type RuleSet = {
  must: Record<string, string[]>;
  time_window: Record<string, string>;
  thresholds: Record<string, number>;
  quality: Record<string, string | number | boolean>;
  include_subsidiaries: boolean;
};

export type RuleBlocks = {
  source_orgs: string[];
  regulations: { reg_id?: string; label?: string | null }[];
  action_date: { start?: string | null; end?: string | null };
  penalty_amount: { min?: number | null; max?: number | null };
  citation_counts: { min?: number | null; avg?: number | null; max?: number | null };
};

export type RuleGenerationRequest = {
  source_orgs?: string[];
  regulations?: string[];
  time_window?: Record<string, string>;
  thresholds?: Record<string, number>;
  quality?: Record<string, string | number | boolean>;
  include_subsidiaries?: boolean;
};

export type QuickRules = {
  sources: string[];
  statutes: string[];
  date: { from?: string | null; to?: string | null };
  penalty_min?: number | null;
  min_citations?: number | null;
  include_subsidiaries: boolean;
  exclude_negated: boolean;
};

export type RuleValidationResponse = {
  rules: RuleSet;
  summary: string;
};

export type QueryRequest = {
  query_text: string;
  mode: "auto" | "list" | "count";
};

export type Citation = {
  doc_path: string;
  section?: string | null;
  sent_idx: number;
  start: number;
  end: number;
  text: string;
};

export type QueryRow = {
  event_id: string;
  date?: string | null;
  penalty_amount?: number | null;
  regulation?: string | null;
  target_org?: string | null;
  citations: Citation[];
};

export type QueryResponse = {
  mode: "list" | "count";
  count: number;
  rows: QueryRow[];
  applied_rules_version: string;
  explain: {
    slots: Record<string, unknown>;
    cypher: string;
    validators: Record<string, boolean>;
  };
};

export async function ingest(): Promise<IngestResponse> {
  const { data } = await api.post<IngestResponse>("/ingest");
  return data;
}

export async function getProfile(): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>("/profile");
  return data;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const { data } = await api.get<{ suggestions: Suggestion[] }>("/suggestions");
  return data.suggestions;
}

export async function acceptSuggestions(ids: string[]): Promise<Suggestion[]> {
  const { data } = await api.post<{ suggestions: Suggestion[] }>("/suggestions/accept", { suggestion_ids: ids });
  return data.suggestions;
}

export async function getRules(): Promise<RuleSet> {
  const { data } = await api.get<RuleSet>("/rules");
  return data;
}

export async function saveRules(rules: RuleSet): Promise<RuleSet> {
  const { data } = await api.post<RuleSet>("/rules", rules);
  return data;
}

export async function getRuleBlocks(): Promise<RuleBlocks> {
  const { data } = await api.get<RuleBlocks>("/rules/blocks");
  return data;
}

export async function generateRules(payload: RuleGenerationRequest = {}): Promise<RuleSet> {
  const { data } = await api.post<RuleSet>("/rules/generate", payload);
  return data;
}

export async function validateQuickRules(payload: QuickRules): Promise<RuleValidationResponse> {
  const { data } = await api.post<RuleValidationResponse>("/rules/validate", payload);
  return data;
}

export async function runQuery(payload: QueryRequest): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>("/query", payload);
  return data;
}

export function extractErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const responseDetail = error.response?.data?.detail;
    if (typeof responseDetail === "string" && responseDetail.trim().length) {
      return responseDetail;
    }
    if (Array.isArray(responseDetail)) {
      const message = responseDetail
        .map((item) =>
          typeof item?.msg === "string"
            ? item.msg
            : typeof item === "string"
            ? item
            : ""
        )
        .filter(Boolean)
        .join("; ");
      if (message.length) {
        return message;
      }
    }
    if (typeof error.message === "string" && error.message.length) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export { api };
