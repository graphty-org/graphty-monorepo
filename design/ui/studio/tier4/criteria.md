The study runs on build <sha> served from <dir>

# Success criteria and round plan: data management (tier 4)

Tier 4 studies how a **returning** graphty user manages data in the real graphty app: bringing a
network in from a file and from a web address, putting two tables together, getting a column read
the right way, telling the program which columns hold the time, the place, the weight and the
name, filtering with condition cards, reviewing what the program says is wrong in a file, and
sending the data out again. The owner wants this tier done in 12 to 24 hours, so it runs **one
round** of sessions on a small panel, after one dry-run fix pass where possible.

Tasks: `tasks.md`. Answer key: `answers.md`. Participants: `roster.md`. Binding decisions:
`decided.md`. Defects below the session-ready bar: `backlog.md`.

## Grades

Each session is graded only from its last screenshot and the files it saved (`downloads/`), never
from the participant's own rating, against the task's success definition in `answers.md`.

- **S** -- success on the answer key's path or an equivalent one.
- **SD** -- success after a detour the participant recovered from by themselves.
- **P** -- part of the task done (for example the network open but the count wrong).
- **F** -- failed or gave up.
- **VOID** -- the tool or the run failed, or the participant opened a file outside its own folder.
  A void session is re-run once as `<id>b`.

A **wrong turn** is a step that leaves the answer key's path and is later taken back or abandoned
(opening a place the task does not need, a menu closed with nothing picked, an undo of the
participant's own step). A **false "done"** is a participant saying it is finished while the
screen shows otherwise.

## Bars that decide "done" (all must hold in the round)

| #   | Bar                    | Target                                                                                                                                                                                                                                                    | Counted from                                                                                                |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Task success           | At least 75% S or SD of each task's valid sessions, and no dataset half with 0 successes                                                                                                                                                                  | The grades' first lines (`Grade:`), counted by the researcher                                               |
| 2   | False "done"           | 0 in the round                                                                                                                                                                                                                                            | The grades (`False done:`)                                                                                  |
| 3   | Wrong turns            | Median at most 2 per task                                                                                                                                                                                                                                 | The grades (`Wrong turns:`)                                                                                 |
| 4   | Severity 3 and 4 open  | 0 confirmed severity 3 or 4 problems                                                                                                                                                                                                                      | Grades, expert walkthroughs and the screenshot audit, after both skeptics                                   |
| 5   | Keyboard               | Sam's sessions S or SD, with no confirmed keyboard block                                                                                                                                                                                                  | Sam's grades                                                                                                |
| 6   | The owner's data rules | 0 confirmed violations: configuration reachable only from the table; a hotkey with no visible button showing its key; "links" or "ties" on screen for edges; a sentence on screen where a control would do; an owner-approved surface removed or restyled | The Figma product designer's and the interaction designer's walkthroughs, confirmed by the screenshot audit |

**Severity** (bar 4): 4 -- data lost or wrong with no sign (a file read wrong and shown as right, a
filter that hides more than it says, an export that drops rows); 3 -- a task blocked for most
people or a result a reader would misread; 2 -- friction a person recovers from; 1 -- wording or
cosmetic; 0 -- not a problem.

**Confirmed** means: seen in two sessions on different task halves; or one session plus a scripted
`real.mjs` repro; or an expert finding that a session or the screenshot audit also shows. Each
confirmed finding survives two skeptics before it counts.

**Experts and audit, every round** (they feed bars 4 and 6):

- The **Figma product designer**: every data screen against Figma's own patterns where Figma solved
  the problem (lists, properties panels, menus, variable and data panels) and against graphty's
  own patterns where graphty differs; the condition cards must be the Style panel's Which nodes /
  Which edges cards (the shared condition pattern).
- The **interaction designer**: consistency of the data flows with the rest of the app (the same
  control for the same job, the same keys, the same undo, the same Escape and Tab behavior;
  `decided.md`).
- The **accessibility specialist**: every data screen by keyboard and with the screen-reader text
  (`real.mjs --read`), at 1440 x 900 and 900 x 700. Findings of severity 3 or 4 count against bar 4.
- The **design engineer's screenshot audit**: every screen the sessions and pilots reached, at
  1440 x 900 and 900 x 700 (truncation, overlap, clipped menus, empty states).

## Measures reported every round (not gates)

- Median steps per task against the answer key's path.
- Which route each success took (for example: the table's column menu or the Data place; a Data
  source card or a Hide on a value).
- Problems by kind and severity, and by the package that owns them (graphty-element, graphty app,
  compact-mantine).
- Words on each data screen at rest, counted by hand by the content designer.

## Round plan

- **One round of sessions** (owner, 2026-10-29: this tier is done in 12 to 24 hours).
- **Dry run first**: every task piloted three ways (success path, its commonest detours, keyboard)
  on the frozen build. The dry run fixes only a crash, a blocked task or a result that would spoil
  a grade on a success path or a listed detour; everything else goes to `backlog.md`. One fix pass
  where possible, two at most; still not ready after two, the studio stops for the owner.
- **Sessions**: at most 30, planned from `roster.md` (about 28). Core tasks (T61, T62, T65, T67)
  run 4 sessions each (2 per half); the other five run 2 (1 per half); Sam runs 2.
- At most **8 participants alive at once** (the browser gate's 8 GPU slots).
- **No step cap.** A session ends when the participant is done, gives up, or repeats without
  progress.
- **Step notes** are one or two sentences, in character.
- **Retry on an API error**: the same prompt from a clean folder, then once on Sonnet; the model is
  recorded and Sonnet sessions are counted apart.
- A **follow-up question** (T65 only) is asked by the workflow after the participant's first `--end`.

## When the studio stops

- All six bars hold: the study is done; the director writes `report.md`.
- The round ran and a bar fails: the studio still stops after this one round (the owner's time
  box); the decided fixes of the round are made, landed and reported, and the report names what
  would need another round.
- A one-way-door decision (a breaking published API change, or a product question the design
  does not settle): the studio stops and asks the owner once.
- The safety cap: 2 dry-run fix passes before the round.

## Change log

- 2026-10-29: written for tier 4 (data management), one round, before any session.
