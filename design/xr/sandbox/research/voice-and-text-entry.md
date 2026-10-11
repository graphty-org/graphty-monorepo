# Voice and text entry in WebXR -- research for the XR technique sandbox

Version note added when this survey was filed: the sandbox worktree installs `@babylonjs/core`
8.56.2, not 8.43.0 as written below. Pin `@babylonjs/gui` and `@babylonjs/addons` to 8.56.2.

Scope: techniques (8) voice with an editable chip sentence and (11) text entry (in-scene
keyboard and dictation) on Meta Quest 3 (Quest Browser) and Samsung Galaxy XR (Chrome on
Android XR). Researched 2026-10-10. Facts marked UNVERIFIED have no first-hand source and
must be checked by the dry run's probe (section 6).

## 1. What each headset gives us for free

| Capability                                               | Quest 3, Quest Browser (152.x, Chromium 146 base)                                                                                                                                                                                                                                                                                                                                                                                                                                       | Galaxy XR, Chrome on Android XR                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Speech `SpeechRecognition`                           | Very likely NOT usable. MDN marks Quest Browser as "mirror of Chrome Android", which is an untested inference, while every first-hand report says it is missing or fails: Babylon forum (2023) "Meta Quest browser not supporting native web voice recognition api"; Meta forum threads; react-speech-recognition not working on Quest 2. Horizon OS has no Google recognition service for Chromium's Android backend to call. UNVERIFIED on browser 152 -- probe it                    | Very likely usable, cloud-backed. Chrome Android's `webkitSpeechRecognition` forwards audio to the system recognizer (Google), so it needs a network. On-device mode (`processLocally`, `available()`, `install()`) and `phrases` biasing are desktop-only; Chromium hard-codes `available()` to "unavailable" on Android. Behavior inside an immersive session UNVERIFIED |
| Microphone permission inside immersive                   | Chromium cannot show the permission prompt inside an immersive session: ask for the mic (getUserMedia) on the 2D page BEFORE "Enter VR" (VROS PR #8, tested on Quest)                                                                                                                                                                                                                                                                                                                   | Same rule assumed (Chromium); Android XR asks WebXR permissions one at a time per domain                                                                                                                                                                                                                                                                                   |
| System keyboard during an immersive session              | YES. `XRSession.isSystemKeyboardSupported` (Quest Browser 31.2+). Focusing a DOM `<input>` shows the system keyboard over the session; it has a microphone key for system voice dictation (online in the US, on-device opt-in elsewhere). Limits: each show is a new editing session and the first key press overwrites the whole value; no key events, read `input.value` / `oninput`; dismissal fires `blur`; the input must be in the DOM, positioned on-screen to avoid page scroll | NO. MDN: `isSystemKeyboardSupported` not in Chrome / Chrome Android. Android XR's web docs list no keyboard or DOM-overlay support for immersive sessions                                                                                                                                                                                                                  |
| WebGPU (for in-browser models)                           | Yes (since browser 32; WebGPU foveation added in 150.1)                                                                                                                                                                                                                                                                                                                                                                                                                                 | Yes (Chrome Android, Adreno) -- UNVERIFIED on the device                                                                                                                                                                                                                                                                                                                   |
| Cross-origin isolation (SharedArrayBuffer, wasm threads) | Chromium: COOP/COEP headers work, `credentialless` COEP works                                                                                                                                                                                                                                                                                                                                                                                                                           | Same                                                                                                                                                                                                                                                                                                                                                                       |

Consequences: voice on Quest needs either an in-page model or the system keyboard's
dictation key; voice on Galaxy XR can start with Web Speech. In-scene text entry needs our own
keyboard on Galaxy XR; on Quest the system keyboard is a second, cheaper option.

## 2. Speech-to-text candidates

### 2.1 Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)

- What: browser speech recognition; interim and final results, `continuous`, `lang`.
- License / maintenance: platform API. `SpeechGrammarList` is ignored by Chrome; `phrases`
  (contextual biasing, Chrome 142) is desktop-only.
- Coverage: Galaxy XR only (expected). Interim results map to grey chips, final to solid chips.
- Add / fix: push-to-talk start/stop, restart on `end` (Android ends after silence), error
  codes to the remote logger, mic permission before entering XR. Our own wrapper already exists:
  `graphty-element/src/ai/input/VoiceInputAdapter.ts` (Web Speech wrapper with start/end
  reasons) -- reuse its shape rather than writing another.
- Links: https://developer.mozilla.org/docs/Web/API/Web_Speech_API ,
  https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md

### 2.2 Moonshine Voice for the Web -- `@moonshine-ai/moonshine-wasm` (RECOMMENDED for Quest, and as a uniform path on both)

- What: on-device streaming STT in WebAssembly (ONNX Runtime minimal build + embedded
  Silero VAD). `MicTranscriber` with `onText` (interim) and `onLine` (final line); `Transcriber`
  for buffers; `AgentFlow` phrase matching (uses a 300M-parameter Gemma embedding model -- too
  heavy for us, skip); `TextToSpeech`.
- Key terms: `mic.setKeyterms([...])` biases recognition toward words the model would not
  produce -- replaceable between phrases while streaming. Exactly what node names like
  "Strozzi", "Guadagni" and attribute names need. Streaming architectures only.
- Models (English): Tiny Streaming 34M params, 12.0% WER; Small Streaming 123M, 7.8%;
  Medium Streaming 245M, 6.65%. Downloaded at runtime from download.moonshine.ai into Cache
  Storage, or self-hosted with `Transcriber.loadFromUrls`. Streaming design: work is done while
  the user talks, so end-of-phrase latency is low (vendor target under 200 ms on desktop; Pixel
  10a Medium Streaming about 400 ms).
- License / maintenance: MIT code; English models MIT. npm 0.1.5, published 2026-08-24, repo
  pushed actively. The npm `.wasm` is 13 MB.
- Coverage: ~90% of voice for both headsets, offline, no account.
- Add / fix: (a) the default build needs SharedArrayBuffer, so the sandbox server must send
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`
  (or `credentialless`); check that Babylon assets and the remote logger still load under
  COEP -- or build the single-thread fallback; (b) self-host the Tiny Streaming files so the
  headset does not depend on the CDN's CORS/CORP headers; (c) measure CPU cost on Quest 3 while
  rendering (it competes with the render loop -- watch for frame drops, the "jitter" the dry run
  must rule out); (d) VAD-driven lines vs push-to-talk: mute the track between talks rather than
  suspending the AudioContext (resuming needs a user gesture -- VROS lesson); (e) a load
  progress readout in-scene.
- Links: https://www.npmjs.com/package/@moonshine-ai/moonshine-wasm ,
  https://github.com/moonshine-ai/moonshine ,
  https://github.com/moonshine-ai/moonshine/blob/main/docs/models/available-models.md

### 2.3 transformers.js Whisper / Moonshine -- `@huggingface/transformers`

- What: ONNX models in the browser (WebGPU or wasm). `automatic-speech-recognition` pipeline
  with `onnx-community/whisper-tiny.en`, `whisper-base.en` (int8 encoder 23 MB + merged decoder
  54 MB), or `onnx-community/moonshine-tiny-ONNX` (the Xenova "Moonshine Web" demo).
- License / maintenance: Apache-2.0; 4.3.1 published 2026-10-06; very active.
- Coverage: ~70%. Whisper is not streaming: record to end of utterance (add a VAD such as
  `@ricky0123/vad-web`, ISC), then transcribe -- adds seconds of latency on wasm; WebGPU makes it
  workable but shares the GPU with the XR render loop. No live interim chips.
- Add / fix: VAD, chunking, a vocabulary bias (Whisper prompt support is limited in the JS port).
- Use: a second engine to compare against Moonshine, not the default.
- Links: https://github.com/huggingface/transformers.js ,
  https://github.com/xenova/whisper-web ,
  https://huggingface.co/onnx-community/whisper-base.en

### 2.4 whisper.cpp wasm (`stream.wasm`, `command.wasm`)

- What: the C++ Whisper port compiled with Emscripten; `command` example has a "guided mode"
  that classifies speech into one of a fixed list of commands.
- License / maintenance: MIT, very active (ggml-org). No official npm; small wrappers exist
  (`@timur00kh/whisper.wasm` 0.1.1, `whisper-wasm` 0.0.1, `@transcribe/transcriber`) -- thin and
  young.
- Coverage: ~50%. Guided mode is attractive for commands but is in the native example, not in
  the wasm demo; building it needs emsdk. Same non-streaming latency as 2.3.
- Use: skip unless Moonshine and transformers.js both fail.
- Links: https://github.com/ggml-org/whisper.cpp/tree/master/examples/command.wasm ,
  https://github.com/ggml-org/whisper.cpp/tree/master/examples/command

### 2.5 Vosk in the browser -- `vosk-browser`

- What: Kaldi/Vosk compiled to wasm in a Web Worker; `new model.KaldiRecognizer(sampleRate,
grammar)` takes a JSON word/phrase list that RESTRICTS the vocabulary (good for commands);
  partial and final results. Small English model about 40 MB.
- License / maintenance: Apache-2.0; npm 0.0.8 last published 2022-12; repo touched 2025-12,
  29 open issues. Effectively unmaintained.
- Coverage: ~60%. Grammar mode is a near fit for command chips, but dictation quality of the
  small model is poor and the package is stale.
- Use: skip; record as the fallback if a closed-vocabulary recognizer turns out to matter.
- Links: https://github.com/ccoreilly/vosk-browser , https://www.npmjs.com/package/vosk-browser

### 2.6 sherpa-onnx (wasm)

- What: next-gen Kaldi (k2-fsa) runtime: streaming zipformer ASR, keyword spotting, hotword
  biasing, VAD; wasm demos on Hugging Face Spaces.
- License / maintenance: Apache-2.0; very active (pushed 2026-10-09). The npm `sherpa-onnx`
  package targets Node; a browser build means copying a Space's files or building with emsdk.
- Coverage: ~70% with hotwords; packaging cost is the obstacle.
- Use: skip for now; the advanced path if Moonshine's key terms are not enough.
- Link: https://github.com/k2-fsa/sherpa-onnx

### 2.7 Picovoice Rhino (speech-to-intent) -- `@picovoice/rhino-web`

- What: on-device speech straight to `{intent, slots}` from a YAML grammar trained in the
  Picovoice Console.
- License: binding Apache-2.0, engine proprietary; needs an AccessKey; free tier up to 3 active
  users a month.
- Coverage: ~60%. Slots must be trained ahead of time, so node names from the loaded graph
  cannot be slots without retraining; a key in the page.
- Use: skip (proprietary, closed vocabulary). Link: https://github.com/Picovoice/rhino

### 2.8 Cloud or LAN server STT

- Wit.ai (Meta, free, token in page) -- the `wit-ai/webxr-voice-demo` (A-Frame, 2021, no SPDX
  license) shows the pattern but relies on Web Speech for the transcript.
- A whisper server on the owner's dev machine (whisper.cpp `whisper-server` or faster-whisper),
  reached over the LAN through the sandbox's own HTTPS server: zero headset compute, best
  accuracy, needs the machine on. Reasonable as a later comparison engine; not needed first.

## 3. Dictation into an in-scene field

No library does this end to end; it is glue between an STT engine and a text control:

- The engine's interim text (`onText` / Web Speech interim) renders grey after the caret; the
  final line (`onLine` / `isFinal`) replaces it in solid text.
- Push-to-talk: hold pinch on the field's mic chip, or a controller button; release ends the
  utterance. Never a hot mic.
- On Quest a third path is free: focus a hidden DOM input when
  `session.isSystemKeyboardSupported`; the user presses the system keyboard's microphone key;
  mirror `input.value` into the in-scene field on `input`. Must be done inside the XR select
  event so it counts as user activation (spatial-kanban PR #4 does this with pmndrs, IWER-only,
  not tried on hardware). Mind the overwrite-on-first-key rule: keep the field's own text and
  append the system keyboard's value, or accept that a session replaces it.
- Mic permission must be granted on the 2D page before entering XR (VROS PR #8): the sandbox's
  "Enter VR" button asks for the mic first when voice is switched on.

## 4. Virtual keyboards

### 4.1 Babylon.js GUI `VirtualKeyboard` + `InputText` (RECOMMENDED)

- What: `VirtualKeyboard.CreateDefaultLayout()`, `keyboard.connect(inputText)`, shift states,
  `onKeyPressObservable`; drawn on `AdvancedDynamicTexture.CreateForMesh(plane)` so it lives in
  the scene and takes XR pointer-ray picks.
- License / maintenance: Apache-2.0, part of Babylon.js. Not installed in the monorepo yet:
  add `@babylonjs/gui` at the same version as `@babylonjs/core` (8.43.0 installed).
- Coverage: ~75%. Known on Quest: works in immersive VR when built with `CreateForMesh`
  (Babylon forum "Entering Text in WebXR"); MUST set `inputText.disableMobilePrompt = true`,
  otherwise a touch-focused InputText calls `window.prompt()` and freezes the session (Babylon
  forum "Virtual Keyboard Anomaly - Oculus Quest", code read in `inputText.js` onFocus). XR ray
  pointers report pointerType "xr", so the prompt is not hit by rays, but set the flag anyway.
- Add / fix: (a) size the plane so keys are at least ~2 cm for hand poke (default keys are 40 px
  on the texture); (b) verify hand poke: near interaction sends "xr-near" pointer events to
  near-pickable meshes, which should reach the ADT -- UNVERIFIED; (c) key press feedback (sound,
  haptic pulse on controllers); (d) InputTextArea is not supported by VirtualKeyboard (forum
  feature request) -- single-line fields only; (e) placement: follow the field, tilt toward the
  user.
- Links: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui ,
  https://forum.babylonjs.com/t/entering-text-in-webxr-experience-immersive-vr-mode/16389 ,
  https://forum.babylonjs.com/t/virtual-keyboard-anomaly-oculus-quest/5434 (playground
  https://www.babylonjs-playground.com/#FIISHL#136)

### 4.2 Quest system keyboard (Quest only)

- See section 1 and 3. Zero rendering code; best typing and includes dictation; Quest only;
  overwrite-on-first-key and no key events. Link:
  https://developers.meta.com/horizon/documentation/web/webxr-keyboard/

### 4.3 A 3D poke keyboard from Babylon GUI 3D buttons

- Babylon GUI 3D has no keyboard. If 4.1's flat texture is hard to poke with hands, lay out
  `TouchHolographicButton`s (MRTK-style, built for poke) in a grid -- about 40 buttons, our own
  code. Only if 4.1 fails the dry run.

### 4.4 Other libraries (reference only; wrong engine)

- `aframe-super-keyboard` (A-Frame, MIT, 2022), `@pmndrs/uikit` keyboard (three.js, custom
  license), Meta Virtual Keyboard (Unity only). Ideas only.
- Research to borrow from: Speicher et al., "Selection-based Text Entry in Virtual Reality",
  CHI 2018 (controller ray pointing was the best of six methods),
  https://doi.org/10.1145/3173574.3174221 ; Boletsis and Kongsvik, "Text Input in Virtual
  Reality: A Preliminary Evaluation of the Drum-Like VR Keyboard", Technologies 2019,
  https://doi.org/10.3390/technologies7020031 . A drum-like mode (controller tips strike keys)
  is a cheap variant of 4.1 worth a toggle.

## 5. Chip-sentence parser without AI

Goal: turn "color these by pagerank" into chips `[color] [these] [by] [PageRank]`, each chip
pokeable to swap one word for an alternative, and the whole sentence executable. Voice is never
the only path: the same chips can be built by poking.

### 5.1 Recommendation: our own slot grammar (~150 lines) with small matching helpers

- A handful of sentence templates, each a verb plus typed slots:
    - `color <target> by <attribute>`; `size <target> by <attribute>`
    - `run <algorithm>`; `layout <layout>`
    - `select <target>`; `hide|show <target>`; `filter <target> where <attribute> <op> <value>`
    - `grow <node> <n> hops`; `undo`; `save`
- Slot vocabularies come from data, never hard-coded: node ids/labels from the loaded graph,
  attribute names from the data and from algorithm results, algorithm and layout names from
  graphty-element's catalog. `<target>` also accepts deictic words ("these", "this", "that
  one", "selection") resolved to whatever the user is pointing at or has selected.
- Matching per token span: exact, then edit distance (`fastest-levenshtein`, MIT, 21 KB), then
  phonetic (`double-metaphone`, MIT, 34 KB) for misheard proper names ("strossi" -> Strozzi).
  Keep the top 3 candidates per chip -- those ARE the alternatives a poked chip offers.
- Unparsed words become a red "?" chip the user can poke to choose from the slot's vocabulary.
- Output: a command call with params. Map it onto graphty-element's existing command set
  (`graphty-element/src/ai/commands/`: `findAndStyleNodes`, `runAlgorithm`, `setLayout`,
  `findNodes`, `zoomToNodes`, ...) so voice, chips and the AI path share one executor. If a
  needed command or a neutral parse helper is missing, it belongs in graphty-element, not in the
  sandbox (see CLAUDE.md: the app must not work around the element).
- Feed the same vocabulary to Moonshine's `setKeyterms` so recognition and parsing agree.
- One assert-based self-check file with ~20 utterances.

### 5.2 Alternatives considered

| Library                                                         | What                                                                                                                 | License / maint.          | Fit                                                                       | Verdict                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `annyang` 3.1.0                                                 | Command templates `'color :target by *attr'`; `trigger(text)` accepts ANY transcript, so it works with Moonshine too | MIT, published 2026-10-06 | 40%: all-or-nothing match, no partial parse, no per-chip alternatives     | Skip; its template syntax is a good model for ours                |
| `compromise` 14.18                                              | English NLP; `doc.match('color [<who>.+] by [<what>.+]').groups()` named captures, POS tags                          | MIT, active               | 50%: nice templates, but no fuzzy/phonetic vocab matching and ~200 KB min | Skip unless free-form phrasing becomes a goal                     |
| `peggy` 5.1 / `ohm-js` 17.5                                     | Parser generators                                                                                                    | MIT, active               | 30%: strict grammars, no fuzzy matching, no partial parse                 | Skip                                                              |
| `@nlpjs/nlp` 5.0 alpha                                          | Trained intent classifier + enum entities                                                                            | MIT, alpha since 2025-01  | 50%: needs training data; stale alpha                                     | Skip                                                              |
| `fuse.js` 7.5                                                   | Fuzzy search over lists                                                                                              | Apache-2.0, active        | Helper only                                                               | Alternative to fastest-levenshtein if we want ranked fuzzy search |
| Picovoice Rhino                                                 | Speech straight to intent + slots                                                                                    | proprietary engine        | Closed vocab                                                              | Skip (2.7)                                                        |
| graphty-element LLM path (`WebLlmProvider`, `VercelAiProvider`) | Full NL to commands                                                                                                  | in repo                   | Not "without AI"                                                          | Keep as an optional comparison toggle, never the default          |

## 6. What the dry run must check (voice and text)

1. A probe line logged through the remote logger on page load and after entering XR, per
   device: `typeof SpeechRecognition`, `typeof webkitSpeechRecognition`, the first `start()`
   result or error code, `crossOriginIsolated`, `navigator.gpu` present,
   `session.isSystemKeyboardSupported`, mic permission state.
2. Moonshine Tiny Streaming on Quest 3 while rendering the Florentine graph: frame time before
   and during speech; first-load download time.
3. Babylon VirtualKeyboard: ray typing with controllers and poke typing with hands on both
   devices; no `window.prompt()` freeze.
4. Quest system keyboard: shows over the session, `input.value` mirrors into the scene, `blur`
   restores, the microphone key dictates.
5. In IWER (headless): the parser self-check, the keyboard reachable by an emulated ray, the
   voice toggle degrading cleanly when no engine is available (IWER returns
   `isSystemKeyboardSupported: false`).

## 7. Summary table

| Candidate                                                 | Role                      | License           | Maintained    | Covers                               | Must add or fix                                                                             | Verdict                                         |
| --------------------------------------------------------- | ------------------------- | ----------------- | ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Web Speech API                                            | STT                       | platform          | n/a           | Galaxy XR ~80%, Quest ~0% (expected) | push-to-talk, restart on end, mic before XR; reuse VoiceInputAdapter shape                  | Engine option "webspeech", default on Galaxy XR |
| @moonshine-ai/moonshine-wasm                              | STT, streaming, on-device | MIT               | yes (2026-08) | ~90% both                            | COOP/COEP or single-thread build, self-host models, measure Quest CPU, key terms from graph | Engine option "moonshine", default on Quest     |
| Quest system keyboard (`isSystemKeyboardSupported`)       | text + dictation          | platform          | Quest 31.2+   | Quest ~70%                           | hidden input, focus in select event, overwrite rule, mirror value                           | Text option on Quest                            |
| @huggingface/transformers Whisper                         | STT, batch                | Apache-2.0        | yes           | ~70%                                 | VAD, latency, GPU contention                                                                | Comparison engine, later                        |
| whisper.cpp wasm                                          | STT / guided commands     | MIT               | yes           | ~50%                                 | emsdk build, no npm                                                                         | Skip                                            |
| vosk-browser                                              | STT, grammar-restricted   | Apache-2.0        | no (2022)     | ~60%                                 | stale                                                                                       | Skip (fallback idea)                            |
| sherpa-onnx wasm                                          | STT, hotwords, KWS        | Apache-2.0        | yes           | ~70%                                 | browser packaging                                                                           | Skip for now                                    |
| Picovoice Rhino                                           | speech-to-intent          | proprietary       | yes           | ~60%                                 | key, closed vocab                                                                           | Skip                                            |
| LAN whisper server                                        | STT                       | MIT (whisper.cpp) | yes           | ~85%                                 | server, network path                                                                        | Later comparison                                |
| Babylon GUI VirtualKeyboard + InputText                   | in-scene keyboard         | Apache-2.0        | yes           | ~75%                                 | `disableMobilePrompt = true`, key size, hand poke check, add @babylonjs/gui 8.43.0          | Default keyboard, both devices                  |
| GUI 3D TouchHolographicButton grid                        | poke keyboard             | Apache-2.0        | yes           | ~40%                                 | build layout                                                                                | Only if 4.1 fails poke                          |
| Own slot grammar + fastest-levenshtein + double-metaphone | chip parser               | MIT deps          | deps stable   | ~90%                                 | ~150 lines + self-check; map to element commands                                            | Build it                                        |
| annyang / compromise / peggy / @nlpjs                     | parser                    | MIT               | mixed         | 30-50%                               | see 5.2                                                                                     | Skip                                            |
