# Tier 6 round 1: visual walkthrough of the Assistant

Build 3b2a7f0649 (graphty@0.8.92), served from the frozen copy named on the first line of
`../../../criteria.md`, driven with `tool/real.mjs` and a real Gemini model. Three sessions, every
screenshot looked at, and small text read from 3x crops. Type sizes come from the frozen source
(`git show 3b2a7f0649:<path>`): `xs` is 9 px and `sm` is 11 px.

| Session | Scheme, size | What it covers |
| ------- | ------------ | -------------- |
| `visual/v1-light/` | light, 1440 x 900 | volunteers.graphml from the empty start: no provider, the provider section, a failed OpenAI key, ready and empty, working, a reply with steps open, a change, Open layer, Undo, the approval card, a removal, the conversation list, Talk, Privacy |
| `visual/v2-sources-dark/` | dark, 1440 x 900 | sources.graphml with 14 people selected: the scope line on a selection, a reply with a chip row, the peek on the light canvas, Show in table, no provider, a failed key |
| `visual/v3-yeast-900/` | light then dark, 900 x 700 | yeast-galactose.graphml: ready and empty, a change with an approval waiting, the peek on 82 small nodes, leaving the panel while a request waits, the provider section, no provider, a failed key |

Severity is Nielsen's 0 to 4, as in `../../../criteria.md`. No finding is rated 3: an expert-only 3
needs a reproduction and a reader who paid for it, and these are for the sessions to confirm. Items
that could rise are marked "watch" with the task that would show it. Evidence paths are under
`visual/`; the screenshots stay on this machine, since git ignores a session folder's images.

## Summary

- 0 findings at severity 3 or 4, 10 at severity 2, 13 at severity 1.
- All but one finding are owned by the graphty app; the peek on small nodes is graphty-element's. None needs a change to
  compact-mantine, so none touches the Figma lock.
