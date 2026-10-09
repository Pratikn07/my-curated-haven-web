"use client";

export default function AdminCollectionError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Collection unavailable</h1>
      <p role="status">This collection could not be loaded.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  );
}
