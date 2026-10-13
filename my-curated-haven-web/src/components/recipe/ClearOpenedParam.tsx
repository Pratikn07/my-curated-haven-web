"use client";

import { useEffect } from "react";

/** The reveal plays once: drop ?opened=1 so a refresh, a bookmark or a shared link shows the recipe plainly. */
export default function ClearOpenedParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("opened")) return;
    url.searchParams.delete("opened");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return null;
}
