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
