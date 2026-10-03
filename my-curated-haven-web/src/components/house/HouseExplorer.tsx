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

function RoomCardBody({ room, kitchenRecipes }: { room: HouseRoom; kitchenRecipes: KitchenRecipeLink[] }) {
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
        <Link
          href="/recipes"
          className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
        >
          Browse recipes
        </Link>
      </>
    );
  }
  if (room.id === "library") {
    return (
      <a
        href="#library"
        className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl border border-border-control bg-surface px-5 py-3 font-semibold hover:bg-surface-muted"
      >
        Try a sample page
      </a>
    );
  }
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
  const openedFrom = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cardHeadings = useRef<Partial<Record<HouseRoomId, HTMLHeadingElement | null>>>({});

  const openRoom = useCallback((id: HouseRoomId, trigger: HTMLElement | null) => {
    openedFrom.current = trigger;
    setActive(id);
    window.history.replaceState(null, "", `#room-${id}`);
    void trackAnalyticsEvent(
      "homepage_preview_opened",
      { feature_key: id, placement: "house", content_version: HOMEPAGE_CONTENT_VERSION },
      "home",
    );
  }, []);

  const closeRoom = useCallback(() => {
    setActive(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    openedFrom.current?.focus({ preventScroll: true });
  }, []);

  // Move focus to the opened card so keyboard and screen reader users land on it.
  useEffect(() => {
    if (!active) return;
    const heading = cardHeadings.current[active];
    heading?.focus({ preventScroll: true });
    heading?.closest("article")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRoom();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, closeRoom]);

  // A shared link such as /#room-library opens that room, on arrival or when the hash changes.
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.replace("#room-", "");
      if (window.location.hash.startsWith("#room-") && isHouseRoomId(id)) openRoom(id, null);
    };
    const frame = window.requestAnimationFrame(openFromHash);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [openRoom]);

  // Keep the light in step with the visitor's clock while the page stays open.
  useEffect(() => {
    const timer = window.setInterval(() => applyHouseLight(document.documentElement), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const onRoomClick = (id: HouseRoomId) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (active === id) return;
    openRoom(id, event.currentTarget);
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
        {active ? (
          <button
            type="button"
            onClick={closeRoom}
            className="absolute top-3 left-3 inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-surface/95 px-4 text-sm font-semibold shadow-sm"
          >
            <span aria-hidden="true">←</span> Back to the house
          </button>
        ) : null}
      </div>

      <h2 id="house-rooms-title" className="sr-only">
        Rooms in the house
      </h2>
      <p className="text-sm text-text-muted">{active ? "Pick another room, or go back to the house." : "Tap a room to look inside."}</p>
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

      <div>
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
            <RoomCardBody room={room} kitchenRecipes={kitchenRecipes} />
          </article>
        ))}
      </div>
    </div>
  );
}
