# Item 10, the project file: security and privacy review

Scope: `session.project` and the version 1 project file in `element-api-decisions.md` section 10
(lines 450-563), against graphty-element on master and the published document design in
`design/documents/`. Scratch: `tmp/api-review/security-10/size.mjs` and `size.log`.

## 1. Item 10 is a second, unhardened file format beside one that already has a trust model (blocking)

`design/documents/` already specifies the one JSON file graphty-element writes and opens
(`README.md:337-344`: `<name>.graphty.json`, `"kind": "graphty-document"`, members `graphty-style`,
`graphty-recipe`, `graphty-data`, `graphty-notes`). That design carries a "Trust" section
(`README.md:384-407`) and a "Limits" section (`README.md:411-445`): a 64 MB file cap and 64-level
nesting checked before parsing, `__proto__` and repeated names refused, nothing fetched, text
rendered as text, own-name lookups only. Item 10 cites none of it and states no limit, no
`__proto__` rule, no depth rule and no text rule. Its file is `"format": "graphty-project"`, a third
recognition key beside `kind` and the kindless 2.x style file.

- **Exploit:** every rule the document design already settled has to be re-decided for the new
  format, and whatever is forgotten is the hole. A reader that opens both formats has two parsers
  to keep in step.
- **Fix:** make the project file a `graphty-document` with new members (results, positions,
  view, sets, views, visibility, app), so it inherits the trust and limit rules, the report shape
  and the error codes. If a separate format really is needed, copy the Trust and Limits sections
  into item 10 by reference, rule by rule.

## 2. The hardened reader exists only for notes; styles and everything new would go through unguarded code (major)

`session/notes/document.ts:66-118` copies a member before reading it. The copy refuses
`__proto__`, accessors and shared objects, and caps nesting at 64. Nothing else in `session/` does
this: `grep __proto__` finds only `notes/document.ts` and `notes/validate.ts`. The style path that
item 10 reuses ("`styles.toDocument()`") checks only the version and the palettes
(`session/styles/StylesApi.ts:871-900`). It has no layer cap, no expression-length cap and no
`__proto__` rule, although `README.md:420-428` requires all three.

- **Exploit:** a stranger's project file with `"results": { "__proto__": {...} }`, or a style
  layer with a 100,000-level selector, reaches code that was never written for hostile input.
  Results keyed by run id, `sets`, `views` and `visibility` are maps keyed by strings from the
  file, so every one of them can be keyed `__proto__` or `constructor`.
- **Fix:** item 10 has to say that `open()` copies the whole file with the notes reader's
  `memberCopy` before any part is applied, and that the Limits section applies to every part.
  The style path needs the same guard on its own, whatever happens to item 10.

## 3. `open(string | URL)` fetches, which the document design forbids (major)

`README.md:394-395` says "Nothing is fetched." Item 10's `open` takes a `URL`, and does not say
whether a `string` is JSON text or an address (the blind author had to guess, guess 2).
`DataSource.fetchWithRetry` (`data/DataSource.ts:337`) already fetches any URL, `data:` included.

- **Exploit, browser:** a page that does `project.open(params.get("project"))` lets a link load
  any address the visitor's browser can reach, with the page's origin and cookies. That covers an
  intranet host behind the visitor's firewall. The response then becomes the visitor's session.
- **Exploit, Node:** a headless `createGraphSession()` service that opens projects submitted by
  others turns `open(url)` into a request to whatever host that service can reach.
- **Fix:** `open(source: Blob | File | string)`, where the string is always the file's text. A
  caller who wants an address calls `fetch` itself and passes the result, which keeps the consent
  and the network policy with the caller.

## 4. Saving inlines the data, the notes and the source address by default, and leaks them (major)

Item 10's `save()` has no options except `app`, and it writes `data.nodes`, `data.edges`,
`data.source`, `notes`, `selection` and every result. The document design decided the opposite on
purpose (`container.md:333-342`): data and notes are never written unless the caller asks, and
`report.leftOut` lists what was held back, "so a file for sharing a technique does not carry the
data by accident."

- **Exploit:** the intelligence analyst persona (`intelligence-analyst.yaml:6`, classified travel
  and finance records; `:38`, "Inability to save and share investigation state") saves to share
  the analysis with a colleague. The file carries every record and every note.
- **Notes carry names:** each note carries its `author`
  (`session/notes/types.ts:83-84`), so the file also says who judged which entity what.
- **The source address leaks too:** `data.source()` returns `config` minus `data` and `file`,
  but including `url` (`session/types.ts:558-567`). A pre-signed object-store URL or a URL with
  an API key in its query string is written into the file in plain text.
- **No save report:** item 10's `save()` returns a bare Blob, so the caller cannot see what was
  written.
- **Fix:** `save()` takes a `parts` choice and returns `{ blob, report }`, where the report lists
  what was written and what was left out. For the share case, data and notes are written only
  when the caller asks. `data.source.config` is never written, or only an allow-list of it
  (`type`, `name`, `size`), with any query string stripped from the URL.

