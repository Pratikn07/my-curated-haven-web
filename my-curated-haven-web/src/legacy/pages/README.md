# Preserved pages

These files are the previous public page bodies. No production route imports them.

| Original route | Original file | Preserved file |
| --- | --- | --- |
| /features | src/app/features/page.tsx | src/legacy/pages/FeaturesPage.tsx |
| /resources | src/app/resources/page.tsx | src/legacy/pages/ResourcesPage.tsx |
| /careers | src/app/careers/page.tsx | src/legacy/pages/CareersPage.tsx |
| /contact | src/app/contact/page.tsx | src/legacy/pages/ContactPage.tsx |

Restore a page by moving its file back to the original route and reviewing the content register first. The current route files call `notFound()` and must not import these modules.

The feature images FeaturesPage.tsx points at (`/images/AI-chatbot.png` and the rest) were removed from `public/` on 2026-10-14 so they are no longer reachable by URL. Restore them from git history (any commit before that date) together with the page.
