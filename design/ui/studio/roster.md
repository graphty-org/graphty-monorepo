# Study participants (rounds 1 to 3)

Simulated participants: each session is a fresh agent playing one persona, with no memory of
any other session, so one persona can take several tasks. Persona files are composites built
from public sources; no real person is portrayed.

Persona files: `P/` = `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/personas/`;
project records: `/home/apowers/Projects/graphty-monorepo/design/designloom/personas/`;
studio files: `S/` = `design/ui/studio/personas/` (this worktree).

## The personas

**First-time users (6) -- 38 of 56 sessions (68%)**

| Name  | Who                                                                       | File                                                 |
| ----- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Elena | Product manager, no graph training, quits tools with a steep start        | `P/explorer-elena.md` (record `explorer-elena.yaml`) |
| Tom   | Lab manager who only opens files others send him; never builds            | `P/recipe-recipient.md`                              |
| Nadia | Bank alert reviewer on a locked-down work laptop                          | `P/alert-reviewer.md`                                |
| Dev   | Undergraduate turning a spreadsheet of relationships into a class project | `S/class-project-student.md`                         |
| Grace | The one person at a small nonprofit who "does the data"                   | `S/nonprofit-operations-analyst.md`                  |
| Ruth  | Reporter with a contacts sheet of people and companies                    | `S/data-journalist.md`                               |

**Others (6) -- 18 sessions**

| Name   | Who                                                                                                                                                                | File                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Alex   | Weekly operations analyst; has used Gephi or NetworkX; not a graph theorist                                                                                        | `P/analyst-alex.md` (record `analyst-alex.yaml`)                 |
| Jordan | Marketing network analyst (communities, influencers)                                                                                                               | `P/marketing-analyst.md` (record `marketing-analyst.yaml`)       |
| Dana   | Supply-chain risk analyst                                                                                                                                          | `P/supply-chain-analyst.md` (record `supply-chain-analyst.yaml`) |
| Morgan | Blind analyst; screen reader and keyboard only. Runs in the tool's screen-reader mode: no screenshots, no clicks, only the accessibility tree and live-region text | `P/screen-reader-analyst.md`                                     |
| Sam    | Sighted analyst who works by keyboard only (a repetitive strain injury); sees the screen, never uses the mouse (`--key` and `--type` only)                         | `S/keyboard-only-sam.md`                                         |
| Mara   | Expert Gephi user deciding whether to switch                                                                                                                       | `P/gephi-holdout.md`                                             |

The studio files for Dev, Grace and Ruth (2026-10-06) strengthen the round 8 files of the same
names (about 4.5 KB each) with more public sources, a voice, abandonment triggers and fuller rules
for playing them (about 8 KB each). Sam's file is new. Nadia's 9 KB file was checked and kept: it
has a voice, counterweights, behaviour rules and sources. None of the four new files has had the
skeptic review the older files had. Because they are still the thinnest first-time files, Dev,
Grace and Ruth carry 6 sessions each and Elena and Tom 7.

## Who takes which task in round 1

56 sessions, the most this round may spend. The four core tasks (T15, T10, T12, T9) run at the
size `criteria.md` sets; the other tasks run smaller and are scored as `rounds/round-1/plan.md`
says. First-time participants are listed first in each row.

| Task                                           | n      | Participants                         |
| ---------------------------------------------- | ------ | ------------------------------------ |
| T15 A whole first session, Les Miserables      | 6      | Elena, Tom, Nadia, Dev; Alex, Morgan |
| T15 A whole first session, own file            | 4      | Grace, Ruth; Jordan, Sam             |
| T10 Names on every dot, Les Miserables         | 4      | Elena, Tom, Dev; Morgan              |
| T10 Names on every dot, College football       | 4      | Nadia, Grace, Ruth; Sam              |
| T12 One character and his ties, Les Miserables | 4      | Elena, Nadia, Ruth; Morgan           |
| T12 One family and its marriages, Florentine   | 4      | Tom, Dev, Grace; Sam                 |
| T9 Bigger dots, Les Miserables                 | 4      | Elena, Nadia, Ruth; Morgan           |
| T9 Bigger dots, Florentine                     | 4      | Grace, Dev, Tom; Mara                |
| T3 Your own list of ties                       | 3      | Dev, Ruth; Dana                      |
| T5 A file that will not read                   | 3      | Tom, Elena; Morgan                   |
| T7 Who matters most, running club              | 3      | Grace, Nadia; Jordan                 |
| T8 Circles of characters                       | 3      | Elena, Dev; Jordan                   |
| T6 What did I get?                             | 2      | Ruth; Morgan                         |
| T11 Untangle the drawing                       | 2      | Tom; Alex                            |
| T13 A picture and the numbers                  | 2      | Nadia; Dana                          |
| T14 Stop for the day and come back             | 2      | Tom; Morgan                          |
| T16 First look (measured, not graded)          | 2      | Elena, Grace                         |
| **Total**                                      | **56** | first-time 38 (68%)                  |

Sessions per persona: Elena 7, Tom 7, Nadia 6, Dev 6, Grace 6, Ruth 6, Morgan 7, Sam 3, Jordan 3,
Alex 2, Dana 2, Mara 1.

Not run in round 1: T1 and T4 (never in tier 1 rounds), T2 (one click; every empty start and T16
measure the same first step), and T7 on Les Miserables (the model knows its ranking from
training; the ranking run on Les Miserables is inside T9 and T15).

The keyboard bar has two participants on each core task: Morgan on the Les Miserables half, Sam on
the other half. First-time and other participants are compared only on tasks both groups took.

