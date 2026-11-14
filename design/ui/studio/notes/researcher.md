# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-06 (older entries folded; full text in git history).

## Top of mind

- (2026-11-06) Round 3 credits one change per problem. If a finding moves, name which unit moved it; if two units
  touch one surface (scope line, focus, the log's foot), say the credit cannot be split.
- (2026-11-06) Bar 9 hangs on the 400% Settings claim: the walks must land in `round-2/repro/settings-400/` with a
  `run.sh` before round 3 scores. No model call needed. Do it first if nobody has.
- (2026-11-06) Owed by the study, not a unit: the audit of the 193 round 2 screens (bars 10, 11), and whether the
  conversation comes back with a key after a reopen. Do not let either read as held.
- (2026-11-06) The key (`answers.md`) quotes words for "the fixed build". The dry run must check every quoted line on
  the frozen round 3 build before any grader reads it.
- (2026-11-06) Instrument fixes owed before sessions: no "RETURNING" in first-meeting prompts; CORS lines out of what
  participants read; `leaksIn` on quoted text. Verify each with a planted run, not the change log.
- (2026-11-06) Hover is a deliberate command in the tool (1 in 12 sessions). Never report "nobody hovered"; the
  Autosave tooltip fix can be read, not credited by any session.
- (2026-11-06) Watch T92 A's plant: the placeholder is the only scope change credited. If the plant still lands, the
  next step is the scope on the You turn, not new scope-line words.
- (2026-11-06) Watch the log's foot: the CSS-only fix (a) must be measured (`scrollHeight` vs `clientHeight`) and the
  three deferred routes (T93 B, T95 A, T90 B) re-walked. A reader who never scrolled did nothing wrong.
- (2026-11-06) Painted fact: count whether replies still deny a repaint. The app line can be right while the model's
  prose stays wrong; report the two apart. Same for one name per measure (`toolset.ts` still gives `plainName`).
- (2026-11-06) Bar 7 stays "fails as worded" if a persona rule closes the tab after success. Report the state at the
  success step beside the end state.
- (2026-11-06) Budget: about 1,331 requests left, 480 reserved for 12 sessions. Count walks and pilots against it
  before any dry run.
- (2026-11-05) Main risk is false passes: a bar counted where its trap never fired, a recovery the prompt supplied,
  "False done: no" on a session that never opened.
- (2026-11-05) Skeptic summaries disagree with their own rows: always recount from rows.
- (2026-11-05) Trace a door to its handler before saying two doors differ (Open a file vs Open project or file).
- (2026-10-30) A severity 3 needs its cost: a reader blocked or a wrong belief left standing. An expert-only 3 needs
  a repro.

## Priorities and values

- **Findings that are real.** A study that flatters the design ships the defect with a pass stamped on
  it. Judge every method by whether it can produce a false pass.
- **The first-time user's core path first** (owner, 2026-10-02).
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. An opinion-only finding is held one severity down.
- **Validate before launch** (owner, 2026-09-29). Preflight, dry run, snapshot. A check that inspects
  zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
- **Honest reporting.** Every number with its denominator; successes beside failures.

## Design criteria

Bars live in each tier's `criteria.md` (frozen before a round). In short: each task at 75-80% with a
floor per dataset half; no confirmed severity 3 or 4 (Nielsen; confirmed = 2 sessions on different
halves, or a session or expert plus a scripted repro); cost in steps per half on pointer sessions; an
end-state script for what a picture cannot show; a bar only a route under study can meet.

## Decisions and reasons

- **2026-11-06 (round 2 closed, read decisions):** Agreed with the Director's one-change-per-problem rule: it is what
  lets round 3 attribute a moved bar. Agreed refusing new scope-line words while the placeholder is tested: one
  planted reader, and two changes on one line cannot be credited. Agreed the tooltip fix removes a false sentence but
  no session can credit it (hover limit). Agreed keeping T90's second key: a task with no good key breaks bar 3; the
  one-bad-key case is unit 4's scripted walk. Agreed bars stay frozen, bar 7 "fails as worded". Rulings settled:
  a painting run says so on its existing line (no Colored row); rollback leaves nothing (differs from a reader's
  Undo); closing the panel does not end the x.
- **2026-11-05 (round 2 insights):** Applied skeptic verdicts from rows, not summaries. Refused key at 2; Autosave to
  2 (not blocked, true belief kept; file reopens). Bar 9 open, not hold, until 400% is reproduced. Kept Send again.
- **2026-11-05 (round 2 scoring):** Scored all 12 bars by hand; bars 10 and 11 "did not hold" (their named source read
  no session). Split bundled rows before scoring.
- **2026-11-05 (key for round 3):** Wrote decided words as "the fixed build" and left the check to the dry run;
  `Build decided` kept only as "if it returns" where a fix rests on the model.
- **2026-11-05 (tier 6 criteria and materials):** 6 tasks x 2 halves = 12 sessions; failed-message path inside T90;
  T93 grades reading, not obedience; proposed persona moves rather than editing frozen criteria.
- **2026-11-03 (tier 5):** One-round cap could only find; ask for at least 2 rounds before a tier. Make every bar's
  feed a launch precondition. Check task words against the key's success line before calling a failure.
- **2026-10-02 to 10-30 (tiers 1-4, folded):** Real app only; criteria frozen; every task walked first; task words
  never echo the screen; VOIDs re-run; change the prompt, not the key, when a prompt leads; two skeptics per insight.

## Tried: worked / did not work

- 2026-11-06 -- Worked: reading decisions' "Refused" list against my critique to avoid re-raising settled items.
- 2026-11-05 -- Worked: viewing every cited screen before citing; asking whether the tool could have made a defect
  (`--reopen`, `--upload`); a script over all logs (12 of 12 "returning"); recounting my own table before trusting
  it; reading a screen for what sits beside the finding (placeholder under Selection 14). Did not work: grep on
  `route.jsonl` for prose or for a control (it holds names and the screen list, so hits and misses both lie);
  multi-line asserted anchors.
- 2026-11-03 -- Worked: a verdict table per item, then the drop/weaken rule mechanically; `steps`, `endstate`,
  `waits` first; reading `hidden` in `styles.json`. Did not work: `score.mjs` and `steps.mjs`'s pooled verdict;
  "least sure" coded from summaries; briefing into old tmp folders; launching without gate evidence.
- 2026-09-28 to 10-30 -- Did not work: trusting `tooltip: null`, pilot step counts, grader wrong-turn counts;
  launching every agent at once; editing a running script; counting one defect in several lists.

## Thinking

- 2026-11-06 -- Round 2's defects share one shape: the screen says less than the graph did, or says it where the
  reader is not looking. Audits should compare neighbors on one screen, since graders score only the target.
- 2026-11-06 -- A fix that only removes a false sentence nobody read is correct and uncreditable. Report it as such.
- 2026-11-05 -- A persona rule can force the act that fails a bar; read persona histories like prompts. Two of six
  round 2 insights died of priming in histories.
- 2026-11-05 -- An insight about what readers did not do needs the tool to make doing it free.
- 2026-11-05 -- A bar's denominator is the sessions where the trap could fire, not those that ran.
- 2026-11-05 -- A bar the prompt supplies the exit for measures the door, not the message.
- 2026-11-03 -- Skeptics cut more from the study than the build; a words-vs-key-vs-fixture check before a round
  saves sessions. Fixtures pre-colored in the task's color manufacture findings.
- **False passes come from:** echoing words, a goal stating the control's meaning, "I think it worked", setups
  pre-doing a task, the easier half, a route around the feature, pooled halves.
- **False fails come from:** build defects deciding the task, tool limits, briefing vs setup mismatch, headless
  mechanisms, the runner.
- **Stopping simulation:** when rounds stop moving core tasks, go to real users.

## Sources

- Tier 6: `tier6/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md`, `decided.md`;
  `rounds/round-2/scores.md`, `insights.md`, `decisions.md`, `repro/`; tool `tool/tier6.mjs`, `real.mjs`;
  scripts in the worktree's `tmp/tier6-r2-score/`; a11y walks in the main checkout's
  `tmp/design-studio/tier6/a11y-r2-400/`.
- Earlier tiers: `tier3/` to `tier5/` criteria, keys, rounds; `design/ui/studio/digests/`; tools `steps.mjs`,
  `endstate.mjs`, `keydraw.mjs`, `waits.mjs`, `score.mjs`, `bars.mjs`.
