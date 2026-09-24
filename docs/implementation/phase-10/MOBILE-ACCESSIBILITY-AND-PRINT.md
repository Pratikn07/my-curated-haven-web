# Mobile, accessibility and print

## Device coverage

Keep the Phase 3 visual system. QA should improve readability, spacing, control states and contrast where measured defects exist. A new theme is not a prerequisite for launch.

| Coverage | Required use |
| --- | --- |
| Automated desktop Chromium | Full journey and regression suite |
| Automated mobile Chromium and WebKit | Full critical journey, 320px reflow plus existing Pixel/iPhone profiles |
| Real iPhone with Safari | Arrival, filters, auth, Checkout return, owned reading and print/share |
| Real Android with Chrome | Same critical journey, keyboard, autofill and back navigation |
| Instagram in-app browser on iOS and Android | Tiny Soho link, auth transition, Checkout handoff and return/recovery |
| Keyboard and screen reader | Desktop keyboard plus VoiceOver/Safari and TalkBack/Chrome critical paths |

Record actual model, OS and browser version. Set the supported version range before execution. Use current stable releases and one earlier major version where available as a proposed starting scope, then align with observed audience data. Missing required real-device coverage is a recorded gate gap, not replaced by changing a viewport.

## Accessibility target

Use WCAG 2.2 AA as the engineering target. Automated axe checks cover only part of accessibility. Manual semantics, focus, announcements, zoom and error recovery remain required. Do not describe this plan or an axe report as legal certification.

Check normal text contrast at least 4.5:1, large text 3:1 and applicable UI/non-text contrast 3:1. Test real foreground/background combinations across buttons, chips, links, focus and error states. Disabled text must remain understandable even where a criterion exempts it.

Adopt the project's 44-by-44 CSS-pixel target for primary touch controls. WCAG 2.2 AA target-size minimum is 24-by-24 with defined exceptions, so distinguish the stronger product target from the standard. Avoid tiny adjacent filter chips or icon-only buttons with no accessible names.

## Manual and automated cases

| ID | Method and action | Pass evidence |
| --- | --- | --- |
| QA-M01 | View at 320px, typical phone widths and landscape, with long recipe/title and errors | No unintended horizontal scroll or clipped primary action. Screenshots include opened menus/dialogs |
| QA-M02 | Increase text to 200%, test 400% browser zoom/reflow where applicable | Content and controls remain usable, no lost instructions or two-dimensional page scrolling for ordinary content |
| QA-M03 | Tab/Shift-Tab through navigation, filter dialog, sign-in, purchase and pending states | Logical order, visible unobscured focus, no trap, Escape/dismiss returns focus appropriately |
| QA-M04 | VoiceOver and TalkBack read catalog, recipe, filters, auth errors and pending purchase | Correct headings/landmarks, labels, counts and status announcements. No repeated noisy live region or unlabeled control |
| QA-M05 | Measure actual text/UI contrast and primary touch bounds, enable reduced motion | Approved colors pass contrast, targets meet product goal, no essential information depends on motion/color alone |
| QA-M06 | Open soft keyboard, paste verification code, autofill email, rotate and resume backgrounded app | Focus/action remains visible, input is not lost unexpectedly, busy states prevent duplicate submission |
| QA-M07 | Arrive and authenticate from real Instagram browsers, then complete test Checkout | Usable handoff or clearly explained supported-browser recovery. Correct account/return destination, no dead end |
| QA-M08 | Run axe on all launch routes and critical states, including errors and dialogs | No unresolved critical/serious findings, review all remaining findings with manual evidence rather than blanket suppression |
| QA-M09 | Print free short/long recipes to PDF on A4 and US Letter, default settings | Complete ingredients, amounts, steps, notes and attribution, no clipped/blank excessive pages or UI chrome |
| QA-M10 | Print paid recipe as owner, then repeat direct print request as nonowner/revoked user | Owner gets full usable content, unauthorised server read reveals no body. No paid content in a public print endpoint |
| QA-M11 | Cancel print, print again, use mobile print/share and increase print scale | App remains usable, no completion claim from dialog close, no hidden text due to background-color printing settings |
| QA-M12 | Slow connection, disabled images, missing image, browser back after auth/Checkout | Readable text-first recovery, stable controls, no duplicate submission, placeholders do not conceal content or ownership state |

Save actual generated PDFs and a short manual checklist. CSS print emulation alone does not reveal pagination defects. Do not promise a downloadable collection PDF unless Phase 8 explicitly adds and secures that separate asset.

## Theme and content checks

- Apply existing Phase 3 typography and spacing consistently to new account/payment screens.
- Put title, total time, yield and primary recipe actions early without burying cooking instructions below promotion.
- Use reviewed photography with predictable aspect ratios and useful alt text. Decorative images need appropriate empty alternatives.
- Avoid busy animation and fixed banners that cover ingredients or the keyboard.
- Keep a visible support path in payment pending/error states.
- Use clear availability wording. Do not label an unavailable server response as an empty collection or expired purchase.

Reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Recheck the exact criteria and exceptions when resolving findings.