Run order: T15, T10, T12 and T9 first; then the rest; at most 4 sessions at once. Morgan's
sessions wait for the tool's screen-reader mode (`rounds/round-1/preflight.md`).
</content>
</invoke>

## Who takes which task in round 2

56 sessions (`rounds/round-2/plan.md` has the run order and starts). First-time participants are
listed first in each row. "carried" marks a round 1 session that was cut off or never started and
runs here with the same persona and task. Most first-time personas take the dataset half of a core
task they did not take in round 1, and every reduced task goes to personas who did not take it.

| Task                                           | n      | Participants                          |
| ---------------------------------------------- | ------ | ------------------------------------- |
| T15 A whole first session, Les Miserables      | 6      | Grace, Ruth, Tom, Nadia; Mara, Morgan |
| T15 A whole first session, own file            | 4      | Elena, Dev; Jordan (carried), Sam     |
| T10 Names on every dot, Les Miserables         | 4      | Nadia, Grace, Ruth; Morgan            |
| T10 Names on every dot, College football       | 4      | Elena, Tom, Dev; Sam (carried)        |
| T12 One character and his ties, Les Miserables | 4      | Tom, Dev, Grace; Morgan               |
| T12 One family and its marriages, Florentine   | 4      | Elena, Nadia, Ruth; Sam               |
| T9 Bigger dots, Les Miserables                 | 4      | Ruth (carried), Dev, Tom; Morgan      |
| T9 Bigger dots, Florentine                     | 4      | Grace (carried), Elena, Nadia; Alex   |
| T14 Stop for the day and come back             | 3      | Nadia; Alex, Morgan                   |
| T13 A picture and the numbers                  | 2      | Ruth; Dana (carried)                  |
| T11 Untangle the drawing                       | 3      | Elena; Jordan, Mara                   |
| T5 A file that will not read                   | 3      | Tom (carried), Ruth; Morgan           |
| T6 What did I get?                             | 2      | Grace; Morgan                         |
| T3 Your own list of ties                       | 2      | Tom; Alex                             |
| T7 Who matters most, running club              | 2      | Dev; Dana                             |
| T8 Circles of characters                       | 2      | Grace; Dana                           |
| T2 Something to try it on                      | 1      | Nadia                                 |
| T16 First look (measured, not graded)          | 2      | Elena (carried), Dev                  |
| **Total**                                      | **56** | first-time 36 (64%)                   |

Sessions per persona: Elena 6, Tom 6, Nadia 6, Dev 6, Grace 6, Ruth 6, Morgan 7, Sam 3, Alex 3,
Dana 3, Jordan 2, Mara 2.

Every session record gives the persona file's full path: the session runner otherwise finds the
thinner round 8 files of the same names for Dev, Grace and Ruth in `P/`, and no file for Sam.
Morgan runs only in the tool's screen-reader mode (`--sr`), which refuses pointer steps; Sam uses
keys only. Bar 7's pairs: Morgan on the Les Miserables halves of T15, T10, T12 and T9 and on T5, T6
and T14; Sam on the other halves of T15, T10 and T12.

## Who takes which task in round 3

56 sessions (`rounds/round-3/plan.md` has the run order and starts). First-time participants are
listed first in each row. Each first-time persona takes the whole first session, names and bigger
dots once each (one dataset half of each), so no first-time persona meets T15 twice; the smaller
tasks go to personas who have not taken them before, where one is left.

| Task                                           | n      | Participants                          |
| ---------------------------------------------- | ------ | ------------------------------------- |
| T15 A whole first session, Les Miserables      | 6      | Elena, Dev, Grace; Morgan, Mara, Alex |
| T15 A whole first session, own file            | 4      | Tom, Nadia, Ruth; Sam                 |
| T10 Names on every dot, Les Miserables         | 4      | Elena, Tom, Dev; Morgan               |
| T10 Names on every dot, College football       | 4      | Nadia, Grace, Ruth; Sam               |
| T9 Bigger dots, Les Miserables                 | 4      | Grace, Elena, Nadia; Morgan           |
| T9 Bigger dots, Florentine                     | 4      | Ruth, Dev, Tom; Jordan                |
| T12 One character and his ties, Les Miserables | 2      | Ruth; Morgan                          |
| T12 One family and its marriages, Florentine   | 2      | Grace; Sam                            |
| T11 Untangle the drawing                       | 5      | Nadia, Dev, Ruth; Dana, Mara          |
| T6 What did I get?                             | 5      | Elena, Tom, Nadia; Morgan, Alex       |
| T7 Who matters most, running club              | 4      | Elena, Tom, Grace; Jordan             |
| T14 Stop for the day and come back             | 3      | Ruth, Grace; Morgan                   |
| T13 A picture and the numbers                  | 2      | Dev; Alex                             |
| T8 Circles of characters                       | 2      | Nadia; Dana                           |
| T5 A file that will not read                   | 1      | Morgan                                |
| T3 Your own list of ties                       | 1      | Elena                                 |
| T2 Something to try it on                      | 1      | Dev                                   |
| T16 First look (measured, not graded)          | 2      | Tom, Ruth                             |
| **Total**                                      | **56** | first-time 37 (66%)                   |

Sessions per persona: Elena 6, Tom 6, Nadia 6, Dev 6, Grace 6, Ruth 7, Morgan 7, Sam 3, Alex 3,
Jordan 2, Dana 2, Mara 2.

As in round 2, every session record gives the persona file's full path, Morgan runs only in the
tool's screen-reader mode and Sam uses keys only. Bar 7's pairs: Morgan on the Les Miserables
halves of T15, T10, T9 and T12 and on T6, T14 and T5; Sam on the other halves of T15, T10 and T12.
