---
name: design-studio
description: Use when launching, continuing, or changing graphty's design studio -- the simulated UX research studio that tests the real graphty app with simulated users, expert walkthroughs and screenshot audits, then fixes what it finds. Covers preparing a new study tier (criteria, tasks, answer key, roster, personas, setups), launching or continuing a tier or round with the saved design-studio workflow, keeping the owner informed, and the process lessons every run must follow.
---

# The graphty design studio

The design studio is a simulated UX research team run as a Claude Code workflow. A panel of
designer roles (director, user advocate, UX researcher, information architect, content designer,
interaction designer, Figma product designer, visual designer, accessibility specialist, red team
critic and design engineer) studies the **real** graphty app with simulated participants, finds
what gets in their way, decides what to change, fixes it in the package that owns the problem,
and studies the new build again. It repeats until the success bars written before the study hold.

A study is run in **tiers**. Each tier studies one kind of use. Tier 1 covered a first-time user's
core path; tier 2 covers common repeat work for a returning user. Every tier runs through the same
saved workflow, `.claude/workflows/design-studio.js`; a new tier needs only its materials and an
args object.

**When a new process lesson comes up during a studio run, change this skill or the workflow in the
same session** -- not only memory. A lesson kept only in memory is lost at the next launch; this
file and the workflow are what the next launch reads.

## Where things live

All studio work happens in the studio worktree (today `.worktrees/design-studio-tier1`, branch
`design/studio-tier1`), never in the main checkout. The studio reads earlier rounds' screenshots, so create
its worktree with `./tools/worktree-new.sh <branch> <base> --full-images ...`; an ordinary worktree has the
`design/**` images only as Git LFS pointer files (fix one with `git lfs pull --include "design/**"`). Inside
it, `design/ui/studio/` holds:

| Path                              | What it is                                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tool/real.mjs`, `tool/README.md` | The study tool: drives the real app in a headless, GPU-drawn browser one step at a time and saves a screenshot after every step; every walk saves its route (`route.jsonl`), which `--replay` and `--rewalk` run again with no model. Read the README before writing tasks or setups |
| `tool/with-browser.sh`            | The machine-wide browser gate (8 slots for GPU-drawn study browsers, of which 1 to 4 are shared with the pre-push gate). `real.mjs` takes a slot at `--start` (or takes over a warm browser that already holds one) and frees it at `--end`                                          |
| `notes/<role>.md`                 | Each designer's memory: "Top of mind", priorities, criteria, dated decisions with reasons, what worked and what did not                                                                                                                                                              |
| `owner-decisions.md`              | Additive API changes the team decided ("decided by the team") and BREAKING ones waiting on the owner ("for the owner")                                                                                                                                                               |
| `personas/`                       | Persona files (composites from public sources; no real person)                                                                                                                                                                                                                       |
| `report.md`                       | The tier 1 report                                                                                                                                                                                                                                                                    |
| `tier<N>/`                        | One tier: `criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `rounds/`, `report.md`                                                                                                                                                                                               |
| `tier<N>/decided.md`              | The tier's binding decisions: each settled behavior (what a key does on a control, a Tab stop, a count) with its date, reason and evidence; every triage cites it                                                                                                                    |
| `tier<N>/backlog.md`              | Defects below the session-ready bar (friction, wording, cosmetic, keyboard or screen-reader only), fixed between rounds by the decide-and-fix loop                                                                                                                                   |

Frozen builds are copied to `<repo>/.study-builds/tier<N>-<round>-<sha>/` and never changed.

## Preparing a new tier

Write these in `design/ui/studio/tier<N>/` and commit them on the studio branch **before** any
session. The workflow's preflight refuses to start without them.

