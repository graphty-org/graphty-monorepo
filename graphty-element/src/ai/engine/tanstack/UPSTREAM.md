# Upstream notes for the AI adapter

What graphty-element works around in the packages this folder builds in, and what to report
upstream. Each entry names the workaround in this repository, so it can be deleted when upstream
fixes the cause.

## Web search and web fetch: `@tanstack/ai-anthropic` 0.21.1

- **Web fetch is sent without its beta header.** `webFetchTool()` declares `web_fetch_20250910`,
  which the Messages API accepts only with `anthropic-beta: web-fetch-2025-09-10`;
  `computeAnthropicBetas` (adapters/text.js) adds betas for files, thinking, context management,
  MCP and code execution, never for web fetch. Workaround: `withWebFetchBeta()` in `anthropic.ts`
  adds it to the request through graphty's fetch when the turn offers web fetch. To report: add
  the beta in `computeAnthropicBetas` when a `web_fetch` provider tool is present.
- **`pause_turn` is reported as a plain stop.** The stream's `message_delta` maps every stop
  reason other than `tool_use` and `max_tokens` to `RUN_FINISHED` with finish reason `stop`, so a
  turn the API paused during a long server-tool run looks finished. Workaround: on Anthropic only
  (`pausesTurns` in `anthropic.ts`), `ChunkReader` in `index.ts` finishes a turn that had a
  provider-run tool and ends with no text and no call as `"paused"`; elsewhere such a turn is an
  empty answer. The loop sends a paused turn back, its `server_tool_use` blocks and results
  carried as provider state, up to three times. To report: pass `pause_turn` through as its own
  finish reason.

## Web fetch on Gemini (URL context): `@tanstack/ai-gemini` 0.37.2

- **The adapter drops `urlContextMetadata`**, the only record of which addresses URL context read
  and whether each loaded (`processStreamChunks` keeps a candidate's `groundingMetadata` and
  nothing else). Workaround: `rawHostedCall` in `google.ts` reads it from each raw chunk, which
  TanStack hands to the `debug` option's logger (`rawChunks()` in `index.ts`, every other log
  category off), and `ChunkReader` reports it as a web fetch when the turn ends. To report: emit
  a provider-executed `url_context` tool call with the metadata, as `google_search` is.
- **URL context's grounding is reported as a `google_search` call.** A turn that read a page
  without searching gets a search result naming that page. Workaround: `ChunkReader` drops a
  provider-run result for a tool the turn did not offer. To report: name the grounding call after
  the tool that produced it.

## Transcription and speech: `@tanstack/ai-openai` 0.29.1, `@tanstack/ai-gemini` 0.37.2

`voice.ts` calls `generateTranscription` and `generateSpeech`; the provider's adapters come with
its chat module (`openaiVoice` in `openai.ts`, `googleVoice` in `google.ts`).

- **Gemini has no transcription adapter.** Workaround: the chat model transcribes, one `chat()`
  turn with a fixed instruction and the clip as an `audio` content part (sent as `inlineData`),
  with no tools. To report: a Gemini transcription adapter over the same call.
- **The OpenAI transcription adapter names every `Blob` `audio.mp3`**, whatever its type
  (`prepareAudioFile`), and the API reads the format from the name, so a WebM clip from
  `MediaRecorder` would be sent as MP3. Workaround: `audioFile()` in `voice.ts` passes a `File`
  named for its type, which the adapter passes on as it is. To report: name the file from the
  `Blob`'s type.
- **The audio adapters do not pass the call's `abortSignal` to their request**, so cancelling
  only stops waiting for it. Workaround: `voiceFetch()` in `voice.ts` gives graphty's fetch the
  call's signal too. To report: pass `abortSignal` to the SDK call.
- **An unknown Gemini voice name throws an English sentence** (`toGeminiVoice`), before any
  request. Workaround: `speak()` in `voice.ts` reads a throw before any request, on a module that
  says `refusesUnknownVoices`, as that refusal and answers `AI_VOICE_UNAVAILABLE`. To report: a
  coded error (or a voice check graphty can call) instead of the sentence.
- **The OpenAI SDK fetches `data:,` before its first multipart request with a new fetch**
  (`supportsFormData`), to learn the `Response` class. Workaround: `voiceFetch()` names
  `Response` on the fetch it hands the SDK. Not reported: the SDK's own probe, harmless but for
  the extra request.

## Live conversations: `@tanstack/ai-openai` 0.29.1, `@tanstack/ai-gemini` 0.37.2

`live.ts` calls `openaiRealtime()` (WebRTC) and `geminiRealtime()` (WebSocket) through
`RealtimeAdapter.connect` directly; the adapters come with their provider's chunk (`openaiLive` in
`openai.ts`, `googleLive` in `google.ts`). `RealtimeClient` (`@tanstack/ai-client`) is not used:
it runs client tools itself, unordered, answers an unknown tool with an English string and keeps
message records of its own, all of which are graphty's. Two defects are fixed in place with pnpm
patches (`patches/`, listed in `pnpm-workspace.yaml`); each has a test in
`test/ai/engine/live.test.ts` that fails without it.

- **OpenAI asks for a response after every tool result.** `sendToolResult` sends
  `response.create` after each `function_call_output`, so a response with two calls asks for a
  new response while only the first result is in. Patch (`@tanstack__ai-openai@0.29.1.patch`): it
  remembers the calls of each `response.done` and sends one `response.create` after the last of
  their results. To report: send the follow-up response once per batch, or leave it to the caller.
