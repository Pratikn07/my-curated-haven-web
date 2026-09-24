"use client";

import Button from "@/components/ui/Button";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { RecipeAccessKind } from "@/lib/analytics/events";

interface PrintButtonProps {
  recipeId?: string;
  accessKind?: RecipeAccessKind;
}

export default function PrintButton({ recipeId, accessKind = "free" }: PrintButtonProps) {
  const handlePrint = () => {
    if (recipeId) {
      trackAnalyticsEvent(
        "recipe_print_requested",
        {
          recipe_id: recipeId,
          access_kind: accessKind,
        },
        "recipe_detail"
      );
    }
    window.print();
  };

  return (
    <Button
      variant="secondary"
      onClick={handlePrint}
      className="no-print inline-flex w-full items-center justify-center gap-2 sm:w-auto"
      aria-label="Print this recipe"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      <span>Print recipe</span>
    </Button>
  );
}
