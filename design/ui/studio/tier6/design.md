# The Assistant in the graphty app

The graphty app draws a graph and lets a reader style, lay out and analyze it. This document
designs the AI assistant inside that app: a chat a reader opens from the left rail, asks about the
graph, and tells to change it. graphty-element already holds the whole assistant (providers, tools,
approvals, undo, voice, saved conversations). The app today has no assistant screen at all.

Status: design, 2026-11-04. It ships behind a feature flag. With the flag off, nothing a reader
sees changes. Binding decisions and their evidence are in `decided.md` beside this file.
"Research" below means `design/ai/assistant-chat-research.md`, cited by recommendation number.

"Mod" means Ctrl, or Cmd on a Mac. The app shows whichever applies.

## 1. What it is

The Assistant is a rail place, like Graph, Data and Notes. Pressing its rail button swaps the left
panel to a conversation. The canvas and the inspector stay where they are, nothing floats over the
drawing, and the frame gains no column.

A reader types or says what they want. The reply comes in three visibly different kinds of content,
because the reader has to know which parts to doubt:

- **Plain text** is the model's own reading.
- **A chip** is a fact a tool computed. It points at real nodes or edges. Hovering it lights them
  up on the canvas; clicking it selects them.
- **A change line** says what happened to the graph, in the words of a rule and a count, with Undo.

A change that Undo can take back happens at once. Only work that is large, slow, replaces the graph
or cannot be undone waits for the reader, in one section pinned above the composer.

## 2. Why this design

Three shapes were designed and judged: a panel in the rail, the same panel with a reply built
around chips and canvas highlights, and a movable window over the canvas. The panel in the rail
wins, with the chip language and the review of voice transcripts taken from the other two.

**Why a panel and not a window.**

- It is what the field ships for this job: Figma, Power BI, Hex, Tableau and Canva all dock
  (research, recommendation 8). The evidence for docking is weak, but nothing argues for floating.
- A window opened at 360 x 520 covers 25% of the canvas at 1440 x 900, past the visual language's
  limit of a fifth for everything floating over the canvas. At 900 x 700 it sits over the approved
  inspector, which also fails WCAG 2.4.11 for focus left in the inspector.
- Camera framing uses the canvas size alone (owner rule), so a node the assistant names could land
  under a window. A reader would then check the wrong picture. Checking is the point of the design
  (research, recommendation 1), so that is the worst failure of the three.
- The canvas stays light in dark mode (owner rule), so a dark window on it is the loudest thing on
  screen.
- A window needs a new shared surface in Figma-locked compact-mantine, plus drag, resize and a Move
  menu. The panel needs none of it: `.ws-left` is already in the F6 ring and `ResizeHandle` already
  has arrow keys.

**What the panel costs.** The layer list is out of view while chatting, because Graph and the
Assistant share the left panel. Open layer sends the reader to the real editor in the inspector,
which keeps the chat open, but it shows one layer and not the stack's order. This is the first thing
to test with readers (section 12).

**Why chips are the reply language.** Cheap checking is what reduces overreliance (research,
recommendation 1), and polish is not proof (recommendation 2). A chip is a check that costs one
hover. Only tool results may be chips. A model's prose never becomes a chip, because a chip means
"computed", and lighting up nodes the model merely named would lend its claims that authority.

## 3. Where it sits

### 3.1 The rail button

| Fact              | Value                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| Label             | Assistant, as a visible caption under the glyph                                     |
| Glyph             | `AiSparkles` (one large, two small stars), as `GLYPHS.assistant`, size 20, rail ink |
| Place in the rail | Graph, Data, Assistant, Notes; Settings stays at the foot                           |
| Key               | Mod+I, in the button's tooltip                                                      |
| Disabled          | never                                                                               |

The caption measures 39.41 px in the app's font; the rail's caption box is 40 px, so it fits with
no shared-component change. `GLYPHS.glow` moved from `Sparkles` to `Lamp`, so the sparkle means
only the Assistant.

### 3.2 The flag

The experiment id is `assistant`, following `design/ci/channels-pipeline/features.md`.

- It is a row in graphty-element's `FEATURES`, because this work adds to the element. Every addition
  carries `@experimental assistant`, and anything the experiment adds that a run would dispatch is
  behind `session.features.has("assistant")`.
- The app shows its half when `element.enabledFeatures.enabled` contains the id, read from the
  element and never computed in the app.
- A reader turns it on with `?features=assistant`. `canary.json` and `nightly.json` list it once the
  branch lands, so the full run's On configuration tests what those readers get. `production.json`
  stays empty until the owner graduates it.
- Off means: no rail button, no command, no key, no Settings section, no loaded chunk, and the
  privacy chip unchanged. The rail keeps its current three places in their current positions.

### 3.3 Opening and closing

- **Open.** Click the rail button, or press Mod+I. Focus goes to the composer, or to the AI
  provider... button if no provider is set. The panel loads as its own chunk.
