import type { Check, Result } from "../contracts";
import type { CollectionImpact, CollectionReadiness, CollectionRevision, CoverAsset } from "./contracts";

/**
 * Readiness for one revision: the database's evidence checks plus the cover check, which needs the
 * deployment's cover manifest (src/config/collection-covers.json). Unknown evidence blocks; only a
 * fully known candidate can be approved, and only an approved one can be published.
 */
export function collectionReadiness(revision: CollectionRevision, impact: Result<CollectionImpact>,
  covers: readonly CoverAsset[]): CollectionReadiness {
  const checks: Check[] = impact.ok ? [...impact.value.checks] : [{ code: "SOURCE_UNAVAILABLE",
    scope: revision.collectionId, state: "unknown", severity: "blocker", origin: "source",
    explanation: "Buyer and dependency evidence could not be checked. Retry before review or publication." }];
  const cover = revision.snapshot.cover;
  if (cover) {
    const shipped = covers.some((c) => c.src === cover.src && c.assetDigest === cover.assetDigest
      && c.width === cover.width && c.height === cover.height);
    checks.push({ code: "COVER_APPROVED", scope: "cover", state: shipped ? "pass" : "fail", severity: "blocker",
      origin: "source", explanation: shipped ? "The cover is one of the shipped collection covers."
        : "The cover does not match a shipped collection cover. Choose it again from the list." });
  }
  const eligible = !checks.some((check) => check.severity === "blocker" && check.state !== "pass");
  return { digest: revision.digest, checks, readyForApproval: eligible,
    readyToPublish: eligible && revision.state === "approved",
    needsVerification: checks.some((check) => check.state === "unknown") };
}
