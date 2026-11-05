The study runs on build <sha> served from <dir>

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
all. A failure is strong evidence; a pass is weak until real people confirm it. The model behind
the Assistant also varies from run to run, so one session's reply may not repeat in the next. Every
report says so.

**What the round must answer, beyond the bars** (from `design.md`, section 12):

1. Does anyone miss the layer list while the chat is open (T91, T94)?
2. Is an answer the file cannot support read as a finding (T95), and do readers separate the model's
   own words from computed chips (T92, T95)?
3. Is a change that applies at once comfortable, or do people want a preview first (T91, T94)?
4. Do readers check chips, or trust that they exist (T92)?
5. Is the approval read, or approved by reflex (T93)?
6. Is the word Assistant, under its glyph, found first time (T90), and do starters teach anything?
7. Do readers understand what is sent to the provider, and does it change what they would load
   (T90's follow-up)?

**Not asked of this round.** A planted wrong count needs the tool to falsify a reply, so nobody
plants one: T92 and T95 rely on the model's own errors and on a question the file cannot answer, and
any wrong reply a session happens to get is recorded. Voice, saved conversations, narrowing a
message to a selection, and the screen-reader path get no task here; the experts walk them. The flag
off is not studied: `AssistantOff.real-element.test.tsx` holds it.

## Grades

S, SD, F, G and VOID, as `answers.md` defines them. Success means S or SD. Each session is graded
from its last screen, its saved records and its transcript, never from the participant's own rating.

## Bars that decide "done"

No bar here is scored by a script. Each is counted by the researcher from the graded sessions and
the expert findings, and each states its denominator. With one session per task half there is no
per-half floor: two domains' data stop a one-domain pass from reading as a clean result, and a
half's fail is reported by name. Every bar is scored in round 1; a bar with nothing to count did not
hold.

| Bar | What it says                      | Holds when                                                                                                                                                                             | Counted from                                  |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Tasks succeed                     | At least 10 of 12 sessions are S or SD, and every task has at least 1 of its 2                                                                                                         | Grades                                        |
| 2   | No false "done"                   | At most 1 of 12 sessions says a task is done while its last screen says otherwise                                                                                                      | `False done:` lines                           |
| 3   | A first-time reader gets it going | Both T90 sessions get a real answer from the model unaided, and both answer the follow-up rightly on what leaves, where it goes and who pays                                           | T90 grades, `Disclosure:` lines               |
| 4   | Failure is recoverable            | Every session that meets a failed message reaches a working state unaided, and at least one session meets one                                                                          | `Failure:` lines, every task                  |
| 5   | Readers doubt the right things    | Of the 4 sessions on T92 and T95, at most 1 reports a wrong claim, or a claim the file cannot support, as fact                                                                         | `Taken on trust:` lines                       |
| 6   | An approval is read               | In both T93 sessions the reader's report agrees with what happened to the network and names how it differs from the expected number                                                    | T93 grades, `Card:` lines                     |
| 7   | A change can be taken back        | Both T94 sessions end with the picture as it started, and the conversation still there                                                                                                 | T94 grades, the `look` values in the records  |
| 8   | The keyboard is enough            | Both of Sam's sessions reach their end with no pointer, with focus never lost to the page at a send, a reply, an approval or Settings closing                                          | His grades, the accessibility expert's walk   |
| 9   | No severity 3 or 4 is left        | No confirmed severity 3 or 4 problem stays open once the fixes are in. Confirmed: seen by 2 participants, or by 1 participant or expert with a reproduction under the round's `repro/` | Grades, expert findings, the screenshot audit |
| 10  | The app does the talking          | No screen in any session or walk shows a raw result code, element English, a tool's arguments or JSON                                                                                  | The screenshot audit                          |

Severity is Nielsen's 0 to 4. Expert counts are not user evidence: an expert-only severity 3 needs a
reproduction. A grader's 3 counts only with its behavioral cost (the reader was blocked, or left with
a wrong belief). A defect in what the model chose to say is reported as the model's, and counts
against the design only if the screen gave the reader no way to tell.

The expert walkthroughs and the screenshot audit count through bars 8, 9 and 10 only.

## Measures reported every round (not gates)

- Per session: the number of Gemini calls (`Model calls:`), messages sent, and steps against the key.
- First move toward the Assistant, and whether the word or the glyph was named (T90).
- Which checks readers used: hovering a chip, clicking it, Show in table, Open run or layer, the
  inspector, none (T92).
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
- **Model use:** each session stays under about 40 calls to Gemini. Pilot walks took 1 to 6 calls
  for a concrete request and 9 for an open-ended one, so prompts ask for concrete things, and every
  persona's history says each message costs their team and to stop at about eight. A session over 40
  is reported, never cut off. The tool's tier cap of 3,000 calls is far above what 12 sessions need.
- **Retries:** a session ending on an API error of the participant's own model is run again with the
  same prompt from a clean folder, then once on Sonnet, with the model recorded.
- **Experts, once:** accessibility (keyboard and the screen-reader reading of every Assistant state,
  voice and conversations included), Figma product design and visual design walkthroughs, and the
  screenshot audit of the sessions' screens.

## Before the round may start

1. The first line names a frozen build, and the Assistant is on in a `REAL_TIER=6` session of it.
2. Every setup file in this folder starts with no `SETUP FAILED` on that build.
3. A dry run walks each task half once, for functionality only: a single pass, fixing what crashes,
   blocks a task or spoils its grading.
4. `real.mjs --brief` writes a briefing for the plan's first session.

## After the round

The researcher scores every bar and the two skeptics try to refute every finding, as in earlier
tiers. Two drops mean dropped; one means weakened unless answered with evidence. Findings a real
reader would meet are then fixed in the package that owns them and walked again.

## When the study stops

After the fixes from round 1 are in and walked again; or earlier on a one-way-door decision for the
owner, a build that blocks more than half the tasks in the dry run, or a study tool that fails its
dry run twice. The owner is told why, once.

## Change log

- 2026-11-05: written before any session.
