# Work protection in graphty-element

Status: design, 2026-10-13. Package: `@graphty/graphty-element`. Where this design and the
autosave parts of `design/ui/object-first-ux/round-3/file-project.md` section 5 or issue #818
disagree, this design replaces them (see section 12).

## 1. The problem and the answer

Today all graph work lives only in the tab's memory until the reader saves a file by hand. That
covers loaded data, layout and pinned positions, algorithm results, style layers, notes and saved
views. A browser can throw that memory away at any time:

- **Discarded.** The browser drops a background tab to save memory, and the tab reloads from
  scratch when the reader comes back. Causes:
    - Chrome Memory Saver, after 2 to 6 hours hidden
    - Chrome urgent discard, under memory pressure
    - Edge sleeping tabs
    - Firefox's low-memory unloader on Windows
- **Frozen, then killed.** A frozen page is often killed next, with no further event. Freezing
  starts:
    - in Safari, about 20 seconds after the page is hidden
    - in Chrome on Android, after 1 minute
    - in Chrome Energy Saver, after 5 minutes
- **Killed or crashed.** iOS kills Safari's page process under memory pressure, most often while it
  is in the background. Android kills browser processes. Renderer and GPU processes crash.
- **Closed.** The reader closes or reloads the tab, or navigates away. Nothing asks first today.

**Browsers cannot be stopped from doing this.**

- **Chrome.** Four cases ignore every protection a page can set up:
    - an extension discard
    - a ChromeOS urgent discard
    - a discard of a frozen page whose memory keeps growing
    - an Android low-memory kill
- **iPad.** Three cases deliver no event at all: a memory kill, a tab closed from the tab switcher
  and a GPU-process crash. `beforeunload` never fires on iOS.
- **Firefox on Android.** It reloads every tab in a killed process.
- **The levers that lower the odds** work only in some browsers, and the reader can see each one:
  notification permission, audio, an installed app, title changes while hidden.

**So the guarantee comes from the work already being on disk.** graphty-element does six things:

1. **Writes continuously.** Every committed change is written to IndexedDB, in one atomic
   transaction, within half a second for ordinary edits and within 10 seconds for edits to the
   graph's data itself. Only the parts that changed are rewritten.
2. **Writes once more the moment the page is hidden, closed or the element is removed.** This
   shortens the window; the guarantee does not depend on it.
3. **Gives every tab its own saved entry**, written only by that tab and fenced against stale
   writes, so two tabs can never overwrite or mix each other's work.
4. **Restores automatically on the next load**, whatever state the page ended in. It uses the same
   path that opens a project file, and reports what it did as a neutral fact.
5. **Uses the few real levers where they are safe and invisible:** a `beforeunload` veto, only
   while a write is outstanding or failing, and (when the consumer asks) a request for persistent
   storage.
6. **Reports what it cannot prevent** as facts: storage that may be deleted, a full quota, a stuck
   database. The consumer can then tell the reader to keep a file copy.

## 2. Why graphty-element

Every part above is detection, construction, sequencing or recovery code. A third party embedding
graphty-element needs exactly the same code to keep its readers' work, and that code is subtle: the
iOS gaps, the back/forward cache rules, the Web Lock claim, write fencing, the restore race with the
page's own startup load. If the graphty app owned it, every other consumer would have to rebuild
it, and by the repository's architectural rules it would be in the wrong package. The element also
already owns what autosave is built on: the project document (`session.project.save()` and
`open()`), the dirty flag and the change events.

The graphty app keeps only presentation: whether and how to show "saved", the wording of a
"restored your work" notice and of storage warnings, whether to suggest installing to the Home
Screen or saving a file, and the file picker. Any storage, lifecycle or recovery code in the app is
a defect.

**Default: off in graphty-element, on in the graphty app.** Another reasonable consumer could choose
not to keep the reader's graph on their device: a kiosk, a shared machine, sensitive data. By the
"offers choices" rule it is an option whose neutral default is to write nothing. Turning it on takes
one attribute and no other code.

Autosave sits on the element, not on the headless session, because it depends on DOM and browser
APIs (IndexedDB, Web Locks, page lifecycle events). The events guide lists its events next to
`graphty-project-status` and says so.

## 3. The simple path

```html
<script type="module">
    import "@graphty/graphty-element";
</script>

<graphty-element autosave="acme.org-chart" sample="karate"></graphty-element>
<p id="status"></p>

<script type="module">
    const graph = document.querySelector("graphty-element");
    const status = document.getElementById("status");

    // Optional: show the state. The words are yours.
    const words = { saved: "All changes saved", pending: "Saving...", failing: "Not saved", off: "" };
    const show = (s) => (status.textContent = words[s.state]);
    show(graph.autosaver.status); // the status event does not fire at start
    graph.addEventListener("graphty-autosave-status", (e) => show(e.detail));

    // Optional: say when work came back, and when only a file copy keeps it safe.
    graph.autosaver.ready.then((restored) => restored && console.log("Restored work from", restored.savedAt));
    graph.addEventListener("graphty-autosave-at-risk", () => console.log("Suggest saving a file"));
</script>
```

That is all a consumer writes. The work survives a reload, a closed tab, a discard and a crash. The
listeners are optional. The key is shared across the whole origin, so the documentation recommends a
namespaced key such as `acme.org-chart`.

The same holds when the page fetches its data and assigns it later (`graph.nodes = rows`): loads
that arrive while the restore is being decided wait for it, and a later load of the same data the
saved work was built from does not replace that work (5.5).

## 4. What exists today and what this builds on

Read from master at 4269ae5b24.

- **The project document.**
    - `session.project.save()` (`src/session/projectFile.ts`) writes the whole session as one
      `graphty-document`. Its members are `graphty-data`, `graphty-session`, `graphty-arrangement`,
      `graphty-results`, `graphty-style`, `graphty-notes` and `graphty-view-state`.
    - `project.open()` reads it back in one transaction. It checks versions
      (`E_UNSUPPORTED_VERSION`), reports member problems, and reports runs that were still computing
      as `W_RUN_PENDING`. It then calls `session.history.clear()` (`projectFile.ts:1396`).
    - **Autosave stores this document and restores through `open()`.** Autosave and a file save then
      never drift apart, and there is no second reader to keep correct.
- **`project.dirty`** means "changed since the last file save". Autosave never clears it, and a
  restore puts it back as it was. Restored work that was never saved to a file is not clean.
- **`project:changed { slices, cause }`** fires synchronously on every committed change. It names
  what changed: `graph`, `attributes`, `runs`, `arrangement`, `pins`, `styles`, `notes`, `config`,
  `layout`, `visibility`, `sets` or `views`. The history merges each gesture (a slider mid-drag, a
  node mid-drag) into one change before it commits, so autosave writes committed state only.
  Selection is not a history step and fires no `project:changed`.
- **Data loads are ordinary undoable steps.** A load that replaces the graph
  (`#replaceData`, `graphty-element.ts:1129`; `session/data.ts:503`) records a history step; it does
  not clear the history. `history:changed` with reason `clear` fires only from
  `session.history.clear()` (public), from `project.open()`, and from disposal
  (`GraphSession.ts:877` through `History.ts:541`). **So `clear` is not a project boundary**, and
  this design does not use it as one (5.2).
- **A disconnected element is a shut-down element.** `disconnectedCallback`
  (`graphty-element.ts:703`) calls `#graph.shutdown()`, and the graph is never rebuilt. Anything the
  final write needs must be built synchronously before that call.
