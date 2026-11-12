# Work protection: implementation plan

Status: plan, 2026-10-13. Package: `@graphty/graphty-element`, plus a small change to the graphty app
in the last step. The design is `design/work-protection/design.md`; section numbers below refer to it.

Every step lands as its own commit (or pull request) that builds, lints, passes `npm run api:report`
with the report committed, and passes its own tests. Every public addition is additive. Tests drive
the real store, the real element and real browser lifecycle events; the only stand-ins are the fault
store and fake locks and clock, which replace the environment, never the code under test.

## Steps

### 1. Split the project document into per-member builders

Package: graphty-element.

Work:

- Split the internal `write()` in `src/session/projectFile.ts` into one builder per member and one per
  run of `graphty-results`. `project.save()` calls all of them and returns the same document as today.
- The arrangement, results and view-state builders read node ids from `session.data.snapshot()` and
  edge ids from the store, never from `session.data.nodes()` or `edges()`.
- Column declarations (`session.data.declare()`) become an additive, versioned field of the
  `graphty-session` member, written by save and read by open.
- `ENGINE_VERSIONS.element` is injected from `package.json` at build time (Vite `define`), so the
  file's `generator` names the real version.

Tests (unit, `default` project):

- Every `ProjectSlice` round-trips through `project.save()` and `project.open()`: change the slice,
  save, open into a fresh session, compare.
- Call counting: building every member except `graphty-data` makes zero `nodes()` and `edges()` calls.
- Column declarations survive save and open; a file without the field still opens.
- `generator` equals the `package.json` version.

### 2. The store: `AutosaveStore`, the memory store and the IndexedDB store

Package: graphty-element. New directory `src/autosave/`.

Work:

- The `AutosaveStore`, `AutosaveWrite`, `AutosaveEntryMeta`, `AutosaveParts` types and the
  `AutosaveConflict` error, exported from `./extend` (6.2).
- `memoryAutosaveStore()`, exported from `./extend`, with an internal fault-injection wrapper used by
  tests: quota, never completes, abort of a write carrying `data`, corrupt part, newer format,
  `UnknownError`, a held write released on demand.
- The IndexedDB store (5.3): database `graphty-autosave` with `entries`, `parts` and `blobs`; one
  readwrite transaction per commit; the `gen` fence read inside the transaction; `seq` assigned inside
  it; parts over 1 MB stored once per SHA-256 and deleted with their last reference; `relaxed`
  durability with `strict` on request; one lazily opened connection, closed after in-flight work;
  `QuotaExceededError` read from both the request and `transaction.error`.
- The store stays free of the element: it imports no Babylon.js or Lit.

Tests:

- One contract suite, written once, run against both stores: atomic multi-entry commit, the fence
  rejects a stale `gen`, `seq` increases per key, `null` removes a part, unknown parts are kept,
  blob sharing and blob deletion with the last reference, `list` by key.
- Unit (`default`): the contract suite on the memory store, and every fault of the wrapper.
- In-page browser (`browser` project, plus new Firefox and WebKit instances for files under
  `test/autosave/`): the contract suite on the real IndexedDB store in Chromium, Firefox and WebKit;
  a transaction aborted mid-way leaves the previous commit whole; closing the connection waits for an
  in-flight transaction to report `complete`.

### 3. The writer: entries, parts, the schedule and failures

Package: graphty-element.

Work (internal; no element wiring yet, driven through `GraphSession`):

- An `Autosaver` class over a session, a store, an internal scheduler and clock seam, and a lock seam.
- The part mapping (5.1): `project:changed` slices map to unwritten parts; a `graph` change marks every
  part; unwritten parts are cleared only on `complete`, minus anything changed since the write was built.
