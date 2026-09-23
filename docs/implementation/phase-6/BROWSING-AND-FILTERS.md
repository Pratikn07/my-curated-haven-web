# Browsing, search and mobile filters

## Listing layout

Route: `/recipes`.

Order the page as heading and short promise, search, useful filter controls, applied filters and result count, then recipe cards. Place the Tiny Soho attribution near the introduction. Use the existing Phase 3 tokens instead of creating another theme.

Start with the three approved free recipes. A single-column phone layout should remain readable without oversized cards. Introduce additional columns when the available width supports them. Card titles are real links with visible focus.

Do not force a large filter panel onto a three-item catalog. Expose only groups with reviewed values and useful variation. Keep the underlying contracts extensible as the catalog grows. Hide pagination when the result set fits on one page.

## URL contract

Validate all parameters on the server. Use a single parser shared with the client where practical.

| Parameter | Proposed meaning | Validation |
| --- | --- | --- |
| `q` | Search approved title and public summary | Trim, normalize whitespace, limit to 120 characters |
| `meal` repeated | Selected meal types | Allowlisted reviewed enum values, deduplicate |
| `diet` repeated | Selected dietary labels | Only labels approved for public filtering |
| `maxTime` | Maximum reviewed total minutes | Positive allowlisted thresholds supported by the UI |
| `sort` | Editorial order, title or time | Default editorial, reject unsupported values |
| `page` | One-based result page | Positive integer, default 1 |

These names are an implementation proposal, not an existing API. Document the final contract alongside the parser.

Remove unsupported parameters from canonicalized filter state. Do not pass arbitrary field names or raw query expressions into database filters. Reset page to 1 when search, filter or sort changes. Omit default values from generated URLs and use consistent repeated-parameter order.

The initial GET form must support search without JavaScript. Interactive filtering can enhance this baseline. The URL is the source of truth for applied state, including refresh, deep links and browser Back.

## Matching and ordering

- Search only approved public title and summary. Do not query protected ingredients for anonymous search.
- Combine selected meal types with OR.
- Combine selected dietary requirements with AND.
- Combine search and separate filter groups with AND.
- Apply maxTime only where total time is reviewed and known. Unknown values never count as quick.
- Use deterministic secondary ordering by stable ID.
- Default ordering follows the approved editorial free-slot order.
- Title sort uses a documented consistent comparison. Time sort places unknown times last.

With three recipes, compute results from the authorized metadata set or a server query using equivalent semantics. For a larger catalog, apply filtering and pagination across the whole eligible dataset, never just the currently downloaded page. A proposed page size is 12, with pagination hidden for the first release.

Facet labels and counts must describe the same eligible catalog as the results. Do not show hidden draft counts or paid-body-derived information. If counts add little value at three recipes, omit them.

## Mobile filter interaction

Reuse the existing native-dialog pattern as a starting point.

1. Open the sheet and copy applied filters into draft state.
2. Keep draft changes local until Apply.
3. Apply validates selections, updates URL state and closes the sheet.
4. Cancel, Escape or a deliberate dismiss action discards uncommitted changes.
5. Restore focus to the opening control.
6. Show applied chips outside the dialog, each with a clearly named remove button.
7. Clear all returns to the default catalog state.

Give the dialog an accessible title. Confirm background interaction is blocked while open, focus remains usable and the content scrolls on short screens. Do not import the demo's permanently busy example into the product.

Use a polite result-status announcement after submitted changes. Avoid announcing every keystroke. Explicit Search submission is enough for launch. If debouncing is added, cancel or disregard stale requests so older results cannot replace newer results.

## States and copy

| State | Behaviour |
| --- | --- |
| Initial loading | Stable layout, clear loading status, no fake result count |
| Results | Accurate count and working detail links |
| No matches | Explain that filters found nothing and offer Clear filters |
| Invalid parameters | Normalize to supported values without crashing |
| Service failure | Explain that recipes could not load and offer Retry |
| Broken image | Preserve layout and title link with a neutral image fallback |
| Out-of-range page | Normalize or show an explicit return-to-first-page action |

An unexpected zero-recipe catalog at launch is an operational problem, not a successful empty experience. Alert the release owner and investigate publication/access state.

Do not add popularity sorting, ratings, infinite scroll, personalized recommendations or age profiling in this phase. Their data and product requirements have not been established.
