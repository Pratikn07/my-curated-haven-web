"use client";

import { useEffect, useRef, useState } from "react";
import type { ShoppingAisle } from "@/lib/collections/make-ahead-types";

interface MakeAheadShoppingProps {
  /** localStorage key for the ticks on this device. */
  storageKey: string;
  heading: string;
  sub: string;
  /** The whole list as plain text, built on the server. */
  copyText: string;
  aisles: readonly ShoppingAisle[];
}

type Ticks = Record<string, boolean>;

const COPY_LABEL = "Copy list";
const COPIED = "Copied. Paste it into your notes or a message.";

function readTicks(key: string): Ticks {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Ticks) : {};
  } catch {
    return {};
  }
}

function writeTicks(key: string, ticks: Ticks): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ticks));
  } catch {
    // Private browsing or blocked storage: the ticks last until the page closes.
  }
}

/**
 * The shopping list: real tick boxes remembered on this device, and "Copy list" for notes or a message.
 * The boxes are plain checkboxes, so they work before the script loads; the script only restores earlier ticks
 * and saves new ones. Copying never prints (print does nothing in Instagram's browser).
 */
export default function MakeAheadShopping({
  storageKey,
  heading,
  sub,
  copyText,
  aisles,
}: MakeAheadShoppingProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ticks = readTicks(storageKey);
    listRef.current?.querySelectorAll<HTMLInputElement>("input[data-item]").forEach((box) => {
      if (ticks[box.dataset.item ?? ""] === true) box.checked = true;
    });
  }, [storageKey]);

  function remember() {
    const ticks: Ticks = {};
    listRef.current?.querySelectorAll<HTMLInputElement>("input[data-item]").forEach((box) => {
      if (box.checked && box.dataset.item) ticks[box.dataset.item] = true;
    });
    writeTicks(storageKey, ticks);
  }

  function copy() {
    const done = () => setCopied(true);
    // Older browsers and some in-app browsers: select the text in a hidden field and copy that.
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = copyText;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, copyText.length);
      try {
        if (document.execCommand("copy")) done();
      } catch {
        // Nothing else to try; the list is still on the page to select by hand.
      }
      area.remove();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(copyText).then(done, fallback);
    } else {
      fallback();
    }
  }

  return (
    <section className="mp-card" aria-labelledby="mp-shop-h" data-track-ux="shopping_list">
      <div className="mp-shop-head">
        <h2 className="mp-h2" id="mp-shop-h">
          {heading}
        </h2>
        <button type="button" className="mp-copy" onClick={copy} data-track-cta="copy">
          {COPY_LABEL}
        </button>
      </div>
      <p className="mp-sub">{sub}</p>
      <p className="mp-copied" role="status">
        {copied ? COPIED : null}
      </p>
      <div ref={listRef} className="mp-shop-list" onChange={remember}>
        {aisles.map((group) => (
          <div key={group.aisle}>
            <h3 className="mp-aisle">{group.aisle}</h3>
            <ul className="mp-list">
              {group.items.map((entry) => (
                <li key={entry.id} className="mp-ing">
                  <label htmlFor={`shop-${entry.id}`}>
                    <input type="checkbox" id={`shop-${entry.id}`} data-item={entry.id} />
                    <span className="mp-what">
                      <span className="mp-buy">
                        {entry.item}
                        {entry.amount ? `, ${entry.amount}` : ""}
                      </span>{" "}
                      <span className="mp-for">For {entry.forWhat}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