1. **`criteria.md`** -- the success criteria, written before any session runs:
    - the first line is reserved: `The study runs on build <sha> served from <dir>` (the workflow
      writes it each time it freezes a build);
    - the bars that decide "done", each measurable per task and dataset (task success rate, false
      "done" claims, wrong turns, open severity 3-4 problems), including how the expert
      walkthroughs and the screenshot audit count (for example, confirmed severity 3-4 findings
      count against the open-problems bar);
    - when the studio stops: bars met, a round with no progress, a one-way-door decision for the
      owner, or the safety cap;
    - the round plan: at most 4 participants alive at once, no step cap, one-or-two-sentence step
      notes, a session cap per round, retry on an API error from a clean folder with the model
      recorded;
    - a change log. A bar changes only with a reason in the change log, and never after the freeze.
2. **`tasks.md`** -- what each participant is asked, one section per task, with its start. A task
   never names the control it needs, and never reuses words a fix put on screen when it re-tests
   that fix. Where a wording or label is at stake, run the task on at least two domains' data.
3. **`answers.md`** -- the answer key, never shown to participants: each task's success
   definition, its success path step by step, and what the final screen or saved file must show.
4. **`roster.md`** -- who participates and which tasks each takes. For a returning-user tier,
   each persona has a **history** (what they did and saw in earlier sessions) and a **start** that
   reflects it: a saved project or a setup file, empty only where the task is about starting
   fresh.
5. **Personas** -- new persona files in `personas/` (or pointers to the designloom records in
   `design/designloom/personas/`, which are the product's requirements base).
6. **Setups and saved projects** -- the `setup:<file>` files and projects the starts name (see
   `tool/README.md`, "A session"). A setup step that misses fails the start with `SETUP FAILED`.

Pilot a few tasks by hand with `real.mjs` while writing the answer key; the workflow pilots all of
them again on every frozen build.

## Launching the workflow

Validate cheaply first, then launch the real run:

```
Workflow({ name: "design-studio", args: { tier: 3, focus: "<one sentence on what this tier studies>", preflightOnly: true } })
```

Read the preflight's problems, fix them, then launch for real with the same args minus
`preflightOnly`. Arguments (all optional except where a default would be wrong for the tier):

| Arg                         | Default                                                            | Meaning                                                                                       |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `tier`                      | `2`                                                                | Tier number; names folders, builds and the servherd server                                    |
| `focus`                     | the criteria file                                                  | One sentence on what the tier studies, given to the criteria reviewers                        |
| `users`                     | `"returning"`                                                      | `"returning"` or `"first-time"`: how participants are framed                                  |
| `worktree`, `branch`        | the studio worktree and branch                                     | Where the study runs                                                                          |
| `studioDir`, `studyDir`     | `<worktree>/design/ui/studio`, `<studioDir>/tier<N>`               | Studio and tier folders                                                                       |
| `reading`                   | `[<studioDir>/report.md]`                                          | Earlier reports and designs the criteria reviewers read                                       |
| `safetyRounds`              | `6`                                                                | Hard cap on rounds                                                                            |
| `startRound`, `skipPrepare` | `1`, `false`                                                       | Continue at a later round in a fresh run (see below)                                          |
| `maxSessions`               | `56`                                                               | Sessions per round                                                                            |
| `browserSlots`              | `8`                                                                | Browser-driving agents alive at once; values above 16 are cut to 16                           |
| `dryRunPasses`              | `2`                                                                | Most fix-and-re-pilot passes before each round; still not session-ready after them, it stops  |
| `maxDecisions`              | `15`                                                               | Changes the director may decide per round                                                     |
| `team`, `teamRemove`        | the eleven roles                                                   | Add or rename roles (`{ steward: "Ontology Steward" }`) or drop optional ones                 |
| `experts`                   | Figma, visual, accessibility walkthroughs and the screenshot audit | `[[role, what]]` pairs, one expert agent each per round                                       |
| `dryRunExtra`               | none                                                               | Extra instruction for the first dry-run triage (e.g. "also read these discarded transcripts") |
| `serverName`                | `design-studio-tier<N>`                                            | servherd name of the served build                                                             |
| `land`                      | `true`                                                             | Whether to make the branch ready to land at the end (see "Landing" below)                     |
| `landEachPass`              | `true`                                                             | Whether every fix pass is made ready to land, and the studio waits for it to land             |

To **continue** a stopped tier, launch a fresh run with `startRound: <next round>, skipPrepare:
true` rather than resuming the old one (see the lessons below).

## What the workflow does

1. **Preflight** -- checks the worktree, the tier's four files, persona and setup paths, the tool,
   that the starting round's session folder is empty, and the browser count. It returns before
   anything costly if one fails.
2. **Prepare** -- waits for a clean branch; the researcher, user advocate and red team review the
   criteria once; the director applies the reviews and **freezes** them; origin/master is merged
   into the studio branch and a build is frozen and served; the **scripted dry run** walks every
   task's success path with no model (`tool/dry-run-pass.mjs`: the app's routes in `graphty/acceptance/`,
   their outcome checks, and each route's end screen compared with the earlier pass's), one reviewer
   looks only at the end screens that changed, and a pilot agent walks only what no script covered:
   a task whose scripted route failed or has none (all three ways), and the detours and keyboard walk
   of the rest -- first replayed from the earlier pass with no model (`real.mjs --rewalk`), by hand only
   where they diverged or were never walked; a pilot that skipped a route is run again; the **dry run** triages what the pilots found against `decided.md` and the
   session-ready bar (see the lessons), fixes only crashes, blocked tasks and grading-spoiling
   results, sends everything else to `backlog.md`, re-walks the routes each fix group touched and
   reverts a group that regresses, lands the pass, freezes a new build, and re-pilots the same way
   with only the touched routes beside the scripted success paths: a task whose script passed,
   whose earlier keyboard walk and detours still match, and that no touched route may belong to keeps
   that earlier pass's result (with its defects); otherwise a pilot agent walks the routes that
   diverged or were never walked and carries over the earlier report's findings for the rest. It exits as soon as the bar holds, and after
   `dryRunPasses` (2) fix passes that still leave blockers it stops for the owner with the list.
