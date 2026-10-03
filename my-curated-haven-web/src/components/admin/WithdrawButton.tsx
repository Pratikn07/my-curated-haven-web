"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import { withdrawRecipeAction, type EditorState } from "@/app/admin/recipes/actions";

export default function WithdrawButton({ recipeId, version, slug }: { recipeId: string; version: string; slug: string }) {
  const [state, formAction, pending] = useActionState<EditorState, FormData>(withdrawRecipeAction, {
    status: "idle",
  });

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Take this recipe off the site? Unsaved edits on this page will be lost.")) {
          event.preventDefault();
        }
      }}
      className="grid gap-2"
    >
      <input type="hidden" name="recipeId" value={recipeId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" variant="secondary" busy={pending} busyLabel="Taking down…" className="w-fit">
        Take off the site
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
