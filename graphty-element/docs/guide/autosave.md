# Autosave

Browsers throw pages away. A background tab is discarded to save memory, a frozen page is killed,
iPad Safari's page process is ended while the reader is in another app, a tab crashes, a reader
closes the wrong tab. Without autosave, everything the reader did since the last file save goes
with it.

With the `autosave` attribute, graphty-element keeps the reader's work in the browser as it
changes, and brings it back the next time the page loads: after a reload, a closed tab, a
discarded tab or a crash. Your page writes no storage, lifecycle or recovery code.

## The simple path

```html
<script type="module">
    import "@graphty/graphty-element";
</script>

<graphty-element
    autosave="acme.org-chart"
    node-data='[{"id": "a"}, {"id": "b"}]'
    edge-data='[{"source": "a", "target": "b"}]'
></graphty-element>
<p id="status"></p>

<script type="module">
    const element = document.querySelector("graphty-element");
    const status = document.getElementById("status");

    // Optional: show the state. The words are yours.
    const words = { saved: "All changes saved", pending: "Saving...", failing: "Not saved", off: "" };
    const show = (s) => (status.textContent = words[s.state]);
    show(element.autosaver.status); // the status event does not fire at start
    element.addEventListener("graphty-autosave-status", (e) => show(e.detail));

    // Optional: say when work came back, and when only a file copy keeps it safe.
    element.autosaver.ready.then((restored) => restored && console.log("Restored work from", restored.savedAt));
    element.addEventListener("graphty-autosave-at-risk", () => console.log("Suggest saving a file"));
</script>
```

That is all. The listeners are optional.

- **The key** (`acme.org-chart`) names whose work this is. It is shared across your whole site, so
  use a namespaced key. Elements with different keys never see each other's work.
- **A bare `autosave`** keys by the page's address (path, query and fragment) and the element's
  `id`. Two bare elements without an `id` on one page refuse, with `E_AUTOSAVE_KEY_AMBIGUOUS`:
  give them ids or keys.
- **Off by default.** Without the attribute nothing is written to the reader's device.

## What it keeps, and when

Everything a [project file](./project-file) keeps: the data, the layout and pinned positions,
algorithm results, style layers, notes, saved views and settings. It is stored in IndexedDB
(database `graphty-autosave`), one entry per tab, so two tabs on one project never overwrite each
other.

- A change is written within half a second while the page is visible, and a change to the graph's
  data itself within 10 seconds, when the page is idle.
- Everything is written again at once when the page is hidden, closed or frozen, and when the
  element is removed.
- A drag, a slider or any other gesture is written once, when it ends.

## What comes back

When the element connects, it lists the saved entries for its key and restores this tab's own
entry (or, in a new tab, the newest one) before any data loads. `autosaver.ready` resolves with
what came back, and `graphty-autosave-restored` fires with the same detail:

```javascript
const restored = await element.autosaver.ready;
if (restored !== null) {
    const { savedAt, revision, others, pageOverrides } = restored;
}
```

Data your page supplies (the `node-data` and `edge-data` attributes, rows you assign to
`nodeData` and `edgeData`, the `data-source` pair) waits for that decision. If it is the same data
the restored work was built from, it is skipped, so a page that fetches its rows and assigns them
on every load keeps the reader's work. If it differs, it replaces the work, and the replaced entry
stays listed (`autosaver.list()`) and fires `graphty-autosave-available` with reason
`"page-data-changed"`.

Data behind an unchanged address is compared by the address only: if the file at the same URL
changed, the reader's restored work is kept. Change the URL (or the key) when the data changes.

Data calls (`addNodes`, `loadFromUrl`, `loadFromFile` and the rest) also wait for the decision,
then run as ordinary changes.

Restored work that was never saved to a file stays unsaved (`session.project.dirty` is true).

## Choices

| Option, on `autosaveOptions` | Default       | What it does                                                                     |
| ---------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `key`                        | the attribute | the key, overriding the attribute's value                                        |
| `restore`                    | `"auto"`      | `"manual"` restores nothing by itself; see below                                 |
| `delayMs`, `maxWaitMs`       | 500, 2000     | the debounce of a write while visible, and the most a change waits               |
| `dataMaxWaitMs`              | 10000         | the most a change to the graph's data waits                                      |
| `keep`                       | 10            | entries per key beyond which clean ones are deleted; unsaved work never is       |
| `persist`                    | `false`       | ask for persistent storage after the first write that follows a reader's gesture |
| `unloadGuard`                | `"pending"`   | when to ask the reader before the page closes; see below                         |
| `store`                      | IndexedDB     | a store of your own (`AutosaveStore` from `@graphty/graphty-element/extend`)     |