3. **Rounds** -- the researcher plans sessions (`real.mjs --brief` writes each participant's
   briefing in a folder outside the studio's files, and a session that read anything else is
   void); the
   **tool dry run** checks the study tool and every bar's script, and the round stops if it fails
   twice; participants run through the browser semaphore, get their follow-up question, and a void
   session is re-run once as `<id>b`; each is graded only from the final screen and saved files; the expert walkthroughs and the
   screenshot audit run beside them; the researcher scores; two skeptics try to refute every
   finding; verified insights go to the owner; a verdict decides whether to stop. If not: every
   role proposes, the red team attacks, the director decides (with a generality check), engineers
   fix in the owning package with tests (the round's decisions plus backlog items, grouped by
   shared component; the accessibility expert also checks the backlog's accessibility items), the
   fixes land, origin/master is merged in, a new build is frozen and served, the dry run runs again,
   every designer updates their notes, and the documents are committed.
4. **Report** -- the director writes `tier<N>/report.md`; the branch is made ready to land.

## Landing

Studio fixes reach master like every other change, through their own pull request (`CLAUDE.md`,
"Shipping a change"). Workflow agents never push, so at every landing point the
workflow merges origin/master into the studio branch, builds, lints, commits, and logs one line:
`ready to land: <branch> at <sha> (<pass>)`. The session that launched the workflow answers that
line by running `tools/pr-open.sh --proof <file>` in the branch's worktree and fixing the branch if
its pull request goes red; the line also names any breaking commit, which merges only with the
owner's go. The workflow then waits until the commit is on `origin/master` (the pull request merged)
before it goes on. Pass
`landEachPass: false` only for a run whose fixes must not reach master.

Outputs, per round `r`: `tier<N>/rounds/round-<r>/` (`plan.md`, `sessions/<id>/` with screenshots,
`transcript.md`, `grade.md` and `leaks.json`, copied back from the participant's own folder under
`tmp/studio-sessions/`, `tool-dry-run-<k>.md`, `expert/<role>.md`, `scores.md`, `insights.md`, `decisions.md`); pilots, each with a
`report.md` of every route walked, under `tier<N>/rounds/r<r>[d<pass>]/pilot/`; dry-run triage in
`tier<N>/dry-run-r<r>-<pass>.md`; fix groups the re-walk rejected in `tier<N>/rejected-fixes.md`.
The pilot reports and triage are committed after every pass. The walks' screenshots and step files
(pilot, dry-run, readiness and tool-check walks) are never committed: they go under the main
checkout's `tmp/design-studio/tier<N>/<round or pass>/`, which git ignores, and a report names them
by that path as plain text. `real.mjs` refuses a walk folder inside the studio's files, and
`.gitignore` keeps everything but `.md` out of `rounds/r*/`.
Walk screenshots go to `tmp/design-studio/`, never into git (owner, 2026-10-21): `.husky/pre-push` and CI
refuses more than 20 new images or 20 MB outside the image folders (`tools/check-committed-images.mjs`);
an `Images-Approved: <reason>` trailer passes a deliberate few, such as mockups.

## Keeping the owner informed

The workflow `log()`s, as they happen: each frozen build's URL and commit, each dry run's two-
sentence finding, each round's five verified insights with a screenshot path, each round's
decisions, the verdict, and why it stopped. The session that launched it relays these to the owner
as they arrive -- insights and new build URLs are what the owner most wants to see, so they can try
the build themselves. Answer "how is the studio going?" from the latest log lines and the round
folder, never from memory. End a message with `ACTION NEEDED:` only when the studio stops for an
owner decision, and only once per item.

## Lessons learned

Each rule below exists because breaking it cost a run.

- **Dry run before every round's sessions, to the session-ready bar and no further.** A build is
  ready for sessions when it has no crash and no blocked task or grading-spoiling wrong result on
  any task's success path or listed detours, re-walked after fixing. The dry run fixes only those;
  friction, wording, cosmetic and keyboard or screen-reader-only problems go to `backlog.md`
  (accessibility items also to the accessibility expert's walkthrough) and are fixed between
  rounds by the decide-and-fix loop. At most 2 fix passes; a re-pilot after a fix pass walks only
  the success paths and the routes the fixes touched; if the bar still fails after 2, stop for the
  owner with the remaining blockers. Tier 3 ran five full passes over about three days with no
  session: of fix-now lists of 344, 217, 151, 129 and 124 rows only 2 were crashes, 76-88% were
  friction, wording or cosmetic, and round 1 could have started after pass 2 or 3. The opposite
  failure is real too: the first tier 2 launch used the pilots only to correct the answer key, and
  defects that blocked or misled participants stopped the round after five sessions.
- **Merge origin/master before every freeze of a round's build.** Before a tier's first build and
  before each round's build, origin/master is merged into the studio branch, so the study never
  runs on a stale app.
- **A dry run that passes on the answer key's route is necessary but not sufficient; it also walks
  each task's commonest detours.** Tier 2 round 1's dry run walked every success path on four
  builds and no participant met a broken control there -- but participants who took common detours
  met build defects no walk had visited: adding Color under Edges while a run's layer was open wrote
  it to Everything, the selection halo tinted a node's own color, focus fell to the page after Add
  step and Delete step, and Enter did not commit a step edit. Each pilot now also walks the two or
  three commonest detours, taken from the previous round's wrong turns and from what a person who
  does not know the path would try first, and writes a report of every route it walked.
- **The dry run also walks each task by keyboard and notes the screen-reader names.** Round 1 was
  piloted by pointer only, so the focus faults above reached the accessibility expert instead of
  being fixed first. Each pilot walks the success path again with Tab, Enter, Space, Escape and the
  arrows, presses Enter, Tab and Escape in every field it opens, and reports focus falling to the
  page, a key that does nothing, and a missing or duplicate name as defects.
- **The study tool gets its own dry run before every round's sessions.** In round 1 the tool reached
  participants more often than the build did: more than four sessions ran at once (load about 158,
  click timeouts), the matcher took the first partial match ("Enjolras", the Sources row against the
  panel heading), a synthetic file drop did nothing on screen, a void session was never re-run, two
  follow-up questions were never asked, and a participant told to read the criteria's first line
  read the facilitator notes and the avoided-words list. The workflow now enforces each: one
  semaphore covers every agent that may drive a browser (participants, graders, experts, pilots,
  engineers checking a fix, build freezes) and is capped at 4; a void session is re-run once as
  `<id>b`; the follow-up is sent by the workflow, not left to the participant; participants get
  only a briefing folder (persona and task text) and the frozen build directory, never a studio
  path, and a session that opened anything else is void. The tool dry run checks the gate with six
  sessions, an ambiguous click, a real file drop, the detours and the briefing folders.
- **Every script a bar is scored by exists and passes a check before the round.** Round 1's
  open-work lister, weight script, accessibility and word counts on tier 2 screens were never
  built, so bars 2, 7, 8 and 9 could not hold whatever the sessions showed. The preflight checks
  each named script exists; the tool dry run checks it fails on a planted failure of its own (a
  script that reads zero items fails) and runs on the frozen build.
- **Pilots walk each task from its real start by clicking, never by URL.** A mock-era check that
  opened each screen by address passed while 18 tasks had end screens no click could reach and
  data that changed between screens.
- **Freeze the criteria before any session, and the build under each round.** Bars written after
  seeing results drift toward what was measured. Changing the build mid-round makes sessions
  incomparable. Fix between rounds and freeze a new build.
- **At most 8 browser-driving agents alive at once, through one semaphore in the script, and
  every study browser draws on the GPU.** On 2026-10-01 eight review agents each ran their own
  parallel crawls: 23 headless Chromium, 49 GB, swap full, an alert to the owner. In tier 1,
  participants queued 17 to 50 minutes for a browser slot while their clock ran, and those sessions
  were voided. The semaphore starts a participant only when a slot is free, and every other
  browser-driving agent shares it (see the tool dry run lesson above). The cap was 4 while
  browsers drew in software (SwiftShader: 550 to 690% CPU per idle graphty page, load above 47 with
  four); on the GPU an idle page costs 27 to 51% and eight sessions used 6.8 GB and about 110% of
  one core, so the cap is 8 (`browserSlots`, and the gate's `BROWSER_SLOTS`). A session that cannot
  reach the GPU fails its start loudly; never run study browsers in software to get past it.
- **Replay, do not re-walk.** Tier 3's 574 dry-run walks spent about a quarter of their time on the
  model, 30% starting browsers (a median of 82 s per walk, most of it waiting for one of four slots)
  and 29% on 6 to 11 s steps, and every re-pilot walked by hand routes an earlier pass had already
  walked. Every walk now saves its route (`route.jsonl`); a re-walk replays it with
  `real.mjs --replay` / `--rewalk`, which needs no model until a step's screen differs, and a pilot
  carries on by hand only from there. Warm browsers make a start about 2 s instead of 7 to 11, and a
  stretch a walker is sure of goes in one `--step` with one screenshot. Participants are never
  replayed: they drive every step.
- **Script the success paths; agents only look at what changed.** Dry runs and studies took days
  because agents navigated page by page. Every task's success path is a route in `graphty/acceptance/`
  (Playwright code driving real clicks and keys on the GPU, checked through graphty-element's API),
  and the dry run starts with it: all 30 tier 3 task halves run in about a minute with no model. A
  route that fails, or a task with no route, gets a pilot; a route that passes gets none. Its end
  screen is compared with the earlier pass's with the drawing and the status bar covered (both
  change from run to run on one build; the outcome checks read what the drawing shows), and only changed screens go to one reviewer
  agent. A defect a pilot finds on a success path becomes a route (`graphty/acceptance/README.md`,
  "Adding a route"). Nothing runs it automatically on a branch: an agent with a long-running
  branch that touches the app runs `node tools/acceptance.mjs run` itself before landing (only the
  routes its change can affect; `--all` for every route).
- **Always `--end` a session, including after a failed attempt.** A stopped agent that never ended
  its session kept its browser slot until the idle timeout.
- **Step notes are one or two sentences, in character.** Full think-aloud in long, screenshot-heavy
  sessions tripped the API's safety filter on about one session in four in tier 1. Short notes
  keep the session; do not trade session quality further (for example by asking retries to "say
  less").
- **Retry a session that ends on an API error: the same prompt from a clean folder, then once on
  Sonnet, and record the model.** Sonnet plays a participant differently, so the report counts
  those sessions separately.
- **No step cap.** A 40-step cap in tier 1 could end a session that was still making progress. A session
  ends when the participant is done, gives up, or keeps repeating without progress.
- **Graders score from the final screen and saved files, never from the participant's rating.**
  Simulated participants claim "done" when the screen says otherwise; false "done" is itself a
  measured bar.
- **Two skeptics try to refute every finding before the studio acts on it.** One simulated model
  plays every persona, so twelve "people" making the same wrong guess can be one guess repeated.
  A pass is weak evidence; a failure reproduced by script is strong.
- **Expert walkthroughs and a screenshot audit every round.** Tier 1 participants missed most of
  what the owner noticed in a few minutes on a real device: truncated color pickers, wrong
  components, missing affordances. Simulated task sessions do not look at polish; experts do.
- **Check every decided change for generality.** In the mock era a fix put "Money in" and "Money
  out" on screen because one fixture's weights were dollars; the re-test, worded "money in against
  money out", jumped from 2.0 to 5.0 partly by echoing its own words. A change must serve every
  domain, add no concept the product's model lacks, and be re-tested with words it did not put on
  screen.
- **Follow Figma where Figma solved the problem, graphty's own model where graphty differs.** The
  owner warned the studio it was copying Figma too literally (exports in the top right instead of
  thinking about data management).
- **Every designer keeps notes and reads them first.** Studio iterations lost consistency when each
  run started without the previous designers' reasoning. Notes are updated after every round,
  summarized past about 25 KB, and committed with the round's documents.
- **Commit the studio documents every round.** Nine of ten notes files once existed only on disk.
- **Architecture holds inside the studio.** Graph functionality goes in graphty-element as neutral
  facts (`{ code, params }`, never English, never grouping or order); words and arrangement in the
  app; shared components in compact-mantine. A fix that works around an element defect in the app
  is a defect.
- **Additive API changes are the team's call; only breaking ones go to the owner.** The owner said
  so on 2026-10-08: asking about every new method or option was the bottleneck. Record the
  reasoning under "decided by the team" in `owner-decisions.md`; never block the study on an
  owner item.
- **Stop on: bars met, a round with no progress, a one-way-door decision, or the safety cap.**
  Stopping tells the owner why, once.
- **Do not resume a long run after editing its script; start a fresh run with `startRound`.** A
  resume replays cached results only up to the first changed agent call, and runs everything after
  it live. Adding a retry to tier 1's script re-ran round 1's plan with new session ids, discarding
  sessions that had already finished. Change the script at a natural pause, then launch a fresh
  run from the next round.
- **Never SendMessage a workflow's agent.** It does not reach the running agent: it resumes a second
  copy from its transcript, and both edit the same worktree. To change a running agent's
  instructions, stop the workflow, edit the script, and launch again.
- **Subagents never run `git stash`, `checkout`, `switch`, `reset`, `restore` or `rebase`.** Their
  permission prompt is never answered, so the agent hangs for good and the workflow never ends.
- **Validate an expensive run before launching it.** Run `preflightOnly` first and read the
  result. Earlier rounds were wasted on the 1,000-agent cap, a round writing into another round's
  folder, and a check that verified zero pages. The preflight refuses a round folder that already
  holds sessions.
- **Do not trust an image model's yes/no.** When an agent checks a screenshot with the image model,
  it asks for a transcription on an ordinary aspect ratio crop and compares the text itself; the
  model agrees with leading questions and invents text on narrow strips.
- **Binding decisions: one `tier<N>/decided.md` every triage reads and cites.** Tier 3's triages
  flip-flopped three behaviors (a disabled "+" as a Tab stop, Escape in the inspector, an
  unfinished condition card's count), so each pass undid the last. A reversal needs a new entry
  with its reason and evidence, and a pilot complaint against a decided behavior is classed (n),
  no change, by rule.
- **Fix shared parts, not screens.** In tier 3, 50 to 60% of each pass's "fix now" list was a fix
  failure: a regression of the previous pass's fix, the same problem again, or another screen
  showing the same shared part's defect. A defect seen on two screens or in two passes is fixed
  once in the shared component (compact-mantine or the shared app part), with a test there, and
  the fix unit names that component.
- **Re-walk what each fix group touched before freezing.** Regressions caused by the previous
  pass's fixes grew from 28% to 33% to 41% of tier 3's lists because the next full pass was the
  only check. After each fix group, the routes its diff touches are walked again (Enter, Escape
  and Tab on every changed control included), and a group that regresses is reverted and handed
  to the next triage.
- **A pass is not complete while any task or keyboard route was skipped.** Tier 3 pilots skipped
  tasks when no browser slot was free, and a skipped route reads as a clean one. No slot is a
  reason to wait, never to skip; a pilot that skipped is run again, and a targeted re-pilot walks
  each touched route exactly as the first pass did.
- **Land every pass.** 526 product fix commits on the tier 3 branch never reached master, so no
  CI, SonarQube or screenshot review saw them and no consumer got them, and pass 2's work was
  committed only after pass 3 piloted it. Commit before freezing a build (a build no commit
  reproduces is invalid), merge origin/master into the studio branch every pass, open its pull
  request with `tools/pr-open.sh` (see "Landing"), and commit the pilot reports and triage.
- **Never commit walk screenshots.** Study screenshots filled the repository with 83k LFS files (9.9 GB) on
  2026-10-21, almost all of them pilot and dry-run walk images. Walks write under the main
  checkout's `tmp/design-studio/`; only reports, scored round sessions and the images a report or
  insight file cites go in git.
- **Commits must really run the hooks.** Agents skip only the interactive `prepare-commit-msg`, by
  copying the WHOLE `.husky/` folder to a fixed path of their own under the worktree's
  `tmp/<task>/hooks`, deleting its `prepare-commit-msg` and passing
  `-c core.hooksPath=<that path>/_`. Never `mktemp` it into `/tmp` and never find it again with
  `ls -t /tmp/tmp.*`: the newest `/tmp/tmp.*` is often another process's file, and on 2026-10-12
  a studio agent deleted a pre-push gate's shard log that way and failed a passing gate (#2197). Husky's `.husky/_/h` runs the hook script one folder above itself,
  so the older recipe (copy only `.husky/_`) skipped the secret scan, formatting and commit-message
  checks without a word on every studio commit until 2026-10-08.
- **Check the framework before escalating to the owner.** Before raising any item "for the owner",
  check `design/ui/framework` (`glossary.md`, `interaction-patterns.md`, `decided-doors.md`), the
  approved specs, the tier's `decided.md`, and the owner's own statements in `.claudehistory`. An
  item those settle is decided by the team, recorded with its citation in `owner-decisions.md`
  under "decided by the team", and built. Only a true one-way door -- a breaking change to a
  published API, a departure from compact-mantine's Figma lock -- goes to the owner. On 2026-10-29
  all nine tier 4 data management questions raised for the owner turned out to be settled by those
  sources (the glossary already named the filter effects, the owner had already said where a
  column's type is set), and the study waited on questions that had answers.
- **A fix is taken back only for a regression its re-walk shows, never for a re-walk that did not
  finish.** On 2026-10-29 and 30 the tier 4 dry run reverted a correct, decided fix (a Select
  card's count counting what it marks) twice, only because its targeted re-walk ran out of time or
  found no free browser slot; no walk showed a regression. The re-walk now lists a route it could
  not finish as `unwalked: <route>` and still returns ok, and the workflow reverts a fix group only
  when a finished walk showed a regression or a failed acceptance.
