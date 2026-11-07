# Tier 6 report: meeting the Assistant

Written 2026-11-06, after round 2 and before round 3. Round 3's build is frozen; no round 3 session or walk has run yet.

## Summary

- **The Assistant works for the people we simulated.** In round 2's 12 sessions:
    - 11 finished their task, and none said a task was done when it was not.
    - Both approval cards were read.
    - Undo in the reply put everything back both times.
    - No computed count on a chip, card or change line was wrong.
- **No real person has used it.** Every participant is one AI model playing a persona. A failure is strong evidence; a pass is weak until real people confirm it.
- **What is left is the screen saying less than the graph did, or saying it where the reader is not looking.**
    - A question repaints the network, and the turn says only "Computed".
    - A selection narrows the next answer while the field reads "Ask about this graph".
    - A reply's end, chips and Undo sit below the fold.
- **One severity 3 is confirmed, and it is not in the Assistant.** At 400% zoom, which a short narrow window matches, the Settings page has no height, so the API key cannot be reached by pointer.
- **30 changes were decided for round 3; 19 are in its build.** 11 were rejected on their re-walk and taken out. One rejected change was only partly taken out, and the round 3 build still carries it (see "What was changed").
- **Nothing waits on the owner from this tier.** Every API change was additive. The Gemini request cap needs one more raise before round 3 can run; that is a team decision inside the owner's monthly budget.

## What was tested

**The product.** The graphty app's Assistant, with its feature flag on: a chat in the left rail.

- A reader sets it up with their own key, asks about a network and tells it to change the network.
- Large changes need the reader's approval, and changes can be taken back.
- Google's Gemini answered in every session and walk; nothing was scripted.

**Tasks.** Six tasks, each in two halves on different data, so one domain cannot make a result look clean:

| Task | What the reader does                                                           | Data, A and B                                                   |
| ---- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| T90  | First time: open a file, set up the Assistant with a key, ask a first question | food bank volunteers; news sources                              |
| T91  | Ask for a change to the drawing ("make them stand out")                        | volunteers, as saved; yeast genes                               |
| T92  | Get two facts for someone who will check them                                  | news sources, with a selection left by a colleague; yeast genes |
| T93  | Remove a group, which needs an approval                                        | volunteers; yeast genes                                         |
| T94  | Ask for a change to a colleague's finished project, then put it back           | a Les Miserables poster project; a volunteers thank-you project |
| T95  | Ask for something the file cannot support                                      | volunteers; yeast genes                                         |

**Participants.** Five personas, twelve sessions per round, one per task half:

- Grace, a nonprofit data person who has never used an AI tool.
- Maren, a genomics researcher who doubts AI output.
- Sam, who uses the keyboard only; every pointer step is refused.
- Dev, a student who takes what AI says.
- Ruth, a reporter who needs every claim to be checkable.

Three sessions are returning readers who know the program but not its AI. An expert walked the screen-reader path; no session studied it.

**Builds.** Every study build is a frozen copy under `.study-builds/`:

| Build      | Used for                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 8fa33aa786 | First dry run: 12 pilots walked every success path, detour and keyboard route. 232 rows, 24 fixed before sessions |
| 3549e11129 | Second dry run: 53 rows, 9 fixed                                                                                  |
| 48879618c4 | Third dry run: 63 rows, 15 fixed. Same app code as the build before it, so it measured nothing new                |
| 3b2a7f0649 | Rounds 1 and 2, and every expert walk                                                                             |
| a80da6d62e | Round 3, frozen 2026-11-06: round 2's kept fixes plus the latest master. Not yet run                              |

**Rounds.**

- **Dry runs: three passes, 151 pilot walks.** Their job was to fix what crashes, blocks a task or spoils grading. Everything else went to `backlog.md`.
- **Round 1: 24 sessions, all void.**
    - The study tool's start gate refused all 12 sessions and all 12 re-runs before a browser opened, because no walk existed on the frozen build.
    - The dry runs had also used up the 3,000-request cap.
    - The round produced 0 screenshots and 0 model calls. Its only output is the four expert walks.