- **The element treats data set before `firstUpdated` as declared** (`#settingUp` turns false at
  `graphty-element.ts:520`); data assigned later arrives as an ordinary load.
- **No page-lifecycle handling exists**, except a `pagehide` log flush. There is no IndexedDB, no
  `beforeunload`, no Web Locks and no `persist()`.
- **Rendering.** The WebGL engine is built without `doNotHandleContextLost`, so Babylon rebuilds GPU
  resources after a context loss. The graph lives on the CPU side, so a lost GPU never loses data.
- **Two gaps in today's file save that autosave would inherit:**
    - Column declarations (`session.data.declare()`, the `attributes` slice) are not written by
      `project.save()` at all. This work fixes that (5.1).
    - `ENGINE_VERSIONS.element` reads `"1.10.0"` while the package is 3.21.0, so the project file's
      `generator` names the wrong version. This work injects the version from `package.json` at
      build time and uses it for both.

**Measured cost of today's save.** Node 22; 50,000 nodes with 3 attributes, 150,000 weighted edges,
every node placed, no algorithm runs. The script is `tmp/work-protection/design-core/measure.mts`.

| Step                                                    | Time          | Size          |
| ------------------------------------------------------- | ------------- | ------------- |
| `project.save()`, the whole document                    | 650 to 760 ms | 15.6 MB       |
| - building `session.data.nodes()` and `edges()` records | about 470 ms  |               |
| - `graphty-data` to JSON                                | 82 ms         | 13.6 MB       |
| - `graphty-arrangement` to JSON                         | 6.6 ms        | 2.0 MB        |
| - every other member                                    | under 1 ms    | under 0.01 MB |
| gzip of the whole document                              | 350 to 520 ms | 3.9 MB        |
| `project.open()` of that document                       | 3.4 to 4.0 s  |               |

What this means:

- Rewriting the whole document on every edit is too slow.
- The 470 ms is the cost of building frozen node and edge records. Today the arrangement, results
  and view-state members also derive their ids from those records. **Their builders must read ids
  from `session.data.snapshot()` and the store's edge ids instead**, or splitting the document saves
  nothing. A unit test counts calls: a style edit makes zero `nodes()` or `edges()` calls.
- With that, an ordinary write is about 10 to 20 ms. Only a change to the data itself pays the
  0.7 s, and those writes are scheduled when the page is idle (5.4).
- Compression costs more CPU than it saves, against quotas of tens of gigabytes, so there is none.
- The graph-format binary form (`snapshot().toBytes()`, 2 ms) is **not** an option for the data
  part: the store does not yet carry the arbitrary keys a record was imported with
  (`src/session/types.ts:681`), so it would drop every node and edge attribute.

## 5. What is saved, where and when

### 5.1 Entries and parts

An **entry** is the autosaved state of one element in one tab, for one project. ("Entry", not
"slot": `<slot>` already means something else to web-component developers.) It has a random id,
the autosave **key** (so different graphs on one site never mix), a meta record, and several
**parts**, each the JSON text of some project-document members:

| Part          | Members                                                                                     | Rewritten when                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`        | `graphty-data`                                                                              | `graph` changes                                                                                                                                                  |
| `run:<id>`    | one run of `graphty-results`                                                                | that run finishes, or `graph` changes; removed when the run is deleted                                                                                           |
| `arrangement` | `graphty-arrangement`                                                                       | `arrangement` or `pins` change, at layout rest and drag end, every 10 s while a layout moves on a visible page, in every write on hide, and when `graph` changes |
| `rest`        | session (now including column declarations), style, notes, view state (including selection) | any other slice, including `attributes`, in every write on hide, and when `graph` changes                                                                        |
| `stash`       | the consumer's stash (5.7)                                                                  | `stash()` is called                                                                                                                                              |

- **A `graph` change rewrites every part.** Arrangement, sets, notes, pins and results refer to node
  ids, so after nodes are added or removed they must be written together with the data.
- **Column declarations** become an additive, versioned field of the `graphty-session` member, so
  they are kept by file save and autosave alike. A unit test round-trips every `ProjectSlice`
  through save and open, so a slice the document drops is caught.
- The internal `write()` in `projectFile.ts` is split into one builder per member (and one per run
  for results), so a write builds only the parts it needs. Nothing public changes.

The meta record:

| Field                             | Meaning                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`, `key`                       | entry id and autosave key                                                                                    |
| `seq`                             | a per-key sequence number, set inside the commit transaction, used to order entries (never the device clock) |
| `gen`                             | commits to this entry so far; every write states the `gen` it expects (5.3)                                  |
| `revision`                        | the number of committed changes the stored state contains; it only goes up, and a restore continues from it  |
| `createdAt`, `savedAt`            | ISO 8601 UTC, for display only                                                                               |
| `name`, `nodes`, `edges`          | so a list can describe the entry without reading it                                                          |
| `dirty`                           | `project.dirty` at the time of the write                                                                     |
| `source`                          | digest of the load the entry's data came from (5.5)                                                          |
| `pageConfig`                      | one digest per attribute or property the page set, as it was when last written (5.5)                         |
| `ended`                           | `"replaced"` once the tab moved on to another project, else absent                                           |
| `restoreAttempts`                 | automatic restores started and not yet confirmed (5.5)                                                       |
| `formatVersion`, `elementVersion` | the entry format (1) and the graphty-element version that wrote it                                           |

### 5.2 When an entry starts and ends

**Starts:**

- at the first committed change after data arrives, when the data came from the page (the declared
  attributes, or rows the page assigned as properties). Reloading the page reproduces that data, so
  a page that only shows a graph costs nothing until the reader changes something.
- at once, when data arrives through a data call or `project.open()` (a file the reader picked, a
  pasted document, a URL the reader chose). Reloading the page cannot reproduce that, so it counts
  as work.

**Ends at a project boundary.** A boundary is an internal hook, fired only by the element's own
entry points that replace the whole project:

