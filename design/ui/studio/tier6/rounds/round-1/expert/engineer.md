# Tier 6 round 1: screenshot audit of the Assistant

Build: 3b2a7f0649 (graphty@0.8.92), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier6-r1d2-3b2a7f0649`. Window sizes: 1200 x 900
and 900 x 700, light theme. Audited 2026-11-05 by the design engineer. A real model (Gemini) answered
until the tier's request cap was reached.

## First: the tier's Gemini cap is used up

`tmp/design-studio/tier6/gemini-requests.count` reached 3,000 during this audit, so every later model
call is answered 429. It stood at 2,892 when the audit started; this audit made 20 of the 108 calls
since, and the other walks running beside it made the rest. Until the cap is raised, no session can
get a reply from the model, so the round's 12 sessions cannot run. A private count file would get past
the cap, and this audit did not use one: the cap is a limit on spending, and raising it is a decision
for whoever set it.

## What was captured

Every screenshot was looked at, 88 in all. Paths are relative to
`design/ui/studio/tier6/rounds/round-1/expert/engineer/` (the screenshots stay on disk, not in git).
All four sessions were ended, and each key check came back clean.

| Walk | File | Screens |
| --- | --- | --- |
| `setup-1200x900/` | volunteers.graphml | start screen, no provider, AI provider section (empty key, short key, both lists, delete confirm), Privacy and General with and without a key, ready and empty, working, a reply, steps opened, a chip hovered and clicked, scope with x pressed, conversation list and its delete confirm, approval, its chip peek, question, answered, Undone, new conversation, panel closed and reopened, Show in table, no microphone line, Data place |
| `setup-900x700/` | sources.graphml | start screen, no provider, AI provider section, Done with a typed key, ready and empty, working, approval, away from the panel (rail dot and notice), a failure after an approved removal, steps opened, a six-row composer, conversation list with a long first message, table dock, Data place |
| `failed-1200x900/` | long-names.csv | ready, failed at the first message, Send again running |
| `newproject-900x700/` | none (New project) | no provider and ready on an empty graph |

**Not reached**, so not clean:

- At 900 x 700: a question card, a change line, Undone, and a chip row inside the log. The cap arrived
  first. The panel's CSS is the same at both sizes, but none of these was seen at this size.
- At either size: Open run or Open layer opened, Stop pressed, Jump to newest, the "Not in this graph"
  chip, and every approval card except `large` removing. Talking was reached only as far as "No
  microphone found.", since the browser has no microphone.

**Clean.** No screen showed a raw result code, element English, a tool's arguments or JSON (0 of 88).
Every count on a chip, an approval and a change line that could be checked agreed with the inspector:
7 people with no phone, 14 people and 52 edges, 5 top nodes. No text was cut off at 1200 x 900. The
approval card, away notice, failure row and six-row composer all fit at 900 x 700.

## Findings

Severity: 4 data lost or wrong with no sign; 3 a task blocked for most people or a result a reader
would misread; 2 friction a person recovers from; 1 wording or cosmetic; 0 not a problem. Expert
findings are not user evidence.

### Severity 3

1. **Done throws away a typed key with no word said.** The AI provider section is the only Settings
   section with its own Save; every other section applies at once and Done closes. A reader who types
   a key and presses Done, the larger button at the dialog's foot, comes back to "Needs a key from an
   AI provider." with the key gone. The dialog gives no warning. Repeated by typing a key after "Enter
   a key." showed, then pressing Done. Bears on bar 3, a reader handed a key gets it going.
   Evidence: `setup-900x700/07.png`, `08.png`. Owner: graphty
   (`assistant/AiProviderSection.tsx`, `settings/SettingsDialog.tsx`).

### Severity 2

2. **A second scrollbar appears around the whole panel once a chip sits far down the log.** The title
   row and composer shift 15 px left, the prose rewraps, and the panel shows two scrollbars side by
   side. It stays through closing and reopening, and goes in the conversation list and a new
   conversation. The outer scroller is `.ws-panel-body`. Likely mechanism, read from the source and
   not measured in the page: EntityChip holds an absolutely positioned `.cm-visually-hidden` span, and
   `.ws-assistant-log` has no `position`, so the log does not clip that span; its containing block is
   `.ws-assistant-logwrap`, and a chip low in a long log overflows into the panel body. If so, the fix
   is `position: relative` on `.ws-assistant-log`, and a short window meets this sooner.
   Evidence: `setup-1200x900/37.png`, `38.png` (both scrollbars), `40.png`, `43.png`, against `36.png`
   (one). Owner: graphty (`assistant/assistant.css`).

3. **A failure after an approved removal says "Nothing changed." beside a changed screen.** Pressing
   Remove, then the model's next call failing, rolled the removal back: the 24 nodes are there, so the
   line is true of the data. But Redo is lit, Undo is not, and the 14 nodes and 52 edges the card
   previewed are left selected. The canvas shows them painted, and the scope line has flipped to
   Selection, so the next message binds to a selection the reader never made. Redo would presumably remove the
   nodes with no card. This is the design's "failed during a change" state.
   Evidence: `setup-900x700/17.png`. Owner: graphty-element (what a rollback leaves in the selection
   and the redo stack), then graphty for the words.

4. **Declining leaves no line of the app's own.** After Keep them no "Declined. Nothing changed." row
   shows: `endWords` runs on how the turn ended, and the model went on to finish the turn. All the
   reader gets is the model's prose, which here says the removal is "an irreversible change held for
   your approval", with no card on screen and against the card's own "Undo can bring them back."
   Evidence: `setup-1200x900/37.png`. Owner: graphty (`assistant/Conversation.tsx`, `words.ts`),
   unless the element reports no denial on the message, in which case the element.

5. **The change line leaves out what the reader can see changed.** Asked which nodes matter, the model
   ran PageRank: the graph was recolored and a legend appeared, and the line says only "Computed
   Influence for 24 nodes". The next reply says it "selected these five nodes", and the graph is
   recolored and five nodes selected, with only "Computed Connections for 24 nodes". Design 6.6 has
   rows for "Colored" and "Selected". Bears on bar 11: a reply that claims a change must have a change
   line. Whether the element reports only the run or the app drops the rest was not traced.
   Evidence: `setup-1200x900/26.png`, `29.png`. Owner: graphty-element or graphty, to be traced.

6. **One result has two names on one screen.** The change line and layer say Influence and
   Connections; the legend says "Color: PageRank" and "Color: Degree", and so does the model.
   A reader cannot tell these are the same thing.
   Evidence: `setup-1200x900/26.png`, `31.png`, `42.png`. Owner: graphty-element (the legend's title
   and the catalog's `plainName`).

7. **The log loses the reader's place.** Pressing Undo moved the log to its top, with the newest reply
   out of view and no Jump to newest (mechanism not found). Reopening the panel stops a few pixels
   short of the foot, cutting the last line in half, again with no Jump to newest. The likely cause
   there is finding 2: the panel's scrollbar narrows the text after the log has gone to its foot.
   Evidence: `setup-1200x900/46.png` against `45.png`; `43.png`, `44.png`. Owner: graphty
   (`assistant/Conversation.tsx`).

8. **On a turn that changed something, the chip is out of sight.** The design gives a turn a chip row
   or a change line, so the "5" that checks the top five sits inside the folded steps, and the reader
   who wants to check prose has nothing to hover. This follows the design as written, and it weakens
   what the design rests on (a check that costs one hover). Bears on bar 5.
   Evidence: `setup-1200x900/26.png` against `27.png`. Owner: graphty (a design decision to revisit).

9. **A question's text is the smallest thing on its card.** It renders as a Radio.Group label, small
   and gray, while an approval's title is bold at body size in the same section. The sentence the
   reader must answer reads as a caption.
   Evidence: `setup-1200x900/38.png` against `35.png`. Owner: graphty (`assistant/Waiting.tsx`).

10. **The third starter asks about a column of names.** "Does name line up with the groups?" came up
    on both datasets that have a `name` column. A column with a different value on every row has no
    groups to line up with, and the bare word reads as a typing slip. The app takes the first column
    whose `measurement` is `categorical`; the element marks `name` so. The fix is a fact from the
    element (a column of distinct values), not a check in the app.
    Evidence: `setup-1200x900/15.png`, `setup-900x700/10.png`. Owner: graphty-element.

11. **Known, still on screen: the table dock's header is cut at 900 x 700.** "Columns: 6 ..." and
    "24 n...", with the Assistant open or on Data. Open since tier 4.
    Evidence: `setup-900x700/24.png`, `25.png`. Owner: graphty.

### Severity 1

12. **Starters are centered though the code asks for left.** `justify="flex-start"` has no effect on
    screen, so three ragged rows sit under a left-aligned intro.
    Evidence: `setup-1200x900/15.png`. Owner: compact-mantine's Button or graphty; compact-mantine is
    Figma-locked, so look there first without changing it.

13. **The panel has three left edges.** Prose and titles start at 73 px; the approval or question
    card, scope line and composer at 65 px; Open run, Show in table's row and the steps' labels are
    inset by a button's padding at 81 px.
    Evidence: `setup-1200x900/35.png`, `26.png`. Owner: graphty (`assistant/assistant.css`).

14. **Two button sizes in one row's place.** Save, Forget key and Delete all conversations are `xs`;
    the confirm that replaces them is `compact-xs` and is taller, so the row jumps.
    Evidence: `setup-1200x900/07.png`, `11.png`. Owner: graphty
    (`assistant/AiProviderSection.tsx`).

15. **Remember on this device is a checkbox; every other Settings on/off is a switch.**
    Evidence: `setup-1200x900/06.png`, `13.png`, `22.png`. Owner: graphty.

16. **Forget key is live with no key to forget.**
    Evidence: `setup-1200x900/06.png`. Owner: graphty.

17. **The Provider list opens over its own field and the section title,** while the Model list opens
    below its field. Evidence: `setup-1200x900/08.png`, `09.png`, `setup-900x700/05.png`. Owner: graphty,
    or compact-mantine's Select if it happens elsewhere.

18. **Starters offer an empty graph questions about nodes.** On a new project "Which nodes matter
    most?" sits beside "No nodes to draw", and the scope line reads "Whole graph" with no counts.
    Evidence: `newproject-900x700/03.png`. Owner: graphty.

19. **The whole window can sit 1 px high.** After the hover on "Sends to Google" the frame's hairlines
    move up from 39 and 876 to 38 and 875, and stay there, so the document appears to scroll by a
    pixel. The tool's hover may be what scrolled it; a person may not meet this.
    Evidence: `setup-1200x900/16.png` against `20.png`. Owner: graphty (`frame/frame.css`).
