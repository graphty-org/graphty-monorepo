# Voice chips

Say a command and see it as a row of chips you can fix one word at a time.

## Using it

- Tick "Arm the microphone" on the landing page before Enter VR. Unarmed, the switch in the gear
  panel is grayed with the reason; arming switches on the preset's voice at once.
- Talk: hold X on the off-hand controller, or hold the "Hold to talk" chip (ray or poke). The row
  sits in front of the space above the graph.
- Words show as chips: gray while the engine may still change them, solid once final. A word that
  fits nowhere is a red chip ending in "?". Run (green) executes; it is dim until every chip is
  filled.
- Poke a chip: the grid above offers its three best alternatives (bright) and then the rest of its
  slot's vocabulary. Poke one to put it in. Clear empties the sentence.
- Without speaking at all: Clear, poke the "?" chip, choose a verb, fill the "?" slots, Run.
- Sentences: `color|size <these|all|node> by <result>`, `run <result>`, `select|hide|show
<these|all|node>`, `grow <node> <n> hops`, `keep <result> at least|at most <number>`, `undo`,
  `save`. "These" and "this" mean the selection, or the node the dominant hand pointed at when
  talking began.
- Setting (gear panel): Speech engine, auto, web-speech, system-keyboard or off.

## Engines

- **Galaxy XR:** the Web Speech API (Chrome's `webkitSpeechRecognition`, cloud) through
  `scene/speech.ts`, one utterance per press.
- **Quest 3:** Quest Browser has no Web Speech API, so talking opens the system keyboard
  (`scene/system-keyboard.ts`). A pinch or trigger on the mic chip opens it (the keyboard is armed
  while a ray is on the chip, because it must open inside that press's select event); after X it
  opens on the next trigger. Press its microphone key, speak, close it. Its words are gray until it
  closes.

## What it reuses

- `fastest-levenshtein` (MIT) and `double-metaphone` (MIT) for misheard words ("colour", "page
  rank", "strossi"): `matcher.ts`.
- The framework's speech seams `scene/speech.ts` and `scene/system-keyboard.ts`.
- The start and end reasons of graphty-element's `VoiceInputAdapter`
  (`graphty-element/src/ai/input/VoiceInputAdapter.ts`), copied as a shape because the element does
  not export it.
- The template idea of `annyang`; the grammar itself (`grammar.ts`) is our own, about 300 lines.

## Logged (remote logger, message prefix `voice.`)

`engine.start` (engine, what started it, session visibility), `engine.keyboard-open`,
`engine.end` (reason: user, final, error with its code, keyboard-closed, cancelled; duration;
visibility), `engine.unavailable`, `visibility` and `session-ended-while-listening` (while
listening), `heard`, `chips`, `alternatives`, `choose`, `run`, `clear`, `press-cancelled`. Every
command it runs is a `command` entry with technique `voice`.

## Known gaps, and what we would fix or replace later

- **First owner test on Galaxy XR:** whether starting recognition blurs or ends the immersive
  session. Only the device can answer; the log has `voice.visibility` and `voice.engine.end` with
  the visibility state. If a blur cancels the X press within 200 ms, listening carries on until the
  recognizer ends by itself.
- **On-device speech on Quest (deferred):** `@moonshine-ai/moonshine-wasm` (MIT, streaming, interim
  text, `setKeyterms` to bias toward node and result names) covers about 90 percent of this on both
  headsets, offline. Not added yet because it needs COOP/COEP headers on every response, a model
  download (self-hosted Tiny Streaming), and its CPU cost while rendering on Quest 3 is unmeasured.
  It would replace the system keyboard route and give Quest gray interim chips. The grammar's
  vocabulary would feed `setKeyterms`.
- `scene/speech.ts` runs one utterance (`continuous` false) and reports final and interim as one
  string, so on Galaxy XR all words are gray until the recognizer ends, a pause ends the listen
  early, and a recognizer that never fires `end` would leave the engine listening. Fix there:
  continuous while held, split final from interim, a grace timer after stop.
- `color` and `size` apply to every node: the state has one color-by and one size-by, so the
  target chip is parsed and shown but not used.
- Node vocabularies are long on the dense graph: the grid shows the first 20 alternatives only.
- Numbers: digits, zero to ten, and "point one"; no "twenty-five" or "a half".
- The system keyboard seam has one arm slot: arming it for the mic chip replaces an arm another
  technique (text entry's dictation key) made, until that technique arms it again.
- Galaxy XR's real hand profile is not emulated (IWER reports Quest hands); the hand path is
  checked with the Quest profile's hands.
- The commands should eventually be graphty-element's own (`ai/commands`), shared with its AI path,
  instead of the sandbox's command layer.
