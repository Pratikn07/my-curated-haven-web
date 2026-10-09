import type { CollectionCommand, CollectionSnapshot, DraftControl, SaveCollectionCommand } from "./contracts";

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
