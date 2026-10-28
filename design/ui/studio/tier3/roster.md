# Tier 3 participants: first-time users

Simulated participants: each session is a fresh agent playing one persona, with no memory of any
other session. Every persona below uses graphty for the **first time** in every session: there is no
history of earlier sessions, only one line saying so, which `real.mjs --brief` gives the participant
under "Your experience with this program". No real person is portrayed; the persona files are
composites built from public sources.

Paths: `S/` = `design/ui/studio/personas/` (this worktree); `P/` =
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/personas/`;
project records (designloom): `/home/apowers/Projects/graphty-monorepo/design/designloom/personas/`.

## Who takes part, and why these nine

- **Six newcomers with no graph tool habits** (Dev, Grace, Ruth, Elena, Tom, Nadia): the owner's
  priority is the average first-time user. Dev, Grace and Ruth have the studio's fullest first-time
  files; Elena (`explorer-elena.yaml`), Tom and Nadia are the earlier tiers' first-time personas.
  Tom only opens what others send him, so he takes the colleague's-project task (T50) and the
  plainest tasks: none of the several-layer tasks (T47, T48) and not T51, where his persona's
  give-up (a second failure, a "discrete or continuous?" kind of question) would be scripted.
- **One analyst who knows another graph tool** (Alex, `analyst-alex.yaml`, has used Gephi or
  NetworkX), and **one genomics researcher who knows Cytoscape** (Maren,
  `genomics-cytoscape-user.yaml`), for the yeast half of T40 and one more task. Neither sits on
  T39 (bar 4 measures newcomers), and no half of a core task holds more than one of them. They show where an
  expectation from another tool meets this panel. Neither stands in for the newcomers: every
  finding from them is reported with who they are, and no first move of theirs is called
  "unprompted" for everyone (`criteria.md`, "Priming").
- **One keyboard-only analyst** (Sam), who works without a mouse. His sessions start `empty
--keys`: the tool refuses every pointer step, so a session cannot slip into clicking.
- **Not in this study:** the screen-reader persona (Morgan), whose sessions the tool reads only as
  text, because every task here is judged by the look of the drawing; the accessibility specialist
  walks every screen with a screen reader's output each round instead. Mara (an expert Gephi user
  weighing a switch), whose questions are expert workflows.

## What each participant is told about their experience

Each section below is given to its participant word for word, after the persona file. It names no
place, control or word of the app: a first-time user knows nothing of it.

### Dev -- student, first time

Files: `S/class-project-student.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Grace -- nonprofit data person, first time

Files: `S/nonprofit-operations-analyst.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Ruth -- reporter, first time

Files: `S/data-journalist.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Elena -- product manager, first time

Files: `P/explorer-elena.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Tom -- lab manager, first time

Files: `P/recipe-recipient.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Nadia -- bank alert reviewer, first time

Files: `P/alert-reviewer.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works."

### Alex -- operations analyst, first time with this program

Files: `P/analyst-alex.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You have used other network tools before, but not this one."

### Maren -- genomics researcher, first time with this program

Files: `P/genomics-cytoscape-user.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You know Cytoscape, but not this program."

### Sam -- keyboard-only analyst, first time

Files: `S/keyboard-only-sam.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You use only the keyboard: in this session the mouse does nothing."

## Where each session starts

Every session starts on the empty start screen (`empty`), and every Sam session with `empty
--keys`. No setup file and no saved project is used: the files a task says the participant brought
are reached by the participant's own `--upload` (`tasks.md`, "Rules").

| Task | A starts from | B starts from | Why                                                                       |
| ---- | ------------- | ------------- | ------------------------------------------------------------------------- |
| T37  | empty         | empty         | A first look is the task.                                                 |
| T38  | empty         | empty         | Bringing in one's own file is the task.                                   |
| T39  | empty         | empty         | The time to the first styled graph is measured from the empty start.      |
| T40  | empty         | empty         | First use: the sample or the file is opened by the participant.           |
| T41  | empty         | empty         | As T40.                                                                   |
| T42  | empty         | empty         | As T40.                                                                   |
| T43  | empty         | empty         | As T40.                                                                   |
| T44  | empty         | empty         | As T40.                                                                   |
| T45  | empty         | empty         | As T40.                                                                   |
| T46  | empty         | empty         | The clusters are found by the participant's own run.                      |
| T47  | empty         | empty         | As T46.                                                                   |
| T48  | empty         | empty         | As T46.                                                                   |
| T49  | empty         | empty         | What "the way it was when you opened it" means is set by the participant. |
| T50  | empty         | empty         | Opening the colleague's project is part of the task.                      |
| T51  | empty         | empty         | As T40.                                                                   |

## Who takes which task in round 1

56 sessions, the most a round may spend. The core tasks (T39, T40, T47, T48) run at 6, three per
dataset; eight tasks at 4, two per dataset (T38, T41, T43, T45, T46, T49, T50, T51). No persona takes both halves of one task. Sam's sessions start `empty --keys`; his
T48 A puts the file chooser and a folder's picker under the keyboard (bar 7).

