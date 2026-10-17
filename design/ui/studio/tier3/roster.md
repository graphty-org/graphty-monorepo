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
  plainest tasks: none of the several-layer tasks (T47, T48), where his persona's give-up would be
  scripted.
- **One analyst who knows another graph tool** (Alex, `analyst-alex.yaml`, has used Gephi or
  NetworkX), and **one genomics researcher who knows Cytoscape** (Maren,
  `genomics-cytoscape-user.yaml`), for the yeast half of T40 and one more task. They show where an
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
dataset; seven tasks at 4, two per dataset; T44 and T51 at 2, one per dataset, reported but not
judged (`criteria.md`: a task under 4 sessions does not hold bar 1, so neither can pass the study
from round 1). No persona takes both halves of one task. Sam's sessions start `empty --keys`; his
T48 A puts the file chooser and a folder's picker under the keyboard (bar 7).

**Not in round 1:** T37 (a first look): every session already records its first move after the
sample or file opened, and T38 reads the node and tie counts from the screen; it waits for a later
round. T42 (a number at or over a line): its two slots go to T51; it runs at 4 in round 2, two per
dataset, because the study cannot pass while a task is unjudged.

| Task half                                        | n      | Participants        |
| ------------------------------------------------ | ------ | ------------------- |
| T38 own file, volunteers (A)                     | 2      | Grace, Dev          |
| T38 own file, sources (B)                        | 2      | Ruth, Elena         |
| T39 one color, Les Miserables (A)                | 3      | Elena, Tom, Sam     |
| T39 one color, College football (B)              | 3      | Dev, Nadia, Maren   |
| T40 letters in a name, Les Miserables (A)        | 3      | Ruth, Nadia, Sam    |
| T40 letters in a name, yeast genes (B)           | 3      | Maren, Dev, Alex    |
| T41 two facts, volunteers (A)                    | 2      | Nadia, Tom          |
| T41 two facts, sources (B)                       | 2      | Grace, Alex         |
| T43 bigger for more, volunteers (A)              | 2      | Ruth, Elena         |
| T43 bigger for more, sources (B)                 | 2      | Dev, Nadia          |
| T44 names, Les Miserables (A)                    | 1      | Alex                |
| T44 names, volunteers (B)                        | 1      | Tom                 |
| T45 ties apart, neighbors (A)                    | 2      | Alex, Grace         |
| T45 ties apart, Les Miserables (B)               | 2      | Tom, Dev            |
| T46 one cluster red, Les Miserables (A)          | 2      | Dev, Nadia          |
| T46 one cluster red, College football (B)        | 2      | Elena, Grace        |
| T47 every cluster at once, Les Miserables (A)    | 3      | Grace, Elena, Alex  |
| T47 every cluster at once, College football (B)  | 3      | Nadia, Ruth, Sam    |
| T48 colors on only some, volunteers (A)          | 3      | Sam, Alex, Ruth     |
| T48 colors on only some, sources (B)             | 3      | Nadia, Grace, Elena |
| T49 put it back, Les Miserables (A)              | 2      | Dev, Grace          |
| T49 put it back, karate club (B)                 | 2      | Alex, Ruth          |
| T50 a colleague's project, lesmis-poster (A)     | 2      | Tom, Elena          |
| T50 a colleague's project, volunteers-thanks (B) | 2      | Ruth, Dev           |
| T51 each kind its own color, volunteers (A)      | 1      | Elena               |
| T51 each kind its own color, sources (B)         | 1      | Tom                 |
| **Total**                                        | **56** |                     |

Sessions per persona: Dev 8, Elena 8, Ruth 7, Grace 7, Nadia 7, Alex 7, Tom 6, Sam 4, Maren 2.
Newcomers (Dev, Grace, Ruth, Elena, Tom, Nadia): 43 of 56 (77%).

Run order: the core tasks first (T39, T40, T47, T48), then the rest; at most 4 sessions at once.

## Change log

- 2026-10-17 (after the review of the tier 3 materials): T48 raised to 6 and made a core task,
  paid for by T37 leaving round 1 (Ruth and Elena added to T48 A and B; Grace, the Director's pick
  for A, holds T48 B after the swap below). T51 takes T42's two slots (Elena A, Tom B); T42 runs
  at 4 in round 2. Tom moved off the several-layer tasks: Nadia takes his T47 B and he takes her
  T44 B; Grace takes his T48 B and he takes T51 B. Sam takes Ruth's T48 A and Ruth takes his T49
  B, so the keyboard user meets a file chooser and a folder's picker. Totals move only where T37
  left (Ruth, Tom) and T48 grew (Elena, Ruth).
- 2026-10-17: Written for the first-use styling study. Replaces the returning-user roster of the
  earlier tier 3 drafts (kept in git history only): no histories, every start empty.
