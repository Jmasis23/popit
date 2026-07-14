import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight text-zinc-900">
            Popit
          </span>
          <Link
            href="/dashboard/new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Get your popup →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Social proof, on autopilot
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Turn your Google reviews into a
          <br className="hidden sm:block" /> conversion popup
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600">
          Popit finds your business on Google, pulls in your real reviews, and
          gives you one line of code. Drop it on your landing page and watch
          &ldquo;Joe says: this was amazing&rdquo; pop up while visitors browse.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/dashboard/new"
            className="rounded-full bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Create my popup — it&apos;s free
          </Link>
        </div>

        <div className="mt-20 grid gap-8 text-left sm:grid-cols-3">
          <div>
            <div className="mb-2 text-2xl">🔎</div>
            <h3 className="font-semibold text-zinc-900">1. We find you</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Tell us your business name — we match it to your Google Business
              Profile automatically.
            </p>
          </div>
          <div>
            <div className="mb-2 text-2xl">⭐</div>
            <h3 className="font-semibold text-zinc-900">2. We pull your reviews</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Your best, most recent 4-5 star Google reviews are synced in
              automatically.
            </p>
          </div>
          <div>
            <div className="mb-2 text-2xl">📋</div>
            <h3 className="font-semibold text-zinc-900">3. You paste one snippet</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Copy a single script tag onto your landing page and reviews
              start popping up for visitors.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
