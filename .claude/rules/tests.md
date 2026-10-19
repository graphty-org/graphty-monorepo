---
paths:
    - "**/*.test.{ts,tsx,js,mjs}"
    - "**/*.spec.*"
    - "**/test/**"
---

Tests wait on conditions and assert on counted work, never on time: wait for the event, the promise or the state that settles the thing under test, and assert on what was done (calls made, nodes placed, frames rendered), not on how long it took. No fixed sleeps (`setTimeout` delays, `waitForTimeout`) and no per-test timeouts; a slow test is a defect to find, not a number to raise. Enforced by the test-timing lint rule (#1589).