- `project.open()` called by the consumer or reader (never the restore's own call)
- a load that replaces the graph: `clearData`, a replacing load, `#replaceData`, `data.setSource`
- a page-supplied load that differs from the entry's `source` (5.5)

It is **not** `history:changed` with reason `clear`. Disposal, an unmount and a consumer's own
`session.history.clear()` (for example, to cap memory) never end an entry.

At a boundary the current entry is marked `ended: "replaced"` **in the same transaction as the new
entry's first commit**, so a kill in between leaves the old entry auto-restorable. Until that commit
lands, the old entry stays current. An ended entry is never restored automatically, but it stays
listed, so "I opened another file by mistake" can be undone by hand. It is the checkpoint before a
destructive replace.

### 5.3 Storage

- **Database.** IndexedDB database `graphty-autosave`, with three object stores:
    - `entries`: meta records, indexed by key and by `[key, seq]`
    - `parts`: keyed by `[entryId, part]`
    - `blobs`: any part over 1 MB, stored once per SHA-256 of its text and referenced from `parts`.
      Two tabs, a back/forward-cache move or a checkpoint of the same data then share one 14 MB copy.
      A blob is deleted in the same transaction that removes its last reference.
- **One readwrite transaction per write:** the meta record plus every unwritten part. A crash before
  the commit leaves the previous commit whole; a crash after it leaves the new one whole.
- **Fenced writes.** Every write states the `gen` it expects. The transaction reads the stored meta
  first and aborts if `gen` differs, then stores `gen + 1`. So a tab whose lock was taken over
  (5.6), a watchdog retry or the no-Web-Locks mode can never commit on top of another writer's
  commit, and an entry can never hold one writer's `data` beside another's `rest`. A rejected write
  moves this tab to a new entry holding its full in-memory state; nothing is lost.
- **The set of unwritten parts is cleared only in the transaction's `complete` handler**, as the
  parts that write carried minus anything changed since it was built. An aborted write (quota, the
  watchdog, `UnknownError`) leaves every part it carried unwritten, so the next write carries them
  again.
- **Durability `relaxed`**, the default. `complete` fires once the data reaches the OS buffer. That
  should survive a crash of the tab or the browser; no vendor says so, and the kill-after-`saved`
  tests in section 8 check it. `strict` is used only for the first write after adopting an entry of
  an older format (5.5).
- **"Saved" means the transaction's `complete` event fired**, never "the write was requested".
- **One connection, open while the page is visible.** `indexedDB.open` is the slow and buggy step in
  WebKit, so it must not run inside the hide handler. The connection is closed on `pagehide` and
  `freeze`, after any in-flight transaction completes (closing early aborts the transaction while
  reporting success, the bug tldraw fixed in its PR 10102), and reopened lazily. The browser tests
  check with NotRestoredReasons and `pageshow.persisted` that an idle open connection does not
  block the back/forward cache in Chromium and WebKit.
- **Main thread only.** Firefox for Android suspends workers in background tabs.
- **Never `localStorage` or `sessionStorage` for work.** Chromium commits localStorage to disk up to
  5 s late; a probe lost a late localStorage write and kept an IndexedDB write made at the same
  moment. sessionStorage dies with the tab. sessionStorage holds only this tab's entry id.

### 5.4 When it writes

1. **While visible.**
    - After `project:changed` or `stash()`, with a trailing debounce of 500 ms, and at most 2000 ms
      after the first unwritten change.
    - **A write that must carry the `data` part** (after a `graph` change) is scheduled with
      `requestIdleCallback`, at most 10 s after the change (option `dataMaxWaitMs`), because at
      50,000 nodes it costs about 0.7 s of main thread. Other changes made meanwhile join it.
    - One write runs at a time. A change that arrives during a write schedules one more write after
      it.
    - Writes are driven by events, never by a repeating timer. Chrome throttles hidden-page timers to
      once a minute, and Firefox for Android stops them.
2. **Immediately, with no debounce, whenever anything is unwritten:**
    - `visibilitychange` to hidden. It is the last event Safari, Android and a Chrome discard
      reliably give.
    - `pagehide`, and `freeze` (Chromium only)
    - `beforeunload` (5.6)
    - `disconnectedCallback`: the parts are built synchronously at the top of the callback, before
      `#graph.shutdown()`; only the IndexedDB commit finishes afterwards.
    - right after a run finishes, because that is expensive work
    - before a project boundary (5.2)

    Every write on hide also captures current positions and the selection. The write starts inside
    the handler, not on a timer. IndexedDB is asynchronous, so finishing that write is best effort;
    this is why step 1 carries the guarantee.

3. **Positions** are written at layout rest, at drag end, every 10 s while a layout moves on a
   visible page, and in every write on hide, never on every frame. There is no public "layout
   settled" event; an internal hook on `Arrangement.rest()` / `seal()` provides it.

**Cost at 50,000 nodes:** an ordinary write is about 10 to 20 ms of main thread and up to 2 MB;
a write after a data change is about 0.7 s and 14 MB, at idle; between writes, nothing. A benchmark
(not a timing test) holds these budgets, including three algorithm runs and a memory-peak line for
restore.

### 5.5 Recovery on the next load

When the element connects with autosave on, it does this before any data loads:

1. **Resolve the key** (5.6) and read `autosave-restore`.
2. **Hold every data input.** Declared attribute loads, rows the page assigns, and data calls wait
   until `autosaver.ready` resolves. Data calls return their usual promises; they settle later.
3. **List the entries** for the key. If the listing does not return within 3 s (a stuck WebKit
   database), the state becomes `failing` with `E_AUTOSAVE_STALLED`, `ready` resolves `null`, the
   held inputs load, and nothing is written until a later listing succeeds. A slow database never
   leaves the page blank.
4. **Pick a candidate.** Candidates have no `ended` and fewer than 2 `restoreAttempts`.
    - **This tab's own previous entry** comes first. Its id is kept in `sessionStorage` (which
      survives a discard-reload and the restore of a crashed tab) and in a per-tab registry in
      memory (for an element remounted in the same tab).
        - Held by an element of this same tab that is shutting down (a remount): wait for its lock,
          which is released once its final write commits.
        - Held by another tab (Chrome "Duplicate tab" and links opened with an opener copy
          `sessionStorage`; or a newer tab claimed it while this one was discarded): reading needs no
          lock, so copy that entry's last commit into a new entry and adopt the copy. **Never fall
          through to an unrelated entry.**
    - **A tab with no own entry** takes the newest by `seq`. If the newest is held by a live tab, it
      restores nothing and fires `graphty-autosave-available` with reason `"held-by-other-tab"`.
5. **Claim** the candidate by taking its Web Lock with `ifAvailable`. The claim is atomic: two tabs
   reloading at once never restore the same entry. The tab that loses tries the next candidate.
6. **Record the attempt:** commit `restoreAttempts + 1` to the entry's meta.
7. **Reassemble** the document from the parts and run the existing
   `project.open(text, { discard: true, limits: { fileBytes: Infinity } })`, with the boundary hook
   suppressed. Autosave can write an entry larger than `open()`'s 256 MB default limit, so the limit
   is lifted for its own entries.
8. **Put `dirty` and `revision` back** to the entry's values, through an internal hook on the save
   point. Then commit `restoreAttempts: 0`.
9. **Let the page's changed settings win.** For each attribute or property the page sets whose
   digest differs from the entry's `pageConfig`, the page's value is applied over the restored one
   (a developer who changed `layout="circular"` and reloaded sees the circular layout). Settings the
   page did not change keep the reader's restored choices. The names are reported as
   `pageOverrides`.
10. **Adopt** the entry: this tab keeps writing to it, starting from the `gen` it read. If the entry
    is an older `formatVersion`, the first write after adoption rewrites every part in one `strict`
    transaction; reading through `open()` and writing again is the whole migration.
11. **Release the held inputs**, one at a time:
    - **A load whose source digest equals the entry's `source`**, arriving before the reader's first
      change after the restore, is absorbed: it is skipped, because the restored work was built
      from that same data. This covers the page that fetches its rows and assigns them on every
      load, whether the rows arrive before or after the restore finished.
    - **A different load** is a project boundary (5.2): the restored entry ends as `"replaced"` and
      stays listed, the load applies, and `graphty-autosave-available` fires with reason
      `"page-data-changed"`. On the next reload the new entry has the new source, so it is absorbed;
      reloads never pile up junk entries.
    - The source digest is the attribute strings for declared loads, a hash of the rows for assigned
      rows, the URL for a URL load, name plus size plus `lastModified` for a file, and a hash of the
      text for a pasted document. Data that changed behind an unchanged URL keeps the reader's
      restored work; the documentation says so.
