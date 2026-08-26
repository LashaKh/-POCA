"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("A recoverable application error occurred.", {
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="system-state" id="main-content">
      <p className="eyebrow">ÉPOCA</p>
      <h1>We could not load this page.</h1>
      <p>Your information is safe. Please try the request again.</p>
      <button className="button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
