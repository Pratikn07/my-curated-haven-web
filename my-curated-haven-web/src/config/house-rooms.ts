/**
 * The rooms of the homepage house. Status is shown as text on each room,
 * never by lighting, because the light follows the visitor's time of day.
 * Opening a room for real is a one-line status change here.
 */
export type HouseRoomId = "kitchen" | "library" | "nursery" | "shelf";
export type HouseRoomStatus = "open" | "soon" | "later";

export type HouseRoom = {
  id: HouseRoomId;
  name: string;
  holds: string;
  status: HouseRoomStatus;
  summary: string;
  /** Where the room sits on the 400 × 380 house drawing, as percentages. */
  area: { left: number; top: number; width: number; height: number };
  /** Camera move when the room is opened: centre point (%) and zoom. */
  zoom: { x: number; y: number; scale: number };
  /** Where the room label sits inside its area. */
  labelAt: "top" | "bottom";
};

export const HOUSE_STATUS_LABEL: Record<HouseRoomStatus, string> = {
  open: "Open now",
  soon: "Coming soon",
  later: "Later",
};

export const HOUSE_ROOMS: readonly HouseRoom[] = [
  {
    id: "library",
    name: "Library",
    holds: "Storybooks",
    status: "soon",
    summary: "Bedtime stories where your child is the hero, drawn in the style you choose.",
    area: { left: 20.5, top: 15.3, width: 59, height: 18.4 },
    zoom: { x: 50, y: 24.5, scale: 1.6 },
    labelAt: "bottom",
  },
  {
    id: "nursery",
    name: "Nursery",
    holds: "Milestones",
    status: "later",
    summary: "A gentle place to keep first words, first foods and the small moments in between.",
    area: { left: 16.5, top: 35.8, width: 32.5, height: 23.7 },
    zoom: { x: 32.75, y: 47.6, scale: 2.1 },
    labelAt: "top",
  },
  {
    id: "shelf",
    name: "Shelf",
    holds: "Family finds",
    status: "later",
    summary: "A short list of family things we would use ourselves, and why we picked them.",
    area: { left: 51, top: 35.8, width: 32.5, height: 23.7 },
    zoom: { x: 67.25, y: 47.6, scale: 2.1 },
    labelAt: "top",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    holds: "Recipes",
    status: "open",
    summary:
      "Toddler recipes by Tiny Soho. Each one has ingredients, clear steps and how to store leftovers, and you can read or print it without an account.",
    area: { left: 16.5, top: 61.6, width: 67, height: 26.3 },
    zoom: { x: 50, y: 74.7, scale: 1.45 },
    labelAt: "top",
  },
] as const;

export function isHouseRoomId(value: string): value is HouseRoomId {
  return HOUSE_ROOMS.some((room) => room.id === value);
}
