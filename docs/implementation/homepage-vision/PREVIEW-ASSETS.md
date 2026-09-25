# Preview assets and native references

## Visual approach

Use three static product previews, one each for Parenting Chat, Curated Shop and Bloom. Prefer synthetic content rendered in a controlled mockup inspired by the native design. The page should resemble the actual product direction without publishing private screenshots or pretending an illustration is a live web feature.

The default format is a still image with an HTML heading, description and availability label outside the image. No embedded application, prerecorded fake-live chat, autoplay video or interaction required to understand the preview.

## Implementation format amendment (2026-09-24)

For this implementation, Chat, Shop and Bloom use semantic HTML mockups rather than separate screenshot files. The native app content is only a source of visual direction; no approved capture was available. Keeping sample words and status labels in HTML preserves readable text, responsive layout and clear separation from a live feature. These markup illustrations are the selected static preview assets for version 1, and each stays a `<figure>` with a visible `<figcaption>` plus nearby heading, status, description and provenance caption. Decorative icons are hidden from assistive technology. The hero remains a raster photo and is tracked separately in the implementation asset manifest.

This is a documented adjustment to the still-image default, not a change to preview scope: the previews remain illustrative, noninteractive and isolated from app services. If a later revision exports a raster UI capture, it needs a local asset reference, meaningful alt text, mobile-crop review and the same visible status outside the image.

## Source map

Native repository: `Pratikn07/parenting-app`, reviewed commit `5e5caa73f5a5d0705572739dd881a96abe9be23b`.

| Area | Reference paths | What to retain |
| --- | --- | --- |
| Product navigation | `app/(tabs)/_layout.tsx`, `app/index.tsx` | Four pillars and the central role of Chat |
| Chat | `src/frontend/screens/chat/ChatScreen.tsx`, `components/ChatHeader.tsx`, `components/MessageBubble.tsx` beneath that screen directory | Conversation layout and contextual parenting use case |
| Recipe assistance | `src/frontend/components/recipes/recipeAssistant/`, `src/frontend/screens/recipes/recipeDetail/` | Connection between recipe use and later assistance |
| Shop | `src/frontend/screens/shop/ShopHome.tsx`, `src/services/shop/ShopService.ts` | Product categories, curated browsing and outbound retail model |
| Bloom | `src/frontend/screens/bloom/BloomScreen.tsx`, its milestone/tip components | Milestone and daily-tip structure |
| Native palette | `src/lib/constants.ts` | Warm cream, terracotta, sage and restrained gold cues |

Reference source does not need to be imported or executed in the Next.js bundle. No native dependencies, child-store imports or live native database calls belong in a static preview component.

## Asset briefs

| Asset ID | Visual content | Required exclusions |
| --- | --- | --- |
| HV-A01 Hero | Family/food image supporting everyday parenting, with usable mobile crop | No text baked into the image, unapproved family identity or product claims |
| HV-A02 Chat preview | One adult question about an everyday routine and one brief illustrative response, in a simple conversation frame | No health diagnosis, child photo, actual chat history, working input, typing indicator or “online now” badge |
| HV-A03 Shop preview | Three or four generic category/product cards, such as feeding, sleep and play | No current price, rating, sale badge, retailer endorsement, checkout button or live affiliate link |
| HV-A04 Bloom preview | Fictional milestone entry and a generic daily tip, clearly a sample | No real name, exact birth date, medical chart, developmental score or unimplemented mood/photo logging |
| HV-A05 Social image | Brand, recipe starting point and three labelled future pillars | No product availability claim beyond the selected release state |
| HV-A06 Recipe images | Existing approved images from the three free recipe catalog entries | No generated substitute presented as the actual dish without editorial approval |

Sample chat content should remain general, such as asking for a calm transition from playtime to dinner. Keep the response short and illustrative. Do not present sample advice as personalised to a real child or as a clinician-reviewed response.

For Bloom, prefer a milestone such as “Tried putting shoes on independently” over a score comparing a child with age norms. Use “Sample milestone” rather than a real child's name. An illustration must not imply clinical assessment.

## Source authenticity labels

| Asset provenance | Caption |
| --- | --- |
| Sanitised screenshot from a real synthetic native session | Parenting app preview. Not available on the website yet. |
| Reconstructed/adapted UI illustration | Illustrative preview based on our parenting app. |
| Pure concept with changes beyond native source | Concept preview for a future web experience. |

Choose the truthful label for each asset. Do not call generated/reconstructed UI an actual product screenshot. Pair the caption with the visible “Planned for the web” status.

## Production procedure

1. Choose a source screen and document the commit/path.
2. Create synthetic content without opening private production accounts.
3. Capture from an isolated native environment, build a labelled static image mockup, or select the semantic HTML mockup route documented above.
4. Remove account names, emails, IDs, photos, notifications, personal timestamps and backend URLs. Recheck the source before export.
5. Export a mobile crop and desktop crop only when the composition needs different framing.
6. Inspect at actual mobile display size. Read the label without zooming.
7. Optimise, strip unnecessary metadata and verify file dimensions, file size and ownership.
8. Record the approved asset and its digest/version in the manifest.

No image creation is part of this documentation PR. During implementation, use the available image-generation tool for requested raster concepts. Precise UI text, controls and status labels should be HTML or rendered design assets so spelling and layout remain verifiable.

## Asset manifest

Proposed location: `docs/implementation/homepage-vision/evidence/<release>/ASSET-MANIFEST.md`. Each row records asset ID, repository path or markup component, source/provenance, rights/permission, dimensions/bytes when raster, crop/alt text when applicable, caption, reviewer, approval date and replacement conditions.

Proposed public path: `my-curated-haven-web/public/images/homepage/`. Use clear versioned filenames without personal information. Keep source design files in the approved asset workflow. Do not commit raw private screenshots merely to preserve history.

Product imagery and family photographs need usable rights. Repository presence alone does not prove rights to publish every screenshot asset or depicted person's image. Use existing approved imagery or licensed/synthetic alternatives.

## Accessibility and image failure

Describe the preview's purpose and relevant visible content in adjacent HTML. Alt text should identify the preview without repeating a long transcript. Decorative icons use empty alt text or equivalent semantics. A screen reader must hear the feature status independently of image loading.

If an image fails, keep the heading, preview label and description readable. Reserve dimensions to avoid layout shifts. Provide a neutral image-unavailable frame rather than fetching a stock image which changes the product story.

Do not bake the only status label into a tiny screenshot corner. A standalone exported asset also needs a visible preview marking if reused in social posts, to avoid losing context outside the homepage.
