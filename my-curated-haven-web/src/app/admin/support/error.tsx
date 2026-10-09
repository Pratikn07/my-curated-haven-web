"use client";

export default function AdminSupportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Support unavailable</h1>
      <p role="status">This support page could not be loaded. Nothing was changed.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  );
}
