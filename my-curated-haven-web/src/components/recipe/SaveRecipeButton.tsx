"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toggleSaveRecipeAction } from "@/lib/actions/saved-recipes";

interface SaveRecipeButtonProps {
  recipeId: string;
  recipeSlug: string;
  initialIsSaved?: boolean;
  isAuthenticated?: boolean;
  variant?: "button" | "compact";
  className?: string;
  onSavedChange?: (isSaved: boolean) => void;
}

export default function SaveRecipeButton({
  recipeId,
  recipeSlug,
  initialIsSaved = false,
  isAuthenticated = false,
  variant = "button",
  className = "",
  onSavedChange,
}: SaveRecipeButtonProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      const returnTarget = `/recipes/${recipeSlug}`;
      router.push(`/sign-in?returnTo=${encodeURIComponent(returnTarget)}`);
      return;
    }

    const nextSavedState = !isSaved;
    setError(null);

    startTransition(async () => {
      const res = await toggleSaveRecipeAction(recipeId, nextSavedState);
      if (res.status === "ok") {
        setIsSaved(res.isSaved);
        onSavedChange?.(res.isSaved);
      } else if (res.status === "unauthenticated") {
        const returnTarget = `/recipes/${recipeSlug}`;
        router.push(`/sign-in?returnTo=${encodeURIComponent(returnTarget)}`);
      } else {
        setError(res.message || "Failed to update recipe bookmark");
      }
    });
  };

  const label = isPending
    ? isSaved
      ? "Removing..."
      : "Saving..."
    : isSaved
    ? "Saved"
    : "Save recipe";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isSaved}
        aria-label={label}
        title={label}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors ${
          isSaved
            ? "border-action bg-action/10 text-action hover:bg-action/20"
            : "border-border bg-surface text-text-muted hover:border-action/40 hover:text-foreground"
        } ${className}`}
      >
        <Bookmark
          className={`h-5 w-5 transition-transform ${isSaved ? "fill-action" : ""}`}
        />
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isSaved}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
          isSaved
            ? "border-action bg-action/10 text-action hover:bg-action/20"
            : "border-border bg-surface text-foreground hover:border-action/40 hover:bg-surface-muted"
        } ${className}`}
      >
        <Bookmark
          className={`h-4 w-4 ${isSaved ? "fill-action" : ""}`}
        />
        <span>{label}</span>
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
