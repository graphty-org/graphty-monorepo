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
`design/studio-tier1`), never in the main checkout. Inside it, `design/ui/studio/` holds:

| Path                              | What it is                                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool/real.mjs`, `tool/README.md` | The study tool: drives the real app in a headless browser one step at a time and saves a screenshot after every step. Read the README before writing tasks or setups |
| `tool/with-browser.sh`            | The machine-wide browser gate (4 slots). `real.mjs` takes a slot at `--start` and frees it at `--end`                                                                |
| `notes/<role>.md`                 | Each designer's memory: "Top of mind", priorities, criteria, dated decisions with reasons, what worked and what did not                                              |
| `owner-decisions.md`              | Additive API changes the team decided ("decided by the team") and BREAKING ones waiting on the owner ("for the owner")                                               |
| `personas/`                       | Persona files (composites from public sources; no real person)                                                                                                       |
| `report.md`                       | The tier 1 report                                                                                                                                                    |
| `tier<N>/`                        | One tier: `criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `rounds/`, `report.md`                                                                               |

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
| `browserSlots`              | `4`                                                                | Browser-driving agents alive at once                                                          |
| `dryRunPasses`              | `4`                                                                | Fix-and-re-pilot passes before each round                                                     |
| `maxDecisions`              | `15`                                                               | Changes the director may decide per round                                                     |
| `team`, `teamRemove`        | the eleven roles                                                   | Add or rename roles (`{ steward: "Ontology Steward" }`) or drop optional ones                 |
| `experts`                   | Figma, visual, accessibility walkthroughs and the screenshot audit | `[[role, what]]` pairs, one expert agent each per round                                       |
| `dryRunExtra`               | none                                                               | Extra instruction for the first dry-run triage (e.g. "also read these discarded transcripts") |
| `serverName`                | `design-studio-tier<N>`                                            | servherd name of the served build                                                             |
| `land`, `prNumber`          | `true`, none                                                       | Whether to land the branch on master at the end                                               |

To **continue** a stopped tier, launch a fresh run with `startRound: <next round>, skipPrepare:
true` rather than resuming the old one (see the lessons below).

## What the workflow does

1. **Preflight** -- checks the worktree, the tier's four files, persona and setup paths, the tool,
   that the starting round's session folder is empty, and the browser count. It returns before
   anything costly if one fails.
2. **Prepare** -- waits for a clean branch; the researcher, user advocate and red team review the
   criteria once; the director applies the reviews and **freezes** them; a build is frozen and
   served; every task is piloted; the **dry run** fixes what the pilots trip over.
3. **Rounds** -- the researcher plans sessions; participants run through the browser semaphore,
   each graded only from the final screen and saved files; the expert walkthroughs and the
   screenshot audit run beside them; the researcher scores; two skeptics try to refute every
   finding; verified insights go to the owner; a verdict decides whether to stop. If not: every
   role proposes, the red team attacks, the director decides (with a generality check), engineers
   fix in the owning package with tests, a new build is frozen and served, the dry run runs again,
   every designer updates their notes, and the documents are committed.
4. **Report** -- the director writes `tier<N>/report.md`; the branch lands on master through one
   pull request.

Outputs, per round `r`: `tier<N>/rounds/round-<r>/` (`plan.md`, `sessions/<id>/` with screenshots,
`transcript.md` and `grade.md`, `expert/<role>.md`, `scores.md`, `insights.md`, `decisions.md`);
pilots under `tier<N>/rounds/r<r>[d<pass>]/pilot/`; dry-run triage in `tier<N>/dry-run-r<r>-<pass>.md`.

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

- **Dry run before every round's sessions.** Pilot every task on the frozen build, triage what the
  pilots find into implementation or polish defects versus open design questions, fix the first
  kind, freeze again and re-pilot until clean (at most 4 passes). The first tier 2 launch used the
  pilots only to correct the answer key; 120 pilot defects (clipped text, typing landing in the
  wrong field, filters hiding their own settings, missing units) went straight to participants,
  and the round was stopped after five sessions. Participants exist to answer design questions,
  not to rediscover bugs.
- **Pilots walk each task from its real start by clicking, never by URL.** A mock-era check that
  opened each screen by address passed while 18 tasks had end screens no click could reach and
  data that changed between screens.
- **Freeze the criteria before any session, and the build under each round.** Bars written after
  seeing results drift toward what was measured. Changing the build mid-round makes sessions
  incomparable. Fix between rounds and freeze a new build.
- **At most 4 browser-driving agents alive at once, through one semaphore in the script.** On
  2026-10-01 eight review agents each ran their own parallel crawls: 23 headless Chromium, 49 GB,
  swap full, an alert to the owner. In tier 1, participants queued 17 to 50 minutes for a browser
  slot while their clock ran, and those sessions were voided. The semaphore starts a participant
  only when a slot is free, and the expert walkthroughs share it.
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
- **Land with the fewest pull requests.** Every pull request costs a screenshot review, a CI run and
  queue time; the studio branch lands as one.
- **Commits must really run the hooks.** Agents skip only the interactive `prepare-commit-msg`, by
  copying the WHOLE `.husky/` folder to a temp dir, deleting its `prepare-commit-msg` and passing
  `-c core.hooksPath=<tmp>/_`. Husky's `.husky/_/h` runs the hook script one folder above itself,
  so the older recipe (copy only `.husky/_`) skipped the secret scan, formatting and commit-message
  checks without a word on every studio commit until 2026-10-08.