- Entry start and the project-boundary hook (5.2): internal hooks fired by `project.open()` (not the
  restore's own call), replacing loads, `clearData` and `data.setSource`; the old entry is marked
  `ended: "replaced"` in the new entry's first commit. `history:changed` with reason `clear` is ignored.
- The schedule (5.4): 500 ms trailing debounce, 2000 ms maximum wait, idle-scheduled data writes with
  `dataMaxWaitMs`, one write at a time, an immediate `flush()` path for the lifecycle triggers, and the
  internal "layout at rest" and "drag end" hooks on `Arrangement.rest()` / `seal()`.
- Meta (`revision`, `dirty`, `gen`, counts, `formatVersion`, `elementVersion`), fencing (a rejected
  write moves to a new entry holding the full state), retention (5.8), and the failure states:
  `E_AUTOSAVE_QUOTA` with one retry after retention, `E_AUTOSAVE_STALLED` with the 10 s watchdog, one
  abort, reopen and retry, `E_AUTOSAVE_CONNECTION_LOST`, `E_AUTOSAVE_TOO_LARGE`, `E_AUTOSAVE_FAILED`.
- `AutosaveStatus` and the codes of 6.3 as exported types.

Tests (unit, fake clock and fake locks, real session, memory and fault stores):

- One write per burst; the forced write at the maximum wait; the data write at idle or at
  `dataMaxWaitMs`; a change during a write schedules exactly one more.
- A style edit writes no `data` part and makes zero `nodes()` calls.
- Each boundary path (open, replacing load, `clearData`, `setSource`) ends the old entry in the new
  entry's first commit; `session.history.clear()` and disposal do not.
- A held write released after a second writer committed is rejected and the entry holds one writer's
  state; the rejected writer's work lands in a new entry.
- An aborted write carrying `data` leaves every part unwritten; the next write carries them.
- Quota, stall, connection-lost and too-large reach their codes, keep the last committed entry, and
  recover on the next change.
- Retention never deletes a dirty, held or newest entry.
- A run that throws midway leaves the model and the entry unchanged.
- The oracle test (section 9): a seeded random sequence over every slice, cause, run finish, layout
  rest, drag end, stash and boundary; after every commit the entry, reassembled from the store, equals
  a fresh `project.save()` member by member. Prints the seed and the shrunk sequence on failure.

### 4. Recovery

Package: graphty-element.

Work (5.5), still on the internal `Autosaver`:

- Candidate choice: this tab's own entry first (id passed in by the caller), never an unrelated entry
  for a tab that has one; otherwise the newest by `seq`; a candidate held by another tab is copied
  into a new entry (`copiedFrom`).
- Claim with the lock seam's `ifAvailable`; record `restoreAttempts + 1` before opening; skip and
  report `E_AUTOSAVE_RESTORE_CRASHED` at 2.
- Reassemble and run `project.open(text, { discard: true, limits: { fileBytes: Infinity } })` with the
  boundary hook suppressed; put `dirty` and `revision` back through an internal save-point hook; commit
  `restoreAttempts: 0`.
- `E_AUTOSAVE_FORMAT_NEWER` and unreadable entries left untouched; an older format rewritten whole in
  one `strict` commit on the first write.
- Source digests (declared attributes, a row hash, a URL, file name plus size plus `lastModified`, a
  text hash), the absorb rule, `pageConfig` digests and `pageOverrides`.
- The 3 s listing timeout (`E_AUTOSAVE_STALLED`, step `list`), after which `ready` resolves `null`.
- `AutosaveRestored`, `AutosaveAvailable` and `AutosaveEntry` as exported types.

Tests (unit):

- Two sessions claim at once; exactly one restores each entry.
- The own entry wins over a newer entry from another tab; an own entry held by another tab is copied,
  never shared.
- Two restores that never confirm make the third load skip the entry and report `restore-failed`.
- A restored session has the entry's `dirty` and `revision`, and `project.dirty` stays true for work
  never saved to a file.
- A same-source load before the first change is absorbed (no new entry); a different source ends the
  entry as `replaced` and reports `page-data-changed`; the next reload absorbs the new source.
- A changed page setting wins and is named in `pageOverrides`; an unchanged one keeps the restored value.
- A newer-format and a corrupt entry are left byte-for-byte untouched and reported.
- A stuck listing resolves `ready` with `null` and writes nothing until a later listing succeeds.

### 5. The element: attributes, events and the page lifecycle

Package: graphty-element.

Work:

- The `autosave` and `autosave-restore` attributes and properties, `autosaveOptions`, `autosaver`
  (`AutosaveApi`), and the four events added to the element's event map and `HTMLElementEventMap` (6.1).
- Key resolution, including `E_AUTOSAVE_KEY_AMBIGUOUS` and `E_AUTOSAVE_UNAVAILABLE` (5.6).
- Held data inputs until `ready` resolves: declared attributes, assigned rows, data calls.
- Web Locks (`graphty-autosave:<key>:<entryId>`), with the no-Web-Locks mode; the own-entry id in
  `sessionStorage` and in a per-tab registry for remounts; a remount waits for the departing element's
  lock.
- Lifecycle triggers: `visibilitychange` to hidden, `pagehide`, `freeze`, `beforeunload`, and
  `disconnectedCallback` building the final parts synchronously before `#graph.shutdown()`; lock
  release on `pagehide` after the in-flight commit; retake on `pageshow` with `persisted` and on
  `resume`; connection close on `pagehide` and `freeze`. No `unload` listener.
- The unload guard (`pending`, `unexported`, `off`), the stash, `requestPersistence()` and
  `persist: true`, `storage` from `estimate()` at most once a minute, `ephemeral`, `persisted`, and the
  once-per-load `graphty-autosave-at-risk` fact.
- `discard()`, `restore(id)`, `remove()`, `removeAll()`, `list()`, `flush()`.
- Documentation: an autosave guide in graphty-element's docs with the section 3 example (compiled
  against the published types), the events guide entry, the iOS `beforeunload` note, the stash
  secrets warning, and the unchanged-URL rule.

