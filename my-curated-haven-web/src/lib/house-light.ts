/**
 * The homepage house follows the light of the visitor's own clock. Instead of
 * switching at fixed hours, the day, evening and night paintings blend into each
 * other along this timetable, and the lamps come on as it gets dark.
 *
 * The same timetable runs in three places: the inline script that sets the light
 * before first paint (no flash of day colours at night), the minute ticker while
 * the page stays open, and the unit tests. Light is atmosphere only; room status
 * is always written as text.
 */

export type Daypart = "day" | "evening" | "night";

/** How much of each painting shows, and how bright the lamps are, from 0 to 1. */
export type HouseLight = { evening: number; night: number; lamps: number };

/** [minute of the day, evening, night, lamps]. Values between rows are interpolated. */
export const HOUSE_LIGHT_TIMETABLE: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 1, 1],
  [330, 0, 1, 1], // 05:30 still night
  [390, 0.4, 0.45, 0.45], // 06:30 dawn
  [450, 0.12, 0, 0], // 07:30 morning
  [510, 0, 0, 0], // 08:30 full day
  [960, 0, 0, 0], // 16:00
  [1020, 0.8, 0, 0.3], // 17:00 golden hour begins, first lamps on
  [1110, 1, 0.12, 0.65], // 18:30
  [1200, 0.3, 0.85, 1], // 20:00 night
  [1245, 0, 1, 1], // 20:45
  [1440, 0, 1, 1],
];

export function daypartAt(date: Date): Daypart {
  const hour = date.getHours();
  if (hour >= 20 || hour < 6) return "night";
  if (hour >= 17) return "evening";
  return "day";
}

export function houseLightAt(date: Date): HouseLight {
  const minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const rows = HOUSE_LIGHT_TIMETABLE;
  let i = 1;
  while (i < rows.length - 1 && rows[i][0] <= minute) i += 1;
  const [m0, e0, n0, l0] = rows[i - 1];
  const [m1, e1, n1, l1] = rows[i];
  const t = Math.min(1, Math.max(0, (minute - m0) / (m1 - m0)));
  // Ease in and out, so changes start and finish gently.
  const s = t * t * (3 - 2 * t);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { evening: round(e0 + (e1 - e0) * s), night: round(n0 + (n1 - n0) * s), lamps: round(l0 + (l1 - l0) * s) };
}

/**
 * Writes the light onto <html>: data-daypart for page colours, --hs-* numbers for
 * the scene, and data-house-* flags so each painting only downloads once it shows.
 */
export function applyHouseLight(root: HTMLElement, date = new Date()) {
  const light = houseLightAt(date);
  root.dataset.daypart = daypartAt(date);
  root.style.setProperty("--hs-evening", String(light.evening));
  root.style.setProperty("--hs-night", String(light.night));
  root.style.setProperty("--hs-lamps", String(light.lamps));
  const flag = (name: string, on: boolean) => (on ? root.setAttribute(name, "") : root.removeAttribute(name));
  flag("data-house-evening", light.evening > 0);
  flag("data-house-night", light.night > 0);
  flag("data-house-lamps", light.lamps > 0);
  flag("data-house-fireflies", light.night >= 0.6);
  // At full night the night painting covers the day one completely, so skip downloading it.
  flag("data-house-day-covered", light.night >= 1 && light.evening === 0);
}

/**
 * The before-first-paint version of houseLightAt and applyHouseLight, as a small
 * inline script. On the homepage it also preloads the painting that shows most,
 * so the first screen does not wait for the stylesheet to discover it. Other
 * pages (such as the Instagram landing pages) never download the house.
 */
export const HOUSE_LIGHT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");var T=${JSON.stringify(
  HOUSE_LIGHT_TIMETABLE,
)};var now=new Date(),h=now.getHours(),m=h*60+now.getMinutes()+now.getSeconds()/60,i=1;while(i<T.length-1&&T[i][0]<=m)i++;var a=T[i-1],b=T[i],t=Math.min(1,Math.max(0,(m-a[0])/(b[0]-a[0])));t=t*t*(3-2*t);function v(k){return Math.round((a[k]+(b[k]-a[k])*t)*1000)/1000}var e=v(1),n=v(2),l=v(3);d.setAttribute("data-daypart",h>=20||h<6?"night":h>=17?"evening":"day");d.style.setProperty("--hs-evening",e);d.style.setProperty("--hs-night",n);d.style.setProperty("--hs-lamps",l);if(e>0)d.setAttribute("data-house-evening","");if(n>0)d.setAttribute("data-house-night","");if(l>0)d.setAttribute("data-house-lamps","");if(n>=0.6)d.setAttribute("data-house-fireflies","");if(n>=1&&e===0)d.setAttribute("data-house-day-covered","");try{if(location.pathname!=="/")return;if(!CSS.supports("background-image",'image-set(url("a.avif") type("image/avif") 1x)'))return;var top=n>=0.5?"night":e>=0.5?"evening":"day",p="/images/house/house-"+top+"-",s=[["(max-width: 1023.98px)","640.avif 1x, "+p+"960.avif 2x"],["(min-width: 1024px)","640.avif 1x, "+p+"1120.avif 2x"]];for(var j=0;j<2;j++){var k=document.createElement("link");k.rel="preload";k.as="image";k.type="image/avif";k.media=s[j][0];k.setAttribute("imagesrcset",p+s[j][1]);k.setAttribute("fetchpriority","high");document.head.appendChild(k)}}catch(x){}})();`;