- **Round 2: 12 sessions, 0 void, 0 on Sonnet.**
    - All ran on claude-opus-5-5. No session ended on an API error, so the Sonnet retry never applied.
    - 125 model calls for 27 messages. The highest session used 19, against a limit of about 40.
- **Round 3: frozen, not run.**

**Experts, on 3b2a7f0649, counted in both rounds:**

- An accessibility walk: the keyboard, and the screen-reader reading of every Assistant state, voice and conversations included.
- Figma product design and visual design walks, at 1440 x 900 and 900 x 700, in both themes.
- A screenshot audit.

Defects were reproduced without the model in `rounds/round-2/repro/`. Two independent skeptics tried to refute every finding of each round: an item both drop is dropped, and an item one drops is weakened.

**What a simulated participant can tell us:**

- where the screen offers no route
- where a word misleads a careful reader
- where a count or a claim is false
- where focus goes
- what a reader does after a failure

**What it cannot tell us:**

- whether real people doubt the AI as much as these personas do. In both of his chances, Dev, the persona written to trust, doubted anyway.
- whether real people read the disclosure
- how fatigue at approvals builds
- what hovering shows. The study tool hovers only on command, so "nobody hovered a chip" measures the tool, not the design.
- what happens when the model's prose states a wrong number next to a chip that disagrees. Nobody planted that case, so it is untested.

## Results per round

The bars are frozen in `criteria.md`. "Did not hold" means the bar's source has not been read yet, not that the product failed it.

### Round 1 (24 void sessions, four expert walks)

| Bar                                   | Result                        | Count                                                |
| ------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| 1 Tasks succeed                       | Not tested                    | 0 of 12 ran                                          |
| 2 No false "done"                     | Not tested                    | 0 sessions with a last screen                        |
| 3 A reader handed a key gets it going | Not tested                    | 0 of 2                                               |
| 4 Failure is recoverable              | Not tested                    | No session met a failed message                      |
| 5 Readers doubt the right things      | Not tested                    | 0 qualifying of 2 needed                             |
| 6 An approval is read                 | Not tested                    | 0 of 2                                               |
| 7 A change can be taken back          | Not tested                    | 0 of 2                                               |
| 8 The keyboard is enough              | **Fails**, on the expert walk | Focus lost after an approval and after Undo          |
| 9 No severity 3 or 4 left             | Open                          | 1 claim at 3 (Settings at 400%), no reproduction yet |
| 10 The app does the talking           | Did not hold                  | 5 of the 11 listed states reached in full            |
| 11 Computed numbers are true          | Nothing to count              | The bar reads "in every session", and 0 ran          |
| 12 Expert findings answered           | Open                          | 20 merged severity 2 findings, 0 fixed               |

### Round 2 (12 sessions on 3b2a7f0649), after the skeptics

