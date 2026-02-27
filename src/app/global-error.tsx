"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white antialiased">
        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-slate-600">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
