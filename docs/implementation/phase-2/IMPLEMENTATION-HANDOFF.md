# Phase 2 implementation handoff

[All plans](../README.md) · [Phase 2 overview](README.md)

## Task

When application setup is requested, implement the Phase 2 engineering foundation in the existing repository. Do not treat the existence of this plan as evidence the work is finished.

Read Phase 1 scope and route inventory, then this phase's detailed plan, environment contract, CI specification, test strategy and release runbook.

## Work checklist

- [ ] P2-01: verify current source, commands, host and production relationship.
- [ ] P2-02: pin a tested supported runtime and clean-install contract.
- [ ] P2-03: document environment boundaries and safe example file.
- [ ] P2-04: add explicit typecheck and browser verification commands.
- [ ] P2-05: add focused tests for currently working behaviour.
- [ ] P2-06: add and verify the stable web-quality Actions job.
- [ ] P2-07: verify protected preview access.
- [ ] P2-08: configure main requirements and verify failure blocking.
- [ ] P2-09: record release, rollback and Phase 1 handoff evidence.

Check a task only after the specified evidence exists. “File added” is not enough for CI, preview or merge enforcement.

## Current application boundaries

The app is under my-curated-haven-web. Keep package-lock.json as the dependency lock. Preserve both repository-root submodule entries.

Phase 1 code has not been implemented by its plan merge. Test baseline routes first. Add future route expectations in the implementation change which introduces them.

The goal remains a mobile-first recipe product under My Curated Haven. Do not add Stripe, Supabase projects, child profiles, AI tools or recipe data during this setup phase.

## Implementation judgement

Resolve ordinary file naming, test layout, compatible tool versions and focused baseline fixes using repository evidence.

Read current framework advisories before choosing dependency versions. Document any required patch separately from test-runner additions. Do not mix in a broad framework rewrite.

Use existing hosting integration and maintain one production deployment path. Do not select a new paid service to complete a checklist.

## Access limitations

Repository write access does not establish administration access to rulesets or Vercel. Complete authorized code and documentation work first. If external settings are inaccessible, state the exact missing configuration and evidence needed.

Do not claim the required checks or preview protection exist based only on written instructions. Do not weaken an existing rule to finish the task.

Deployment authorization must come from the current session and applicable rules. This plan documents a release procedure, not blanket authorization for future production work.

## Required evidence in the implementation PR

- Source baseline and final implementation SHA.
- Runtime and npm versions.
- Clean install, lint, type generation, type-check and build results.
- Browser test count and outcome.
- Workflow run URL.
- Deliberate failure and corrected-run evidence.
- Required-check/ruleset identity.
- Preview access results.
- Production trigger and rollback reference.
- Remaining blockers with owners.

## Handoff to Phase 1 and Phase 3

Phase 1 receives working checks, a protected review environment, and a documented release path. Its route and navigation changes add the matching regression tests.

Phase 3 receives the same foundation for mobile design changes. Avoid declaring the existing colour palette fully accessible without component-level contrast and state checks.

## Completion report

State what changed, what ran, what passed, what external configuration was verified and what is still blocked. Link the implementation PR and exact commit.

Distinguish these states: documentation merged, setup implemented, CI passed, settings verified, application deployed. Do not collapse them into a single “done.”