- The strongest theme: **the reply's three marks are really one.** The design separates the model's
  words, computed results and what happened. On screen, a change line, a failure and the working line
  are all the same 11 px body ink on the same left edge as the model's prose. This is the question the
  round asks in `criteria.md` (do readers separate the model's words from computed results), so the
  fix should not wait for a reader to fail on it.
- The second theme: **the deciding text is the smallest again.** The scope line, a microphone failure
  and the disclosure of what leaves the computer are all 9 px, against the design's rule that state
  text never drops to the caption.
- What holds up: the approval card is the best-built screen in the tier (see "Held
  up"). Dark theme needs no separate fixes.

## Findings

### The reply

**1. Severity 2 (watch: T92, T95). A change line looks exactly like the model's prose.**
Screen: a reply with a change (design 4.6). "Computed Influence for 24 nodes" and "Colored 24 nodes by
role" follow the prose at the same size, ink and left edge, with a 4 px gap, and a turn that changed
the graph shows no chip row. So on a change turn nothing on screen marks a computed fact. The design's
drawing has the chip inside the line: "Colored (o)77 by group". The build prints plain text.
Evidence: `v1-light/20.png`, `v1-light/26.png`, `v1-light/34.png`, `v3-yeast-900/04.png`.
Owner: graphty app (`Checks.tsx`, the change lines are plain `Text`). Fix: draw the line's count as the
existing node chip, as design 4.6 shows. No new look is needed.

**2. Severity 2 (watch: T90). A failure looks like a reply.**
Screen: failed (design 4.9). "Could not reach OpenAI: the connection failed." is plain body ink under
the heading "Assistant", with no glyph and no error ink, in both themes and at both sizes. Once the
reader sends another message, Send again leaves and the failure is one more paragraph in the log.
Evidence: `v1-light/12.png`, `v1-light/18.png`, `v2-sources-dark/14.png`, `v3-yeast-900/19.png`.
Owner: graphty app (`Conversation.tsx` lines 209-213). Fix: use the warning glyph row the empty result
already has (`Checks.tsx` line 220), so a problem has one look. The design's rule allows error ink for
danger, so either stays inside it.

**3. Severity 2. "Working" has no sign of life.**
Screen: working (design 4.5). "Sending to Google" is a still line of body text that looks like the
start of a reply, and only the quiet Stop button says anything is running. On one message it stayed
unchanged across two screenshots 6 seconds apart, and the whole message took over 20 seconds.
Evidence: `v1-light/24.png`, `v1-light/25.png`, `v1-light/26.png`.
Owner: graphty app (`Conversation.tsx` line 389). Fix: put a small Mantine `Loader` before the line, in
the neutral ink. It adds motion, not a hue.

**4. Severity 2. An undone change still reads as a fact.**
Screen: a change after Undo (design 4.6). "Colored 24 nodes by role" and "Sized 15 nodes" stay at full
ink while the drawing has gone back to PageRank. The only sign is the word "Undone", alone at the far
right where the Undo button was, on a row that has lost Open layer.
Evidence: `v1-light/28.png`, `v1-light/31.png`. Owner: graphty app (`Checks.tsx` line 318). Fix: dim the
turn's change lines and put "Undone" on the left edge below them.

### Text size of state and disclosure

**5. Severity 2 (watch: T92 A). The scope line is the smallest text at the composer, and it decides the
answer.** Screen: ready, with a selection. "Selection" against "Whole graph" is one 9 px word, the only
other change being that an x replaces the edge chip. The placeholder still says "Ask about this graph" while a
message is limited to 14 nodes. Design section 8 says state text never drops to the 9 px caption, and
T92 A depends on this line being read.
Evidence: `v2-sources-dark/02.png`, `v2-sources-dark/05.png` against `v1-light/09.png`.
Owner: graphty app (`Composer.tsx` lines 62, 80). Fix: `size="sm"` on both words; the row has the room.
The placeholder's wording goes to the content designer.

**6. Severity 2. "No microphone found." is 9 px, under everything.**
Screen: Talk with no microphone (design 4.12). The failure lands below the buttons at caption size in
plain ink, far from Talk, and pushes the composer up 18 px. Evidence: `v1-light/39.png` against
`v1-light/38.png`. Owner: graphty app (`Composer.tsx` line 223). Fix: `size="sm"`.

**7. Severity 2 (watch: T90's disclosure). What leaves the computer is the smallest text in the provider
section.** Screen: AI provider (design 4.2). The disclosure ("go straight to Google. Google charges your
key.") is 9 px, smaller than the hint under Remember, and the section at rest holds about 64 words,
above the 50 that `criteria.md` rates a severity 2. Bar 3 asks every reader to report exactly these
facts. Evidence: `v1-light/05.png`, `v3-yeast-900/12.png`. Owner: graphty app (`AiProviderSection.tsx`
lines 180-181). Fix: 11 px for the disclosure. Keep the word count with this reason: the disclosure is
what bar 3 measures and it is settled in `decided.md`; the cut, if any, is the content designer's.

### Layout and alignment

**8. Severity 2. Four left edges and three action looks in a 280 px panel.**
The log's text starts at x=73; the approval card, the scope line and the composer box at x=65; Open run
and the step rows at x=81; the steps label at x=101. On the approval card the 8 px step against the
prose directly above is plain to see. Row actions also differ with no reason a reader could name: Show
in table is borderless on the right, Open run is borderless and indented on the left, Undo and Send
again are bordered on the right. Design says nothing here is boxed and my criteria allow two or three
edges. Evidence: `v1-light/32.png`, `v1-light/21.png`, `v2-sources-dark/05.png`, `v3-yeast-900/04.png`.
Owner: graphty app (`assistant.css`: `.ws-assistant-waiting` and `.ws-assistant-foot` pad 8 where the log
pads 16). Fix: one 16 px text edge, with the composer box alone reaching out to 8; quiet row actions
start on the text edge.

**9. Severity 2 (watch: T90, whether starters teach). Starters float centered and look like headings.**
Screen: ready and empty (design 4.3). Three centered lines under a left-aligned sentence, with no
border, glyph or fill at rest. They are the only centered text in the panel, and nothing says they can
be pressed. Evidence: `v1-light/09.png`, `v2-sources-dark/02.png`, `v3-yeast-900/02.png`.
Owner: graphty app (`AssistantPanel.tsx`; a Mantine `Button` centers its label, and the class
`ws-assistant-starters` has no rule). Fix: `justify="flex-start"` on the button, so they sit on the text
edge as a list of rows.

**10. Severity 2. Two brand buttons in Settings.**
Screen: AI provider. Save and Done are both filled brand buttons, and in dark both are
bright lime. Design section 8 allows one brand button on screen. Evidence: `v1-light/05.png`,
`v3-yeast-900/12.png`. Owner: graphty app; Done belongs to the shared Settings dialog and Save to the
section, so Save is the one that can drop to `default`. Check with the interaction designer first what
Done does with a typed key, which this walk did not test.

**11. Severity 1. The scrollbar reflows the log.** When the log first overflows, a 15 px scrollbar takes
width from the text: every line rewraps and Undo jumps from x=320 to x=305. Evidence:
`v1-light/21.png` against `v1-light/26.png`. Owner: graphty app. Fix: `scrollbar-gutter: stable` on
`.ws-assistant-log`.

**12. Severity 1. No hairline under the title.** The log scrolls straight under the title row, so a line
is cut in half against it ("Nothing changed." at y=77), although the panel's rule is that sections part
on hairlines. Evidence: `v1-light/26.png`. Owner: graphty app (`.ws-assistant-head`).

**13. Severity 1. The title and a turn's heading are the same thing twice.** Both are 11 px weight 600,
and "Assistant" stands in both places. Turns also barely group: 32 px between exchanges against 24 px
inside one. Evidence: `v1-light/20.png`, `v2-sources-dark/05.png`. Owner: graphty app (`assistant.css`).
Fix: widen the gap between exchanges to at least twice the gap inside one.

**14. Severity 1. The title drops the conversation's identity.** It reads "New conversation", then just
"Assistant" after the first message, with its chevron unchanged. Evidence: `v1-light/09.png`,
`v1-light/11.png`. Owner: graphty app.

**15. Severity 1. Two replies in one turn run together.** After an approval, the second reply follows the
first with a line break and no paragraph gap, so "please confirm" and "I found 7" read as one block.
Evidence: `v1-light/34.png`. Owner: graphty app (`Conversation.tsx`).

### Steps, chips and checking

**16. Severity 1 (watch: T92). Opened steps are hard to tell apart.** Four rows read "Query data" at 9 px.
Each chip sits on its own row under its step, and rows without one pack tight, so a chip reads as
belonging to the row after it as easily as the row before. Evidence: `v2-sources-dark/07.png`,
`v1-light/21.png`. Owner: graphty app for the layout (put the chip on the step's row, before the
duration); the repeated name goes to the content designer.

**17. Severity 1. A chip has a default cursor.** A chip that peeks on hover and, by design, selects on click shows no
pointer: `--hover-at` printed `cursor: default` on the approval's chip and a step's chip. The model label
is the same (`cursor: default`, `v1-light/13.png`), though `decided.md` keeps it as text. Evidence:
`v1-light/33.png`, `v2-sources-dark/07.png`. Owner: graphty app, on the wrapper around `EntityChip`, so
compact-mantine does not change.

**18. Severity 1. The peek weakens on small nodes.** On 331 nodes at about 2 px, the 82 peeked nodes are
only slightly larger, darker dots. It can be seen, but only by comparing. On the volunteers and sources
it reads at once, on orange and over the selection's gold ring, which answers the design's question
about the light canvas under dark chrome. Evidence: `v3-yeast-900/05.png` against `v3-yeast-900/04.png`;
`v1-light/33.png`, `v2-sources-dark/07.png`. Owner: graphty-element, which draws `selection.peek`.

**19. Severity 1 (watch: T92). Show in table leaves the rows scattered.** The six selected rows stay in
load order among 24, the last below the fold, and the header still says "24 nodes". The half-height
canvas also puts the toolbar over the bottom of the drawing. Evidence: `v2-sources-dark/08.png`.
Owner: graphty app.

### Setup and the conversation list

**20. Severity 1. The one door on the first screen is the faintest control.** "AI provider..." has a
border at 1.26:1 in light and 1.39:1 in dark (sampled: 229 on 255, 66 on 44). With no composer on this
screen no Send exists, so the rule of one brand button would still hold if this one were filled.
Evidence: `v1-light/04.png`, `v2-sources-dark/10.png`, `v3-yeast-900/14.png`. Owner: graphty app
(`AssistantPanel.tsx` line 38).

**21. Severity 1. The promise is the footnote.** "Nothing is sent until you add one." is the reassuring
line of the first screen and it is 9 px. Evidence: `v1-light/04.png`. Owner: graphty app
(`AssistantPanel.tsx` line 47).

**22. Severity 1. The conversation list does not mark the open one.** The only row offers Open on the
conversation already open, and Delete has the same weight as Open. Each row takes about 64 px, and the
date is 9 px. Evidence: `v1-light/37.png`. Owner: graphty app (`ConversationList.tsx`).

**23. Severity 1 (known). The approval's chip row shows nodes only.** The title says 7 nodes and 32 edges
and the chip below says 7, so it repeats a number and leaves the other out. `answers.md` already records
it. Evidence: `v1-light/32.png`. Owner: graphty app.

## Held up

- **The approval card.** It is the heaviest thing in the panel without a box: a bold title with the
  count, one brand verb, and Send dropped to quiet, as decided. It fits at 240 px with 12 px to spare,
  and it reads the same in dark. Evidence: `v1-light/32.png`, `v3-yeast-900/04.png`,
  `v3-yeast-900/11.png`.
- **Dark theme.** Chips, the composer's focus ring and the panel all hold on dark chrome. The canvas
  stays light by decision.
- **The lasting notice.** "Waiting: remove 82 nodes and 63 edges" with Open stays across places and sits
  clear of the toolbar at 900 x 700, and the rail's dot is small but only a backup to it. Evidence:
  `v3-yeast-900/06.png`, `v3-yeast-900/07.png`.
- **Rail caption.** "Assistant" fits its box at 9 px, as measured in `decided.md`.
- **The 900 x 700 panel.** No text is cut anywhere in it. Evidence: `v3-yeast-900/02.png`,
  `v3-yeast-900/19.png`.

Not reported because `decided.md` settles them: the key card covering a node (`v1-light/26.png`), the
model label as text, no bubbles or boxes, the x on the panel, an analysis question repainting the
network, and the `name` starter. The model's "irreversible" beside the card's "Undo can bring them
back" (`v1-light/32.png`) is the model's prose; it is listed for the graders, not as a design defect.

## States covered

| State | 1440 x 900 light | Dark | 900 x 700 |
| ----- | ---------------- | ---- | --------- |
| 4.1 No provider | `v1-light/04.png` | `v2-sources-dark/10.png` | `v3-yeast-900/14.png` (dark) |
| 4.2 Provider section | `v1-light/05.png` | `v2-sources-dark/10.png` | `v3-yeast-900/12.png` (dark) |
| 4.3 Ready and empty | `v1-light/09.png` | `v2-sources-dark/02.png` | `v3-yeast-900/02.png` |
| 4.4 A reply, steps open | `v1-light/21.png` | `v2-sources-dark/07.png` | `v3-yeast-900/04.png` (steps shut) |
| 4.5 Working | `v1-light/24.png` | `v2-sources-dark/04.png` | not taken |
| 4.6 A change, Undone | `v1-light/26.png`, `28.png` | not taken | `v3-yeast-900/04.png` |
| 4.7 Approval, `large` | `v1-light/32.png` | `v3-yeast-900/11.png` | `v3-yeast-900/04.png` |
| 4.9 Failed at setup | `v1-light/12.png` | `v2-sources-dark/14.png` | `v3-yeast-900/19.png` (dark) |
| 4.10 A request waits, away | not taken | not taken | `v3-yeast-900/06.png` |
| 4.11 Conversation list | `v1-light/37.png` | not taken | not taken |

**Not reached, so not clean:** Stop pressed and a stray Esc (4.5); the other approval cards (4.7); a
question from the Assistant (4.8); a 429 and a failure during a change (4.9); the notices for a change
or an answer landing while away (4.10); a `--reopen` return (4.11); Talking with a working microphone
(4.12, the headless browser has none). Light at 900 x 700 for 4.1 and 4.9, and dark at 1440 x 900 for
4.7, were replaced by the other combination.

**Why the walk stopped there:** the tier's shared count of Gemini requests reached its cap of 3,000
during this walk (2,892 when it began; these three sessions used 29). Every later real message gets a
429 until the cap is raised, so the unreached states above that need a model cannot be walked.
