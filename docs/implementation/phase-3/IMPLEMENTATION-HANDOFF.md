# Phase 3 implementation handoff

[All plans](../README.md) · [Phase 3 overview](README.md)

## Objective

Implement the mobile-first design foundation using the existing Next.js app. Keep My Curated Haven and its official domain. Preserve the cream, terracotta and sage brand direction, with functional shades meeting contrast requirements.

Read current repository instructions, Phase 1 scope and Phase 2 setup before edits. Confirm which application changes and CI settings have actually shipped.

## Checklist

- [ ] P3-01: record source, rendered baseline and existing component consumers.
- [ ] P3-02: build a concrete local/protected design reference.
- [ ] P3-03: implement semantic tokens and correct font mappings.
- [ ] P3-04: refactor core UI primitives and interaction states.
- [ ] P3-05: integrate a responsive shell using the existing route contract.
- [ ] P3-06: apply the system to current public pages.
- [ ] P3-07: create isolated recipe layout examples and state contracts.
- [ ] P3-08: verify imagery, reduced motion and print foundations.
- [ ] P3-09: complete the acceptance matrix and focused checks.
- [ ] P3-10: prepare release evidence and later-phase handoff.

Do not mark a task complete solely because a component file exists.

## Source preservation and scope

Keep deferred parenting pages recoverable. Shared component changes affect their future reuse, so retain compatible props or document a migration. Do not edit the parenting_app or SuperClaude_Framework gitlinks.

No public recipe endpoints, database migrations, Stripe integration, authentication, analytics service setup or native-app rewrite belong to Phase 3.

Do not add fake Buy, Save or Print capabilities to the public website. Isolated design examples should clearly identify simulated interactions.

## Implementation choices

Reuse existing tools and utilities. A new UI framework, Storybook deployment or Figma subscription is not required.

Keep static surfaces server-compatible. Use client components for stateful controls. Preserve visible content when animation or images fail.

Resolve routine file names, component extraction and responsive details through the specified contracts. Product review should use concrete examples, while independent implementation work proceeds.

## Design decisions to record

- Accepted action and status colours.
- Font-family choice and loader-to-theme mapping.
- Header behaviour and breakpoint.
- Card image crop and typography.
- Filter Apply/Cancel semantics.
- Print content hierarchy.
- Remaining product or content blockers.

The exact paid collection, price and commercial terms remain owner decisions from Phase 1. Do not fill missing values to make a design feel complete.

## Downstream handoff

| Phase | Design input supplied |
| --- | --- |
| 4 backend | Public-preview versus authorized-content boundary |
| 5 content | Display fields, null handling, image and print requirements |
| 6 recipe UX | Card, listing, detail, filter and request-state patterns |
| 7 accounts | Future saved-state presentation, no assumed persistence |
| 8 payments | Collection presentation and access states, hosted checkout boundary |
| 9 analytics | Named user interactions to instrument later |

## Completion report

Link the implementation PR and exact commit. Summarize rendered changes, tests, review evidence and unresolved dependencies.

Distinguish design documentation, component implementation, isolated prototype behaviour and public feature launch. Do not claim paid access, recipe content or whole-site accessibility compliance from this design work.
