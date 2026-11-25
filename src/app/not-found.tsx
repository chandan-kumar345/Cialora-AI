import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="cielora-auth-bg flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="rounded-3xl border border-white bg-white/95 p-8 shadow-xl max-w-md">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
          404 · Page Not Found
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
          This workspace route does not exist
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          Return to your Cielora AI dashboard or sign in to continue.
        </p>
        <Link
          href="/dashboard"
          className="cielora-gradient-btn mt-5 inline-flex rounded-full px-6 py-2.5 text-xs font-bold text-white"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
