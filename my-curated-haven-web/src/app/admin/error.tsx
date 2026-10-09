"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Admin unavailable</h1>
      <p role="status">{error.message || "Something went wrong."}</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
