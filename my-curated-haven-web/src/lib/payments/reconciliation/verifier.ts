import type { Binding } from "./contracts";
import type { ProviderRead } from "./provider-read";

/**
 * One verification run: claim the job, read the provider outside any database transaction, record the result under
 * the same fence. Every step is injected, so this file has no runtime imports and is unit-tested directly.
 */

export type Claim = { state: "claimed"; jobId: string; fence: number; binding: Binding }
  | { state: "complete"; observationId: string };
export type Recorded = { state: "complete"; observationId: string } | { state: "failed"; code: string };
/** A provider read and the API version (or fixture name) that produced it. */
export type SourcedRead = ProviderRead & { apiVersion: string };
export type VerificationDeps = {
  claim(jobId: string): Promise<Claim>;
  read(binding: Binding): Promise<SourcedRead>;
  record(jobId: string, fence: number, read: SourcedRead): Promise<Recorded>;
};
export type VerificationResult = { ok: true; observationId: string } | { ok: false; code: string };

function code(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/ADM_[A-Z_]+/);
  return match ? match[0] : fallback;
}

export async function runVerification(jobId: string, deps: VerificationDeps): Promise<VerificationResult> {
  let claim: Claim;
  try {
    claim = await deps.claim(jobId);
  } catch (error) {
    return { ok: false, code: code(error, "CLAIM_FAILED") };
  }
  if (claim.state === "complete") return { ok: true, observationId: claim.observationId };
  let read: SourcedRead;
  try {
    read = await deps.read(claim.binding);
  } catch {
    // The lease expires on its own; a later check claims the job again under a new fence.
    return { ok: false, code: "READ_FAILED" };
  }
  try {
    const recorded = await deps.record(jobId, claim.fence, read);
    return recorded.state === "complete" ? { ok: true, observationId: recorded.observationId } : { ok: false, code: recorded.code };
  } catch (error) {
    return { ok: false, code: code(error, "RECORD_FAILED") };
  }
}
