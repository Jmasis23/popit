"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
};

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const [siteRes, searchRes] = await Promise.all([
        siteId
          ? Promise.resolve(null)
          : fetch("/api/sites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: siteName, url: siteUrl }),
            }).then((r) => r.json()),
        fetch(
          `/api/platforms/search?platform=google&query=${encodeURIComponent(
            query || siteName
          )}`
        ).then((r) => r.json()),
      ]);

      if (siteRes) {
        if (siteRes.error) throw new Error(siteRes.error);
        setSiteId(siteRes.id);
        setToken(siteRes.token);
      }
      if (searchRes.error) throw new Error(searchRes.error);
      setCandidates(searchRes.results);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(placeId: string) {
    if (!siteId || !token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/platforms/google/connect?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push(`/dashboard/${siteId}?token=${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  function handleSkip() {
    if (!siteId || !token) return;
    router.push(`/dashboard/${siteId}?token=${token}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-zinc-900">
          Create your review popup
        </h1>
        <p className="mt-2 text-sm text-zinc-600">Step {step} of 2</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSearch} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Landing page name
              </label>
              <input
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Joe's Plumbing – Homepage"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Landing page URL
              </label>
              <input
                required
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://joesplumbing.com"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Business name + city (for Google search)
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Joe's Plumbing, Austin TX"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Find my business on Google"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            {candidates.length === 0 && (
              <p className="text-sm text-zinc-600">
                No matches found. Go back and try a more specific search, or
                skip for now — you can connect Google (and Yelp, Facebook,
                Trustpilot) from the manage page.
              </p>
            )}
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                disabled={loading}
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-indigo-400 hover:shadow-sm disabled:opacity-50"
              >
                <div className="font-medium text-zinc-900">{c.name}</div>
                <div className="text-sm text-zinc-600">{c.address}</div>
                {c.rating && (
                  <div className="mt-1 text-xs text-zinc-500">
                    ⭐ {c.rating} ({c.reviewCount} reviews)
                  </div>
                )}
              </button>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-zinc-500 underline"
              >
                ← Back
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-indigo-600 underline"
              >
                Skip — connect platforms later →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