| Bar                                   | Result              | Count                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Tasks succeed                       | **Holds**           | 11 of 12 (7 S, 4 SD, 1 F); every task has a success. 12 of 12 if the failed session is read at the step where its task was done                                                                                                 |
| 2 No false "done"                     | **Holds**           | 0 of 12                                                                                                                                                                                                                         |
| 3 A reader handed a key gets it going | **Holds**           | 2 of 2 got a real answer unaided; both scored 3 of 3 on what is sent, where it goes and who pays                                                                                                                                |
| 4 Failure is recoverable              | **Holds, weakly**   | 2 of 2 recovered by a route the screen offered; 0 of 2 learned what failed                                                                                                                                                      |
| 5 Readers doubt the right things      | **Holds, weakly**   | 3 of 4 sessions had a wrong or unsupported claim on screen; 0 of 3 passed it on as fact. The doubt came from the reader, not the screen                                                                                         |
| 6 An approval is read                 | **Holds**           | 2 of 2 read the card; both reports matched the network                                                                                                                                                                          |
| 7 A change can be taken back          | **Fails as worded** | 1 of 2. Undo worked in 2 of 2; the failed session ended after the reader closed the tab                                                                                                                                         |
| 8 The keyboard is enough              | **Fails**           | Sam finished 2 of 2 by keys alone. On the expert walk, focus is lost after an approval and after Undo, and "Undone" and the transcript are not announced                                                                        |
| 9 No severity 3 or 4 left             | **Fails**           | 1 confirmed at 3: Settings at 400%. Reproduced at 320 x 256 and 640 x 256, where the click on the key box is refused (`repro/settings-400/`). The reproduction was added after the skeptic check, which had left this item open |
| 10 The app does the talking           | Did not hold        | 5 of 11 states reached in full, 6 in part; 88 of 679 screens audited, none from a session                                                                                                                                       |
| 11 Computed numbers are true          | Did not hold        | 12 graders found 0 exceptions; 0 of 193 session screens audited                                                                                                                                                                 |
| 12 Expert findings answered           | Open                | 20 merged severity 2 findings, 0 fixed at the round's end; readers met 7 of them                                                                                                                                                |

By domain, the yeast-gene sessions were 4 of 4 and the people datasets 7 of 8. The one failure was on a project file and had nothing to do with its data.

### Round 3 (build a80da6d62e): not yet measured

| Bar    | What the build changes                                                                                            | To watch                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 4      | A failure with no status names the key as a possible cause and offers the provider                                | Do readers learn the cause?                           |
| 5      | The field's placeholder follows the scope ("Ask about this selection")                                            | Does the planted selection still mislead?             |
| 8      | Esc in a dialog keeps the selection; the scope x lasts through closing the panel                                  | Focus after an approval or Undo is still unfixed      |
| 9      | Settings scrolls in a short window                                                                                | Its content paints past the dialog's edge (see below) |
| 10, 11 | A painting run says so on its line; a ranking that selects draws "Selected N nodes"; a removed run says "Removed" | The 193-screen audit is still owed                    |

## What was learned, most important first

1. **Readers can use it, and the computed numbers held.**
    - Round 2: 11 of 12 finished, 0 false "done", every count on chips, cards and change lines true, approvals read 2 of 2, and Undo restored 2 of 2.
    - The dry-run fixes to chip counts held: no session met the false counts the pilots had found (the chip of 15, "at least 6", the x keeping six).
2. **The remaining faults share one shape: the state that decides a message moves, and the words stay honest but say less than the graph did.**
    - A question repainted the network in 4 of the 6 sessions on T90, T92 and T95, and the turn said only "Computed ...". One reply even denied the repaint (`r2-s02/29.png`).
    - A selection narrowed an answer under "Selection 14". Dev caught it from one word in the reply: "If I had not read that one word I would have told her the wrong person" (`r2-s05/05.png`).
3. **Readers check through rows, and that door is the weakest one.** Show in table or the table was the check in 9 of 12 sessions. Show in table opens with the named rows out of view (`repro/r2-s06/walk/04.png`). On 24 nodes that costs one scroll; on a large file it costs much more.
4. **A refused key reads as "the connection failed".**
    - Both T90 readers resent once, which cannot help, then found the provider by two different routes. Neither learned the cause.
    - OpenAI returns the refusal without a cross-origin header, so the browser hides it. The app can only say the key may be at fault.
5. **"Autosave: saved" promises more than it does for a file that was opened.**
    - After a change, an Undo and a closed tab, nothing on the start page brings that project back (`repro/r2-s09/walk-undone/05.png`).
    - Opening the file again does bring it back, and nothing was lost, so the skeptics held this at severity 2.
    - No way of opening a file gives the program a handle to it, so a file opened that way never reaches Recent projects.