12. **Fire `graphty-autosave-restored`** and resolve `ready` with the same detail:
    `{ entry, savedAt, revision, report, wasDiscarded, navigationType, others, copiedFrom, pageOverrides }`.
    - `report` is the normal project-open report. Runs that were computing come back as
      `W_RUN_PENDING` and are not rerun: rerunning is an opinion, and an unseeded run would give a
      different answer.
    - `others` counts the other unheld, unended, dirty entries of this key, so a consumer can say
      that more work exists than what came back.
    - `wasDiscarded` and `navigationType` are facts only. The detail stays readable afterwards as
      `autosaver.restored`.

**Recovery never depends on `document.wasDiscarded`, crash detection or a "closed cleanly" marker.**
Safari and Firefox do not implement `wasDiscarded`; a kill or a crash is not a discard; an iOS
tab-switcher close sends nothing. Reopening the page always brings the work back.

**A restore that fails never looks like a fresh start, and never deletes anything:**

- **A malformed part, a format newer than this code** (a newer deploy wrote it), or a malformed
  version number (treated as incompatible): the entry is left untouched, and
  `graphty-autosave-available` fires with reason `"restore-failed"` and the problem's code.
- **A restore that kills the page** (iOS memory kill at the restore's memory peak, a GPU hang): the
  entry's `restoreAttempts` stays raised. At 2 the automatic restore skips it and fires
  `"restore-failed"`, so the reader reaches the page and can save a file or remove the entry.
- **A restore never deletes or rewrites an entry it could not read.**

`autosave-restore="manual"` (or `restore: "manual"`) turns automatic restore off; the element then
fires `graphty-autosave-available` with reason `"manual"` when entries exist, and the consumer calls
`autosaver.restore(id)`.

### 5.6 Tabs, locks, keys and the page lifecycle

- **One writer per entry.** The tab writing an entry holds the Web Lock
  `graphty-autosave:<key>:<entryId>`. A dead tab (discarded, crashed or closed) releases it. A
  frozen tab keeps it, so it is never mistaken for a dead one. Two tabs on the same project keep two
  entries; neither overwrites the other, and the fenced writes (5.3) cover the moments a lock
  changes hands.
- **Unmount and remount.** `disconnectedCallback` builds the final write synchronously, and the lock
  is released only after that write commits. An element connected later in the same tab with the
  same key waits for that lock (a waiting request, not `ifAvailable`) and restores the entry. An app
  that unmounts and remounts on a route change, or a React development remount, gets its work back.
  Moving the same element instance in the DOM disconnects it for good (4); that is an existing
  element limitation, tracked separately, and autosave still keeps the work for a new element.
- **The back/forward cache.**
    - On `pagehide` with `persisted` (the page is entering the cache), the tab releases its lock at
      once, because a held lock keeps the page out of the back/forward cache, and Chrome freezes the
      page right after `pagehide`, before a write started there can commit. Releasing it cannot mix
      an entry: every commit is fenced by the entry's generation, so of two writers the later is
      refused. On a real unload (`persisted` false) the lock is released once the write commits.
    - On `pageshow` with `persisted`, and on `resume`, it takes the lock back with `ifAvailable`;
      the two events arrive back to back, and they make one claim between them, not two.
    - If another tab claimed the entry meanwhile, this tab moves to a new entry and writes every part
      there. The two copies are duplicates; nothing is lost.
    - The element never adds an `unload` listener.
- **Holding the lock while merely hidden** also exempts the page from Chrome Energy Saver freezing.
  That is a side benefit; nothing relies on it.
- **Without Web Locks** (very old browsers), every entry except the tab's own counts as not live.
  The claim is best effort; the fenced writes still prevent a mixed entry, and a duplicate restore
  loses nothing.
- **The key.**
    - A string value of the `autosave` attribute is the key. `autosaveOptions.key`, when set, wins
      over it. Both are read when the listing starts, which is never earlier than the task after the
      element connected; for certainty, use the attribute.
    - A bare `autosave` uses `location.pathname + location.search + location.hash` plus the element's
      `id`. With no `id` and more than one autosaving element in the document, the element refuses:
      state `off`, problem `E_AUTOSAVE_KEY_AMBIGUOUS`. It never falls back to the element's position.
- **The unload guard** (option `unloadGuard`, read when it is first needed):
    - `"pending"`, the default when autosave is on. A `beforeunload` listener is registered only while
      a write is outstanding (including an idle-scheduled data write) or autosave is failing. It calls
      `preventDefault()` and starts the write. On desktop, the reader is asked before closing within
      that window or while writes fail. Once the write commits, the listener is removed: a healthy
      page never prompts, and the back/forward cache is never blocked.
    - `"unexported"`: the listener stays while `project.dirty`, for consumers who want a prompt
      whenever work exists only in the browser.
    - `"off"`.

    The guard has no effect on iOS, where `beforeunload` never fires; the documentation says so.
    Whether Firefox's automatic tab unloader and tab-suspender extensions honor the veto is checked by
    the lifecycle harness (9); until it passes, the documentation does not claim it, and nothing relies
    on it.

### 5.7 The stash: small consumer state saved with the work

Some of the reader's work is not project state, so the element cannot see it; the graphty app, for
example, keeps note text that is still being typed in React state.

- `autosaver.stash(name, value)` saves a small JSON value under a reverse-domain name. It marks the
  `stash` part unwritten and schedules the debounced write, so a draft typed just before the page is
  hidden is written with it. The `stash` part is small and separate, so typing never rewrites the
  arrangement.
- `autosaver.stashed(name)` reads it back. It is valid once `autosaver.ready` resolves.
- The documentation says API keys and other secrets must never be stashed.

### 5.8 Persistence, quota, retention and failures

- **Persistent storage.** `navigator.storage.persist()` is called only when the consumer asks:
  `persist: true` (once per page load, after the first write that follows a user gesture) or
  `autosaver.requestPersistence()`. Chrome and Safari decide silently; Firefox shows its own
  permission prompt, which is why it is not a default. `status.persisted` reports `true`, `false` or
  `null` (unknown) either way, from `navigator.storage.persisted()`.
- **Storage use** is read with `navigator.storage.estimate()` at start and at most once a minute
  after writes, and reported as `status.storage { usage, quota, entries, bytes }`, where `entries`
  and `bytes` are this key's.
- **Retention.**
    - **Autosave never deletes a dirty entry on its own**, by count, by age or to make room. Dirty means
      the work exists nowhere else.
    - Beyond 10 entries per key (`keep`), it deletes clean entries and entries whose content equals
      another entry's (duplicates), oldest `seq` first, ended ones first. It never deletes a held
      entry or the newest entry of any key.
    - There is no age limit; Safari's 7-day rule already expires idle storage. The consumer can remove
      entries with `remove()` and `discard()`.
- **On `QuotaExceededError`** (read from both `transaction.error` on abort and the request's error,
  since engines report it in different places): close that connection (Firefox refuses the next
  transaction on it with `InvalidStateError`), apply retention, then retry once. If that fails, the
  state becomes `failing` with `E_AUTOSAVE_QUOTA`; the last committed entry and the in-memory work
  are kept, the unload guard stays armed, and the next change retries.
- **Too large.** If building a part throws (V8's string length limit), the state becomes `failing`
  with `E_AUTOSAVE_TOO_LARGE`; the guard stays armed.
- **Watchdog.** A shipping Safari bug can wedge a database. If a write makes no progress (no request
  inside it completes) for 10 s, the state becomes `failing` with `E_AUTOSAVE_STALLED`; a write that
  is merely slow, on a page whose main thread is busy drawing a large graph, is never aborted; the element aborts the stuck
  transaction (overlapping transactions run in creation order, so a retry behind it would stall
  too), reopens the connection and retries once.
- **Lost connection.** After WebKit's storage process dies, every request fails with
  `UnknownError: Connection to Indexed Database server lost` until a reload. The element reopens
  once; if that fails, the state is `failing` with `E_AUTOSAVE_CONNECTION_LOST`, so the consumer can
  tell the reader to save a file or reload.
- **Private windows and partitioned storage.** No API reports a private window, so
  `status.ephemeral` is a hint: `"likely"` when OPFS `getDirectory` throws (Safari private), when
  the quota is sized from RAM (Chrome Incognito: under twice the JavaScript heap limit, since a
  fixed 1 GiB missed Incognito on machines with more than about 16 GB of memory), or when the element runs in a third-party iframe
  (`window.top !== window` and storage is partitioned, which Safari also clears); `"unknown"`
  otherwise.
- **Whole-origin deletion cannot be detected or prevented** from inside the origin: eviction under
  storage pressure, Safari's deletion after 7 days of Safari use with no interaction on the site,
  the reader clearing site data, the end of a private window. An evicted origin looks like a first
  visit. The only defense is a copy outside the origin: `project.save()` or `downloadProject()`
  today, and file mirroring later (section 10).
- **At-risk fact.** Once per page load, when `status.persisted === false` or
  `status.ephemeral === "likely"`, and work exists that was never saved to a file, the element fires
  `graphty-autosave-at-risk` with `{ code: "W_AUTOSAVE_ORIGIN_EPHEMERAL", params: { persisted,
ephemeral, unexported } }`. The simple path listens for it (section 3). On iPad the consumer may
  suggest a file copy or installing to the Home Screen (Home Screen apps are exempt from the 7-day
  rule).

## 6. Public API (all additive)

Recorded in `graphty-element/api/index.api.md` (`npm run api:report`). The four events are added to
the element's event map (`graphty-element.ts:4338`) and to `HTMLElementEventMap`, so `e.detail` is
typed.

### 6.1 Element

- Attribute and property **`autosave`**: present means on; a string value is the key.
- Attribute **`autosave-restore`**: `"auto"` (default) or `"manual"`.
- Property **`autosaveOptions`**: `Partial<AutosaveOptions>`, with no attribute.
- Property **`autosaver`**: `AutosaveApi`.
- Events (none fires at connect; read `autosaver.status` once, as with `graphty-project-status`):
    - **`graphty-autosave-status`**, detail `AutosaveStatus`, on every state change
    - **`graphty-autosave-restored`**, detail `AutosaveRestored`
    - **`graphty-autosave-available`**, detail `AutosaveAvailable`
    - **`graphty-autosave-at-risk`**, detail `CodedFact<"W_AUTOSAVE_ORIGIN_EPHEMERAL">`

### 6.2 Advanced path

```ts
interface AutosaveOptions {
    key: string; // overrides the attribute's key
    restore?: "auto" | "manual"; // "auto"
    delayMs?: number; // 500, debounce while visible
    maxWaitMs?: number; // 2000
    dataMaxWaitMs?: number; // 10000, for writes that carry the data
    keep?: number; // 10 clean or duplicate entries per key
    persist?: boolean; // false; true calls navigator.storage.persist()
    unloadGuard?: "pending" | "unexported" | "off"; // "pending"
    store?: AutosaveStore; // IndexedDB "graphty-autosave"
}

interface AutosaveApi {
    readonly status: AutosaveStatus;
    readonly ready: Promise<AutosaveRestored | null>; // settles once the restore is decided
    readonly restored: AutosaveRestored | null; // the last restore in this element
    flush(): Promise<void>; // resolves once committed
    list(): Promise<readonly AutosaveEntry[]>;
    restore(id: string, options?: { discard?: boolean }): Promise<ProjectOpenReport>;
    remove(id: string): Promise<void>; // refuses a held entry
    removeAll(): Promise<void>; // this key; held entries are skipped
    discard(): Promise<void>; // delete this tab's entry, reload the page's own data
    stash(name: string, value: unknown): void;
    stashed(name: string): unknown;
    requestPersistence(): Promise<boolean>;
}

interface AutosaveEntry {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly createdAt: string;
    readonly savedAt: string;
    readonly revision: number;
    readonly nodes: number;
    readonly edges: number;
    readonly dirty: boolean;
    readonly live: boolean;
    readonly ended?: "replaced";
}

interface AutosaveRestored {
    readonly entry: AutosaveEntry;
    readonly savedAt: string;
    readonly revision: number;
    readonly report: ProjectOpenReport;
    readonly wasDiscarded: boolean | null; // null where the browser does not say
    readonly navigationType: string | null;
    readonly others: number;
    readonly copiedFrom: string | null;
    readonly pageOverrides: readonly string[];
}

interface AutosaveAvailable {
    readonly entry: AutosaveEntry;
    readonly reason: "page-data-changed" | "held-by-other-tab" | "restore-failed" | "manual";
    readonly problem: CodedFact<string> | null; // set for "restore-failed"
}

interface AutosaveStatus {
    readonly state: "off" | "saved" | "pending" | "failing";
    readonly savedAt: string | null;
    readonly revision: number; // changes contained in the last commit
    readonly entry: string | null;
    readonly unexported: boolean; // the same as project.dirty
    readonly persisted: boolean | null;
    readonly storage: {
        readonly usage: number;
        readonly quota: number;
        readonly entries: number;
        readonly bytes: number;
    } | null;
    readonly ephemeral: "likely" | "unknown";
    readonly problem: CodedFact<AutosaveCode> | null;
}

/** A custom backend (OPFS, a server, an encrypted store) and the tests' fault-injecting store. */
interface AutosaveStore {
    list(key: string): Promise<readonly AutosaveEntryMeta[]>;
    read(id: string): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined>;
    /**
     * Atomic: every write commits, or none does. Rejects with AutosaveConflict when any entry's
     * stored gen differs from its expectedGen. Assigns each meta's seq inside the commit.
     */
    commit(writes: readonly AutosaveWrite[]): Promise<void>;
    remove(id: string): Promise<void>;
}

/** Part names and values are private to the element; a store keeps parts it does not recognize. */
type AutosaveParts = Readonly<Record<string, string | Uint8Array>>;

interface AutosaveWrite {
    readonly id: string;
    readonly expectedGen: number; // 0 for a new entry
    readonly meta: AutosaveEntryMeta;
    readonly parts: Readonly<Record<string, string | Uint8Array | null>>; // null removes a part
}

/** id, key, gen and seq are the store's to index; every other field is opaque and passed through. */
interface AutosaveEntryMeta {
    readonly id: string;
    readonly key: string;
    readonly gen: number;
    readonly seq: number;
    readonly [field: string]: unknown;
}
```

- `restore(id)` refuses when there are unsaved changes, with the existing `E_UNSAVED_CHANGES`,
  unless `discard` is passed, exactly as `project.open()` does.
- `discard()` ends and deletes this tab's own entry, then loads the page's declared data again: the
  supported "start over" path. During development, `autosave-restore="manual"` stops automatic
  restores.
- `AutosaveStore`, `AutosaveConflict` and a `memoryAutosaveStore()` are exported from `./extend`.
  Part values are typed `string | Uint8Array` now, so a later binary or chunked `data` part changes
  nothing in the public types.

### 6.3 Codes

Codes are neutral `{ code, params }`; the consumer writes the words. `status.problem` and thrown
`GraphtyError`s use the same code style as the project file:

| Code                          | Params                                 | When                                                            |
| ----------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `E_AUTOSAVE_UNAVAILABLE`      | `{ api: "indexedDB" }`                 | IndexedDB is missing or throws on open; state `off`             |
| `E_AUTOSAVE_KEY_AMBIGUOUS`    | `{ elements }`                         | a bare `autosave` on several elements without `id`; state `off` |
| `E_AUTOSAVE_QUOTA`            | `{ usage, quota }`                     | `QuotaExceededError` after retention                            |
| `E_AUTOSAVE_STALLED`          | `{ afterMs, step: "list" \| "write" }` | the listing or a write has not completed in time                |
| `E_AUTOSAVE_CONNECTION_LOST`  | `{}`                                   | the database connection is gone and reopening failed            |
| `E_AUTOSAVE_TOO_LARGE`        | `{ part }`                             | a part could not be built (string length limit)                 |
| `E_AUTOSAVE_FAILED`           | `{ name }`                             | any other write failure                                         |
| `E_AUTOSAVE_ENTRY_TAKEN`      | `{ id }`                               | `restore()` or `remove()` of an entry a live tab holds          |
| `E_AUTOSAVE_UNKNOWN_ENTRY`    | `{ id }`                               | `restore()` or `remove()` of a missing entry                    |
| `E_AUTOSAVE_FORMAT_NEWER`     | `{ formatVersion }`                    | an entry written by newer code; left untouched                  |
| `E_AUTOSAVE_RESTORE_CRASHED`  | `{ attempts }`                         | an entry whose automatic restore did not finish twice           |
| `W_AUTOSAVE_ORIGIN_EPHEMERAL` | `{ persisted, ephemeral, unexported }` | the at-risk fact (5.8)                                          |

Restore problems from the document itself use the existing `project.open` codes: `W_RUN_PENDING`,
the member problems and `E_UNSUPPORTED_VERSION`.

## 7. What the graphty app does

- **Turns autosave on.** It sets `autosave="<project key>"`, using its own project id from the Recent
  list, and `autosaveOptions = { persist: true }`.
- **Optionally shows the state:** a status chip from `graphty-autosave-status`, a "restored" notice
  from `autosaver.ready`, and a list of other autosaves from `autosaver.list()` (including the
  `others` count and ended entries).
- **Words the warnings** for `graphty-autosave-at-risk`, `graphty-autosave-available` and the
  `failing` codes, and decides whether to nudge toward saving a file or installing to the Home
  Screen.
- **Stashes the note draft** while the reader types:
  `graph.autosaver.stash("app.graphty.note-draft", text)`.
- **Nothing else.** No detection, no storage, no retry, and no startup load of its own that competes
  with the restore.

## 8. Ways work is lost, and what covers each

| Scenario                                                            | Browsers                                              | What protects                                                                                                   | How it is tested                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tab discarded (Memory Saver, urgent, extension, Edge sleeping tabs) | Chrome, Edge; Android often                           | continuous write, write on hide, restore on load                                                                | headed Chrome for Testing under xvfb: edit, open a second tab in front, assert a write committed after `visibilitychange`, discard through the test extension's `chrome.tabs.discard`, then through `chrome://discards` urgent discard, reactivate, assert `wasDiscarded` and the restore of the tab's own entry while a newer entry from another tab exists |
| Firefox low-memory unloader                                         | Firefox desktop                                       | continuous write; the `beforeunload` veto while a write is pending, if the harness confirms it                  | geckodriver with `-remote-allow-system-access`, Marionette chrome context: `TabUnloader.unloadLeastRecentlyUsedTab()` while pending (assert not unloaded) and after `saved` (assert unloaded and restored on reselect)                                                                                                                                       |
| Frozen, then killed                                                 | Chrome Energy Saver, Android, Safari after about 20 s | the writes on hide and on `freeze` have already committed                                                       | raw CDP `Page.setWebLifecycleState frozen`, assert the page logged `freeze`, kill the renderer                                                                                                                                                                                                                                                               |
| Process killed (out of memory, jetsam, Android lmkd)                | iPad Safari often; Android; all                       | continuous write                                                                                                | renderer `SIGKILL` after an edit at 1,000, 50,000 and 100,000 nodes; Playwright WebKit with the web process killed by pid; iPad protocol for jetsam                                                                                                                                                                                                          |
| Renderer or GPU-process crash                                       | all                                                   | same as above; GPU state is never the source of truth                                                           | CDP `Page.crash`                                                                                                                                                                                                                                                                                                                                             |
| Browser or OS killed                                                | all                                                   | a relaxed commit is in the OS buffer                                                                            | `SIGKILL` the browser root process, relaunch on the same profile, assert; once with `--restore-last-session` so the own-entry path is covered too                                                                                                                                                                                                            |
| Close, reload, navigate away                                        | all                                                   | write on hide and `pagehide`; on desktop, a `beforeunload` prompt only within the write window or while failing | close after `saved`, and close while `pending`, with `page.close({ runBeforeUnload: true })`; dialog appears while pending, none after `saved`                                                                                                                                                                                                               |
| Tab closed from the iOS tab switcher                                | iPad Safari                                           | continuous write                                                                                                | iPad protocol                                                                                                                                                                                                                                                                                                                                                |
| Element unmounted and remounted                                     | all                                                   | final write built before shutdown; the same tab waits for the lock                                              | browser test: edit, remove, add a new element with the same key in the same task and after it, assert the work restores and no extra entry exists                                                                                                                                                                                                            |
| Two tabs on one project                                             | all                                                   | one entry per tab, Web Lock claim, fenced writes                                                                | pages in one browser context: interleaved edits, N pages reloading together, an old tab focused after a new one writes, a duplicated tab; no restored entry id twice, every unended entry restored or listed                                                                                                                                                 |
| A write left over from a tab that lost its lock                     | all                                                   | fenced writes                                                                                                   | unit test: hold a write in the fault store, hand the lock to a second session, release the first write; it is rejected and the entry holds one writer's state                                                                                                                                                                                                |
| Mixed entry from the part mapping                                   | all                                                   | every `graph` change rewrites every part; unwritten parts cleared only on `complete`                            | oracle test (9)                                                                                                                                                                                                                                                                                                                                              |
| Write aborted midway                                                | all                                                   | aborted parts stay unwritten                                                                                    | fault store aborts the write carrying `data`; reload asserts every part agrees                                                                                                                                                                                                                                                                               |
| Restore kills the page                                              | iPad most likely                                      | `restoreAttempts`                                                                                               | unit test: two restores that never confirm, third load fires `"restore-failed"`                                                                                                                                                                                                                                                                              |
| Page's startup load races the restore                               | all                                                   | inputs held until `ready`; same-source loads absorbed                                                           | browser test: fetch, assign rows, edit, reload with the rows assigned before and after the restore finishes; edit is kept and no new entry appears                                                                                                                                                                                                           |
| Quota full                                                          | all                                                   | keep the last good entry, `E_AUTOSAVE_QUOTA`, guard armed                                                       | Chromium `Storage.overrideQuotaForOrigin`; Firefox `dom.quotaManager.temporaryStorage.fixedLimit` (KiB) in the profile's `user.js`; WebKit by fault store only                                                                                                                                                                                               |
| IndexedDB stuck or its connection lost                              | Safari                                                | discovery timeout, watchdog abort and retry, `E_AUTOSAVE_CONNECTION_LOST`                                       | fault store that never completes, and one that fails with `UnknownError`                                                                                                                                                                                                                                                                                     |
| New deploy while a tab is open                                      | graphty.app                                           | each tab writes its own entry; a newer format is left untouched and reported                                    | unit test with an entry of a higher `formatVersion`                                                                                                                                                                                                                                                                                                          |
| Long operation fails midway                                         | all                                                   | runs apply only when they finish; transactions roll back                                                        | inject a throw; assert the model and the entry are unchanged                                                                                                                                                                                                                                                                                                 |
| Opened another project by mistake                                   | all                                                   | the old entry kept as `ended: "replaced"`, ended in the new entry's first commit                                | unit test for each boundary path: open, replacing load, `clearData`, `setSource`                                                                                                                                                                                                                                                                             |
| Eviction, Safari 7-day rule, cleared data, private window ended     | Safari tabs; all                                      | cannot be prevented; `persisted`, `ephemeral`, `unexported` and the at-risk event                               | CDP `Storage.clearDataForOrigin` (fresh start, no crash); iPad protocol                                                                                                                                                                                                                                                                                      |
| GPU context or device lost                                          | all                                                   | data unaffected; Babylon restores WebGL; the WebGPU rebuild is issue #793                                       | `WEBGL_lose_context`; `device.destroy()`                                                                                                                                                                                                                                                                                                                     |
| Change made while hidden                                            | all                                                   | event-driven writes, not timers                                                                                 | headed Chromium with throttling on: a run finishes while hidden, assert it committed by counting writes, with no debounce timer having fired                                                                                                                                                                                                                 |
| Memory pressure without a kill                                      | all                                                   | nothing to lose                                                                                                 | `Memory.forciblyPurgeJavaScriptMemory` with 100,000 nodes; assert no loss. Memory kills are the `SIGKILL` rows                                                                                                                                                                                                                                               |

**The invariant every kill test asserts.** Edit number i sets node attribute `probe` to i. The page
logs every `saved` with its `revision`. After the page is killed and reopened:

- the restored `revision` is at least the last revision logged as `saved`
- every node's `probe` equals the restored revision, which shows the restore is whole
- no restore deleted an entry

Every lifecycle test first proves its trigger happened: `wasDiscarded` for a discard, the `crash`
event or a new renderer pid for a kill, the logged `freeze` event for a freeze, the logged
`visibilityState` for hiding. Tests wait on conditions (the status, counted store writes) and assert
counted work, never elapsed time or millisecond offsets.

## 9. Test infrastructure

- **Unit tests (Node, every pull request).**
    - **Tools:** `memoryAutosaveStore` with fault injection (quota, a write that never completes,
      abort of the write carrying `data`, a corrupt part, a newer format, `UnknownError`, a held
      write), fake locks, and an internal scheduler and clock seam (not public).
    - **With the fake clock:** one write per burst; a forced write at the maximum wait; the data write
      at idle or at `dataMaxWaitMs`; `E_AUTOSAVE_STALLED` followed by exactly one abort, reopen and
      retry; at most one `estimate()` per minute.
    - **Coverage:** the part mapping (a style edit writes no `data` and makes zero `nodes()` calls);
      every `ProjectSlice` round-trips through save and open; entry start and boundaries; `dirty` and
      `revision` restored; the atomic claim between two sessions; fencing; the absorb rule;
      `pageOverrides`; retention never deletes a dirty, held or newest entry; `restoreAttempts`.
    - **Oracle test.** A seeded random sequence of every slice and cause (including layout rest, drag
      end, run finish, stash and each boundary). After every committed write, the entry reassembled
      from the store is compared member by member with a fresh full `project.save()` of the live
      session. On failure it prints the seed and the shrunk sequence.
- **In-page browser tests (Vitest browser mode, every pull request).** Only tests that never reload,
  close or kill their own page, because Vitest runs each test in an iframe of its runner page: the
  IndexedDB store, two sessions in one page, the unmount and remount, quota through the fault store.
  graphty-element's browser projects run Chromium only today; Firefox and WebKit instances are added
  for these tests.
- **Lifecycle tests (Node with Playwright's library API; a new CI shard).** Every test that reloads,
  closes or kills a page. Each starts Chromium, Firefox and WebKit with
  `launchPersistentContext(userDataDir)`, serves a fixture page, and reads results from the reopened
  page with `page.evaluate`. WebKit's web process is killed by pid, found under the browser this test
  launched (on Linux, `WebKitWebProcess`).
- **Chromium lifecycle harness (raw CDP from Node, about 100 lines, no new dependency).**
  Playwright's Chromium launch adds `--disable-back-forward-cache`,
  `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows` and
  `--disable-renderer-backgrounding`, so a back/forward-cache or background test under it passes
  without testing anything. The harness launches Chrome for Testing itself without those flags
  (branded Chrome no longer loads extensions from the command line), in Chrome's headless mode,
  which is the full browser without a window system: discarding, freezing, the back/forward cache
  and session restore all work there, each test proves its trigger happened, and the same run works
  on a workstation and a runner with no X server. With `DISPLAY` set it runs headed. It covers
  freezing, background targets, the discard extension and `chrome://discards`, renderer and browser
  `SIGKILL`, quota, clearing data and the memory purge. **Back/forward cache test:** navigate away,
  listen for `Page.backForwardCacheNotUsed`, go back, assert the event did not fire and
  `pageshow.persisted` is true; once in `saved` and once right after an edit. Firefox and WebKit
  assert `pageshow.persisted` only.
- **Firefox harness.** geckodriver (a new CI dependency) for the unloader tests in section 8. If it
  cannot be added, the veto claim stays documented as untested.
- **Release train and nightly, on macOS (`hosts.yml`, never on pull requests; each job has a time
  limit, since macOS minutes cost about ten times Linux).**
    - First, one 5-minute job checks whether IndexedDB persists across safaridriver sessions. If not,
      as expected, kill and relaunch tests run on Playwright's macOS WebKit with a persistent context.
    - **Real Safari** (Xcode 26 pinned) covers what only Safari has, each within one safaridriver
      session: the hide transition (minimize through `osascript`, assert a write committed after
      `visibilitychange`), stall detection and `persist()` results. Any WebContent kill is by pid from
      the process tree of that Safari, never by name.
    - **iOS Simulator.** A self-driving fixture page applies N scripted edits from URL parameters,
      waits for `saved`, and posts `{ revision, phase }` to a local collector. The run opens it with
      `simctl openurl`, waits for the beacon, presses Home (asserts a `hidden` beacon), terminates
      Safari, opens it again and compares the `restored` beacon with the last `saved` one. The
      Simulator has no jetsam killer and no 7-day rule; those stay with the iPad.
- **Nightly, optional.** Chrome on an Android emulator (KVM runner, `adb` CDP forward, `am kill`).
  Firefox for Android is not automated; its claims are marked so in the documentation.
- **The owner's iPad (manual, about 15 minutes).** A diagnostics story in graphty-element's
  Storybook logs every lifecycle event, every `saved` revision, `wasDiscarded` and the restore report
  to its own IndexedDB and, so that an evicted origin does not erase the evidence, to a collector
  started through servherd. A checklist gives the expected outcome per case, so the run produces a
  pass or fail record.
    - **Cases:** switch apps for 1 minute, 10 minutes and overnight; close the tab from the tab
      switcher; Stage Manager; the same as a Home Screen app; a private window; a 100,000-node import
      followed by an app switch.
    - **Platform questions it answers:** whether `persist()` is granted in a tab or a Home Screen app;
      whether a granted `persist()` escapes the 7-day rule; what IndexedDB does in a private window;
      the memory level at which the iPad kills the page.
- **Benchmark (not a test).** Write cost at 10,000, 50,000 and 100,000 nodes with 3 runs, in all
  three engines, against the budgets in 5.4; the memory peak of a restore; and how often the write on
  `pagehide` lands per engine (recorded, never asserted).

## 10. Phases

1. **Core.** Chromium, Firefox and WebKit green.
    - per-member and per-run builders that never read `nodes()` or `edges()` outside the data part;
      column declarations in the session member; the build-time version
    - the IndexedDB store with fencing, shared blobs and one connection; entries, locks and keys
    - the write schedule, idle data writes and the lifecycle triggers, including unmount
    - recovery: held inputs, `ready`, the absorb rule, page overrides, `restoreAttempts`, own-entry
      copies
    - the boundary hook; the unload guard, the stash, `requestPersistence()` and the status facts
    - the codes, the element attributes, property and the four typed events
    - unit, oracle, in-page browser, lifecycle and Chromium-harness tests
2. **Safari, Firefox harness and the app.**
    - the macOS jobs, the iOS Simulator run, the iPad protocol and the diagnostics story
    - the geckodriver unloader tests
    - the benchmark
    - the graphty app turning autosave on and stashing note drafts
3. **Beyond the origin, and beyond state.**
    - `autosaver.mirrorTo(fileHandle)`: write the project document to a file the reader chose
      (Chromium only; the picker stays in the app)
    - a `data` part chunked by row ranges, so a single edit at 100,000 nodes rewrites one chunk
    - persisting a bounded undo history
    - lowering memory while hidden to reduce iOS kills, once measured
    - the WebGPU rebuild of issue #793

**Left out on purpose:**

- **Measures that keep the page alive** (audio, notifications, title changes, the freezing origin
  trial). They fail against the worst cases, and the reader can see them. They are documented for
  consumers and are never defaults.
- **A per-edit journal replayed on recovery.** The project document already round-trips, and the
  split into parts makes writes cheap. A second, replay-based reader would be one more thing to keep
  correct. Revisit if a `rest` write regularly costs more than 16 ms.
- **Storage Buckets, OPFS and the Cache API as backends.** They face the same eviction as IndexedDB.
  A consumer who wants them can use them through `AutosaveStore`.
- **Merging between tabs, or live sync.** One entry per tab already makes overwrites impossible.
- **AI conversations.** They get their own IndexedDB store on the branch of pull request #1998, and
  can join the entry later as an extra part.

## 11. Residual risk

- **Edits after the last commit,** when the page dies with no event (an iOS kill, a tab-switcher
  close, a crash). While visible and editing continuously, up to 2 s plus one write is lost; after a
  change to the data itself, up to 10 s plus one write (about 0.7 s at 50,000 nodes on desktop,
  several seconds on an iPad).
- **Work never committed:** a gesture in progress when the page dies (an app switch mid-drag), and
  runs still computing, which come back as `W_RUN_PENDING`. Selection changes are written only with
  another change or on hide.
- **No undo across a restore.** The history lives in memory; a destructive edit committed just
  before a kill cannot be undone after the restore.
- **Power loss** can lose writes the OS had not flushed (about 2 s). This cannot be tested in CI.
- **Whole-origin deletion** loses everything not saved to a file. The element reports when that risk
  exists; only a file copy removes it.
- **Storage failing for a long time** (a full quota, a stuck database, a lost connection). Nothing is
  written until it recovers. The failure is reported, and on desktop the reader is asked before
  closing; on iOS no prompt exists.
- **A large data write on hide** at the moment iOS is most likely to kill the page raises peak memory.
  Chunking the data part (phase 3) is the remedy if the iPad protocol shows it matters.

## 12. Changes from earlier designs

- **Issue #818 and the earlier "one writer per project with a lease":** replaced by one entry per
  tab, with one writer by construction and fenced writes. Two tabs on one project never conflict,
  and no read-only tab is needed.
- **The autosave envelope with content-addressed members:** satisfied by the project document,
  split into parts that change at different rates, with large parts stored once per content hash.
- **`file-project.md` section 5 ("the current session and the last 5 for 7 days"):** now no dirty
  entry is ever deleted automatically, at most 10 clean or duplicate entries per key, and no age
  limit. Its "off by default in the element, on in the app" is kept.
- **Checkpoints kept only in the autosave:** an ended entry is that checkpoint.

## 13. Decision for the owner

**Autosave is off by default in graphty-element** and turned on by one attribute. This follows the
rule that the element's defaults are the neutral behavior of the mechanism: here, writing nothing to
the reader's device. For the same reason `persist` is off by default (Firefox shows a prompt).

Turning autosave on by default later would change a default. That is a breaking change and needs a
major release. If every third-party consumer should get protection without even adding the
attribute, decide that now; otherwise nothing is needed.

Everything else here is additive and internal. The stored format is versioned, private to the
element, and not a published file format.

## Appendix A. Review findings not taken, or taken differently

- **Store `data` as graph-format bytes from the start:** rejected; the snapshot drops node and edge
  attributes (`types.ts:681`). Idle scheduling, and chunking in phase 3, address the cost instead.
- **Keep the previous generation of every part (A/B) to undo a destructive edit after a crash:**
  rejected; it doubles storage for a rare case. Ended entries cover a destructive replace, and a
  bounded undo history is planned in phase 3.
- **A byte budget for the whole database (for example 25% of the quota):** rejected; enforcing it
  would mean deleting dirty work, which this design never does. Shared blobs remove most
  duplication, and `status.storage` reports use so the consumer can act.
- **OPFS or the Cache API as a second backend while IndexedDB fails:** rejected for now; it is a
  second store to keep correct and faces the same eviction. Failures are reported, and a consumer
  can plug one in through `AutosaveStore`.
- **Adopting an entry always rewrites every part:** not needed; fenced writes already reject a
  stale writer. Only an older-format entry is rewritten whole.
- **A `writer` id in the meta for fencing:** `gen` alone is enough, since every commit changes it.
- **Rename the key property instead of the API object:** the API object is renamed to `autosaver`;
  `autosave` stays, matching its attribute.
- **Delay `persist()` to an explicit call only:** taken differently; both `persist: true` and
  `requestPersistence()` exist, and the default is off.
- **An `autosave-unload-guard` attribute:** not needed; the guard is read when it is first needed,
  long after any script sets `autosaveOptions`.
- **Listing `memory_pressure` on macOS as coverage:** dropped; it does not kill Safari tabs on demand.
- **Keep the 2-hour background run:** replaced by the "change made while hidden" test, which
  asserts what the long run could not.
- **Making the same element instance survive a DOM move:** out of scope; it is an existing element
  limitation (a disconnected element is shut down), tracked separately.