Tests:

- In-page browser (Chromium, Firefox, WebKit):
    - unmount and remount with the same key, in the same task and in a later one: the work restores and
      no extra entry exists
    - two elements with different keys in one page never mix
    - a bare `autosave` on two elements without `id` reports `E_AUTOSAVE_KEY_AMBIGUOUS`
    - the `beforeunload` listener exists only while a write is outstanding or failing (`pending`), and
      while `project.dirty` (`unexported`)
    - a stash written just before `flush()` is read back by a remounted element
    - `requestPersistence()` and `status.persisted` report the browser's answer
    - the four events carry typed details and none fires at connect
- Unit: `autosaveOptions.key` wins over the attribute; `persist: true` calls `persist()` once, after
  the first write that follows a user gesture.
- Real input: an edit made with a real mouse drag (`test/helpers/real-input.ts`) is written at drag
  end, not during it (counted store writes).

### 6. Lifecycle tests: reload, close, kill and the Chromium harness

Package: graphty-element. New vitest project `lifecycle` (Node environment; each test launches its own
browsers through Playwright's library API) and a new CI shard `graphty-element-lifecycle` in
`tools/ci-test-matrix.mjs`, run only when graphty-element is affected.

Work:

- A fixture page served from the built `./bundle` by a small Node server inside the test, with a probe
  edit script (edit i sets node attribute `probe` to i) and a log of every `saved` revision.
- `launchPersistentContext(userDataDir)` for Chromium, Firefox and WebKit; WebKit's web process killed
  by pid from the process tree of the browser this test launched.
- The Chromium harness (`test/lifecycle/cdp-harness.ts`, raw CDP, no new dependency): launches Chrome
  for Testing headless (headed when `DISPLAY` is set) without Playwright's background and back/forward-cache flags; loads a
  test extension that calls `chrome.tabs.discard`; drives `chrome://discards`; `Page.setWebLifecycleState`,
  `Page.crash`, renderer and browser `SIGKILL`, `Storage.overrideQuotaForOrigin`,
  `Storage.clearDataForOrigin`, `Memory.forciblyPurgeJavaScriptMemory`, `Page.backForwardCacheNotUsed`.
- The shared invariant check (section 8): restored `revision` at least the last logged `saved`, every
  `probe` equals the restored revision, no entry deleted. Every test first proves its trigger happened.
- Budget: the shard must finish within about 10 minutes, running beside the existing shards, so it
  adds no wall time to a pull request. Node counts above 1,000 (50,000 and 100,000) run only when
  `GRAPHTY_LIFECYCLE_FULL=1`, which the release train sets.

Tests: every row of the matrix below marked "this server".

### 7. Firefox unloader, Safari, the iOS Simulator, the iPad protocol and the benchmark

Packages: graphty-element and `.github/workflows/`.

Work:

- Firefox harness: Marionette spoken directly (no geckodriver, no new dependency) with
  `-remote-allow-system-access`, chrome context, `TabUnloader.unloadLeastRecentlyUsedTab()`, on
  Mozilla's Firefox at a pinned version (Playwright's build never hides a background tab). Runs in
  the `lifecycle` shard (about 20 seconds). The documentation claims the veto for Firefox, since the
  test passes.
