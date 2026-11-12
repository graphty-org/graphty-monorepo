# compact-mantine

## Locked to Figma

compact-mantine draws and behaves exactly as Figma does. The only departures are the rows of
`design/figma-spec.md` section 14, which the owner approved on 2026-10-23 as a closed list.

- Never change a component's look or behavior away from Figma, and never add, remove or change a
  section 14 row, without the owner's approval.
- Never edit a Figma test's expected value (`tests/figma/**`), the measuring harness
  (`tests/harness/figma.ts`, `tests/harness/measure.ts`) or the token values (`src/theme/tokens.ts`,
  `src/theme/colors.ts`, `src/theme/styles/size-scale.ts`) to make a test pass. Fix the component.
- The owner's approval is a `Figma-Approved: <reason>` trailer on the commit that makes the change.
  Only the owner adds it; never add it yourself.

`tools/check-figma-lock.mjs` enforces this in CI's Checks job. The Figma
browser tests (`tests/figma/*.browser.test.tsx`) compare every component with the Figma study in
`design/ui/figma`, which is outside git, through `tests/figma/figma-fixture.json`: exactly the
fields of the study's captures the tests read. The token tests (`tests/theme/tokens.test.ts`) read
Figma's CSS variables from `tests/figma/figma-variables.json`. So they run everywhere, CI included. After changing
which captures, elements or properties a test reads, regenerate it from the study with
`node tests/figma/figma-fixture.mjs build` (a test that reads a capture the fixture lacks fails and
names that command). Where the study is present, the lock checks its captures against
`tests/figma/figma-study.sha256` and every fixture value against the study.

## Shared components

Callers never write a bespoke control to work around a component here: if a component is wrong, fix it here, so
every caller gets the fix (graphty/CLAUDE.md, "UI Components").
