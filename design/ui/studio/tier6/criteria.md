The study runs on build a80da6d62e served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier6-r3-a80da6d62e

Frozen on 2026-11-05 for the tier 6 rounds.

# Success criteria and round plan: meeting the Assistant (tier 6)

A bar changes only between rounds, with the change and its reason in the change log at the end, and
nothing here changes after the round's first session starts. The first line names the frozen build
once the workflow has frozen one; no session starts before it does.

**What is studied.** The graphty app's Assistant with its feature flag on: a chat in the left rail
that a reader sets up with their own key, asks about a network, and tells to change it. The
sessions cover setting it up, asking it to change and analyze a network, trusting what it says,
approving and taking back what it does, and recovering when it fails or cannot help. A real model
(Google's Gemini) answers in every session. Design: `design.md`. Settled decisions: `decided.md`.
Tasks: `tasks.md`. Answer key (graders only): `answers.md`. Participants: `roster.md`.

**One round is planned.** This is one quick user group, not a run to a ceiling. Its feedback is
then fixed, the fixes are walked again, and no second round of sessions follows unless the owner
asks for one. A bar that does not hold says what to fix; it does not call for another round.

**Who the participants are.** Simulated: one model playing five composite personas, 12 sessions in
all. Nine are first meetings with graphty; three (T91 A, T94 A, T94 B) are returning readers who know
the program and have never used its AI. A failure is strong evidence; a pass is weak until real people confirm it. The model behind
the Assistant also varies from run to run, so one session's reply may not repeat in the next. Every
report says so.

**What the round must answer, beyond the bars** (from `design.md`, section 12):

1. Given a number on screen that is wrong for the question asked, who catches it, and how (T92 A,
   where a selection the reader did not make narrows the reply)?
2. Does anyone miss the layer list while the chat is open (T91 A, T94)?
3. Is an answer the file cannot support read as a finding (T95), and do readers separate the model's
   own words from computed chips (T92, T95)?
4. Is a change that applies at once comfortable, or do people want a preview first (T91, T94)?
5. Do readers check chips unasked, or trust that they exist (T92, before the follow-up)?
6. Is the approval read on first meeting, or approved by reflex (T93)?
7. Is the word Assistant, under its glyph, found first time (T90), and do starters teach anything?
8. Do readers understand what is sent to the provider, and does it change what they would load
   (T90's follow-up)?

**Not asked of this round.**

- **A wrong number the model states in its own prose, beside a chip that disagrees.** T92 A's plant
  is a true count of the wrong nodes, and its tell is the scope line. Nobody falsifies a reply, so the
  report's first limit says the prose-against-chip case went untested unless a model error happens to
  show it.
- **Fatigue at approvals.** Reflex comes from repetition (the research's catch rate fell after 50 or
  more prompts); one card seen once cannot rule it out.
- **A reader with no key at all.** The way to get one is walked by the experts, not studied.
- **Failure during a change, and whether "Nothing changed." is then true.** No task meets it; an
  expert reproduces it (below), and a false line counts through bars 9 and 11.
- **A stray Esc that takes back a run's changes.** No task meets it; the accessibility expert
  reproduces it.
- Voice, saved conversations and the screen-reader path get no task; the experts walk them. The flag
  off is not studied: `AssistantOff.real-element.test.tsx` holds it.

## Grades

S, SD, F, G and VOID, as `answers.md` defines them. Success means S or SD. Each session is graded
from its last screen, its saved records and its transcript, never from the participant's own rating.

## The bars

No bar here is scored by a script. The bars gate the fixes, not a further round: each failed bar
says what to fix, and is measured again on the fixed build ("After the round"). Each is counted by
the researcher from the graded sessions and the expert findings, and each states its denominator.
With one session per task half there is no per-half floor: two domains' data stop a one-domain pass
from reading as a clean result, and a half's fail is reported by name. Every bar is scored in round 1; a bar with nothing to count did not
hold.

| Bar | What it says                        | Holds when                                                                                                                                                                                                                                                    | Counted from                                                 |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Tasks succeed                       | At least 10 of 12 sessions are S or SD, and every task has at least 1 of its 2. A void's re-run replaces it. An F with `Model decided: yes` stays in the 12, and the bar is also reported without it                                                          | Grades                                                       |
| 2   | No false "done"                     | At most 1 of 12 sessions says a task is done while its last screen says otherwise                                                                                                                                                                             | `False done:` lines                                          |
| 3   | A reader handed a key gets it going | Both T90 sessions get a real answer from the model unaided, and both score 3 of 3 on what leaves, where it goes and who pays                                                                                                                                  | T90 grades, `Disclosure:` lines                              |
| 4   | Failure is recoverable              | Every session that meets a failed message reaches a working state unaided, by a route the screen offered, and states no wrong cause; at least one session meets one                                                                                           | `Failure:`, `Way out:` and `Failure read:` lines, every task |
| 5   | Readers doubt the right things      | Of the sessions on T92 and T95 with a wrong or unsupported claim on screen, at least 2 qualify, and fewer than half pass one on as fact in the first report. Under 2 qualifying is "not tested": it does not hold, and the fix is to the trap, not the design | `Trap fired:` and `Taken on trust:` lines                    |
| 6   | An approval is read                 | In both T93 sessions the grade is `Card: read (card)`, and the report agrees with what happened to the network and names how it differs from the expected number                                                                                              | T93 grades, `Card:` lines                                    |
| 7   | A change can be taken back          | Both T94 sessions end with the picture, the layers and the runs as they started, and the conversation still there; T94 B after two changes                                                                                                                    | T94 grades, the `look` values and `work.json`                |
| 8   | The keyboard is enough              | Both of Sam's sessions reach their end with no pointer. At a send, a reply, an approval, an Undo and Settings closing, focus is not lost and the next key typed lands in the composer. The status words of design 6.7 are heard for every state               | His grades, the accessibility expert's walk                  |
| 9   | No severity 3 or 4 is left          | No confirmed severity 3 or 4 problem stays open once the fixes are in. Confirmed: seen by 2 participants, or by 1 participant or expert with a reproduction under the round's `repro/`. Reported twice: at the round's end and after the fixes                | Grades, expert findings, the screenshot audit                |
| 10  | The app does the talking            | Every state in the list below is reached, and no app-drawn row on any screen read shows a raw result code, element English, a tool's arguments or JSON. Reported as screens read over screens taken. JSON in the model's own prose is the model's             | The screenshot audit, the state list                         |
| 11  | Computed numbers are true           | In every session, each count on a chip, an approval and a change line agrees with `answers.md` and the records, and every reply that claims a change has a change line. Zero exceptions. Model prose is bar 5's                                               | The screenshot audit                                         |
| 12  | The experts' findings are answered  | Every severity 2 finding from the Figma and visual walks is fixed, or kept with a reason in the report. A panel state at rest above 50 words is a severity 2                                                                                                  | Figma and visual walks                                       |

Severity is Nielsen's 0 to 4. Expert counts are not user evidence: an expert-only severity 3 needs a
reproduction. A grader's 3 counts only with its behavioral cost (the reader was blocked, or left with
a wrong belief). A defect in what the model chose to say is reported as the model's, and counts
against the design only if the screen gave the reader no way to tell.

The expert walkthroughs and the screenshot audit count as follows, and through no other bar:

- Accessibility walk: bars 8, 9 and 10.
- Figma and visual walks: bars 9, 10 and 12. A confirmed severity 3 or 4 counts against bar 9.
- Screenshot audit: bars 9, 10 and 11.

The accessibility walk types one letter after each send, reply, approval, Undo and Settings close,
and checks it landed in the composer: `--keys` sessions print no focus line, so bar 8 cannot be
counted from them alone.

## The state list

Each row is marked in the round's scores with the session or walk that reached it, or "not reached".
A state not reached does not count as clean, and bar 10 does not hold. The audit opens at least one
folded step per task, since tool steps are folded by default.

| Design section | State                                                          | Reached by                                                                                                                               |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1, 4.2       | No provider; the provider section                              | T90                                                                                                                                      |
| 4.3, 4.4       | Ready and empty; a reply, its steps opened                     | Every task                                                                                                                               |
| 4.5            | Working; Stop; a stray Esc                                     | Every task; accessibility walk for Stop and Esc                                                                                          |
| 4.6            | A change; every row of 6.6 a session meets                     | T91, T94; accessibility walk for the rest                                                                                                |
| 4.7, 6.5       | Each approval card that can be reached                         | T93 for `large`; accessibility walk for the rest                                                                                         |
| 4.8            | A question from the Assistant                                  | Accessibility walk                                                                                                                       |
| 4.9            | Failed: at setup; a 429; during a change                       | T90; accessibility walk, using a `REAL_GEMINI_COUNT` file filled to a few calls below the cap, which costs nothing and fails mid-message |
| 4.10           | Away from the panel                                            | Accessibility walk                                                                                                                       |
| 4.11           | Conversations, and a `--reopen` return with the tab's key gone | Accessibility walk                                                                                                                       |
| 4.12           | Talking, and each voice line                                   | Accessibility walk                                                                                                                       |
| 6.4            | Every result code                                              | Sessions and walks where they arise; the rest by a test that puts each code through `words.ts`, named in the scores                      |

The Figma and visual walks cover the same states at 1440 x 900, and states 4.1, 4.3, 4.4, 4.7 and 4.9
at 900 x 700 and in the dark theme too.

## Measures reported every round (not gates)

- Per session: the number of Gemini calls (`Model calls:`), messages sent, and steps against the key.
- First move toward the Assistant, and whether the word or the glyph was named (T90).
- What the reader would load, phone numbers or emails included, and why (T90's follow-up).
- Who noticed the selection (`Scope noticed:`, T92 A).
- Where the reader went to make the change by hand (`Hand edit:`, T91 A).
- Which checks readers used before the follow-up, and apart from those, after it: hovering a chip,
  clicking it, Show in table, Open run or layer, the inspector, none (T92).
- Whether anyone looked for the layer list, and what they did (T91, T94).
- Any wish for a preview before a change applied, in the reader's own words (T91, T94).
- Whether a starter was used, read, or ignored.
- How each reader reversed a change: Undo in the reply, the arrow at the top, Control+Z, asking the
  Assistant, or by hand (T94).
- Every number with its denominator, with and without any session decided by a build defect.

## Round plan

- **Sessions:** 12 at most, one per task half (`roster.md`). A void session is re-run once as
  `<id>b`, which does not count against the 12.
- **Live at once:** at most 4 participants. No step cap: a session ends when the participant is done,
  gives up or stops making progress. Step notes are one or two sentences, in character.
- **Model use:** each session stays under about 40 calls to Gemini. Pilot walks took 1 to 8 calls
  for a concrete request and 9 for an open-ended one, so prompts ask for concrete things, and every
  persona's history says each thing asked costs their team, and to ask no more than about eight. A session over 40
  is reported, never cut off. The tool's tier cap is 5,000 calls: the dry runs spent the first 3,000, so it was raised on 2026-11-05 to leave room for the sessions.
- **Retries:** a session ending on an API error of the participant's own model is run again with the
  same prompt from a clean folder, then once on Sonnet, with the model recorded.
- **Experts, once:** accessibility (keyboard and the screen-reader reading of every Assistant state,
  voice and conversations included), Figma product design and visual design walkthroughs, and the
  screenshot audit of the sessions' and walks' screens. Each works from the state list above.

## Before the round may start

1. The first line names a frozen build, and the Assistant is on in a `REAL_TIER=6` session of it.
2. Every setup file in this folder starts with no `SETUP FAILED` on that build.
3. A dry run walks each task half once, for functionality only: a single pass, fixing what crashes,
   blocks a task or spoils its grading. It fixes yeast's approval count (`answers.md`, "Seen while
   writing this key"), which would spoil bars 6 and 11.
4. On T92 A the dry run shows the reply narrowed to the selection. If it is not, that plant is
   dropped, T92 A starts from `connected-sources.txt`, and the report's first limit says so.
5. `answers.md`'s reference values and "Seen while writing this key" are re-read on that build; they
   were keyed on ad16c1f2dd.
6. `real.mjs --brief` writes all 12 briefings, and each holds no fact the key forbids.

## After the round

The researcher scores every bar and the two skeptics try to refute every finding, as in earlier
tiers. Two drops mean dropped; one means weakened unless answered with evidence. Findings a real
reader would meet are then fixed in the package that owns them.

Each failed bar and each kept finding is then walked again on the fixed build, by its task half or
its `repro/`, keeping prompts free of any phrase a fix added to the screen; the walk covers every
fixed screen. The researcher rescores bars 8 to 12 on that build and reports every bar's result
there. These walks are not user evidence, and the report says so.

## When the study stops

After the fixes from round 1 are in and walked again; or earlier on a one-way-door decision for the
owner, a build that blocks more than half the tasks in the dry run, or a study tool that fails its
dry run twice. The owner is told why, once.

## Change log

- 2026-11-05: written before any session.
- 2026-11-05, before the freeze, from three reviews. Bars 1 to 10 were not yet in use.
    - Bar 1: says how a model-decided F and a void's re-run count, because the bar was silent on both.
    - Bar 3: renamed, and `rightly` is 3 of 3, because every reader here is handed a key and "first
      time" claimed more than that.
    - Bar 4: needs a route the screen offered and no wrong cause, because the prompt hands over the
      second key, so "unaided" held however poor the failure row was.
    - Bar 5: counts only sessions with a wrong claim on screen, and needs at least 2, because a right
      reply or a plain refusal passed it with nothing tested. T92 and T95 no longer ask for doubt.
    - Bar 6: needs the card read, because a reflex approval with a right report passed.
    - Bar 7: adds layers, runs and a second change, because `look` alone misses a run left behind and
      a single Undo never stresses "Undo on the newest step only".
    - Bar 8: adds the next key typed, Undo and the status words, because "focus not lost" passes
      focus on the wrong control.
    - Bar 9: reported twice, so a round's result stays visible after fixes.
    - Bar 10: needs the state list, because the rule that an empty check fails applied to any screen
      nobody reached.
    - Bar 11, new: tier 1's check that counts are true had no successor here, and the key already
      holds one false count (yeast's 361 edges).
    - Bar 12, new: the Figma and visual walks fed nothing, since a visual finding rarely meets "blocked
      or wrong belief". Answered, not gated on being fixed: a quick round gates on harm to readers.
    - Dropped from the reviews: a tool option to fail a call mid-session, and an instruction that
      makes the model misstate counts. Both add tool work to a quick round; the `REAL_GEMINI_COUNT`
      reproduction and T92 A's selection cover the question with setup alone, and the limit is stated
      under "Not asked". The selection was walked on ad16c1f2dd: the reply read "Of the 9 on-record
      sources in the selection, 6 gave donations", where the file's answer is 7 of 12.
- 2026-11-05, the first freeze: no build was named before this one, so the first line moves from its
  placeholder to round r1's build 8fa33aa786, which holds master merged in. No bar changed.
- 2026-11-05, before the round's first session: `answers.md` now matches the walks of frozen build
  8fa33aa786 on T90 to T93 and T95. No bar and no prompt changed; `tasks.md` is untouched.
    - All: a `Build decided: yes` line marks a session a known build defect decided, because the
      measures ask for numbers with and without one and no grade line carried it.
    - T90: names or ids both count, because 3 of 5 replies on A gave ids; closeness joins the
      references, because replies ranked by it; the status bar's chip and Quick actions join the ways
      out, and the panel's AI provider... button is gone once a key is saved; Google with the OpenAI key
      is no wrong turn, because Save accepts it and the tool's key swap brings a reply; the keyboard
      route to the rail is Control+I or ArrowDown, not Tab.
    - T91: B's key card reads 9 of 331; A's path takes one or two more messages, because the first
      request changes nothing; a selector listing the nine ids matches; the chip on A and the drawing's
      eight dots are named as no basis.
    - T92: ids count as answers; the on-screen betweenness values sit beside the key's; the path runs
      to 9 steps and says where each check really is; a repaint is no longer expected; the plant is
      confirmed on this build.
    - T93: B's request also says Undo can bring them back; the title, not the edge chip, is the count;
      the model's question before the request, the 3-person choice (21 nodes, 47 edges) and a filter
      after Keep them each have a grading line.
    - T95: both halves have an id column; a question from the model has a `Trap fired:` rule; the
      refusal example is one this build gave; a left-behind run is no step; a chip under a claim from
      memory is not support.
- 2026-11-05: the study moved from build 8fa33aa786 (served from
  `.study-builds/tier6-r1-8fa33aa786`) to build 3549e11129, which holds the fixes made since that
  freeze.
- 2026-11-05: `answers.md` now matches the walks of build 3549e11129 for T90 B, T91 A, T92 A, T93 B and
  T95 A. No bar and no prompt changed; `tasks.md` is untouched.
    - T90: a reply that ranks wrongly still counts as what it gave, because one put s18 first by
      closeness.
    - T91: A's path is 3 to 5 steps, because the first message can now paint; the "No matches" step,
      "Query data failed" and the false 63 or 24 chip are gone, and Which nodes reads the rule.
    - T92: the chip row can read 7, 12, 9, 5 or 14, all true counts, and only 7 and 12 back the fact,
      which applies the success line's "something behind it" to the rows the walks showed; six after
      the x is graded on the report; a repaint can happen on A; "Selected 0 nodes" is named as backing
      nothing.
    - T93: the edge chip no longer disagrees, so its grading line goes and "Seen while writing this
      key" says so.
    - T95: a question's words stay in the turn, as `decided.md` settles; a chip under a claim is on
      either half; a shown run can be missing from `work.json`, and a dead Open run is no wrong turn; a
      refusal may offer a proxy list.
- 2026-11-05: the study moves from build 3549e11129 (`.study-builds/tier6-r1d1-3549e11129`) to build
  48879618c4 (`.study-builds/tier6-r1d1-48879618c4`). No bar changed, and no commit between the two
  touches `graphty`, `graphty-element` or `compact-mantine`.
- 2026-11-05: `answers.md` now matches the walks of frozen build 48879618c4 for T91 A, T92 A, T92 B and
  T95 A. No bar and no prompt changed; `tasks.md` is untouched. That build has the same app code as
  3549e11129, so the second dry run's fixes are not in it, and the key's lines on "Selected 0 nodes" and
  on rows of 5 or 9 stay.
    - T91: a chip of 15 under a reply of 9 is no basis, by the ruling on T92 A's rows of 5 or 9; a report
      of 15 is F, `Build decided: yes`; "Style failed." under the 15 left selected is a failed message,
      left by the scope x and Send again; a resize alone to the ranking's own top size does not read
      apart, which applies the key's existing line that the nine must; "Sized 9 nodes" can repeat.
    - T92 A: after the x the reply can hold no seven at all, and what does bring it is listed; a reader
      who pressed the x and reports 6 is the same F, marked `Build decided: yes` and reported apart,
      because the key's earlier line relied on the reply holding a seven; fact 1 can name s10 alone,
      which is F, `Trap fired: yes`; a row can read 9 beside "6 of the 9", or be missing.
    - T92 B: "at least 6" under fact 1's selection is named: a report of 6 is F, `Build decided: yes`, and
      asking again is one more step; a turn that selected its answer has no chip, and the selection in
      the inspector stands behind it; "Selected 0 nodes" can come once.
    - T95: a question can come unasked; Open run opens the run where it stayed; a report offering the
      Assistant's whole-network file as a short list is F, `Build decided: yes`.
    - "Seen while writing this key" gains the file, the x, the model's cleared selection, the chip of
      15 and the two changes that leave nothing to find, each rated.
- 2026-11-05: the study moves from build 48879618c4 (`.study-builds/tier6-r1d1-48879618c4`) to build
  3b2a7f0649 (`.study-builds/tier6-r1d2-3b2a7f0649`), which holds the dry run's fixes and the latest
  master. No bar changed.
- 2026-11-05: `answers.md` now follows the words decided for the build after 3b2a7f0649, and the walks of
  3b2a7f0649 itself, which it had not been matched to. No bar and no prompt changed; `tasks.md` is
  untouched, and T90's prompt keeps its second key because bar 3 reads a real answer. That build does not
  exist yet, so lines given for it are decided words, and its dry run checks them against the screen.
    - T90: the failure row names the key and offers AI provider...; that button is `Way out: other`, and
      repeating the row's words is `Failure read: key`, by the existing line on "I cannot tell"; Enter and
      Done save a typed key.
    - T91: identical lines fold, so "Sized 9 nodes" no longer repeats; "Style failed." can carry a reason.
    - T92 A: the field names the selection; the x alone reached seven on 2 of 2 walks of 3b2a7f0649, so
      `Build decided: yes` on a report of 6 now means that fix did not hold; Open run on a line for 14
      nodes opens a run counted inside the selection, where the key had said all 24.
    - T92 B: "at least 6" did not return, and its `Build decided` note applies only if it does; a turn
      that selected its answer keeps its chip, and "Selected 0 nodes" is gone, so a right fact 2 with
      only the reply's words behind it is F with no `Build decided`.
    - T92 and T95: the Computed lines use the name the key card uses and say when a run painted; on T95
      a removed run reads "Removed Degree" with no Open run, and a run that painted nothing opens on Values.
    - T95: the Assistant's file holds what the message is about; `Build decided` stays for one that holds
      more.
    - "Seen while writing this key": each kept item now says what the sessions on 3b2a7f0649 showed and
      what the fixed build does; the refused key is down to 2, as round 2 scored it.
- 2026-11-06: the study moves from build 3b2a7f0649 (`.study-builds/tier6-r1d2-3b2a7f0649`) to build
  a80da6d62e (`.study-builds/tier6-r3-a80da6d62e`) for round 3, which holds round 2's kept fixes and the
  latest master. No bar changed. Round 2's change that said an Assistant failure once was taken out, so
  a failed turn's end row is an alert each time it is drawn.