- A new workflow, `.github/workflows/work-protection-macos.yml`, triggered by `workflow_dispatch` and
  `workflow_call`, called by `release.yml` beside `hosts.yml` (a red run holds the release, like Hosts),
  never on a pull request. Pinned `macos-26` and Xcode 26; each job has a time limit.
    - A 5-minute probe: does IndexedDB persist across safaridriver sessions?
    - Playwright macOS WebKit with a persistent context: the kill and relaunch rows.
    - Real Safari through safaridriver: the hide transition (window minimized with `osascript`, a write
      committed after `visibilitychange`), stall detection, `persist()` results. WebContent kills by pid
      from that Safari's process tree only.
    - The iOS Simulator: a self-driving fixture page (edits from URL parameters, beacons
      `{ revision, phase }` to a local collector); `simctl openurl`, Home, terminate Safari, reopen,
      compare the `restored` beacon with the last `saved` one.
- The diagnostics story in graphty-element's Storybook: logs every lifecycle event, `saved` revision,
  `wasDiscarded` and the restore report to its own IndexedDB and to a collector started through
  servherd. The iPad checklist (`design/work-protection/ipad-protocol.md`) with the expected outcome
  per case.
- The benchmark (`bench` and `browser-bench` projects, gating nothing): write cost at 10,000, 50,000
  and 100,000 nodes with 3 runs, the restore memory peak, and how often the `pagehide` write lands per
  engine.

Tests: the matrix rows marked "macOS runner" and "iPad"; the story renders in visual review like any
other (its log area holds no times, so the capture is stable).

### 8. The graphty app turns autosave on

Package: graphty.

Work:

- Set `autosave="<project key>"` from the Recent list's project id, and `autosaveOptions = { persist: true }`.
- A status chip from `graphty-autosave-status`, a "restored" notice from `autosaver.ready`, the
  `others` count and ended entries from `autosaver.list()`, and the words for the at-risk, available
  and failing codes.
- Stash the note draft with `graph.autosaver.stash("app.graphty.note-draft", text)`.
- Remove any startup load that competes with the restore. Nothing else: no storage, detection or retry
  code in the app.

Tests:

- `*.real-element.test.tsx`: type a note and edit a node with `userEvent`, remount the app, assert the
  edit and the draft are back and the "restored" notice shows.
- Storybook play functions for the chip states and the notice, driven by the element's real events.

As built: autosave is on in the app shell at the default address (`AppShell autosave`, key
`app.graphty.shell`), because that is the shell readers use and the one with notes. It has no project
list, and the element keeps each tab's work apart by itself, so one key serves it. The tier 1 workspace
(`?next`), which has the Recent list, does not autosave yet: it opens on its start screen after a reload
with no element mounted, so turning autosave on there also needs it to reopen the tab's project on load.
That belongs with its switch-over.

## Verification matrix

"This server" means the `lifecycle` shard (step 6) or the in-page browser tests (steps 2 and 5), in
Chromium, Firefox and WebKit through Playwright unless the row says otherwise; they run on every pull
request that affects graphty-element. "macOS runner" means `work-protection-macos.yml` (on demand and on
the release train). Every kill test asserts the invariant: restored `revision` at least the last logged
`saved`, every `probe` equal to the restored revision, no entry deleted.

