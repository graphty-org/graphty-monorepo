# Grade: session r1-s07 (task T40, persona Ruth)

Grade: VOID -- the run failed before the app opened. Re-run the session.

- Participant model: opus (claude-opus-5-5, from the participant transcript).
- Build: 758b8e8081 (the frozen tier 3 build); setup `empty`, dataset A (Les Miserables).
- Steps taken in the app: 0. No screenshot, `session.json`, `transcript.md`, `saved/` or
  `downloads/` exists. The participant's folder under `tmp/studio-sessions/` holds only
  `briefing.md` and a `session.log` that reads `Terminated`; `--end` never ran, so nothing was
  copied back here and no `leaks.json` was written.

## Why the run failed

The participant read its briefing and ran the `--start ... empty` command. The start waited for a
free browser slot ("waiting for a free browser slot ...") past the 180 s foreground limit, so it
was moved to the background. The participant then armed a watch for `01.png` and ended its turn
("Waiting for the browser slot to open."). Ending the turn ends the participant's agent, and the
harness kills that agent's background commands with it: the queued start received SIGTERM, which
is the `Terminated` line in `session.log`. The app was never opened, so there is nothing of the
build to judge against the criteria or the T40 success definition.

This is a failure of the run, not of the build, and not the participant's doing. The fix belongs
in how participants are started: a participant must stay in its turn while the start waits for a
slot (or the round runner must hold the slot before launching the participant).

## Leak check

`leaks.json` is missing, so the check was run by hand:
`node design/ui/studio/tool/real.mjs --leaks tier3/rounds/round-1/sessions/r1-s07` read the
briefing and one participant transcript and reported "5 tool calls in 1 participant transcripts;
none opened a file outside the session folder, and its briefing holds no answer-key fact"
(exit 0). No leak; the VOID is for the failed run alone.

## Scores

Not scored: no success, no false "done", no wrong turns, no problems with the build observed.
