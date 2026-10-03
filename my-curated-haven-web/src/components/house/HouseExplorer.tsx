"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import {
  HOUSE_ROOMS,
  HOUSE_STATUS_LABEL,
  isHouseRoomId,
  type HouseRoom,
  type HouseRoomId,
  type HouseRoomStatus,
} from "@/config/house-rooms";
import { HOMEPAGE_CONTENT_VERSION } from "@/config/homepage-content";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { applyHouseLight } from "@/lib/house-light";
import HouseDepth from "@/components/house/HouseDepth";
import { Steam } from "@/components/house/HouseScene";
import { NurserySample, ShelfSample } from "@/components/house/RoomSamples";

export type KitchenRecipeLink = { slug: string; title: string; totalMinutes: number | null };

const STATUS_ORDER: Record<HouseRoomStatus, number> = { open: 0, soon: 1, later: 2 };
const LIST_ROOMS = [...HOUSE_ROOMS].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

/** Where the painted house sits in the frame, as percentages. Matches .hs-house in house.css. */
const HOUSE_BOX = { left: 6, top: 9, width: 88, height: 88 };

function toFrame(room: HouseRoom["area"]) {
  return {
    left: `${HOUSE_BOX.left + (room.left * HOUSE_BOX.width) / 100}%`,
    top: `${HOUSE_BOX.top + (room.top * HOUSE_BOX.height) / 100}%`,
    width: `${(room.width * HOUSE_BOX.width) / 100}%`,
    height: `${(room.height * HOUSE_BOX.height) / 100}%`,
  };
}

/** Camera centre in frame percentages, kept inside the frame so no empty edge shows when zoomed. */
function cameraFor(room: HouseRoom) {
  const { scale } = room.zoom;
  const half = 50 / scale;
  const clamp = (value: number) => Math.min(100 - half, Math.max(half, value));
  return {
    x: clamp(HOUSE_BOX.left + (room.zoom.x * HOUSE_BOX.width) / 100),
    y: clamp(HOUSE_BOX.top + (room.zoom.y * HOUSE_BOX.height) / 100),
    scale,
  };
}

function StatusLabel({ status }: { status: HouseRoomStatus }) {
  const dot =
    status === "open"
      ? "bg-accent-strong"
      : status === "soon"
        ? "bg-[var(--room-library-accent)]"
        : "border border-text-muted bg-transparent";
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text-muted">
      <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${dot}`} />
      {HOUSE_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The Library's way in: a closed storybook whose cover swings open, then the room view
 * closes and the page moves to the sample. Without JavaScript it is a plain link.
 */
function LibraryBookLink({ onLeaveRoom }: { onLeaveRoom: (after: () => void) => void }) {
  const [opening, setOpening] = useState(false);
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const goToSample = () => {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#library`);
      document.getElementById("library")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setOpening(false);
    };
    if (reduce) {
      onLeaveRoom(goToSample);
      return;
    }
    setOpening(true);
    window.setTimeout(() => onLeaveRoom(goToSample), 650);
  };
  return (
    <a
      href="#library"
      onClick={onClick}
      data-opening={opening ? "" : undefined}
      className="library-book-link inline-flex min-h-12 items-center gap-4 justify-self-start rounded-xl border border-border-control bg-surface py-2 pr-5 pl-3 font-semibold hover:bg-surface-muted"
    >
      <span className="library-book" aria-hidden="true">
        <span className="library-book-pages" />
        <span className="library-book-cover" />
      </span>
      Try a sample page
    </a>
  );
}