| Scenario                                                                                                                            | Where                                                                                                                                                          | How it is reproduced                                                                                                                                                | Passes when                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tab discarded by an extension or Memory Saver                                                                                       | this server: Chrome for Testing (headless; headed with `DISPLAY`)                                                                                              | edit; open a second tab in front; assert a write committed after `visibilitychange`; `chrome.tabs.discard` from the test extension; reactivate                      | `wasDiscarded` is true; the invariant holds; the tab restores its own entry although another tab wrote a newer one                |
| Urgent discard under memory pressure                                                                                                | this server: Chrome for Testing                                                                                                                                | as above, discard from `chrome://discards`                                                                                                                          | same as above                                                                                                                     |
| Firefox low-memory unloader                                                                                                         | this server: Mozilla Firefox through Marionette                                                                                                                | `TabUnloader.unloadLeastRecentlyUsedTab()` while `pending`, then after `saved`                                                                                      | not unloaded while pending; unloaded after `saved`, and restored on reselect                                                      |
| Frozen, then killed                                                                                                                 | this server: Chrome for Testing                                                                                                                                | `Page.setWebLifecycleState frozen`; renderer `SIGKILL`                                                                                                              | the page logged `freeze`; the invariant holds                                                                                     |
| Renderer killed (out of memory)                                                                                                     | this server: Chromium, WebKit                                                                                                                                  | `SIGKILL` of the renderer or `WebKitWebProcess` (pid from this browser's tree) after an edit; 1,000 nodes per pull request, 50,000 and 100,000 on the release train | a new renderer pid; the invariant holds                                                                                           |
| Renderer or GPU-process crash                                                                                                       | this server: Chromium                                                                                                                                          | CDP `Page.crash`                                                                                                                                                    | the `crash` event fired; the invariant holds                                                                                      |
| Browser or OS killed                                                                                                                | this server: Chromium, Firefox, WebKit                                                                                                                         | `SIGKILL` of the browser root; relaunch on the same profile; once more with `--restore-last-session` (Chromium)                                                     | the invariant holds; with session restore, the own entry is chosen                                                                |
| Close, reload or navigate away                                                                                                      | this server: all three                                                                                                                                         | close after `saved`; close while `pending` with `page.close({ runBeforeUnload: true })`; reload; navigate and come back                                             | a dialog appears only while pending; none after `saved`; the invariant holds after reopening                                      |
| Back/forward cache                                                                                                                  | this server: Chrome for Testing (CDP), Firefox and WebKit (`pageshow.persisted`)                                                                               | navigate away and back, once in `saved` and once right after an edit                                                                                                | no `Page.backForwardCacheNotUsed`; `persisted` true; the edit is kept                                                             |
| Element unmounted and remounted                                                                                                     | this server: in-page, all three                                                                                                                                | remove the element after an edit, add one with the same key in the same task and in a later one                                                                     | the work restores; no extra entry                                                                                                 |
| Two tabs on one project                                                                                                             | this server: all three, pages in one context                                                                                                                   | interleaved edits; N pages reloading together; an old tab focused after a new one writes; a duplicated tab (sessionStorage copied)                                  | no entry restored twice; every unended entry restored or listed; the duplicate restores a copy                                    |
| Stale write from a tab that lost its lock                                                                                           | unit                                                                                                                                                           | a held write in the fault store released after a second writer commits                                                                                              | rejected; the entry holds one writer's state; nothing lost                                                                        |
| Mixed entry from the part mapping                                                                                                   | unit (oracle)                                                                                                                                                  | seeded random sequences over every slice and boundary                                                                                                               | the reassembled entry equals `project.save()` after every commit                                                                  |
| Write aborted midway                                                                                                                | unit and in-page                                                                                                                                               | fault store aborts the write carrying `data`; a real aborted IndexedDB transaction                                                                                  | every part agrees after a reload; previous commit whole                                                                           |
| Restore kills the page                                                                                                              | unit                                                                                                                                                           | two restores that never confirm                                                                                                                                     | the third load skips the entry and reports `restore-failed`; nothing deleted                                                      |
| Startup load races the restore                                                                                                      | this server: all three                                                                                                                                         | page fetches and assigns rows before and after the restore finishes; edit; reload                                                                                   | the edit is kept; no new entry                                                                                                    |
| Quota full                                                                                                                          | this server: Chromium (`Storage.overrideQuotaForOrigin`), Firefox (`dom.quotaManager.temporaryStorage.fixedLimit` in `user.js`); unit for WebKit (fault store) | fill the quota, then edit                                                                                                                                           | `E_AUTOSAVE_QUOTA`; last good entry kept; guard armed; next change after room is made commits                                     |
| IndexedDB stuck or connection lost                                                                                                  | unit (fault store); macOS runner: real Safari stall check                                                                                                      | a store that never completes; one that fails with `UnknownError`                                                                                                    | `E_AUTOSAVE_STALLED` then one abort, reopen and retry; `E_AUTOSAVE_CONNECTION_LOST` when reopening fails; the page is never blank |
| New deploy while a tab is open                                                                                                      | unit                                                                                                                                                           | an entry with a higher `formatVersion`                                                                                                                              | left untouched; reported as `E_AUTOSAVE_FORMAT_NEWER`                                                                             |
| Long operation fails midway                                                                                                         | unit                                                                                                                                                           | inject a throw in a run                                                                                                                                             | model and entry unchanged                                                                                                         |
| Opened another project by mistake                                                                                                   | unit, per boundary path                                                                                                                                        | `project.open()`, replacing load, `clearData`, `setSource`                                                                                                          | old entry `ended: "replaced"` in the new entry's first commit, listed, restorable by hand                                         |
| Origin data cleared or evicted                                                                                                      | this server: Chromium (`Storage.clearDataForOrigin`)                                                                                                           | clear, then reload                                                                                                                                                  | fresh start without an error; the at-risk fact fired earlier when `persisted` was false                                           |
| Private window                                                                                                                      | this server: Chromium Incognito context; iPad                                                                                                                  | open the fixture in a private context                                                                                                                               | `ephemeral` is `"likely"`; the at-risk fact fires once                                                                            |
| GPU context or device lost                                                                                                          | this server: Chromium in-page                                                                                                                                  | `WEBGL_lose_context`; `device.destroy()`                                                                                                                            | the data and the entry are unchanged                                                                                              |
| Change made while hidden                                                                                                            | this server: Chrome for Testing with throttling on                                                                                                             | a run finishes while the page is hidden                                                                                                                             | the write committed, counted, with no debounce timer having fired                                                                 |
| Memory pressure without a kill                                                                                                      | this server: Chromium                                                                                                                                          | `Memory.forciblyPurgeJavaScriptMemory` at 100,000 nodes (release train)                                                                                             | no loss; the invariant holds                                                                                                      |
| Safari hidden                                                                                                                       | macOS runner: real Safari                                                                                                                                      | minimize with `osascript`                                                                                                                                           | a write committed after `visibilitychange`                                                                                        |
| Safari WebContent killed, Safari relaunched                                                                                         | macOS runner: Playwright WebKit with a persistent context (real Safari if the probe shows IndexedDB persists across sessions)                                  | kill by pid from that browser's tree; relaunch                                                                                                                      | the invariant holds                                                                                                               |
| Safari `persist()`                                                                                                                  | macOS runner: real Safari                                                                                                                                      | `requestPersistence()`                                                                                                                                              | `status.persisted` matches `navigator.storage.persisted()`                                                                        |
| iOS app switch, then Safari terminated                                                                                              | macOS runner: iOS Simulator                                                                                                                                    | `simctl openurl`, Home, terminate Safari, reopen                                                                                                                    | a `hidden` beacon; `restored` revision at least the last `saved`                                                                  |
| iOS memory kill, tab-switcher close, Stage Manager, Home Screen app, private window, overnight, 100,000-node import then app switch | owner's iPad, diagnostics story, checklist                                                                                                                     | manual, about 15 minutes                                                                                                                                            | each checklist case records the expected outcome; the answers to the platform questions in design section 9 are recorded          |
| Write cost and restore memory peak                                                                                                  | this server and macOS runner: benchmark, gating nothing                                                                                                        | 10,000, 50,000 and 100,000 nodes with 3 runs                                                                                                                        | recorded against the budgets of design 5.4; a regression is investigated, never asserted by time                                  |
