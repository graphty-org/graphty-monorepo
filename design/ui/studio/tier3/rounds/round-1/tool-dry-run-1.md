# Tier 3 round 1: tool dry run 1 (second pass, incomplete)

Checked on 2026-10-21 on the frozen build 758b8e8081 (`.study-builds/tier3-r1d2-758b8e8081`), with
the tool at commit e8ac45abcc. The tool has not changed since commit bac7f99ad5. Nothing in the
studio's files was changed. The evidence is in the studio worktree's `tmp/tool-dry-run-r1-1/`.

The first version of this report, from the earlier pass, is in git at 17cc5def74.

**Verdict: not shown ready.** The pass had to stop before its browser checks finished. Checks 2,
3 and 4, the `--prove` checks, the planted gate rounds and a fresh bars walk were started, but none
of them finished. They must be run again: `tmp/tool-dry-run-r1-1/all.sh`, `gate-planted.sh` and
`bars.mjs <out> --tier 3 --dist <frozen build>`.

## 1. The browser gate -- partial pass

- `BROWSER_SLOTS=5` and `BROWSER_SLOTS=0` are both refused by `with-browser.sh` with exit 2.
  `BROWSER_SLOTS=9` on `real.mjs --start` stops the start with exit 1, and nothing is started.
- Six sessions were started at once, with a bars walk running beside them. A poll about once a
  second took 89 readings in the first 90 seconds. None showed more than 4 gated browsers: 88
  showed 4 and 1 showed 3.
- **Not shown:** that every session was ended. The pass stopped before the end phase finished.

## 2 to 4. Matcher, file drop, detour walks -- not run to the end

## 5. Participants cannot reach facilitator files -- partial pass

- `--brief` for r1-s05 (T39 A, Sam, `--keys`), r1-s20 and r1-s07 wrote each briefing under
  `tmp/studio-sessions/tier3/rounds/round-1/sessions/<id>/` and created nothing in the round's
  `sessions/` folder.
- Each briefing holds the persona, the roster history, the prompt word for word and the exact
  `--start` command. None holds the answer key, a follow-up, the avoided words or the criteria.
  The stray markup and the study-team note found by the earlier pass are gone.
- Two lines are still written for the study team, not for the participant:
  - Sam's "Why this persona exists" names "the studio's keyboard bar" and another persona,
    Morgan.
  - r1-s20's playing rules say "Do not show her the design's hypotheses".
- `--start` on the round's `sessions/r1-s05` is refused with exit 2, and the refusal names the
  folder to brief instead.
- `real.mjs --leaks rounds/round-1` exits 1 with "no participant log read for 56 sessions".
- **Not shown:** the two `--prove` checks. That run did not finish.

## 6. Scripted bars -- partial

| What it is | What was shown |
| --- | --- |
| `wording.mjs` | `--self-test` passes (exit 0). On round 1's walk: 0 shared words and 0 shared phrases not kept on purpose (exit 0). With 0 screens' spoken text it fails (exit 1). |
| `score.mjs`, bars 1 to 4 | An empty round fails with "no valid session, so no bar was measured" (exit 1). The self-test was not finished. |
| `keydraw.mjs` | A session with no key row fails (exit 1). The self-test was not finished. |
| `bars.mjs --tier 3`, bars 6 and 8 | A fresh walk on the frozen build was started but did not finish. The committed round 1 runs passed the gate earlier. |
| `real.mjs --gate` | The planted rounds were not run again. |
