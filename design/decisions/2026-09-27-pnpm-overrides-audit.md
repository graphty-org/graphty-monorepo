# Fifteen pnpm overrides survive the audit, and why each one stays

Date: 2026-09-27
Changes: `pnpm-workspace.yaml` (`overrides`, `minimumReleaseAge`, `catalog`), the root
`package.json` (its `pnpm.overrides` block is gone), `pnpm-lock.yaml`.

## The decision

The root `package.json` carried 58 `pnpm.overrides` with no stated reasons. Every one was removed
and `pnpm audit` was read against what pnpm then resolved. An override came back only where a
package in the lockfile pins, or asks for a range of, a vulnerable version, so that pnpm cannot
reach the fix without it. Fifteen did. They now live in `pnpm-workspace.yaml`, which is YAML and
carries the reason beside each entry:

| Override                                     | Held back by                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `brace-expansion@>=4.0.0 <5.0.9` -> `^5.0.9` | `nx` 22.7.12 pins 5.0.8                                                             |
| `smol-toml@<1.7.1` -> `^1.7.1`               | `nx` 22.7.12 pins 1.6.1                                                             |
| `adm-zip@<0.6.1` -> `^0.6.1`                 | `@nx/react` -> `@nx/module-federation` -> `@module-federation/dts-plugin`           |
| `koa@>=3.0.0 <3.1.2` -> `^3.1.2`             | the same `@module-federation/dts-plugin`                                            |
| `ws@>=8.0.0 <8.21.0` -> `^8.21.0`            | the same `@module-federation/dts-plugin`                                            |
| `serialize-javascript@<7.0.5` -> `^7.0.5`    | `@nx/react` -> webpack -> `terser-webpack-plugin` asks for 6.x                      |
| `qs@<6.16.0` -> `^6.16.0`                    | `@nx/react` -> express                                                              |
| `lodash@<4.18.0` -> `^4.18.0`                | `commitizen` pins 4.17.21                                                           |
| `tmp@<0.2.6` -> `^0.2.6`                     | `commitizen` -> inquirer -> `external-editor` asks for 0.0.33                       |
| `minimatch@>=10.0.0 <10.2.3` -> `^10.2.3`    | compact-mantine's `vite-plugin-dts` -> `@microsoft/api-extractor` pins 10.0.3       |
| `ajv@>=7.0.0-alpha.0 <8.18.0` -> `^8.18.0`   | the same `api-extractor` -> `@microsoft/tsdoc-config`                               |
| `ip-address@<10.3.1` -> `^10.3.1`            | graphty-element's `@jsonhero/schema-infer` -> `@jsonhero/json-infer-types` pins 8.x |
| `undici@<6.28.0` -> `^6.28.0`                | graphty-element's `@ai-sdk/*` -> `@ai-sdk/provider-utils` 2.x pins 5.x              |
| `vite@<6.4.3` -> `^6.4.3`                    | `vitepress` 1.x depends on vite 5, which the vite advisories patch only from 6.4.3  |

To test whether an entry is still needed: delete it, run `pnpm install`, then
`pnpm audit --audit-level=moderate` and `pnpm why <name>`. If the audit stays clean, it goes.

## What the other 43 were

- Two forced DOWNGRADES, `storybook@>=10.0.0` -> `^9.1.20` and `vite@>=8.0.0` -> `^7.3.6`. Nothing
  in the workspace asks for Storybook 10 or Vite 8, so they held nothing back.
- Floors that direct declarations now cover: the root declares `storybook` `^9.1.20` (it pinned
  9.1.17), `happy-dom` `^20.8.9` in the root, algorithms and layout (two asked for 18), `nx` and
  every `@nx/*` plugin at 22.7.12 (the override had lifted `nx` alone to 22.7.x while the plugins
  stayed on 22.3.3), and Vitest 4.1.11 for every package through the pnpm catalog.
- Floors for versions the lockfile no longer contains at all.

## The lockfile was not regenerated from scratch

The issue asked for a lockfile resolved from nothing. One was built, and it is what showed that
most overrides are only needed because the lockfile holds old parents: resolved fresh, only six
of the fifteen above were still needed. But a fresh resolution also moves every runtime and test
dependency to its newest in-range release, and in this workspace that moved Babylon.js from 8.43
to 8.56, React from 19.2.3 to 19.3.0, Mantine from 8.3.10 to 8.3.18 and Playwright from 1.57 to
1.63. Two real failures came with it: compact-mantine's RangeSlider size tests fail against
Mantine 8.3.18, and the XR tests fail under Playwright 1.63's Chromium, which exposes its own
`navigator.xr`, so the IWER emulator declines to install. Those upgrades, their fixes and their
Chromatic review belong in their own change rather than inside a Vitest and pnpm upgrade, so the
committed lockfile keeps the previous resolution and changes only what this work requires. The
follow-up issue linked from the pull request carries the fresh resolution and both failures.

## What the audit leaves open

No high or critical advisory remains. Moderate and low ones without a patched release to move to,
or whose parent cannot take the patched major:

- `@vitest/mocker` 3.2.4 (moderate), a dependency of Storybook 9 itself; only Vitest 4's copy is
  patched, and Storybook 9 is built against the 3.x API.
- `uuid` 8 and 9 (moderate), through compact-mantine's Storybook 8 addons.
- `elliptic` 6.6.1 (low), through graphty-element's `encrypt-storage`. No patched version exists.
- A handful of low advisories (`body-parser`, `diff`, `@babel/core`, `postcss-selector-parser`,
  `@ai-sdk/provider-utils`) that a fresh resolution clears without any override.

## Supply-chain settings

pnpm is 10.34.5. `minimumReleaseAge: 1440` (minutes) keeps an install from resolving any version
published in the last day, the window in which a compromised release is usually found and pulled.

## The Dependabot alerts

GitHub listed 216 open alerts; 208 are for versions this lockfile no longer contains. GitHub's
dependency graph for the repository reports no parsed manifests (`dependencyGraphManifests` has a
count of 0 and the SBOM endpoint returns no packages), so it never re-evaluates an alert when the
lockfile changes. The stale alerts are dismissed as "inaccurate" with a comment naming what the
lockfile now resolves. If new alerts keep arriving frozen the same way, the repository's
dependency graph setting needs the owner; a CI dependency-submission step is the other route and
was deliberately not added.
