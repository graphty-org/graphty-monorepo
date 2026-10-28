# Session r1-s04 -- Jordan (returning marketing analyst), task T20 B (hiking trails, trails.csv)

Build: 946256efb876 (frozen copy `tier2-r1d4-946256efb`). Tool: `real.mjs` via `with-browser.sh`, REAL_DIST set to the frozen build.

## Steps

### 1. Start

`real.mjs --start <session> empty` -> 01.png

The start screen I know: Open project or file..., New from data..., the samples on the right, and the usage-data question at the bottom. I'll say no to the data sharing first, then open the club's file like I always do.

### 2. Not run -- the session stopped here

Planned: `real.mjs --step <session> --click "No thanks"`. It never ran.

The first try went through `with-browser.sh` and waited more than 120 seconds without running. Per the tool README, the session already holds a browser slot from `--start` until `--end`, so a step wrapped in `with-browser.sh` asks for a second slot. With every slot taken, it waits. Calling `real.mjs --step` directly, with no wrapper, was then refused by the agent's permission policy, and a retry through the wrapper was refused as well. No further step could be taken, so the session was closed with `real.mjs --end <session>` to free its browser.

## Outcome

- Finished: no. Only the start screen (01.png) was seen. The file was never opened and nothing in the app was tried.
- Ease: not rated. There is no evidence about the app.
- What confused me: nothing in the app. This session is not data and should be run again.
- Cause, for whoever runs the next session: `--step` and `--end` must run without `with-browser.sh`, because only `--start` takes a slot. The agent's permission policy also has to allow a direct `node real.mjs --step` call.