function RoomCardBody({
  room,
  kitchenRecipes,
  onLeaveRoom,
}: {
  room: HouseRoom;
  kitchenRecipes: KitchenRecipeLink[];
  onLeaveRoom: (after: () => void) => void;
}) {
  if (room.id === "kitchen") {
    return (
      <>
        {kitchenRecipes.length > 0 ? (
          <ul className="grid gap-2">
            {kitchenRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <Link
                  href={`/recipes/${recipe.slug}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2 font-semibold hover:bg-surface-muted"
                >
                  <span>{recipe.title}</span>
                  {recipe.totalMinutes ? (
                    <span className="shrink-0 text-sm font-normal text-text-muted">{recipe.totalMinutes} min</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-end justify-between gap-4">
          <Link
            href="/recipes"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
          >
            Browse recipes
          </Link>
          <div className="kitchen-pot" aria-hidden="true">
            <Steam />
            <div className="kitchen-pot-image" />
          </div>
        </div>
      </>
    );
  }
  if (room.id === "library") return <LibraryBookLink onLeaveRoom={onLeaveRoom} />;
  if (room.id === "nursery") return <NurserySample />;
  return <ShelfSample />;
}

export default function HouseExplorer({
  scene,
  kitchenRecipes,
}: {
  scene: ReactNode;
  kitchenRecipes: KitchenRecipeLink[];
}) {
  const [active, setActive] = useState<HouseRoomId | null>(null);
  const [hover, setHover] = useState<HouseRoomId | null>(null);
  const activeRef = useRef<HouseRoomId | null>(null);
  const openedFrom = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);
  const cardHeadings = useRef<Partial<Record<HouseRoomId, HTMLHeadingElement | null>>>({});
  // Opening a room adds a history entry, so the phone's back gesture steps out of the room
  // instead of leaving the site. A room opened from a shared link has no entry of its own.
  const pushedEntry = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const openRoom = useCallback((id: HouseRoomId, trigger: HTMLElement | null, history: "push" | "replace" | "none") => {
    if (trigger) openedFrom.current = trigger;
    setActive(id);
    if (history === "push") {
      // The page behind never moves while a room is open, so the browser need not restore
      // a scroll position when stepping back out (it would undo a scroll made after closing).
      window.history.scrollRestoration = "manual";
      window.history.pushState(null, "", `#room-${id}`);
      pushedEntry.current = true;
    } else if (history === "replace") {
      window.history.replaceState(null, "", `#room-${id}`);
    }
    void trackAnalyticsEvent(
      "homepage_preview_opened",
      { feature_key: id, placement: "house", content_version: HOMEPAGE_CONTENT_VERSION },
      "home",
    );
  }, []);

  const finishClose = useCallback(() => {
    setActive(null);
    const after = afterClose.current;
    afterClose.current = null;
    // Wait until the room view has closed and the page can scroll again.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        window.history.scrollRestoration = "auto";
        if (after) after();
        else openedFrom.current?.focus({ preventScroll: true });
      }),
    );
  }, []);

  /** Steps out of the room. `after` runs once the room view has closed. */
  const closeRoom = useCallback(
    (after?: () => void) => {
      afterClose.current = after ?? null;
      if (pushedEntry.current) {
        pushedEntry.current = false;
        window.history.back(); // the popstate handler below finishes closing
        return;
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      finishClose();
    },
    [finishClose],
  );

  // Inside a room: land on its heading, start at the top of the room, and keep the page behind still.
  useEffect(() => {
    if (!active) return;
    viewRef.current?.scrollTo({ top: 0 });
    cardHeadings.current[active]?.focus({ preventScroll: true });
    const root = document.documentElement;
    root.classList.add("room-view-open");
    return () => root.classList.remove("room-view-open");
  }, [active]);

  // Escape steps out; Tab stays inside the room view while it is open.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRoom();
        return;
      }
      if (event.key !== "Tab" || !viewRef.current) return;
      const focusable = [
        ...viewRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])"),
      ].filter((node) => node.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, closeRoom]);

  // The address decides the room: a shared /#room-library link opens it, and going back closes it.
  useEffect(() => {
    const syncWithAddress = () => {
      const hash = window.location.hash;
      const id = hash.replace("#room-", "");
      if (hash.startsWith("#room-") && isHouseRoomId(id)) {
        if (activeRef.current !== id) openRoom(id, null, "none");
      } else if (activeRef.current) {
        pushedEntry.current = false;
        finishClose();
      }
    };
    const frame = window.requestAnimationFrame(syncWithAddress);
    window.addEventListener("popstate", syncWithAddress);
    window.addEventListener("hashchange", syncWithAddress);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", syncWithAddress);
      window.removeEventListener("hashchange", syncWithAddress);
    };
  }, [openRoom, finishClose]);

  // Keep the light in step with the visitor's clock while the page stays open.
  useEffect(() => {
    const timer = window.setInterval(() => applyHouseLight(document.documentElement), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const onRoomClick = (id: HouseRoomId) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (active === id) return;
    // Moving between rooms inside the room view replaces the entry, so one back gesture leaves the house's room.
    openRoom(id, active ? null : event.currentTarget, active ? "replace" : "push");
  };

  const activeRoom = HOUSE_ROOMS.find((room) => room.id === active);
  const camera = activeRoom ? cameraFor(activeRoom) : null;
  const frameStyle = camera
    ? ({ "--zoom-x": `${camera.x}%`, "--zoom-y": `${camera.y}%`, "--zoom-scale": camera.scale } as CSSProperties)
    : undefined;

  return (
    <div className="grid min-w-0 gap-4">
      <div
        ref={frameRef}
        className="house-frame"
        data-active={active ?? undefined}
        data-hover={hover ?? undefined}
        style={frameStyle}
      >
        <div className="house-camera">{scene}</div>
        <HouseDepth frameRef={frameRef} />
        {HOUSE_ROOMS.map((room) => (
          <a
            key={room.id}
            href={`#room-${room.id}`}
            aria-hidden="true"
            tabIndex={-1}
            className="house-hotspot"
            data-room={room.id}
            style={toFrame(room.area)}
            onClick={onRoomClick(room.id)}
            onPointerEnter={() => setHover(room.id)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </div>

      <h2 id="house-rooms-title" className="sr-only">
        Rooms in the house
      </h2>
      <p className="text-sm text-text-muted">Tap a room to look inside.</p>
      <ul aria-labelledby="house-rooms-title" className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
        {LIST_ROOMS.map((room) => (
          <li key={room.id} className="min-w-0">
            <a
              href={`#room-${room.id}`}
              aria-current={active === room.id ? "true" : undefined}
              onClick={onRoomClick(room.id)}
              onPointerEnter={() => setHover(room.id)}
              onPointerLeave={() => setHover(null)}
              className="grid h-full min-h-14 content-start gap-0.5 rounded-xl border border-border bg-surface px-3 py-2.5 hover:bg-surface-muted aria-[current=true]:border-action aria-[current=true]:bg-surface-muted"
            >
              <span className="font-semibold">{room.name}</span>
              <span className="text-sm text-text-muted">{room.holds}</span>
              <StatusLabel status={room.status} />
            </a>
          </li>
        ))}
      </ul>

      {/*
        Step inside: with JavaScript, an open room fills the screen (a centred panel on large
        screens) with its painted close-up above what the room holds. Without JavaScript the
        room cards are simply listed here, and each room link jumps to its card.
      */}
      <div
        ref={viewRef}
        className="room-view"
        data-open={active ? "" : undefined}
        data-room={active ?? undefined}
        role={active ? "dialog" : undefined}
        aria-modal={active ? true : undefined}
        aria-labelledby={active ? `room-${active}-title` : undefined}
      >
        <div className="room-view-panel">
          <div className="room-view-picture" aria-hidden="true">
            {HOUSE_ROOMS.map((room) => (
              <div key={room.id} className="hs-room" data-room={room.id}>
                {room.id === "kitchen" ? <div className="hs-room-cat" /> : null}
              </div>
            ))}
          </div>
          <div className="room-view-sheet">
            {LIST_ROOMS.map((room) => (
              <article
                key={room.id}
                id={`room-${room.id}`}
                aria-labelledby={`room-${room.id}-title`}
                data-open={active === room.id ? "" : undefined}
                className="room-card mt-2 grid scroll-mt-24 gap-4 rounded-[var(--radius-card)] border border-border bg-surface-muted p-5"
              >
                <div className="grid gap-1">
                  <StatusLabel status={room.status} />
                  <h3
                    id={`room-${room.id}-title`}
                    ref={(node) => {
                      cardHeadings.current[room.id] = node;
                    }}
                    tabIndex={-1}
                    className="font-display text-2xl font-normal outline-none"
                  >
                    The {room.name} · {room.holds}
                  </h3>
                </div>
                <p className="max-w-[60ch] text-text-muted">{room.summary}</p>
                <RoomCardBody room={room} kitchenRecipes={kitchenRecipes} onLeaveRoom={closeRoom} />
              </article>
            ))}
            {active ? (
              <nav aria-label="Other rooms" className="room-view-others">
                <p className="text-sm font-semibold text-text-muted">Other rooms</p>
                <ul className="flex flex-wrap gap-2">
                  {LIST_ROOMS.filter((room) => room.id !== active).map((room) => (
                    <li key={room.id}>
                      <a
                        href={`#room-${room.id}`}
                        onClick={onRoomClick(room.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-control bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
                      >
                        {room.name}
                        <span className="font-normal text-text-muted">· {HOUSE_STATUS_LABEL[room.status]}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
          {active ? (
            <button type="button" onClick={() => closeRoom()} className="room-view-back">
              <span aria-hidden="true">←</span> Back to the house
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