- **Mod+I has one rule.** It goes to the composer, opening the panel if needed. Pressed in the
  composer, it closes. So a reader can select on the canvas, press Mod+I and keep typing.
- **Close.** The panel's x (tooltip "Close Ctrl+I"), Mod+I in the composer, or the active rail
  button. Closing returns to the place or page the reader came from, and focus to where it was, or
  to the rail button if that element is gone. Pressing another rail button goes there.
- **Closing never stops a run.** Section 4.10 says what reaches the reader while away.

### 3.4 Size

| Window     | Rail | Panel | Inspector | Canvas | Canvas with Graph open |
| ---------- | ---- | ----- | --------- | ------ | ---------------------- |
| 1440 x 900 | 57   | 280   | 240       | 863    | 903                    |
| 900 x 700  | 57   | 240   | 240       | 363    | 363                    |

- The panel's width is stored apart from `leftWidth`, so the Graph panel keeps its grid.
- Default: 280 px (the framework's width), or the left panel's current width in a window under
  1200 px wide. Giving the panel 280 at 900 x 700 would leave the canvas 323 px.
- The resize handle reaches 480, capped so the canvas keeps 320.
- Below 640 CSS px wide, the panel fills the area right of the rail, as the Data page does, with the
  canvas and inspector hidden and inert until it closes. This is what makes 400% zoom work (WCAG
  1.4.10): a rail, panel and inspector already take 577 px. There, chips still select, but the peek
  has no canvas to show.

## 4. States

### 4.1 No provider

The first time, a reader has no key. The screen says what the thing does before what it needs, and
offers one door. There is no composer, because a dead control teaches nothing.

```
| Assistant                         x |
|-------------------------------------|
| Ask about this graph or change it.  |
| It can be wrong.                    |
|                                     |
| [ AI provider... ]                  |
| Needs a key from an AI provider.    |
| Nothing is sent until you add one.  |
```

The branch reads the catalog's `requiresKey`, not "has a key". A provider that needs none skips this
screen. That is the room left for the in-browser model: it arrives as one more provider row and one
download row in this slot, with no redesign, and it is not drawn until it works.

### 4.2 The provider section in Settings

AI provider... opens Settings on a new section, "AI provider", the capability's one home. It is
also in Quick actions. Save closes Settings and focus lands in the composer.

```
| AI provider                                          |
| Provider   [ Google                              v ] |
| Model      [ Gemini 3.1 Pro                      v ] |
| API key    [ ********************                  ] |
|            Get a key from Google                     |
| [ ] Remember on this device                          |
|     Stored in this browser, not encrypted.           |
|                                                      |
| Your messages and what the assistant reads from the  |
| graph (column names, node ids, labels and values) go |
| straight to Google. Google charges your key.         |
| Conversations stay in this browser, not encrypted.   |
|                                                      |
| [ Save ]  [ Forget key ]  [ Delete all conversations ]|
```

- Provider and Model come from `AI_PROVIDER_DESCRIPTORS`, leaving out `testOnly` entries, models
  with `supportsTools: false`, and `webllm` until it works.
- `checkApiKeyShape` gives one line under the field on blur or Save (section 6.3). A shape check is
  not a real check: a bad key shows as `AI_KEY_REJECTED` on the first message.
- A key is kept for this tab by default (`keyPersistence` with `storage: "sessionStorage"`).
  Remember moves it to `localStorage`. Both survive the fresh element each project opens.
- Forget key removes it from both, and the panel returns to 4.1.
- Delete all conversations confirms first, because it cannot be undone.
- "Get a key from {provider}" links to the provider's own key page, for readers who have never made
  one. The URLs are the app's, keyed by provider id.

### 4.3 Ready, empty conversation

```
| New conversation (v)          +   x |
|-------------------------------------|
| Ask about this graph or change it.  |
| It can be wrong.                    |
|                                     |
| Which nodes matter most?            |
| What groups does this graph have?   |
| Does department line up with the    |
| groups?                             |
|-------------------------------------|
| Whole graph  (o)77  (/)254          |
| Ask about this graph                |
| Gemini 3.1 Pro        [Talk] [Send] |
```

The three rows are starters. A starter fills the composer and never sends. They are questions,
because readers arrive with questions and a command like "Color by degree" teaches chat for a job a
direct control already does. The third uses the first categorical column in
`session.data.attributes()`; with none it reads "What stands out in this graph?". They are gone
after the first message. The can-be-wrong line appears here only: a disclaimer on every reply is a
pattern to avoid (research, "Patterns to avoid").

### 4.4 A reply

```
| You                                 |
| Which nodes bridge the clusters?    |
|                                     |
| Assistant                           |
| > 2 steps                           |
| TP53 and MDM2 carry most shortest   |
| paths between the two clusters.     |
| (o) 12 nodes     Show in table      |
```

- "You" and "Assistant" are small headings on one left edge. No bubbles, avatars or right-aligned
  messages: they cost width and box the content. A spoken message reads "You (spoken)".
- Order in a turn: steps, prose, then the chip row or the change line. Prose streams at the foot, so
  the settled facts arrive beside the composer, where the eye already is.
- **Steps** are collapsed. Expanded, each is one row with the tool's plain name, duration and any
  chip. Never arguments, never JSON (research, recommendation 7).
- **One chip row per turn at most**: the last result's node chip and edge chip. Earlier results'
  chips are in the expanded steps. A full transcript of tinted chips would compete with the drawing.
- **Show in table** selects those elements and opens the table dock. A list never squeezes into
  280 px, and every practitioner in the LinkQ study chose the table (research, "Two routes to
  checking").
- **An empty result** is a warning row with what was searched, not a chipless shrug: "No matches for
  degree > 50." (research, recommendation 2).

### 4.5 Working

```
| Assistant                           |
| > 1 step                            |
| Running PageRank                    |
|-------------------------------------|
| Whole graph  (o)77  (/)254          |
| Ask about this graph                |
| Gemini 3.1 Pro   [Talk] [Stop  Esc] |
```

- Send becomes Stop in place, with its key on the button. Esc in the composer stops, only while a
  run can be cancelled.
- The working line names real activity from `status.stage` and the running tool, and shows only
  after one second. `status.stageMessage` is English from the element and is never shown.
- Text streams as text, never HTML, into the turn's foot. The log follows only a reader who is at
  the bottom; anyone else gets a Jump to newest button.
- The reader can keep typing the next message during a run.
- Stop ends the turn with "Stopped. Changes taken back." ("Stopped." when it had changed nothing)
  and puts the sent text back in an empty composer. A partial take-back says what stayed.

### 4.6 A change

```
| Assistant                           |
| > 2 steps                           |
| The largest group centers on        |
| Valjean.                            |
| Colored (o)77 by group              |
| 3 hidden nodes not colored          |
| Open layer                   [Undo] |
```

- One line per effect, at most three, then "and {N} more", which opens the steps. Each line is the
  rule and the count (research, recommendation 4).
- **Open layer** or **Open run** writes `inspected` as `layer-row` or `run-row`: the real editor
  opens in the inspector and the chat stays. The chat links to the real control rather than
  replacing it (research, "Chat and direct manipulation").
- **Undo shows on the newest step only.** The history is linear, so an Undo on an old turn would
  imply skipping the reader's later edits. The app reads it: `session.history.next` is
  `{ kind: "undo", step }` with `step.provenance.message` equal to this message's id. Undo runs the
  shared undo.
- Once no step of the message remains applied, the row reads "Undone" and the conversation stays.
- Mod+Z works too, in the composer once it holds no edit of its own, by the app's existing rule.

### 4.7 Waiting on the reader: an approval

One section pinned above the composer, so a request cannot scroll away and Shift+Tab reaches it.
It is a hairline-separated section on the panel's background, not a box, capped at 40% of the
panel's height and scrolling inside.

```
| Remove (o)12 and (/)30?      1 of 2 |
| Undo can bring them back.           |
| [Remove]  [Change this]  [Keep them]|
|-------------------------------------|
| Whole graph  (o)77  (/)254          |
| Ask about this graph                |
| Gemini 3.1 Pro        [Talk] [Send] |
```

- **When.** The element's defaults: `approvals: "none"` with the built-in limits on. Style, layout
  and view changes apply at once. A large, slow, replacing, irreversible or network batch waits
  (research, recommendation 3).
- **Words state the effect, from `gate` and `preview`, never arguments** (section 6.5). Only the
  `irreversible` card says Undo cannot reach it; a `large` removal is one undo step like any other.
- **Buttons are verbs.** The primary is the brand button, and Send drops to quiet while a request
  waits, so one action is primary. No red: danger is error ink only, and an irreversible step says
  so in words.
- **Its chips peek** at what it would touch, as in 4.4.
- **Change this** declines and focuses the composer. **Sending a message** while a request waits
  supersedes it, and the turn says so.
- Focus never jumps to the section. The status line announces it.
- **A request that ends unanswered** leaves the section and its reason goes in the turn
  (`AI_APPROVAL_STALE`, section 6.4). `replayed` requests come back after a reload.

### 4.8 Waiting on the reader: a question

The same section. `choices` are Mantine radios, or checkboxes when `multiple`, with an Answer
button. The composer's placeholder becomes "Or type an answer", and typing always works: widgets
are never the only repair path (research, recommendation 6). `AI_ANSWER_INVALID` keeps it open with
one line.

### 4.9 Failed

```
| Assistant                           |
| Could not reach Google: the service |
| is unavailable.                     |
| Nothing changed.     [Send again]   |
```

- Inline at the turn, worded from codes only. `status.error.message` and `ExecutionResult.message`
  are English from the element and are never shown.
- Each failure says what failed and whether the graph changed, with one button: Send again, or
  AI provider... for setup codes. One failure offers both: `AI_PROVIDER_ERROR` with no `status`
  from a provider whose catalog entry has `requiresKey`, because a browser can hide a refused key
  behind a failed connection; the row reads "the connection failed or the key was refused" with
  Send again and AI provider... side by side. The sent text returns to an empty composer. The row is
  `role="alert"`, as the app's other inline failures are.
- An unknown code falls back on `success`, since the union is open.

### 4.10 Away from the panel

Runs continue while another place is open.

- **A request waits.** The rail glyph gets a neutral Mantine `Indicator` through the `icon` prop and
  the button gets an `aria-description`. The dot is the lasting route and has one meaning: waiting
  for you. A lasting notice also says "Waiting: remove 12 nodes" with Open, until it is answered or
  dismissed. This needs one new optional field on the app's `Notice`, since only an error stays
  today.
- **A change lands.** One notice per turn, the same words as the change line, with Undo. It shows
  only with the panel closed, so two Undos are never on screen.
- **An answer lands with no change.** A notice, "The assistant answered", with Open.

### 4.11 Chats

The header's left control names the open chat: the reader's name for it, else their first words,
else "New chat", truncated, with "Chats, {title}" as its name and tooltip. It never reads
"Assistant" and carries no count. It opens the list of chats in place of the log, with the composer
kept below and the header reading "Chats {N}"; Esc returns to the log and the composer. Rows are
newest first, each a button that opens the chat (its date read with it), a short date and an
always-shown "..." with Rename (F2) and Delete. The open chat's row has a check; a new chat before
its first message shows as a checked "New chat" row at the top. Opening the list focuses the open
chat's row. Rename, from the menu or F2 on the row, swaps the title for a field (Enter or leaving
saves, Esc cancels, empty returns to the first words); the name is saved with the chat by
`renameAiConversation`. Delete confirms on the row ("Delete this chat?", focus on Keep it), then
focus moves to the next row. "+" starts a new chat, saved with its first message. The list holds
this graph's chats (`listAiConversations()`); they are app state and never in the project.
`history: "browser"` is on, because a reload that loses the chat is worse than a stated local store.

### 4.12 Talking

```
| Color the nodes I point at          |  live transcript, in the composer
| Gemini 3.1 Pro [Stop talking] [Send]|
```

- The Talk button shows only where `getAiVoiceSupport()` allows input. Voice is never the only path.
- **Press and release** latches: listening runs until Talk is pressed again. **Press and hold** for
  over 300 ms stops on release. Enter and Space on the button act as a press. So a reader who cannot
  hold has the same path, and a screen reader's browse mode that turns Space into a click still
  works. No setting is needed; the app only calls `aiTalk(true)` and `aiTalk(false)`.
- **Shift+Mod+Space** does the same from anywhere, canvas and composer included, and opens the panel
  if needed. It is shown in Talk's tooltip. While listening, the canvas stays live, so a reader can
  point at nodes with the mouse and say "color these".
- **The transcript lands in the composer and waits for Enter.** Sending voice unseen is a pattern to
  avoid (research), and a reader who cannot see a mistranscription gets no other review. Focus moves
  to the composer when listening ends.
- The element's bare-key `holdKey` stays unset. It listens on the graph's element, while focus
  normally sits in the composer, and a bare letter would need the single-key switch.
- First use names where the audio goes, once.

## 5. Behavior

### 5.1 The composer

- A Mantine `Textarea`, autosized from one to six rows, pinned at the panel's foot. Only the log
  scrolls.
- Enter sends. Shift+Enter makes a new line. Send's tooltip shows both.
- The draft lives in the workspace store, like the note draft, because `PanelBoundary` remounts by
  place. Opening another project clears it.
- Send and Stop use `aria-disabled` rather than `disabled`, so focus is not dropped when Stop turns
  back into Send on an empty composer.
- The model label is text that opens the provider section. It is not a second home for the setting,
  so there is no dropdown here. The reader pays, so it stays visible (research, "Model choice").

### 5.2 Scope

The line above the composer always states what the message is about, live while typing, because
people state the command and then point (research, recommendation 5).

| Selection           | Filter | Line                                   |
| ------------------- | ------ | -------------------------------------- |
| none                | none   | Whole graph (o)77 (/)254               |
| none                | on     | Whole graph (o)77 (/)254, 12 hidden    |
| 42 nodes            | any    | Selection (o)42 x                      |
| 42 nodes, x pressed | any    | Whole graph (o)77 (/)254 Use selection |

The x is only drawn because the element binds it: `aiCommand` takes a `scope` (section 11). Without
that, tools read the selection anyway and the x would prove nothing. The x lasts for one message,
or until the selection changes. Clicking the canvas mid-sentence updates the line and keeps the
draft.

### 5.3 Checking

| Act                   | What happens                                    | Changes the next message's scope |
| --------------------- | ----------------------------------------------- | -------------------------------- |
| Hover or focus a chip | a neutral halo on those elements; no undo step  | no                               |
| Click a chip          | they become the selection                       | yes, and the scope line shows it |
| Show in table         | they become the selection; the table dock opens | yes                              |
| Open layer, Open run  | the real editor opens in the inspector          | no                               |

Peek exists because selection is not undoable, and a look must not change the question. A chip
whose elements have left the graph reads "Not in this graph" and is plain text. The chip's count is
live; its target is the rule that found them, not a stored list. The camera never moves.

### 5.4 What the model is told

The app passes instructions through a new `instructions` option: short answers, plain text with no
markdown, never name a color or a position, and ask when a wrong guess would cost the reader
(research, recommendations 2 and 6, and "Blind readers"). Models tend not to ask unprompted.

## 6. Every word on screen

The app owns all of these. Keys are this design's, under `assistant.`, and go in
`design/ui/framework/message-catalog.md`. American spelling, "edges" not "links", the word
Assistant, no apology, no praise. Sentences appear only where the job is conversation; everything
else is a row, a chip or a verb.

### 6.1 Panel and composer

| Where                                              | Words                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rail caption, panel title before a provider is set | Assistant                                                                                                                              |
| Panel region name                                  | Assistant                                                                                                                              |
| Header chat switch (closed)                        | {name} or {first words} or New chat; name "Chats, {title}"                                                                             |
| Header chat switch's tooltip; open                 | Chats, {title}; Chats {N}                                                                                                              |
| "+" tooltip                                        | New chat                                                                                                                               |
| x tooltip                                          | Close Ctrl+I                                                                                                                           |
| Intro                                              | Ask about this graph or change it. It can be wrong.                                                                                    |
| No-provider line                                   | Needs a key from an AI provider. Nothing is sent until you add one.                                                                    |
| No-provider button, command                        | AI provider...                                                                                                                         |
| Starters                                           | Which nodes matter most? / What groups does this graph have? / Does {column} line up with the groups? / What stands out in this graph? |
| Composer placeholder                               | Ask about this graph                                                                                                                   |
| Placeholder, a selection binds the message         | Ask about this selection                                                                                                               |
| Placeholder, question waiting                      | Or type an answer                                                                                                                      |
| Composer name                                      | Message the assistant                                                                                                                  |
| Send, its tooltip                                  | Send; Enter sends, Shift+Enter makes a new line                                                                                        |
| Stop                                               | Stop Esc                                                                                                                               |
| Talk, its tooltip, on                              | Talk; Talk Ctrl+Shift+Space; Stop talking                                                                                              |
| Model label's tooltip                              | Change provider or model                                                                                                               |
| Scope                                              | Whole graph; Selection; Use selection; {N} hidden                                                                                      |
| Scope x                                            | Ask about the whole graph                                                                                                              |
| Log name                                           | Chat                                                                                                                                   |
| Jump                                               | Jump to newest                                                                                                                         |
| Turn headings                                      | You; You (spoken); Assistant                                                                                                           |
| Steps                                              | {N} step, {N} steps                                                                                                                    |
| Chip names (spoken)                                | {N} nodes, select; {N} edges, select; {label}, node, select                                                                            |
| Gone chip                                          | Not in this graph                                                                                                                      |
| Row actions                                        | Show in table; Open layer; Open run; Undo; Undone                                                                                      |
| Chat list                                          | Chats; a row's "..." is "{title} menu": Rename F2, Delete; Delete this chat? Delete, Keep it; Chat name; Not renamed                   |
| Audio, first use                                   | Speech goes to your browser's maker. / Speech goes to {provider}.                                                                      |

### 6.2 Working line

| `stage`    | Words                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| processing | Sending to {provider}                                                         |
| generating | Writing                                                                       |
| executing  | Running {tool plain name}, or for an algorithm Running {algorithm plain name} |
| Listening  | Listening                                                                     |

### 6.3 Provider section

| Where                                    | Words                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section, rows                            | AI provider; Provider; Model; API key; Remember on this device                                                                                                |
| Remember's note                          | Stored in this browser, not encrypted.                                                                                                                        |
| Disclosure                               | Your messages and what the assistant reads from the graph (column names, node ids, labels and values) go straight to {provider}. {provider} charges your key. |
| History note                             | Chats stay in this browser, not encrypted.                                                                                                                    |
| Link                                     | Get a key from {provider}                                                                                                                                     |
| Buttons                                  | Save; Forget key; Delete all chats                                                                                                                            |
| Confirm                                  | Delete all chats? Delete all, Keep them                                                                                                                       |
| `E_KEY_EMPTY`                            | Enter a key.                                                                                                                                                  |
| `E_KEY_PREFIX`                           | {provider} keys start with {prefix}.                                                                                                                          |
| `E_KEY_TOO_SHORT`                        | This key is too short.                                                                                                                                        |
| Privacy chip, flag on and provider saved | Sends to {provider}; tooltip: Your messages and graph details go to {provider}. Opens AI provider                                                             |

With usage data also on, the chip's tooltip adds "Usage data is sent, content masked."

### 6.4 Result codes

"Graph line" means the turn also says "Nothing changed." or lists what stayed. Unknown codes use
Finished or Failed by `success`.

| Code                                                                         | Words                                                                | Button         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------- |
| `AI_COMPLETED`                                                               | (the reply)                                                          | --             |
| `AI_NO_RESPONSE`                                                             | No answer came back.                                                 | Send again     |
| `AI_NOT_ENABLED`, `AI_DISPOSED`                                              | The assistant is not connected.                                      | AI provider... |
| `AI_KEY_MISSING`                                                             | Add a key for {provider}.                                            | AI provider... |
| `AI_KEY_REJECTED`                                                            | {provider} refused the key.                                          | AI provider... |
| `AI_CONFIG_INVALID`                                                          | The AI provider settings cannot be used.                             | AI provider... |
| `AI_HOSTED_TOOL_UNSUPPORTED`                                                 | {provider} cannot use this tool, so the assistant worked without it. | --             |
| `AI_PROVIDER_ERROR` (`assistant.failed`)                                     | Could not reach {provider}: {cause}.                                 | Send again     |
| `AI_PROVIDER_PAUSED`                                                         | {provider} paused and did not finish.                                | Send again     |
| `AI_FAILED`, `AI_TOOL_THREW`, `AI_TOOL_UNKNOWN`, `AI_TOOL_INVALID_ARGUMENTS` | The assistant could not finish this step.                            | Send again     |
| `AI_TOOL_FAILED`                                                             | {tool plain name} failed.                                            | Send again     |
| `AI_CANCELLED`                                                               | Stopped. Changes taken back. ("Stopped." with no `steps`)            | --             |
| `AI_UNDONE`                                                                  | Undone while running. Changes taken back.                            | --             |
| `AI_ROLLBACK_PARTIAL`                                                        | Stopped. {steps} changes could not be taken back.                    | --             |
| `AI_APPROVAL_DENIED`                                                         | Declined. Nothing changed.                                           | --             |
| `AI_APPROVAL_STALE`, graph-changed                                           | Not run: the graph changed.                                          | --             |
| `AI_APPROVAL_STALE`, superseded                                              | Not run: you sent a new message.                                     | --             |
| `AI_APPROVAL_STALE`, expired                                                 | Not run: the request expired.                                        | --             |
| `AI_TOOL_DENIED_BY_POLICY`                                                   | Not allowed here. Nothing changed.                                   | --             |
| `AI_TOOL_NOT_RUN`                                                            | Not run.                                                             | --             |
| `AI_ANSWER_INVALID`                                                          | That is not one of the choices.                                      | --             |
| `AI_HISTORY_UNAVAILABLE`, `AI_STORAGE_FAILED`                                | This conversation is not being saved.                                | --             |
| `AI_HISTORY_NEWER_FORMAT`                                                    | Saved by a newer version of graphty, so it was left as it is.        | --             |

`{cause}` is worded from `params.status`: 401 or 403 "the key was refused", 429 "too many requests
or the spend limit was reached", 5xx "the service is unavailable", otherwise "error {status}". With
no status it is "the connection failed", or for a provider that `requiresKey` "the connection failed
or the key was refused", which also adds AI provider... beside Send again (section 4.9). A
provider's refusal can arrive mid-stream, so the partial answer stays above the row.

Voice, on one line under the composer, by `reason`: `permission-denied` "Allow the microphone to
talk."; `no-microphone` "No microphone found."; `insecure-context`, `no-recognition`,
`no-provider-transcription` "This browser cannot take speech here."; `recognition-network` "Speech
stopped: the connection dropped."; `no-key` "Speech needs a key."; any other "Speech is not
available."

### 6.5 Approval cards

| `gate`            | Title                                                      | Line                                           | Primary       | Decline         |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------- | ------------- | --------------- |
| `large`, removing | Remove {N} nodes and {M} edges?                            | Undo can bring them back.                      | Remove        | Keep them       |
| `large`, changing | Change {N} values?                                         | Undo can bring them back.                      | Change        | Keep them       |
| `replaces`        | Replace this graph's {N} nodes and {M} edges?              | --                                             | Replace       | Keep this graph |
| `irreversible`    | Remove {N} nodes and {M} edges?, or Run {tool plain name}? | Undo cannot bring this back.                   | Remove or Run | Keep them       |
| `slow`            | Run {algorithm}?                                           | About {N} seconds; or May run for a long time. | Run           | Skip            |
| `network`         | Load {url}?                                                | Reads a page outside graphty.                  | Load          | Skip            |
| any other         | Run {tool plain names}?                                    | --                                             | Allow         | Decline         |

"Change this" sits between them on every card. The count parts drop out when a count is zero.

### 6.6 Change lines

Worded from each effect's code and params (section 11). The channel word is the Style panel's own.

| Effect       | Words                                                        |
| ------------ | ------------------------------------------------------------ |
| style, fill  | Colored {N} nodes by {source}                                |
| style, size  | Sized {N} nodes by {source}                                  |
| style, other | Set {channel} on {N} nodes                                   |
| layout       | Arranged as {layout plain name}                              |
| filter       | Filtered to {kept} of {total} nodes                          |
| run          | Computed {algorithm} for {N} nodes                           |
| data         | Added or Removed {N} nodes and {M} edges; Changed {N} values |
| selection    | Selected {N} nodes                                           |
| view         | Moved the view                                               |
| any other    | Changed the graph                                            |
| excluded     | {H} hidden nodes not colored (or not changed)                |
| empty        | No matches for {searched}.                                   |

### 6.7 Status line

Spoken through the one polite status region; never shown.

| When                   | Words                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Sent and over a second | Working                                                     |
| Finished, no change    | Answer ready                                                |
| Finished with a change | Each change line, then Answer ready                         |
| Waiting                | Waiting for your approval: {title}; Waiting for your answer |
| Stopped                | The turn's stopped line                                     |
| Undo                   | Undone                                                      |
| Listening starts, ends | Listening; Transcript in the message box                    |

## 7. Keyboard and screen readers

**Keys.** All Mod keys fire while typing, by the app's existing `firesWhileTyping` rule.

| Key             | Where                            | Does                                          | Shown on                |
| --------------- | -------------------------------- | --------------------------------------------- | ----------------------- |
| Mod+I           | anywhere                         | goes to the composer; in the composer, closes | rail tooltip, x tooltip |
| Shift+Mod+Space | anywhere                         | starts or stops listening                     | Talk tooltip            |
| Enter           | composer                         | sends                                         | Send tooltip            |
| Shift+Enter     | composer                         | new line                                      | Send tooltip            |
| Esc             | composer, while running          | stops                                         | Stop button             |
| Esc             | composer, not running            | keeps the text (settled tier 3 rule)          | --                      |
| Esc             | conversation list                | back to the log                               | --                      |
| Mod+Z           | composer with no edit of its own | undoes the newest step                        | Undo tooltip            |

Check Mod+I and Shift+Mod+Space on the build in Chrome, Firefox, Safari and Edge: `commands.ts`
does not use them, but a browser could. `parseKey` needs to accept Space.

**Tab order.** Header, log, waiting section, composer. So Shift+Tab from the composer reaches the
request first, then the newest turn's controls.

**The log.** One focus stop (`tabindex="0"`, named Conversation) so arrows and Page keys scroll it,
with a 3:1 focus ring. Each turn's chips are one roving group: one Tab stop, arrows inside.

**F6.** `.ws-left` is already in the ring. Entering the panel lands in the composer.

**Screen readers.**

- The answer body is never in a live region. Status news goes to the one always-mounted polite
  region in `Workspace.tsx` (research, recommendation 9). No second region is added.
- Failures are `role="alert"` on the failed row, as elsewhere in the app, so no assertive region is
  added either.
- Each turn is a heading. Focus stays in the composer through streaming and tool steps.
- A chip's name carries the count, because the peek shows only on the canvas.
- Every graph change is in words, because the drawing tells a blind reader nothing.
- `NoticeView` has no live role, so a notice's words go through the status region once, not twice.

Nothing here has been run with a screen reader. Real NVDA and VoiceOver runs, 200% and 400% zoom and
the focus rings are owed on the build.

## 8. Look

- Everything is built from existing components: `RailButton`, Mantine `Textarea`, `Button`,
  `Indicator`, `Radio`, `Checkbox`, `ActionIcon`, `Tooltip`, compact-mantine `EntityChip`,
  `ResizeHandle` and `Toast`. `EntityChip` gets hover and focus from a wrapping element, so
  compact-mantine does not change at all.
- Nothing inside the panel is boxed. Sections are separated by hairlines on the panel's background.
- Two text sizes: body for prose and state lines, including Stopped and errors; small for headings,
  names and timestamps. State text never drops to the 9 px caption.
- No hue: chips keep their existing tint by kind, the dot is neutral, the peek halo is neutral. The
  one brand button on screen is Send, or the approval's verb while a request waits.
- Check on the build: chip rows wrapping at 240 px in both themes, whether the neutral peek reads on
  the light canvas under dark chrome, and chips against the 24 px minimum target (WCAG 2.5.8).

## 9. Left out of the first version

| Left out                                     | Why                                                                          | Room left                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| In-browser model                             | Deferred; a multi-gigabyte download needs a neutral status the element lacks | One provider row and one download row in 4.1                     |
| Web search and web pages                     | Off by default, paid per search, and a whole trust surface of its own        | A numbered source list under the prose, and the third reply mark |
| In-page code, helpers, plans                 | Off unless configured, and each needs words of its own                       | Fallback approval card; plans use step rows                      |
| Live voice, spoken replies, spoken approvals | The review path comes first; turn-by-turn input is what is untested          | One setting each in the provider section                         |
| Links in prose to named nodes                | A model's words must not look computed                                       | Chips stay tool results only                                     |
| Editable guess chips, Regenerate             | Retyping and Change this cover them; Send again covers failures              | --                                                               |
| Token use                                    | Needs a per-conversation fact to be honest                                   | The model label's tooltip                                        |
| Exporting a conversation                     | No reader task asks for it yet                                               | A row in the conversation list                                   |
| A model picker in the composer               | It would be a second home for a setting                                      | --                                                               |
| A what-is-sent read from the element         | The fixed sentence in 6.3 is true today                                      | Swap the sentence for the read                                   |

## 10. What stays as it is

The landing page, the Style panel, the inspector, the header and the workspace frame do not change.
No existing test or screenshot changes with the flag off. The canvas is never reframed for the
panel beyond the width it already loses to any left panel.

## 11. What is asked of graphty-element

All additive, all tagged `@experimental assistant`. Names and shapes are proposals the builder may
change. Each result stays `{ code, params }`, never English.

Needed for the first version:

1. **The `assistant` row in `FEATURES`**, with its tracking issue.
2. **Effects on a message.** `AiCallRecord` has no affected ids. Add `effects` to the assistant
   message: a list of `{ code, params, target? }`. Params carry counts, hidden count, layer or run
   id, channel and source. `target` is a selection target (a rule or a run reference, not an id
   list), so it stays exact at any graph size and is small to store. An empty read is an effect
   too, with what was searched.
3. **A target on approval previews.** `preview.ids` is capped at ten, so a card for twelve nodes
   cannot peek at them all.
4. **Peek.** `selection.hover` takes one node. Add a transient, neutral highlight for a target, with
   no undo step and no selection change.
5. **Scope on `aiCommand`.** `scope: "selection" | "graph"`, default absent as today. It binds the
   tools to the whole selection by reference, with no 20-id cap, or to the whole graph with the
   selection ignored, and the message reports the scope used, hidden elements included. Today
   `PointingRecord` cuts the selection to the cap, so a "42 nodes" chip would over-promise on the
   voice path.
6. **`plainName` for each tool** in the catalog, so step rows and working lines need no app word
   list and an extension tool supplies its own.
7. **Reviewing a transcript.** A voice option under which a finished press sends nothing, and the
   final `ai-voice-transcript` carries the text and the pointing, for the app to pass to
   `aiCommand(text, { via: "voice", pointing })`. Default: today's send on release.
8. **`instructions` on `AiManagerConfig`**, text added to the system prompt.
9. **First words on `AiConversationSummary`**, the reader's own text, so the list has titles. It is
   the reader's data, so it goes on the plain-string allowlist.
10. **`encryptionKey` optional on `KeyPersistenceConfig`.** `ApiKeyManager` already allows that, but
    the config type requires it, which would make the app invent a key.

Checked, and needing no change: undo per message (`session.history.next` and `provenance.message`
answer it, so no `undoAiMessage` is needed), and restoring the sent text (the app already holds what
it sent, so no `getLastInput`).

To confirm while building: `ElementHost` mounts a fresh element per project. The app calls
`enableAiControl` on each, the key returns from storage, and a run in progress ends with
`AI_DISPOSED`.

Later: neutral download status on `AiStatus` for the in-browser model, a what-is-sent read, and
per-conversation token use.

## 12. Test with readers

In order of what could sink the design:

1. Given a planted wrong count, who catches it, and how? Confidence is not the measure.
2. Does anyone miss the layer list while the chat is open?
3. Is an incorrectly empty result read as a real finding?
4. Is immediate apply with Undo comfortable, or do people want a preview for style and layout?
5. Do readers peek at chips, or trust that they exist?
6. Does a stray Esc that takes back a run's changes surprise anyone?
7. Is the approval section read, or approved by reflex?
8. Is the word Assistant, under this glyph, found first time?
9. Do starters teach what is possible, or get ignored?
10. Do readers understand what is sent to the provider, and does it change what they load?

## 13. Framework records to change with the build

- `state-matrix.md`, Assistant rail button: never disabled; the prompt is inside the panel.
- `interface-templates.md` 5: only tool results are chips, not every object named. Tab order gains
  the waiting section. The no-provider state is the panel's.
- `figma-crosswalk.md` ledger: the Agents sparkle glyph is adopted in rail ink; its purple stays
  rejected.
- `output-homes.md`, AI provider...: reached from the panel, Settings and Quick actions, not from a
  disabled button's reason line.
- `interface-specification.md` 1.3: the panel's width rule in section 3.4 here.
- `message-catalog.md`: the keys in section 6.
- `Rail.tsx`'s comment, which says Assistant is not drawn until built.