`autosave-restore="manual"` (or `restore: "manual"`) turns automatic restore off: the element fires
`graphty-autosave-available` with reason `"manual"` when an entry exists, and you call
`element.autosaver.restore(id)`. Use it while developing a page if a restored element gets in the way;
`element.autosaver.discard()` deletes this tab's entry and loads the page's own data again.

## Asking before the page closes

While a write is outstanding or failing, the element asks the reader before the page closes (a
`beforeunload` listener). Once the write commits the listener is removed, so a healthy page never
asks and stays eligible for the browser's back/forward cache.

- `unloadGuard: "unexported"` asks whenever the work was never saved to a file.
- `unloadGuard: "off"` never asks.

**On iPhone and iPad no browser ever asks:** `beforeunload` never fires on iOS. The work is still
kept, because it is already written.

## Storage the browser may delete

A browser can delete a site's storage as a whole: under storage pressure, when the reader clears
site data, at the end of a private window, and in Safari after seven days of use without a visit
to the site (Home Screen apps are exempt). Nothing inside the page can prevent that; only a file
copy survives it.

- `element.autosaver.status.persisted` says whether the browser granted persistent storage.
  `element.autosaver.requestPersistence()` asks for it (Firefox shows the reader a prompt), and so
  does `autosaveOptions = { persist: true }`, once per page load.
- `status.ephemeral` is `"likely"` in what looks like a private window or another site's frame.
- `graphty-autosave-at-risk` fires once per page load when work that was never saved to a file is
  in storage that is not persisted, or probably private. Its detail is
  `{ code: "W_AUTOSAVE_ORIGIN_EPHEMERAL", params: { persisted, ephemeral, unexported } }`. That is
  the moment to suggest saving a file (`element.downloadProject()`).

## Your own state: the stash

Some of the reader's work is not in the graph: a note still being typed in your own panel, say.
Save it with the work:

```javascript
element.autosaver.stash("org.example.note-draft", textarea.value);
// after a restore:
await element.autosaver.ready;
textarea.value = element.autosaver.stashed("org.example.note-draft") ?? "";
```

The value is any small JSON value, under a reverse-domain name. **Never stash API keys, passwords
or other secrets:** the stash is stored unencrypted in the reader's browser.

## The entries

```javascript
const entries = await element.autosaver.list(); // this key's entries, oldest first
await element.autosaver.restore(entries[0].id, { discard: true }); // open one by hand
await element.autosaver.remove(entries[0].id); // refuses one another tab is writing
await element.autosaver.removeAll();
await element.autosaver.flush(); // write everything now
```

`restore()` refuses with `E_UNSAVED_CHANGES` when the current work was never saved to a file,
unless `discard: true` is passed; the current work then ends and stays listed. `remove()` and
`restore()` refuse an entry another tab is writing with `E_AUTOSAVE_ENTRY_TAKEN`, and a missing
one with `E_AUTOSAVE_UNKNOWN_ENTRY`.

## Status and codes

`element.autosaver.status` is `{ state, savedAt, revision, entry, unexported, persisted, storage,
ephemeral, problem }`, and `graphty-autosave-status` fires whenever it changes (never at connect).
`state` is `"off"`, `"saved"`, `"pending"` or `"failing"`; `problem` is a `{ code, params }` fact:

| Code                         | When                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `E_AUTOSAVE_UNAVAILABLE`     | the browser has no IndexedDB; state `"off"`                    |
| `E_AUTOSAVE_KEY_AMBIGUOUS`   | a bare `autosave` on several elements without an `id`; `"off"` |
| `E_AUTOSAVE_QUOTA`           | the storage quota is full, even after old clean entries went   |
| `E_AUTOSAVE_STALLED`         | the database did not answer in time                            |
| `E_AUTOSAVE_CONNECTION_LOST` | the database connection is gone; a reload brings it back       |
| `E_AUTOSAVE_TOO_LARGE`       | part of the project is too large for the browser to write      |
| `E_AUTOSAVE_FAILED`          | any other write failure                                        |

While `failing`, the work is still in memory, the last good entry is kept, and the next change
tries again.

See [Events](./events#autosave-events) for the four events.
