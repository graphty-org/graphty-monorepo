# Upstream notes for the AI adapter

What graphty-element works around in the packages this folder builds in, and what to report
upstream. Each entry names the workaround in this repository, so it can be deleted when upstream
fixes the cause.

## In-page code: `@tanstack/ai-isolate-quickjs` 0.3.2 over `quickjs-emscripten` 0.31.0

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

None of these is filed yet.
