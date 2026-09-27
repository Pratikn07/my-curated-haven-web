# Device, accessibility and print review

Status: print output reviewed for the 3 free recipes (2026-09-26 audit); physical-device and screen-reader review not run.

## Print, 2026-09-26

Chromium print-to-PDF (`page.pdf`, A4 595.92 x 842.88 pt and US Letter 612 x 792 pt) of the 3 live free recipes, print media emulated. Files kept outside the repo.

| Check | Result |
| --- | --- |
| Site header, navigation, footer, print button hidden | Pass |
| Ingredients, method, allergens present; images loaded; no horizontal overflow | Pass |
| **Recipe title, summary, total time, yield, labels printed** | **Fail**: the recipe's own `<header>` was hidden with the site header (D10-01) |
| Page count | 3 pages each, mostly because the 16:9 photo frame printed full size around a 2.2 in image (D10-01) |

Fixed in the audit PR; regression test `printed recipes keep the title and details, with a compact photo` in `design-system.spec.ts`. Re-check a real browser print dialog on a phone and a desktop after deploy.

## Earlier status

The repository browser suite includes Chromium desktop, Chromium mobile and WebKit mobile projects, a 320px overflow check, axe checks on selected public states, and a simulated print-media layout assertion. Those checks do not prove behavior in iOS/Android, Instagram in-app browsers, VoiceOver, TalkBack, system print dialogs or a generated PDF.

No candidate-specific screenshots, assistive-technology recordings or A4/US Letter PDF were supplied. No real device or print evidence is claimed. Complete QA-M01–QA-M12 on the approved content and named staged candidate, recording device/OS/browser versions and each required manual result.
