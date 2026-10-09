"use client";

export default function AdminCollectionsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Collections unavailable</h1>
      <p role="status">Collections could not be loaded. This is not an empty list.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  );
}