6. **The keyboard path works end to end; focus does not follow a press.** Sam finished both sessions by keys alone. After Remove, Answer or Undo, focus lands on a disabled or distant control, and the next letters typed are lost (expert walk, steps 67 to 75).
7. **One measure has several names on one screen.** Examples: Reach and Closeness, Bridges and Betweenness, Louvain and Communities. Every reader who met this had to ask or guess. The glossary's rule is one name per meaning.
8. **The instrument limited the study more than the product did.**
    - A whole round was lost to the start gate and the request cap.
    - The dry runs that protected the round also used up its budget.
    - Three tool behaviors shaped what was seen: hovers only on command, browser errors printed to participants, and a prompt calling every participant "returning". The last two are fixed for round 3.
9. **Only a walk catches a bad fix.** 11 of 30 fixes passed their tests and failed their walk. Examples:
    - a focus ring that disappeared
    - a dialog painting past its edge
    - an Undo named after the wrong line
    - a fix whose committed file differed from the one that was built

    Each fix now carries its own acceptance walk.

## What was changed

**Before round 2: the dry runs, 48 fixes over three builds.** Round 2 confirmed four of them:

- the counts on chips and change lines (bar 11, no exception in 12 sessions)
- the x on the scope reaching the right answer (7 of 12 on T92 A)
- "Selected N nodes" appearing where a selection was claimed
- the export arriving

**Between round 2 and round 3: 30 changes decided, 19 in the round 3 build.**

- None has met a reader yet. In the table, "walk passed" means its acceptance walk passed on a build before the freeze.
- No walk exists yet on a80da6d62e itself. That build also merged a large master: the selection workspace, the timeline dock and a batched node renderer.

| Package                  | Change                                                                                    | In a80da6d62e | Confirmed                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| graphty-element          | A painting run says it painted, to the reader and the model                               | yes           | walk passed                                                                        |
| graphty-element          | A ranking that selects reports the selection                                              | yes           | walk passed                                                                        |
| graphty-element          | A message taken back leaves no selection and no lit Redo                                  | yes           | element test                                                                       |
| graphty-element          | The model stops at a "no" and selects only when asked                                     | yes           | no walk on record                                                                  |
| graphty-element          | A removed run says "Removed {name}"; Open run and Open layer show only while they stand   | yes           | walk passed                                                                        |
| graphty-element          | A typed answer outside the choices reaches the model (`typed: true`)                      | yes           | element test                                                                       |
| graphty-element, graphty | A failed step gives its reason                                                            | yes           | no walk on record                                                                  |
| graphty-element, graphty | "Stopped" and "Declined" end rows say only what happened                                  | yes           | walk passed                                                                        |
| graphty                  | A failure with no status names the key and offers the provider                            | yes           | walk passed                                                                        |
| graphty                  | The placeholder follows the scope                                                         | yes           | no walk on record                                                                  |
| graphty                  | A waiting question is its card's title                                                    | yes           | no walk on record                                                                  |
| graphty                  | The Undo notice: no doubled period, no notice over the open panel                         | yes           | no walk on record                                                                  |
| graphty                  | Done keeps a typed key; a bad key is spoken                                               | yes           | no walk on record                                                                  |
| graphty                  | An Esc taken by a dialog or the panel keeps the selection                                 | yes           | no walk on record                                                                  |
| graphty                  | The scope x lasts through closing the panel                                               | yes           | its test was removed by a revert; restore it                                       |
| graphty                  | Change lines read once; "and N more" opens in place                                       | yes           | no walk on record                                                                  |
| graphty                  | A finished reply's end stays in view, with one scrollbar                                  | yes           | walk passed                                                                        |
| graphty                  | Settings scrolls in a short window (part of a rejected change)                            | **yes**       | **rejected**: content paints past the dialog onto the status bar under 481 px tall |
| study tool               | Prompts stop calling first-time readers "returning"; browser noise kept from participants | yes           | -                                                                                  |
| answer key               | Quotes the new words                                                                      | yes           | -                                                                                  |

