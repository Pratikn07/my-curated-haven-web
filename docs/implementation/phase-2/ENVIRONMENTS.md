# Runtime and environment contract

## Runtime decision

The reviewed lockfile resolves Next.js 16.0.7, whose package engine requires Node >=20.9.0. A minimum engine is not a runtime support recommendation.

Proposed implementation baseline: a currently supported Node 24 LTS patch, after confirming compatibility and availability on the linked host. Pin the tested version locally and in CI. Record npm version and declare the package manager in package.json.

Recheck framework advisories and select an appropriate patched framework release before application deployment. Do not infer security from a successful historical build.

The [Node release schedule](https://nodejs.org/en/about/previous-releases) showed Node 24 as LTS during planning. Refresh this decision at implementation time.

## Working directory

Git repository root and application root are different:

| Operation | Directory |
| --- | --- |
| Git commands | Repository root |
| npm install/build/test commands | my-curated-haven-web/ |
| GitHub workflow files | .github/workflows/ at repository root |
| Implementation documentation | docs/implementation/ at repository root |
| Host Root Directory setting | Verify my-curated-haven-web against actual project |

Do not move the app or modify submodule entries to simplify CI.

## Environment matrix

| Context | Data and credentials | Runtime behaviour | Exposure |
| --- | --- | --- | --- |
| Local development | Synthetic fixtures, no production credentials needed | next dev for interactive work | Loopback by default |
| Local verification | Same synthetic inputs | Production build plus next start | Loopback |
| PR CI | No production or preview bypass secrets | Clean install, checks, production-mode browser tests | Ephemeral runner |
| Shared preview | Only environment-specific values needed by current code | Host preview build | Verified reviewer access protection |
| Production | Only approved variables needed by shipped features | Host production build | Official public domain |

## Variables for this phase

The current marketing-app tests should require no Supabase or Stripe credentials.

| Proposed name | Location | Purpose | Decision |
| --- | --- | --- | --- |
| CI | Runner-provided | Test timeouts, retries and server reuse policy | Use runner value, never ship as client config |
| PLAYWRIGHT_BASE_URL | Test runner only | Optional approved preview test target | Default to local loopback if absent |
| SITE_URL | Server/build config, only if introduced | Explicit canonical production origin | Add only with code consuming the value |
| Preview automation bypass credential | Trusted secret store | Optional authenticated preview automation | Do not introduce for basic local CI |

These are proposed names, not a claim of existing configuration.

For a local-only suite, keep base URL in test config. If an override is introduced, validate its protocol and expected host before sending any credentials. No production-mutating tests belong in this suite.

## Example-file rules

- Use .env.example for variable names, comments and safe placeholders only.
- Keep .env.local and other real environment files ignored.
- Verify the existing .env* ignore pattern does not accidentally hide the example.
- If no variables are required, say so instead of adding unused configuration.
- Keep provider project identifiers in setup notes where useful. Never put tokens in the docs.

## Future-service boundary

Later backend work should establish separate test resources and document auth, data and storage access. Later payment work should use provider test mode before launch.

Do not copy the connected Instagram Supabase project configuration into this app by assumption. The correct recipe/product backend has not been established by this phase.

Do not add service-role keys, webhook secrets, payment keys or production user exports to bootstrap CI.

## Build-time network dependencies

The current root layout uses next/font Google fonts. Record whether the build environment reaches the required font resources. A blocked download is an environment failure with a specific cause.

Preferred response: provide the expected build-time access or make a separate reviewed move to locally hosted, properly licensed font assets. Do not mock production fonts silently or skip the production build.

## Acceptance evidence

- Selected Node and npm versions.
- Clean npm ci result with unchanged lockfile.
- Type-generation, lint, type-check and build outcomes.
- Proof the local and PR suite requires no production secrets.
- Host runtime and root-directory settings.
- Owner of future environment changes.

See [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) for clean-install behaviour and [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) for installed-version command support.
