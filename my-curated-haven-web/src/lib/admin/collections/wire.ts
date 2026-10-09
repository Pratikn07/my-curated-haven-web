import type {
  CollectionCommand, CollectionSnapshot, DraftControl, IssueCollectionCommand, PublishCollectionCommand, ReviewCollectionCommand,
  SaveCollectionCommand, SubmitCollectionCommand,
} from "./contracts";

/**
 * The single adapter from camelCase commands to the snake_case JSON the collection RPCs read.
 * Snapshots stay camelCase: they are stored and digested exactly as the editor shows them.
 */

function base(input: CollectionCommand) {
  return { collection_id: input.collectionId, operation_id: input.operationId, reason: input.reason };
}

export function createWire(input: CollectionCommand & { snapshot: CollectionSnapshot }) {
  return { ...base(input), snapshot: input.snapshot };
}

export function startWire(input: CollectionCommand) {
  return base(input);
}

export function saveWire(input: SaveCollectionCommand) {
  return { ...base(input), expected_version: input.expectedVersion, expected_digest: input.expectedDigest,
    base: { publication_id: input.base.publicationId, digest: input.base.digest },
    snapshot: input.snapshot, reopen_reviewed: input.reopenReviewed };
}

export function controlWire(input: DraftControl) {
  return { ...base(input), action: input.action, expected_digest: input.expectedDigest, reference_id: input.referenceId };
}

function exact(input: CollectionCommand & { revisionId: string; expectedVersion: number; expectedDigest: string }) {
  return { ...base(input), revision_id: input.revisionId, expected_version: input.expectedVersion,
    expected_digest: input.expectedDigest };
}

export function submitWire(input: SubmitCollectionCommand) {
  return { ...exact(input), impact_token: input.impactToken };
}

export function issueWire(input: IssueCollectionCommand) {
  return { ...exact(input), code: input.code, field: input.field, severity: input.severity, explanation: input.explanation };
}

export function reviewWire(input: ReviewCollectionCommand) {
  return { ...submitWire(input), submission_id: input.submissionId, decision: input.decision,
    resolved_issue_ids: input.resolvedIssueIds };
}

export function publishWire(input: PublishCollectionCommand) {
  return { ...submitWire(input), base: { publication_id: input.base.publicationId, digest: input.base.digest },
    approve_now: input.approveNow,
    access_decisions: input.accessDecisions.map((d) => ({ release_id: d.releaseId, source_kind: d.sourceKind, policy: d.policy })) };
}