**Not in round 1:** T37 (a first look): every session already records its first move after the
sample or file opened, and T38 reads the node and tie counts from the screen; it waits for a later
round. T42 (a number at or over a line) and T44 (names on the drawing): their slots go to T51,
which is judged in round 1; both run at 4 in round 2, two per dataset, because the study cannot
pass while a task is unjudged.

| Task half                                        | n      | Participants        |
| ------------------------------------------------ | ------ | ------------------- |
| T38 own file, volunteers (A)                     | 2      | Alex, Dev           |
| T38 own file, sources (B)                        | 2      | Ruth, Elena         |
| T39 one color, Les Miserables (A)                | 3      | Elena, Tom, Sam     |
| T39 one color, College football (B)              | 3      | Dev, Nadia, Ruth    |
| T40 letters in a name, Les Miserables (A)        | 3      | Ruth, Tom, Sam      |
| T40 letters in a name, yeast genes (B)           | 3      | Maren, Dev, Grace   |
| T41 two facts, volunteers (A)                    | 2      | Nadia, Tom          |
| T41 two facts, sources (B)                       | 2      | Grace, Alex         |
| T43 bigger for more, volunteers (A)              | 2      | Maren, Elena        |
| T43 bigger for more, sources (B)                 | 2      | Dev, Nadia          |
| T45 ties apart, neighbors (A)                    | 2      | Alex, Grace         |
| T45 ties apart, Les Miserables (B)               | 2      | Tom, Dev            |
| T46 one cluster red, Les Miserables (A)          | 2      | Alex, Nadia         |
| T46 one cluster red, College football (B)        | 2      | Elena, Grace        |
| T47 every cluster at once, Les Miserables (A)    | 3      | Grace, Elena, Alex  |
| T47 every cluster at once, College football (B)  | 3      | Nadia, Ruth, Sam    |
| T48 colors on only some, volunteers (A)          | 3      | Sam, Dev, Ruth      |
| T48 colors on only some, sources (B)             | 3      | Nadia, Grace, Elena |
| T49 put it back, Les Miserables (A)              | 2      | Dev, Tom            |
| T49 put it back, karate club (B)                 | 2      | Alex, Ruth          |
| T50 a colleague's project, lesmis-poster (A)     | 2      | Tom, Elena          |
| T50 a colleague's project, volunteers-thanks (B) | 2      | Ruth, Dev           |
| T51 each kind its own color, volunteers (A)      | 2      | Elena, Nadia        |
| T51 each kind its own color, sources (B)         | 2      | Grace, Alex         |
| **Total**                                        | **56** |                     |

Sessions per persona: Dev 8, Elena 8, Ruth 7, Grace 7, Nadia 7, Alex 7, Tom 6, Sam 4, Maren 2.
Newcomers (Dev, Grace, Ruth, Elena, Tom, Nadia): 43 of 56 (77%).

Every session starts `empty`, and every one of Sam's `empty --keys` (T39 A, T40 A, T47 B, T48 A):
the start each task names (`tasks.md`, "Rules"; the table above, "Where each session starts").

Run order: the core tasks first (T39, T40, T47, T48), then the rest; at most 4 sessions at once.

## Change log

- 2026-10-20 (fifth review, before the freeze): Alex takes Dev's T46 A and Dev takes Alex's T48 A.
  A core half now holds bar 1 only with 2 S or SD from sessions other than Alex's and Maren's, and
  T48 A held Alex beside Sam, whose key presses can use up the half's one allowed F; it now has two
  pointer newcomers. Every persona keeps its count, the newcomers keep 43 of 56, no one has both
  halves of a task, and every session still starts `empty`, Sam's `empty --keys`.

- 2026-10-19 (fourth review, before the freeze): T51 runs at 4 and is judged in round 1; T44
  joins T42 in round 2. Nadia and Alex add T51 A and B; Tom takes Nadia's T40 A; Alex's and Tom's
  T44 seats go. Every persona keeps its count, the newcomers keep 43 of 56, and no one has both
  halves of a task. Every session still starts `empty`, Sam's `empty --keys`.

- 2026-10-17 (second review, before the freeze): Maren off T39 (bar 4 measures newcomers): she
  takes Ruth's T43 A and Ruth takes her T39 B. Alex off T40 B, so a core half no longer rests on
  two people who know another graph tool: Grace takes it and Alex takes her T38 A. Tom off T51 B,
  where his persona's give-up would be scripted: Grace takes it and Tom takes her T49 A. Every
  persona keeps its count, and no one has both halves of a task.

- 2026-10-17 (after the review of the tier 3 materials): T48 raised to 6 and made a core task,
  paid for by T37 leaving round 1 (Ruth and Elena added to T48 A and B; Grace, the Director's pick
  for A, holds T48 B after the swap below). T51 takes T42's two slots (Elena A, Tom B); T42 runs
  at 4 in round 2. Tom moved off the several-layer tasks: Nadia takes his T47 B and he takes her
  T44 B; Grace takes his T48 B and he takes T51 B. Sam takes Ruth's T48 A and Ruth takes his T49
  B, so the keyboard user meets a file chooser and a folder's picker. Totals move only where T37
  left (Ruth, Tom) and T48 grew (Elena, Ruth).
- 2026-10-17: Written for the first-use styling study. Replaces the returning-user roster of the
  earlier tier 3 drafts (kept in git history only): no histories, every start empty.
