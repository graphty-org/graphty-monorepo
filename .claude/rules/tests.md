---
paths:
    - "**/*.test.{ts,tsx,js,mjs}"
    - "**/*.spec.*"
    - "**/test/**"
---

Tests wait on conditions and assert on counted work, never on time: wait for the event, the promise or the state that settles the thing under test, and assert on what was done (calls made, nodes placed, frames rendered), not on how long it took. No fixed sleeps (`setTimeout` delays, `waitForTimeout`) and no local deadline anywhere: no per-test or per-project timeout, no `{ timeout }` or `{ interval }` on a wait (`waitFor`, `findBy*`, `vi.waitFor`, `expect.poll`, a Playwright action or assertion, `waitForStableFrame`), no helper with a deadline parameter or a deadline loop, no `vi.setConfig`. There is one global hang guard, set in one place (`tools/test-wait-guard.mjs`, applied by `withTestGuards` in every vitest config), far above normal, and nothing overrides it. A slow test is a defect to find, not a number to raise. To check that a UI delay is honoured (a tooltip's open delay) or that a product's own timeout fires, step it on a fake `setTimeout`, never by waiting it out. Enforced by the test-timing lint rule (#1589).
