"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
};

type Connection = {
  id: string;
  platform: string;
  enabled: boolean;
  externalId: string | null;
  label: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  lastSyncedAt: string | null;
  reviews: Review[];
};

type Site = {
  id: string;
  name: string;
  url: string;
  position: string;
  intervalSeconds: number;
  platforms: Connection[];
};

const PLATFORM_META: Record<
  string,
  { label: string; searchable: boolean; oauth: boolean; hint: string }
> = {
  google: {
    label: "Google (Places)",
    searchable: true,
    oauth: false,
    hint: "Search by business name + city. Pulls up to 5 public reviews via the Google Places API — no login required.",
  },
  google_business_profile: {
    label: "Google Business Profile",
    searchable: false,
    oauth: true,
    hint: "Sign in with the Google account that manages your Business Profile to pull all of your reviews.",
  },
  yelp: {
    label: "Yelp",
    searchable: true,
    oauth: false,
    hint: "Search by business name + city",
  },
  trustpilot: {
    label: "Trustpilot",
    searchable: false,
    oauth: false,
    hint: "Enter your website domain, e.g. joesplumbing.com",
  },
  facebook: {
    label: "Facebook",
    searchable: false,
    oauth: false,
    hint: "Paste your Page ID and a Page Access Token from Meta's Graph API Explorer",
  },
};

const PLATFORM_ORDER = [
  "google",
  "google_business_profile",
  "yelp",
  "facebook",
  "trustpilot",
];

export default function ManageSitePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const gbpError = searchParams.get("gbp_error");

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/sites/${id}?token=${token}`);
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setSite(data.site);
  }, [id, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handleSettingChange(
    field: "position" | "intervalSeconds",
    value: string | number
  ) {
    await fetch(`/api/sites/${id}?token=${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await load();
  }

  const snippet = `<script src="${origin}/widget.js" data-site="${id}" async></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <div className="p-10 text-sm text-red-600">
        Missing access token. Use the manage link you got after setup.
      </div>
    );
  }
  if (error) {
    return <div className="p-10 text-sm text-red-600">{error}</div>;
  }
  if (!site) {
    return <div className="p-10 text-sm text-zinc-500">Loading…</div>;
  }

  const byPlatform = new Map(site.platforms.map((c) => [c.platform, c]));
  const totalReviews = site.platforms
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.reviews.length, 0);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{site.name}</h1>
          <p className="text-sm text-zinc-600">{site.url}</p>
        </div>

        {gbpError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t connect Google Business Profile: {gbpError}
          </div>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">1. Paste this on your landing page</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add it right before the closing <code>&lt;/body&gt;</code> tag.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3">
            <code className="flex-1 overflow-x-auto text-xs text-zinc-100">
              {snippet}
            </code>
            <button
              onClick={copySnippet}
              className="shrink-0 rounded-md bg-zinc-700 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-600"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">
            2. Review platforms ({totalReviews} reviews live)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Connect any of these, then flip the switch to control which ones
            show up in your popup.
          </p>
          <div className="mt-4 space-y-3">
            {PLATFORM_ORDER.map((platform) => (
              <PlatformCard
                key={platform}
                siteId={id}
                token={token}
                platform={platform}
                connection={byPlatform.get(platform) ?? null}
                onChange={load}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">3. Popup settings</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Position
              </label>
              <select
                value={site.position}
                onChange={(e) => handleSettingChange("position", e.target.value)}
                className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Seconds between popups
              </label>
              <input
                type="number"
                min={4}
                value={site.intervalSeconds}
                onChange={(e) =>
                  handleSettingChange("intervalSeconds", Number(e.target.value))
                }
                className="mt-1 w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </section>

        <p className="text-xs text-zinc-400">
          Bookmark this page — it&apos;s your private manage link (keep the
          ?token= in the URL private).
        </p>
      </div>
    </div>
  );
}

function PlatformCard({
  siteId,
  token,
  platform,
  connection,
  onChange,
}: {
  siteId: string;
  token: string;
  platform: string;
  connection: Connection | null;
  onChange: () => Promise<void>;
}) {
  const meta = PLATFORM_META[platform];
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [candidates, setCandidates] = useState<
    { id: string; name: string; address: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function connect(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/platforms/${platform}/connect?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExpanded(false);
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platforms/search?platform=${platform}&query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCandidates(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(enabled: boolean) {
    await fetch(`/api/sites/${siteId}/platforms/${platform}/toggle?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await onChange();
  }

  async function refresh() {
    setBusy(true);
    await fetch(`/api/sites/${siteId}/platforms/${platform}/refresh?token=${token}`, {
      method: "POST",
    });
    await onChange();
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-zinc-900">{meta.label}</div>
          {connection ? (
            <div className="text-xs text-zinc-500">
              {connection.label} · {connection.reviews.length} reviews synced
              {connection.rating ? ` · ⭐ ${connection.rating}` : ""}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              Not connected{meta.oauth ? ` — ${meta.hint}` : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {connection && (
            <>
              <button
                onClick={refresh}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Refresh
              </button>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={connection.enabled}
                  onChange={(e) => toggle(e.target.checked)}
                />
                Show in popup
              </label>
            </>
          )}
          {!connection && meta.oauth && (
            <a
              href={`/api/sites/${siteId}/platforms/${platform}/oauth/start?token=${token}`}
              className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Connect with Google
            </a>
          )}
          {!connection && !meta.oauth && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {!connection && expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
          <p className="text-xs text-zinc-500">{meta.hint}</p>

          {meta.searchable && (
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Joe's Plumbing, Austin TX"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={search}
                disabled={busy || !query}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Search
              </button>
            </div>
          )}

          {meta.searchable && candidates.length > 0 && (
            <div className="space-y-1.5">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => connect({ [platform === "google" ? "placeId" : "yelpId"]: c.id })}
                  disabled={busy}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm hover:border-indigo-400 disabled:opacity-50"
                >
                  <div className="font-medium text-zinc-900">{c.name}</div>
                  <div className="text-xs text-zinc-500">{c.address}</div>
                </button>
              ))}
            </div>
          )}

          {platform === "trustpilot" && (
            <div className="flex gap-2">
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="joesplumbing.com"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => connect({ domain })}
                disabled={busy || !domain}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          )}

          {platform === "facebook" && (
            <div className="space-y-2">
              <input
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="Page ID"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Page Access Token"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => connect({ pageId, accessToken })}
                disabled={busy || !pageId || !accessToken}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