- **OpenAI never says that a response with only calls ended**, and never that the data channel
  closed: `message_complete` is emitted only for a response with a message item, and the channel
  has no `onclose`. Patch (the same file): `message_complete` (with no parts) for a response
  without a message, and `status_change` `idle` when the channel closes, as the Gemini adapter
  does for its socket. `live.ts` reads `message_complete` as the end of a response and an `idle`
  it did not cause as a lost connection. To report: a response-end event and a closed status.
- **Gemini's `stopAudioCapture` never ends the reader's turn**: it only stops sending frames and
  never sends `audioStreamEnd`. Measured on `gemini-3.8-live` (the paid live test): even with
  `audioStreamEnd`, the server's activity detection ends a turn only after the setup's
  `silenceDurationMs` (2,000 ms) of silence in the audio itself, so a reader who lets go half a
  second after the last word never gets an answer. Patch (`@tanstack__ai-gemini@0.37.2.patch`):
  `AudioStreamer.stopAudioCapture`, when it was streaming on a set-up session, sends that much
  silence (512-sample frames of zeros) and then `{ realtimeInput: { audioStreamEnd: true } }`. To
  report: end the turn on stop (or offer manual activity, `activityStart` / `activityEnd`, which
  is push-to-talk's own mechanism).
- **Gemini's setup always sends `proactivity: { proactiveAudio: false }`**, which
  `gemini-3.8-live` refuses (the socket closes with 1007, "Explicitly disabling proactive audio is
  not supported for this model"), so no session opens. Patch (the same file): the field is sent
  only when proactive audio is on. To report: leave unset options out of the setup.
- **Both adapters start the microphone in `connect`** (OpenAI leaves the track enabled; Gemini
  streams once set up). Workaround: `live.ts` calls `stopAudioCapture()` right after `connect`,
  before the session is configured, and starts it only while talk is held. Not a defect for a
  hands-free client; to report as an option to connect muted.
- **Both adapters throw English `Error`s** (a refused SDP exchange, a microphone OpenAI could not
  open, a socket that closed before setup). Workaround: `live.ts` mints the token itself, so the
  status of the one request that carries the key is graphty's own; Gemini's microphone failure is
  the browser's `DOMException`, read by name; OpenAI's is read from the start of its sentence
  (`Microphone access required`). To report: coded errors.
- **Neither adapter takes a base URL**: `https://api.openai.com/v1/realtime/calls` and
  `wss://generativelanguage.googleapis.com/...` are fixed. Workaround: `ProviderApiEngine`
  refuses live with a custom `baseUrl` (`AI_VOICE_UNAVAILABLE`, `live-custom-base-url`), so the
  press runs turn by turn. To report: a base URL option.
- **The token helpers read the key from the environment** (`openaiRealtimeToken`,
  `geminiRealtimeToken` read `process.env` / `window.env`). Not used: `getToken()` in `live.ts`
  mints with the reader's key from the page, a fresh token per connection (Gemini: `uses: 1`, a
  short expiry), so there is no refresh timer, and the key never reaches a URL. Not reported:
  they are server helpers by design.
- **OpenAI's data channel must not open while `connect` awaits the SDP answer**: `onopen` reads
  `pendingEvents`, declared later in the function. A real handshake takes a network round trip, so
  it does not happen in a page; the Node fake opens the channel a task later. To report: declare
  the queue before the channel's handlers.

## In-page code: `@tanstack/ai-isolate-quickjs` 0.3.2 over `quickjs-emscripten` 0.31.0

The in-page code sandbox is not part of the provider engine: a program runs in the page whichever
engine or model wrote it, the in-browser model's included. It sits in this folder only because its
driver is a TanStack package, and only this folder may import one. So it is a second seam: the
loop reaches it through `loadProgramRunner()` and the `ProgramRunner` type in `../load.ts` and
`../types.ts`, never through the engine. **Replacing the provider engine does not replace the
sandbox**: move `program.ts` with its own driver, or keep this folder's TanStack Code Mode
dependency for it alone.

`program.ts` uses Code Mode's QuickJS driver (`createQuickJSIsolateDriver`) and `stripTypeScript`
directly. The driver builds for browsers with Vite and with webpack
(`test/packaging/program-wasm.test.ts`), so graphty-element has no QuickJS bridge of its own.

- **The WebAssembly module names its own default location.**
  `@jitl/quickjs-wasmfile-release-sync`'s browser module computes
  `new URL("emscripten-module.wasm", import.meta.url)` even when a `wasmLocation` is given. A
  library build inlines that file into the chunk as base64 (700 kB), and an application bundler
  that reads graphty's chunk would look for a file beside it. Workaround: `programChunk()` in
  `vite.config.ts` removes that default, and `program.ts` passes `wasmLocation` from its own
  asset URL. To report: make the default lazy, or skip it when `locateFile` is set.
- **Console output is unbounded.** The driver keeps every `console.log` line of a program in a host
  array until the program ends. Workaround: `program.ts` replaces `console` in the sandbox with one
  that stops at `maxLogChars`. To report: a log cap in `IsolateConfig`.
- **Cancelling waits for the deadline.** `IsolateContext` has no abort: `dispose()` waits for a
  running program to settle. Workaround: `program.ts` settles every pending binding call at once on
  abort, so the program unwinds and the context can be disposed. To report: an `AbortSignal` on
  `execute()`.
- **`stripTypeScript` brings all of sucrase**, most of the 372 kB chunk, and its
  code-generation strings, which `tools/check-published-deps.mjs` exempts (`TEXT_NOT_IMPORTS`).

None of the issues in this file is filed upstream yet.
