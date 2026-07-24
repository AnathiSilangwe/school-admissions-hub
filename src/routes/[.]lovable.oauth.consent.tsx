import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta Supabase OAuth helpers — narrow local types so we don't grep node_modules.
type OAuthAuthorizationDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthDecisionResult = { redirect_url?: string; redirect_to?: string };
type SupabaseOAuth = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthAuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDecisionResult | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDecisionResult | null; error: Error | null }>;
};
function authOAuth(): SupabaseOAuth {
  return (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;
}

type Search = { authorization_id: string };

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Connect an app — Thabazi Secondary School" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-border/60 bg-surface/80 p-8 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Could not load this authorization</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const scopes = details?.scopes ?? [];

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = authOAuth();
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface/80 p-8 shadow-glass backdrop-blur">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Connect {clientName} to your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This lets {clientName} use the Thabazi Admissions tools as you. It does not bypass this
          site's permissions — you'll only see the data your account is allowed to see.
        </p>

        {scopes.length > 0 && (
          <div className="mt-4 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">
            Requested access: {scopes.join(", ")}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground shadow-glass transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-input bg-background px-6 py-3 font-semibold text-foreground hover:bg-accent disabled:opacity-60"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}