**Rejected on the re-walk and taken out (11):**

- focus to the composer after a press
- one name per measure
- the Autosave tooltip
- Enter saves the key
- Show in table opens on its rows
- no raw rule text on app rows
- a failure spoken once
- each panel control named for its object
- disabled Send and Answer look disabled
- the Assistant found by "AI"
- the 400% Settings change, except for one CSS part (below)

Each has its cause in `rejected-fixes.md`. Each will be refixed in the shared part named there, never as a new app-only change.

**The Settings change still in the build** fixes the severity 3: every control can be reached. But in a window under 481 px tall it paints the page past the dialog's bottom edge, onto the status bar. The rejection record says the unit was taken out, yet the build still carries this part. Round 3 reads bar 9 on this state, and its walk at 320 x 256 decides whether the overlap is a severity 2 or worse.

**compact-mantine:** no change. A disabled button loses its focus ring because of a compact-mantine rule (`buttons.css.ts`), and that package is locked to Figma.

## Deferred, and why

- **Opened steps in plain words** (seen in 5 sessions). This needs a wording design for every tool, and bar 10 forbids showing the tool's arguments.
- **Sets and filters the model makes leave nothing in the Data place.** The element's visibility rules and the Data place's filter cards are two separate models, so this needs a design, not a fix.
- **Opening a file with a handle, so it reaches Recent projects.** This is a new way to open files, with a permission prompt on reopen. It stays in the backlog.
- **Group 1 to N for communities.** The file has no group names, so a fix needs a concept the product lacks.
- **A disabled button's look.** The only fix is in compact-mantine, under its Figma lock. Today's filled look keeps its focus ring, so it stays as it is, at severity 1.
- **Second forms of fixes in flight:** other scope wording, a separate "Colored" row, "Autosave: no changes". Each waits for its first form's result, so round 3 can credit one change per problem.
- **About 150 backlog rows** (keyboard-only, wording, cosmetic) in `backlog.md`, worked between rounds.

## Decisions waiting on the owner

**None from tier 6.**

- Every graphty-element change in this tier is additive: new effect codes, a `painted` fact, a `typed` answer option, and an export scope of named nodes. Each is recorded under "Decided by the team" in `owner-decisions.md`.
- Two selection fixes change what an expression returns. The team took them as bringing the API to its written contract, under the owner's 2026-10-28 rule that design conformance is a fix.
- The Assistant has not reached master, so none of this is published.

The older "For the owner" entries in `owner-decisions.md` (tiers 2 to 5: defaults, a saved-file format, compact-mantine behaviors) are unchanged. None comes from this tier.

## Next steps

1. **Raise the tier's request cap from 5,000 to 6,000 before any round 3 walk.**
    - 4,338 are spent and 662 remain.
    - Round 3 needs about 26 gate walks at up to 19 requests each, plus about 125 to 240 for 12 sessions.
    - 1,000 more costs about $5, inside the owner's $150 monthly LLM budget, so it is the team's call, as the raise to 5,000 was.
2. **Settle the Settings change in the build** with a walk at 320 x 256 and 640 x 256 on a80da6d62e. If the page still paints onto the status bar, refix it in `frame.css` and refreeze before sessions.
3. **Walk every change on a80da6d62e**, starting with the ones that have no walk on record, and restore the scope x test. The master merge touched shared rows, so re-walk the routes around those rows too.
4. **Pay what the study owes:** the audit of the 193 session screens (bars 10 and 11), and whether a conversation comes back with its key after a reopen.
5. **Run round 3.**
    - First the criteria's re-walks of every failed bar and kept finding, and the rescore of bars 8 to 12.
    - Then the 12 sessions, if requests remain.
    - T92 A and T90 go first, to credit the placeholder and the failure row.
6. **Refix the 11 rejected changes in their shared parts.** Focus after a press goes first, because it is bar 8's last failure.
