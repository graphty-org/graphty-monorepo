# Text entry

An in-scene keyboard and a dictation key. It opens whenever another technique asks for a line of
text through `ctx.text.request({ label })` -- a note from a node menu, an inspector field, a
step-list note -- and resolves with the text (Enter or Done) or null (Cancel). It claims no input:
the keys are GUI buttons, reached by a controller ray and trigger, a hand ray and pinch, or a
fingertip poke.

- **Where it opens:** at arm's reach below the line of sight, not at the field that asked (which
  may be 75 cm away): 38 cm ahead of the head and 28 cm below the eyes, about 36 degrees below the
  gaze, facing the head and tilted up toward it. It is world-locked while open, so it never swims
  with the head. Both distances are settings (`reachM`, `dropM`).
- **Keys:** 2.4 cm pitch, 2.2 cm visible (the default VirtualKeyboard keys would be about 1 cm on a
  panel this size). Rows: digits and backspace, qwerty, asdf and Enter, shift and zxcv, a space bar,
  then Cancel and Done.
- **Dictation key**, beside the keyboard, chooses its route from the browser (setting `dictation`:
  auto, web-speech, system-keyboard, off):
    - **Web Speech** (Chrome on Galaxy XR): poke or point at it to listen, again to stop; interim
      words show in the field as they arrive; the final words are added after the field's text.
    - **Quest's system keyboard** (Quest Browser has no Web Speech): pinch or trigger at the key.
      The press's XR `select` event focuses a hidden DOM input, and Quest shows its own keyboard
      over the session, with its microphone key. What it types is added after the field's text
      (each showing of that keyboard starts empty and its first key would replace the whole value).
    - **Neither:** the key reads "No dictation" and logs why.
- **When the module is off**, the framework answers the same request with a row of canned chips
  ("check", "interesting", "?", Cancel), so a note is still possible (`src/framework/text-seam.ts`).

## What it reuses

| Piece                            | From                                                                                      | Covers                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Key buttons, rows, shift display | Babylon GUI `VirtualKeyboard` (`addKeysRow`, `applyShiftState`, `onKeyPressObservable`)   | All key drawing and hit testing                                                    |
| The field                        | Babylon GUI `InputText` with `disableMobilePrompt = true`                                 | Display; a touch focus can no longer call `window.prompt()` and freeze the session |
| Poke on a 2D GUI panel           | Babylon `WebXRNearInteraction` (sphere pick that fills in texture coordinates)            | Fingertip typing with no 3D key meshes                                             |
| Panel, buttons                   | `ctx.ui.panel` and its `button` and `text` (`src/scene/ui.ts`)                            | Near-pickable, ray-pickable plane                                                  |
| Speech                           | `src/scene/speech.ts`, a thin wrapper of the browser's Web Speech API                     | Galaxy XR dictation                                                                |
| Quest system keyboard            | `src/scene/system-keyboard.ts`, after Meta's WebXR keyboard page and spatial-kanban PR #4 | Quest typing and dictation                                                         |

The spike the plan asked for first -- does a fingertip poke reach `VirtualKeyboard` keys? -- passed
on the emulated headset (IWER): every key press in the dry run with hands arrived as a poke
(pointer type `xr-near`). So the fallback `TouchHolographicButton` key grid was not built.

## What we would fix or replace later

- `VirtualKeyboard.connect(inputText)` is not used: it types only while the field holds the GUI
  focus, and a pointer up anywhere off the panel (the other hand, a ray on the graph) blurs the
  field and hides the keyboard. Keys are applied here from `onKeyPressObservable` instead. A fix
  in Babylon (a connect mode that ignores focus) would remove that code.
- A poke presses as soon as the fingertip's 2 cm pick sphere reaches the panel; there is no press
  depth, no key travel and no debounce. If the owner reports doubled or early keys, add a press
  plane offset or move to `TouchHolographicButton` keys, which have real travel.
- No haptics or key sound yet beyond the framework's audio clicks.
- Single line only: `VirtualKeyboard` does not support `InputTextArea` well, and notes are short.
- No cursor movement, selection or word suggestions.
- The system keyboard opens only from a pinch or trigger (it needs the `select` event's user
  activation), never from a poke; a poke on the key says "Pinch me". It also freezes the scene's
  input while open (Quest behavior).
- Whether starting Web Speech blurs or ends the session on Galaxy XR is unverified until the owner
  tries it; every start and end is logged with its reason (`text-entry.dictation.start` and `.end`).
- Drum-style typing comes free and untuned: within 10 cm of the panel Babylon's near interaction
  (controller mode "centered in front") turns the controller's ray off and its tip pokes keys. The
  dry run types with controllers by ray from 28 cm away; the tip poke is untested and has no
  setting yet.
- The keyboard does not follow the hand once open; if the owner walks away it stays.

## Log entries

`text-entry.open` (label, dictation route and why), `text-entry.close` (how: done, cancel,
replaced or switched off; chars; time; key count; backspaces; presses by pointer type, `xr-near`
for pokes and `xr` for rays), `text-entry.dictation.start` / `.end` (engine, reason, word count),
`text-entry.systemKeyboard.open` (the event it opened in, the focused element) / `.close`.
The text itself is in the requester's command (`note`), not here.

## Dry run

`dryrun/checks/text-entry.mjs` (see its header for the command): on each profile, the keyboard opens
at reach below the gaze, every key is at least 2 cm, c a t Enter (poke with hands, ray and trigger
with controllers) logs `note` on the Medici with the text "cat", a stub recognizer's "three word
note" is added to the field, switching the module off while open hides it, `window.prompt` is never
called, and with the module off the canned chips make the note. On `quest3-hands` with the system
keyboard reported as supported, a pinch on the dictation key focuses the hidden input inside the
`select` event and its value is appended to the field.