## 5. Results reopen as computed without being computed: a file can forge an analysis (major)

"Results are stored as columns, so a reopen recomputes nothing." The file supplies both the run id
key and the run description (`algorithm`, `params`, `scope`, `seed`, `label`), and the values.
`session/runs/runId.ts:1-25` derives a run's id from the algorithm, whether it is exact, and the
scope. Item 10 does not say that the reader re-derives that id and compares it with the key. It
also does not say that each column's length is checked against the node count, or that the values
are checked against the algorithm's declared fields (finite numbers, the right type).

- **Exploit:** a shared file labels hand-picked values `pagerank` over the whole graph. The
  reader's styles, legend, table and Analyze panel show them as graphty-element's own
  computation. A column one element short shifts every value after the gap onto the wrong node
  ("by node order"). It does so silently, and so does editing the file by hand, which the blind
  author also found.
- **Exploit, cost:** a column of 10 MB strings where numbers belong reaches the scales and the
  repaint.
- **Fix:**
  - Key result columns and positions by node id, not by order.
  - Re-derive the run id and refuse a mismatch.
  - Check each column against the algorithm's field descriptors, and refuse it alone with a code.
  - Mark every reopened run with where it came from (for example `origin: "file"`), the way
    style layers are stamped with their document (`README.md:396-400`). A reader can then ask
    for a recompute.

## 6. Unknown top-level keys are written back untouched, unseen and without limit (major)

"Unknown top-level keys are kept on save" makes a newer writer's additions survive. It also turns
every file into a carrier. A stranger's file can hold 60 MB under `"x"`, or a copy of their own
data, and the person who opened it re-saves and re-shares it forever without knowing. Item 10's
API has nowhere to show these keys: `OpenReport` lists only the `ProjectPart` names.

- **Integrity:** a newer writer's key that refers to nodes by order or by run id is written back
  after this reader has deleted nodes or rerun results. It is then wrong and still looks valid.
- **Fix:**
  - Keep the document design's rule (`container.md:343-345`): every member written back without
    being understood is listed in the save report with its size.
  - Report unknown keys on open, with `W_UNKNOWN_MEMBER`.
  - Let the caller drop them.

## 7. The `app` slot is untyped, unbounded, un-namespaced and saved every time (minor)

`app: unknown` is "stored untouched for the consumer".

- **Exploit:** a consumer that does `Object.assign(settings, project.app)` or a deep merge
  inherits the prototype pollution that item 2 above shows the element itself does not guard
  against.
- **No owner:** the slot names no owner, so app A's settings reach app B, which reads them as its
  own.
- **No cap:** nothing limits its size.
- **Fix:**
  - Run `app` through the same copy as the rest of the file (no `__proto__`, depth 64).
  - Cap it, as notes cap `extensions` at 64 KB (`README.md:424`).
  - Key it by an application id (`app: { "org.example.viewer": {...} }`) and hand a consumer only
    its own entry.

## 8. A save can be larger than any open will accept (minor)

`size.mjs` builds item 10's file at the render ceiling (50,000 nodes, 100,000 edges, 10 short
attributes per node, 8 result columns, positions). The file is 31.1 MB; stringify takes 100 ms and
parse 127 ms (`size.log`). Three times the attributes passes the 64 MB file cap in `README.md:416`.

- **Data loss:** item 10 states no cap. If the reader enforces 64 MB, `save()` succeeds and
  writes a file that `open()` refuses. If it does not, the 64 MB rule is gone for every file.
- **Fix:** `save()` checks the cap it will be opened under. It refuses with `E_TOO_LARGE`, naming
  the part, or reports that the file will need raised limits to open.

## 9. `open()` replaces the session, and nothing guards unsaved work (minor)

"A fresh history, not an undo step" means opening a file discards the session and its undo
history, and nothing can bring them back. Item 10 is silent on a dirty session (the blind author
asks the same thing, guess 4).

- **Exploit:** a drag-and-drop target or a `?project=` link throws away hours of unsaved work in
  one event.
- **Contradiction:** the document design says a file's data never replaces a loaded graph unless
  the caller passes `data: "replace"` (`README.md:369-370`, Trust rule 4). Item 10 does the
  opposite.
- **Fix:** `open()` refuses on a dirty session with a code (`E_UNSAVED`) unless the caller passes
  `{ discard: true }`. Offer `apply: false` to preview first, as `openDocument` does
  (`README.md:192`, `:212`).

## 10. Reasons and names from the file are shown as English sentences, with no text rule (minor)

`missing[].reason` is element-written English, and item 10's own example concatenates the reasons
into a notification. The rule that a quoted string from the file is cut to 256 characters, isolated
against right-to-left overrides and rendered as text (`README.md:401-405`) is not carried over.
`name`, run labels, set and view names come from the file, and the example writes them into
`document.title`.

- **Fix:** give each `missing` entry a `code` and `details`, and keep `reason` only as a
  fallback. Restate Trust rule 6 for every string the project API returns.
