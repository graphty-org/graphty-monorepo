# The Assistant: settled decisions

Every review of the Assistant reads this file and cites it. A complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and the
evidence; the old entry stays. The design they belong to is `design.md` beside this file.
"Research" means `design/ai/assistant-chat-research.md`.

## Identity

- **The label is Assistant, drawn as the rail caption.** (2026-11-04.) Reason: it is the glossary's
  screen word, the owner allowed it, "Agent" promises autonomy and collides with the element's
  helpers, and the sparkle alone is not understood. Evidence: `glossary.md`; research recommendation
  8; measured at 39.41 px in Inter 9 px against the 40 px `.cm-rail-label` box in headless Chromium,
  so it fits with no shared change.
- **The icon is the AI sparkle: one large four-point star and two small ones (a custom glyph in
  lucide's style, `AiSparkles` in `glyphs.ts`), as `GLYPHS.assistant`, size 20, rail ink, no
  purple; glow moves to lucide `Lamp`.** (2026-11-06, owner: lucide `Sparkle` is a single star, not
  the AI sparkle; replaces the 2026-11-04 choice below.) Earlier: lucide `Sparkle`. (2026-11-04.) Reason: the owner asked for the sparkle; the plural `Sparkles` already
  means glow in the approved Style panel; a second hue reads as data. Evidence: `glyphs.ts` line 156;
  `figma-crosswalk.md` ledger, whose rejection of the sparkle narrows to its purple;
  `visual-language.md` A1.
- **The rail order is Graph, Data, Assistant, Notes.** (2026-11-06, owner; replaces Graph,
  Assistant, Data, Notes of 2026-11-04.) Reason: the owner's call after trying the app. Flag off,
  nothing moves.
- **The rail button is never disabled.** (2026-11-04.) Reason: the owner's brief is that clicking
  brings up a chat window. This reverses the state matrix's disabled button. Evidence: `state-matrix.md`
  row 178 against `information-architecture.md`'s provider prompt, which disagreed.

## The flag

- **The flag follows `design/ci/channels-pipeline/features.md`: experiment id `assistant`, a row in
  graphty-element's `FEATURES`, additions tagged `@experimental assistant`, read in the app from
  `enabledFeatures.enabled`, reached by `?features=assistant`.** (2026-11-04.) Reason: this work adds
  to the element, so it is not an app-only experiment, and one build serves every site. Evidence:
  features.md sections 2, 3, 4 and 5.3; `ElementHost.tsx` already passes `features`.
- **Off means no rail button, command, key, Settings section, chunk or privacy chip change.**
  (2026-11-04.) Reason: an experiment only adds. Evidence: features.md rule 1.
- **`canary.json` and `nightly.json` list it when the branch lands; `production.json` stays empty
  until the owner graduates it.** (2026-11-04.) Reason: nightly's site is what the On run tests.
  Evidence: features.md 7.5. Two-way door: one line in a site file.

## Shape

- **The Assistant is a rail place in the left panel, not a window.** (2026-11-04.) Reason: a window
  covers 25% of the canvas at 1440 x 900, past the limit of a fifth; opens over the inspector at
  900 x 700; can hide a linked node, which the canvas-framing rule forbids fixing by reframing; and
  needs a new surface in Figma-locked compact-mantine. Evidence: research recommendation 8;
  `visual-language.md` furniture limit; WCAG 2.4.11; four independent reviews ranked the panel above
  the window.
- **Width: stored apart from `leftWidth`; 280 by default, or the left panel's current width under a
  1200 px window; handle to 480, capped so the canvas keeps 320; below 640 CSS px it fills the area
  right of the rail.** (2026-11-04.) Reason: 280 at 900 x 700 leaves a 323 px canvas, and rail, panel
  and inspector take 577 px, so 400% zoom cannot fit otherwise. Evidence: `interface-specification.md`
  1.3; `frame.css` has no width breakpoint; WCAG 1.4.10.
- **The turn has no bubbles, avatars or right-aligned messages; nothing inside the panel is boxed.**
  (2026-11-04.) Reason: they cost width and box the content. Evidence: `visual-language.md`, "nothing
  inside a panel is boxed".
- **The panel has an x even though other places do not.** (2026-11-04.) Reason: the active rail
  button shows no tooltip, so the x is the visible button that carries the close key. Evidence:
  `NavRail.tsx`; the owner's rule that every shortcut has a visible button.

## Keys

- **Mod+I goes to the composer, opening the panel if needed; pressed in the composer it closes.**
  (2026-11-04.) Reason: a toggle closes the panel on a reader who selected on the canvas and wants
  to keep typing. One rule, not three cases. Evidence: `commands.ts` does not use it; `firesWhileTyping`
  lets it fire in a field. To verify in each browser on the build.
- **Esc in the composer stops a run, only while running.** (2026-11-04.) Reason: the Stop button
  shows the key, and elsewhere Esc keeps typed text. A stray press takes changes back, so it is on the
  test list. Evidence: `tier3/decided.md`, Escape.

## The reply

- **Three marks, no hue: plain text is the model's, a chip is computed, a change line is what
  happened.** (2026-11-04.) Reason: readers must know what to doubt; glyph rows would need a legend
  when a chip already exists. Evidence: research recommendation 2.
- **Only tool results may be chips. A model's prose never becomes one.** (2026-11-04.) Reason: a chip
  means computed, and lighting up what a model named lends its claim authority. This narrows the
  template's "an object it names is a link". Evidence: LinkQ's overtrust finding in research,
  "Two routes to checking"; `interface-templates.md` 5.
- **At most one chip row per turn; a turn that changed the graph shows it in the change line.**
  (2026-11-04.) Reason: chips are tinted by kind and a transcript full of them competes with the
  data. Evidence: `visual-language.md` hue budget.
- **Hover or focus peeks; only a deliberate click selects.** (2026-11-04.) Reason: selection is the
  next message's scope and is not undoable, so a look must not change the question. Evidence:
  `tools/families/select.ts`, "add no undo step".
- **No turn folds. Tool steps do, and are collapsed by default.** (2026-11-04.) Reason: readers use
  earlier prose as memory, and a screen reader must skim every turn's heading. Evidence: research
  recommendation 7 and "Showing reasoning".
- **Starters are questions from the graph's own columns, fill the composer and never send.**
  (2026-11-04.) Reason: readers arrive with questions, and a command teaches chat for what a control
  already does. Evidence: research recommendation 8; VizAbility in research, "Blind readers".

## Changes and approvals

- **Reversible changes apply at once; only the element's built-in limits hold a batch.**
  (2026-11-04.) Reason: approving everything trains reflex approval. Evidence: research
  recommendation 3; the element's defaults, `approvals: "none"` with `gate` on.
- **Approval cards are worded from `gate` and `preview`, with verb buttons. Only `irreversible` says
  Undo cannot reach it.** (2026-11-04.) Reason: a `large` removal is one undo step, so a card saying
  otherwise is false. Evidence: `ToolExecutor.ts` lines 603-622; research "Patterns to avoid", prompts
  showing arguments rather than effect.
- **The waiting section is one hairline section pinned above the composer, capped at 40% of panel
  height, and focus never jumps to it.** (2026-11-04.) Reason: a request cannot scroll away, and
  Shift+Tab reaches it. Evidence: research recommendation 9.
- **While a request waits, its verb is the one primary button and Send is quiet. No red.**
  (2026-11-04.) Reason: one primary action; danger is error ink only. Evidence: `visual-language.md`.
- **Undo is offered on the newest step only, read from `session.history.next` and
  `provenance.message`; no `undoAiMessage`.** (2026-11-04.) Reason: the history is linear, so Undo on
  an old turn would imply skipping the reader's later edits, and the read already exists. Evidence:
  `session/types.ts` history `next`; `AiController.ts` `revertMessage`.
- **One notice per turn, shown only with the panel closed.** (2026-11-04.) Reason: two Undos on screen
  repeat themselves over the canvas. Evidence: the furniture limit in `visual-language.md`.
- **A waiting request while away gets a neutral rail dot and a lasting notice with Open.**
  (2026-11-04.) Reason: a 6-second notice is no lasting route, and a dot alone is easy to miss.
  Evidence: `store.ts` `Notice`, where only an error stays.

## Scope

- **The scope line always states what a message is about. The x is drawn only because the element
  binds scope.** (2026-11-04.) Reason: tools read the selection anyway, so an unbound x proves nothing
  and a capped id list makes "42 nodes" over-promise. Evidence: `voice/pointing.ts`, `FACT_IDS_CAP` of
  20 in `tools/prompt.ts`; research recommendation 5.

## Setup and privacy

- **The key has one home: an AI provider section in Settings. No model dropdown in the composer.**
  (2026-11-04.) Reason: one home per feature. The model label is text that opens the section, and it
  stays visible because the reader pays. Evidence: research, "Model choice"; `output-homes.md`.
- **A key stays for the tab unless the reader turns on Remember, which says it is not encrypted;
  Forget key removes it.** (2026-11-04.) Reason: research lean, and both survive the fresh element per
  project. Evidence: research, "Local key storage"; `ApiKeyManager.ts`.
- **The no-provider screen says what the assistant does first, then offers AI provider... alone. No
  Quick actions door, no form, no composer.** (2026-11-04.) Reason: Quick actions is a door to what is
  already on screen, and a form first is the worst first screen. Evidence: research recommendation 8.
- **The panel branches on the catalog's `requiresKey`, so the in-browser model arrives as a provider
  row and a download row; it is not drawn until it works.** (2026-11-04.) Reason: no unbuilt item is
  drawn, and no-key readers are a named differentiator. Evidence: `catalog/ai.ts`; director's design
  criteria.
- **With the flag on and a provider saved, the privacy chip reads "Sends to {provider}".**
  (2026-11-04.) Reason: "Local only" would be false, and a value never misstates what it describes.
  Evidence: `PrivacyChip.tsx`.

## Voice

- **The transcript lands in the composer and waits for Enter.** (2026-11-04.) Reason: sending voice
  unseen is a pattern to avoid, and a reader who cannot see a mistranscription has no other review.
  Evidence: research "Patterns to avoid".
- **Talk latches on a press and stops on release after a hold over 300 ms; Shift+Mod+Space does the
  same from anywhere. `holdKey` stays unset.** (2026-11-04.) Reason: readers who cannot hold get the
  same path with no setting; a click on a node takes focus off a held button; `bindHoldKey` listens
  on the graph's element while focus sits in the composer. Evidence: `AiManager.ts` `bindHoldKey`; WCAG
  2.1.4.

## Accessibility

- **Status news goes to the one polite region in `Workspace.tsx`; a failure is `role="alert"` on its
  row. No new live region.** (2026-11-04.) Reason: the app's failures already work this way, and two
  regions would speak twice. Evidence: `Workspace.tsx` line 242; `DataPage.tsx`, `WhichPicker.tsx`;
  research recommendation 9.
- **The answer body is never in a live region; focus stays in the composer through streaming.**
  (2026-11-04.) Evidence: research recommendation 9 and WCAG 4.1.3.
- **The model is told never to name a color or a position.** (2026-11-04.) Reason: such answers tell
  a blind reader nothing. Evidence: Kodandaram in research, "Blind readers".

## Left out

- **Out of the first version: in-browser model, web tools, in-page code, helpers and plans, live
  voice, spoken replies, links in prose, guess chips, Regenerate, token use, conversation export.**
  (2026-11-04.) Reason: each is optional in the element and the window works without it; small and
  coherent first, with room left for each. Evidence: `design.md` section 9.

## Settled by the first dry run (2026-11-05, build 8fa33aa786)

None of these reverses an entry above. Evidence: `dry-run-r1-1.md`.

- **A lone `true`, `false` or `null` in a rule is that value; `data.false` still names a column.**
  (2026-11-05.) Reason: a reader and a model both write it so, and read as a column it matches no node
  and every edge. Evidence: reproduced on `compileExpressionPredicate`; T91 A, `No matches for
data.trained == false.` on nine false rows.
- **A rule about a column one kind does not carry matches none of that kind.** (2026-11-05.) Reason:
  `query.ts` already promises that a path nothing answers matches nothing, and a chip that counts
  every edge is a false number. Evidence: reproduced; T93 B's 361, T93 A's 63.
- **A turn keeps the words the reader read: a reply beside a request, a reply beside a failure, and a
  question once answered.** (2026-11-05.) Reason: this applies "No turn folds" to words that were
  never saved; readers use them as memory, and on T95 the sentence lost can be the only caveat.
  Evidence: T92 A, T93 A, T93 B, T95 A.
- **Send again goes with what the scope line says now, not the failed message's scope.** (2026-11-05.)
  Reason: the scope line always states what a message is about, so a resend must obey it. Evidence:
  T91 B and T93 B, a selection over nothing under a line reading Whole graph.
- **The x on the scope line lasts for one message and clears nothing.** (2026-11-05.) Reason: it
  unbinds the message; the selection stays, and the line offers Use selection. A complaint that it
  does not last or does not clear is classed no change. Evidence: `design.md`, section on the scope
  line ("The x lasts for one message, or until the selection changes").
- **A selection is not a change to the graph, so it does not hide a turn's chip row; the row is the
  last result that found something; a selection of nothing draws no line.** (2026-11-05.) Reason: this
  narrows "a turn that changed the graph shows it in the change line" to what it was for. A selection
  adds no undo step and is not saved. A turn with a real change keeps its line alone. Evidence:
  T92 B success path; `tools/families/select.ts`.
- **A grouping run's count is all its groups; the list below it may stop at ten and says so.**
  (2026-11-05.) Reason: a value never misstates what it describes. Evidence: T93 B, Groups 10 beside
  Components 26.
- **What the Assistant exports is saved as a file.** (2026-11-05.) Reason: the element's event hands
  the document to the application, which must take it. Evidence: T95 A; `AiExportReadyEvent`.
- **A conversation reopened reads Undone for every message whose steps no longer stand.**
  (2026-11-05.) Reason: Undo works with any conversation showing, so the mark cannot depend on which
  one was open. Evidence: T94 B.
- **With the flag on and a provider saved, Settings' Privacy names the Assistant and the provider.**
  (2026-11-05.) Reason: "a value never misstates what it describes", the same reason as the privacy
  chip. Off, it does not change. Evidence: T90 A, T90 B.
- **The key card is an overlay: it may cover a node, and the canvas is not reframed around it.**
  (2026-11-05.) Reason: framing uses the canvas alone; the panel entry above names the same rule.
  `answers.md` rates a count of 8 from the drawing as decided by the build. Evidence: T91 A, T94 A.
- **Kept for the first round by the answer key: the refused key reading as a connection failure, the
  `name` starter, no shape check on a Google key, an analysis asked as a question repainting the
  network, and a selection surviving Undo.** (2026-11-05.) Reason: each is what a task measures or was
  ruled to wait for the round. Fix after it. Evidence: `answers.md`, "Seen while writing this key" and
  T90's route.
- **A message taken back by its own rollback stays the design: a failed write that nothing fixed
  undoes the message's writes.** (2026-11-05.) Reason: the fault on T92 A is the failing call, not the
  rule. Evidence: `design/ai/assistant-coverage-design.md` 4.3.
- **An answer goes on with the message it answers, so its turn and the question's turn share one
  undo step.** (2026-11-05.) Reason: one step per message. Two Undo buttons for that step are backlog,
  not a wrong step. Evidence: `design/ai/assistant-coverage-design.md` 4.3; T95 A.

## Settled by the second dry run (2026-11-05, build 3549e11129)

None of these reverses an entry above. Evidence: `dry-run-r1-2.md`.

- **A message is limited to its selection only while that selection holds something. Once it is empty
  the message is about the whole graph for the rest of its run, an answer included, and a later
  select does not bring the old ids back.** (2026-11-05.) Reason: the scope line always states what a
  message is about, and it reads Whole graph the moment the selection empties, so the reads must too.
  Refusing the model's clear was rejected: a reader may ask for it, and the offered "Apply to the
  entire graph" would stay dead. While the selection holds anything, every target stays limited to
  it. Evidence: T91 B touched-27, T92 B touched-31, T92 A touched-33; `settleTarget` in `fields.ts`.
- **What the Assistant exports is what the message is about: a target the call names, else the bound
  selection, else the whole graph. A format that cannot narrow refuses a narrowed call.** (2026-11-05.)
  Reason: a saved file that holds more than the screen says is the worst place for a false line, and
  on T95 A it held every phone number. Evidence: T95 A detour-2 and touched-39 downloads.
- **The chip row stays the turn's last result that found something; the model is told to make that
  read the one its reply counts.** (2026-11-05.) Reason: a chip may not be matched to prose, since a
  model's prose never becomes one, so the order of the reads is the honest lever. A row of several
  chips was rejected: chips carry no label, and it would leave Show in table with no one target.
  Evidence: T92 A touched-13 and success.

## Settled by the dry run of build 48879618c4 (2026-11-05)

None of these reverses an entry above. Evidence: `dry-run-r1-2.md`.

- **What the reader approved stops counting. The gate's running totals restart after an approved
  batch, so a later batch is held only for what it does itself, and its card counts only that.**
  (2026-11-05.) Reason: a request describes what has not happened yet. Held on the totals, a read
  after Remove raised 'Remove 82 nodes and 63 edges?' over a network already at 249, and Keep them drew
  'Declined. Nothing changed.' beside a removal that stands. Letting the rest of the message through
  unheld was rejected: a second large removal the reader never saw must still be asked. Evidence:
  T93 B keyboard and second-request-3; `largePreview` in `ToolExecutor.ts`.
- **A message about the whole graph after one about a selection reads afresh: the model is told its
  earlier answers and conditions were limited, and adds no condition the reader did not ask for.**
  (2026-11-05.) Reason: the scope line always states what a message is about, and the x is its remedy,
  so the remedy must work. Taking earlier turns out of what is sent was rejected: 'those' needs them.
  The x itself is unchanged. Evidence: T92 A success, touched-16 and keyboard, 3 of 3 walks on six.

## Settled by the study's second round (2026-11-05, build 3b2a7f0649)

None of these reverses an entry above; the third and sixth close what "Kept for the first round" left
to fix after it. Evidence: `rounds/round-2/insights.md`, `rounds/round-2/decisions.md`.

- **A painting run says so on its own change line, "Computed Closeness for 24 nodes, colored by it". It gets
  no second row, and the model's result carries the same fact.** (2026-11-05.) Reason: a line must be true
  without the prose, and a repaint under "Computed" does not exist for a reader who cannot see the
  drawing. A Colored row was rejected: one effect per channel stacks rows on turns that hold three lines,
  and `source` prints a result path raw. Evidence: `sessions/r2-s02/29.png`, `sessions/r2-s10/05.png`;
  `prompt.ts` asks the model to report painted counts that `summarizeRun` never gave it.
- **The composer's placeholder follows the scope: "Ask about this selection" while a selection binds the
  message.** (2026-11-05.) Reason: the scope line always states what a message is about, so the field
  under it may not say otherwise. This amends design 6.1. Evidence: `sessions/r2-s05/05.png`.
- **A failure with no status, on a provider that needs a key, names both causes and offers Send again and
  AI provider... together.** (2026-11-05.) Reason: a browser hides the 401, so the app cannot know which
  it was, and a named cause with no door is a notice. Send again stays for a dropped network. Evidence:
  both skeptics' probes of `api.openai.com`; `sessions/r2-s01/18.png`.
- **The Assistant's lines use the key's name for a measure, by id.** (2026-11-05.) Reason: glossary section 2,
  rule 1, and the `plainName` rule in `CLAUDE.md`, which lets an application replace a name by id. The
  catalog does not change. Evidence: `sessions/r2-s01/18.png`, `sessions/r2-s10/05.png`.
- **Show in table selects the rows and opens the dock narrowed to them, with a removable chip.** (2026-11-05.)
  Reason: on a large file a selection alone leaves the rows out of view. This amends design 5.3's row
  and keeps its selection. Evidence: `repro/r2-s06/walk/04.png`.
- **The kept "selection surviving Undo" does not reach a rollback. A message taken back leaves the selection
  it found and no lit Redo; a reader's own Undo does not change.** (2026-11-05.) Reason: a rollback means
  the message did not happen, while an Undo is the reader's act, and selection is not undoable. Evidence:
  `rounds/round-1/insights.md`, finding 7.
- **The x outlives closing the panel: it lasts one message or until the selection changes, and closing is
  neither.** (2026-11-05.) Reason: the entry above and design 5.2 say so, and the build forgot the x only
  because nothing watched the selection once the panel unmounted. Evidence: `rounds/round-1/expert/a11y.md`,
  finding 8.
- **Esc on the panel, outside the composer, leaves the selection, as does an Esc that closes a dialog.**
  (2026-11-05.) Reason: "Esc closes the innermost thing first", and selection is the next message's scope
  with no undo. Evidence: `rounds/round-1/expert/a11y.md`, finding 7; `rejected-fixes.md`.

## Settled by the owner's report on the chat switcher (2026-11-06)

Evidence: the owner's report, "I click on the drop-down for assistant and it only shows my first query. Oh
wait, that's a chat and I can have multiple chats. That wasn't clear. And there is no way to rename my
chats." Cause, read in the code: once a chat has a message the header reads "Assistant", the list has no
heading, count or current mark, and graphty-element keeps no name for a conversation.

- **The reader's word is "chat", not "conversation".** (2026-11-06.) Reason: the owner's own word, and the
  word of ChatGPT, Claude.ai, Gemini, Copilot Chat, Cursor and Notion AI. Only the app's words change;
  graphty-element's names (`listAiConversations` and the rest) keep "conversation". This amends design
  4.11 and the 6.1 words table.
- **The header button always names the open chat: its name, else the reader's first words, else "New
  chat". It never reads "Assistant".** (2026-11-06.) Tooltip "Chats", accessible name "Chats, {title}".
  Open, its label is "Chats {N}", N counting the rows shown. No count and no glyph at rest. Reason: a
  button that names the chat reads as a chat picker; a bare number at rest has no unit.
- **The list stays in place of the log (design 4.11). One row per chat: a full-width button that opens
  it, a short date, and an always-visible "..." menu with Rename (F2) and Delete.** The open chat carries a
  check and `aria-current="true"`; an open chat not yet saved shows as its own checked "New chat" row.
  Reason: the Data place's SourceRow pattern, copied, not a new control; Open and Delete as row buttons
  read as a message history. A floating popover was rejected: rename and the delete confirm need a field
  and focus that a menu breaks.
- **Rename is the shared RenameInput, lifted from SourceRow, reached by the row menu or F2 on a focused
  row, and nowhere else.** Enter or leaving saves, Esc cancels without closing the list, an empty name
  clears back to the first words. Double-click and header rename were rejected: a click there opens the
  chat or toggles the list first.
- **graphty-element keeps the name: `renameAiConversation(id, name | null)`, `name` on the summary and the
  snapshot, and `firstWords` on the snapshot.** Reason: the app may not store names or rescan messages
  (CLAUDE.md, the app must not work around graphty-element). Additive, `@experimental`. The optional
  `name` joins format v1 only while v1 is unreleased; after that it is version 2.
- **Default titles are the reader's own first words. No model-written titles.** Reason: an extra paid,
  slow call per chat (the owner already reports the Assistant slow), poor on in-browser models.
- **Rejected as more than the report needs:** a second New chat button, a new-chat hotkey (Shift+Mod+O
  is Chrome's bookmark manager), a bare Delete key, a filter field, date groups, a pending dot, roving
  focus. "+" in the header stays the one door; the element already saves a chat only with its first
  message, so empty chats cannot pile up.

## Overturned: the closed chat switcher shows the count (2026-11-06)

Evidence: the owner, after the switcher above was built, still found "it only shows my first query... that's
a chat and I can have multiple chats. That wasn't clear." The OpenAI, Anthropic and Google QA walks of the
same build agree: the closed header showed only the current title and a chevron, and "Chats" lived only in
the tooltip and the accessible name, which a reader who does not hover never meets. The walks also found the
open list's titles centered in their rows, so short and long titles started at different edges.

- **The closed header reads "Chats {N}" in the secondary ink, then the open chat's title, then the
  chevron.** (2026-11-06.) This overturns "No count and no glyph at rest" in the section above. N counts
  the chats, the unsaved open one included, so the unit travels with the number and the bare-number
  objection no longer holds. Open, the header stays "Chats {N}" alone. Accessible name "Chats {N},
  {title}"; tooltip the full title, since the title truncates. Reason: the plural word and its count say
  there are several chats without opening anything; a count badge was rejected as a bare number again.
- **Every row's title starts at one left edge.** The row button is full width with its content at the
  start, and the check's slot keeps its width when a long title squeezes the row. Reason: centered titles
  read as a menu of unrelated labels, not a list of one kind of thing; it was a defect, not a choice.
