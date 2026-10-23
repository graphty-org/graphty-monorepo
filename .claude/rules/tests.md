---
paths:
    - "**/*.test.{ts,tsx,js,mjs}"
    - "**/*.spec.*"
    - "**/test/**"
---

Tests wait on conditions and assert on counted work, never on time: wait for the event, the promise or the state that settles the thing under test, and assert on what was done (calls made, nodes placed, frames rendered), not on how long it took. No fixed sleeps (`setTimeout` delays, `waitForTimeout`), no per-test timeouts and no deadline on a wait (`{ timeout }` or `{ interval }` on `waitFor`, `findBy*`, `vi.waitFor`, `expect.poll`, a Playwright action or assertion): every test and wait shares its package's one hang guard (`tools/test-wait-guard.mjs`), far above normal. A slow test is a defect to find, not a number to raise. To check that a UI delay is honoured (a tooltip's open delay), step it on a fake `setTimeout`, never by waiting it out. Enforced by the test-timing lint rule (#1589).
