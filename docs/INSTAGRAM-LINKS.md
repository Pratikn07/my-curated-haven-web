# Instagram links

Copy the link for where you're posting it. Each one opens the normal website; the tag at the end tells PostHog where the visitor came from.

| Where you post it | Link |
| --- | --- |
| Profile bio | `https://mycuratedhaven.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=bio_link` |
| Story link sticker | `https://mycuratedhaven.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=story_link` |
| DM or broadcast channel | `https://mycuratedhaven.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=instagram_dm` |

Reel and feed captions can't hold clickable links, so they point people to the bio.

## Telling Stories apart

Add `&utm_content=` and a date or a short word to the end. For example, a Story posted on 1 October:

```text
https://mycuratedhaven.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=story_link&utm_content=2026-10-01
```

Or one about the oat bars: `...&utm_content=oat_bars`.

The label must be lowercase letters, numbers, `-` or `_`, up to 40 characters. Anything else (a space, a dot, an `@`) makes the site ignore the whole tag, so the visit counts as untagged.

## Linking to a recipe instead of the homepage

Replace `https://mycuratedhaven.com/` with the recipe's address and keep everything from `?` onward:

```text
https://mycuratedhaven.com/recipes/soft-baked-blueberry-and-oat-bars?utm_source=instagram&utm_medium=organic_social&utm_campaign=story_link&utm_content=oat_bars
```

## Where to see the results

PostHog → **Web analytics** → the **UTM campaign** or **Channels** breakdown. Or PostHog → **Activity**, filter on the property `campaign_code`.

## Adding a new place

Links only count if the campaign name is on the site's list, so random or mistyped tags don't pollute the reports. To add one (for example Facebook or Pinterest), ask for it to be added to `ALLOWED_CAMPAIGNS` in `my-curated-haven-web/src/lib/analytics/campaigns.ts` (and `ALLOWED_SOURCES` for a site other than Instagram).
