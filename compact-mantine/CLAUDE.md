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

`tools/check-figma-lock.mjs` enforces this in the pre-push gate and in CI's Checks job. The Figma
browser tests (`tests/figma/*.browser.test.tsx`) compare every component with the Figma study in
`design/ui/figma`, which is outside git: they run in the pre-push gate on this machine and skip in
CI, where the study is absent. The lock also checks the study's captures against
`tests/figma/figma-study.sha256`.
