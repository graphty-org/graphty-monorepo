# Tier 5 round 1: void

This round measured nothing about the build. All 60 sessions (r1-s01 to r1-s30 and their re-runs
r1-s01b to r1-s30b) were refused by the study tool before any participant saw the app:

- `real.mjs --start` refuses every session of a round whose `plan.md` has no "Gate evidence"
  section, and the round's start gate (`real.mjs --gate <round folder>`) was never run, so the
  section was never written. Every start printed the same `FAIL: ... plan.md holds no "Gate
  evidence" section` line.
- The runner then re-ran every void session into the same refusal, instead of stopping at the first
  refusal every session shared.
- The leak check also flagged every session, because it matched file names inside the text a
  participant wrote (the quoted FAIL line names `plan.md`), not only the files a call opened.

What is still worth reading here comes from the expert walks and the scripted walk on build
1e123d7d33 (`scores.md`, `insights.md`, `expert/`). The one confirmed severity 3 (a screen reader
hears the count of the inspector row behind an open workspace) is fixed in the graphty app after the
freeze; see `../../decided.md`, "After round 1 (void)".

The round is rerun in full as round 1 from an empty `../round-1/` folder and does not count toward
the cap of three rounds or as "a round with no progress". Since this round, the runner
(`.claude/workflows/design-studio.js`) runs the start gate before any session and stops the round
when its first sessions are refused with one shared line, and the leak check reads only what a call
opens.

`bars/`, `bars-light/`, `calm-first-rejected.md`, `calm-first-frozen.md` and `rating-check.md` were
made on the frozen build 1e123d7d33; the rerun's gate looks for the bars runs and the calm-first
write-up in `../round-1/`, so run them there again (or copy them, if the build is unchanged).
