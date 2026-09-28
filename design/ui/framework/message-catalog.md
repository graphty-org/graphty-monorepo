# Message catalog

**Job.** Every message key: its template, type, verb, delivery route, the flow step that fires it,
and the cause template of every error code, until graphty-element's and the app's strings modules
exist; then this becomes a pointer to them. The rules each row obeys (voice, templates, caps,
number formats, mark words) are `content-design.md`; when a message fires is the step named in
"Fires at". **Owner:** content designer. **Ceiling:** the README's table. **Validated by:** `content-design.md`
9, whose lints parse these tables.

**Columns.** *Type* is exactly one `content-design.md` 4 type, a label, or methods text. *Route*: a
backticked kebab-case name is an event record; *state* is text beside a published state; *return*
is text on a call's result; *error* is the reader text on `GraphtyError`; *app* is chrome. Every
slot is filled from a field on the route; routes and slots not yet in the element are rows in
`element-needs.md`. *Level 4* is the reason a notice is allowed (`interaction-patterns.md` 3.5
level 4): out-of-sight, detached, outside-app, or field-closed; "--" for every other type.
*Spoken* is the live region (`content-design.md` 4, Announcements): polite, assertive, or "--".
*Also shown* names a second surface carrying the same text. Owner is graphty-element except
`start.empty` and `feedback.sent` (app): the chip's count, the save state and a changed-options
count are graph facts a third-party host would otherwise rewrite (`content-design.md` 1). IP is `interaction-patterns.md`, IPE
`interaction-pattern-entries.md`. Plurals are ICU in code.

## Published keys

graphty-element publishes each message by key so a host can supply its own words
(`decided-doors.md`, "Host names for reader text"). On every route in the Route column that the element owns, a
message is a record `{ key, params, text }`: on each reader-text event record, on the text beside
a state or on a call's result, and on `GraphtyError` as its reader headline, with its cause as a
second record of the same shape.

- **The key is `graphty.` plus the Key column**: `graphty.<area>.<message>`, the area being the
  key's first segment (`graphty.load.reading`, `graphty.run.done`, `graphty.export.done`). A cause
  is `graphty.cause.<code>[.<discriminator>]`, keeping the published error code's spelling
  (`graphty.cause.E_FETCH_FAILED.remote`). Other segments are lowerCamelCase ASCII. The
  `graphty.` namespace is the element's alone; the app's own keys (`start.empty`,
  `feedback.sent`) are chrome, never published and carry no namespace.
- **`params` are the template's slots by name**, without braces (`{file}` is `file`), holding raw
  values: a count as a number, a name as a string, a nested cause as its own record. A bracketed
  part left unfilled is a missing parameter, never an empty string. Formatting (`content-design.md`
  5) is done for `text`; a host that rewords formats its own values.
- **`text` is the element's English, an unpublished default** any release may reword. A host with
  no wording of its own shows it.
- **Stable.** A key is never renamed or reused. Rewording `text` keeps the key; adding an optional
  parameter keeps it; removing or renaming a parameter, or changing what the message means, mints
  a new key and retires the old one, which stays listed here as retired so no later message
  takes it.
- **Beside the key, as published values**: on an error, `details.recovery` (the recovery class),
  the chosen verb, and the cause's own key and parameters (`content-design.md` 4, Errors).

## Keys

| Key | Template (example) | Type | Verb | Route | Fires at | Level 4 | Spoken | Also shown |
|---|---|---|---|---|---|---|---|---|
| `start.empty` | the start screen's title | empty surface | Open... (takes a dropped file); Connect to data source... (`principles.md`, the ledger) | app | no project (`principles.md` 5) | -- | -- | -- |
| `load.reading` | Reading {file} as {format} | progress | Cancel | state: load | the canvas load card | -- | polite | -- |
| `load.done` | {file} read[: {K} rows dropped] | notice | Show import, when K > 0 | `import-report` | load finished out of sight | out-of-sight | polite | -- |
| `load.report` | Read as {format}: {mapping}; {counts} | report line | -- | `import-report` | Last import Details | -- | -- | -- |
| `load.merged` | {file}: {M} matched, {N} new, {U} unmatched | report line | -- | `import-report` | Add data, Join | -- | -- | -- |
| `load.parallelEdges` | heading "{N} extra parallel edges" with (i); policies "Keep all: {E} edges", "Merge into one, {reduction} of {attribute}: {E} edges" | choice step | the load step's commit verb | return: import plan | an issue row in the load step | -- | -- | -- |
| `drop.choice` | {file}: {profile} file; rows by profile, each with its result in counts (IPE 4.5) | choice step | none: each row commits its own result | return: file profile | a drop on a loaded graph | -- | -- | -- |
| `open.failed` | Could not open {file}: {cause} | error | the chosen verb | error | open, load | -- | assertive | -- |
| `open.unreconnected` | {N} references not reconnected | notice | Show references | `project-opened` | open; references out of sight | out-of-sight | polite | -- |
| `run.cost` | {band} ("a few minutes") | mark | -- | state: catalog cost | menu row, run control | -- | -- | -- |
| `run.running` | Running {result} | progress | Cancel | state: run | the running notice (IP 3.5) | -- | -- | -- |
| `run.done` | {result} finished | notice | Show result | `run-finished` | one run ended out of sight | out-of-sight | polite | -- |
| `runs.done` | {N} results finished[; {K} failed] | notice | Show results | `run-finished`, `run-failed` | more than one run ended out of sight while one notice showed | out-of-sight | polite | -- |
| `run.failed` | Could not run {algorithm}: {cause} ("0 edges on the selection") | error | the chosen verb; Show {result} as a notice | `run-failed` | the result's state line; a notice, headline only, out of sight | out-of-sight | polite | notice |
| `run.canceled` | {result} canceled | notice | Redo | `history-undone` | undo of a pending run (IP 3.4) | out-of-sight | polite | -- |
| `run.undoWaiting` | {result} removed when it ends | notice | -- | `history-undone` | undo of a running run that cannot be canceled (IP 3.4) | out-of-sight | polite | -- |
| `recipe.outcome` | {done} of {total} computed[; {S} need a narrower scope][; {K} failed][; {U} Not run: {band}] | report line | -- | state: recipe run | the recipe's row (`state-matrix.md` 4.8) | -- | -- | -- |
| `record.methods` | one sentence per run: algorithm, every resolved option, scope with counts, weight and its role, seed, engine, graphty-element version, and the conventions cited (`graph-conventions.md`) | methods text | Copy | return: run record | a result's record; Version history (`output-homes.md` 2) | -- | -- | -- |
| `undo.label` | Undo {name}; Redo {name}; Cancel {name} | label | -- | state: `history.nextUndo` | Edit menu, Quick actions | -- | -- | -- |
| `undo.done`, `redo.done` | Undone: {name}; Redone: {name} | notice | Redo; Undo | `history-undone`, `history-redone` | out of sight (IP 3.4) | out-of-sight | polite | -- |
| `delete.detached` | {N} {kind} detached | notice | Undo | `deleted` | IPE 6.4 | detached | polite | -- |
| `delete.outOfSight` | {object} deleted | notice | Undo | `deleted` | IPE 6.4 | out-of-sight | polite | -- |
| `remove.done` | {N} {kind} removed | notice | Undo | `deleted` | removed elements not drawn (IPE 6.4) | out-of-sight | polite | -- |
| `name.duplicate` | {kind} names must be unique | field error | -- | return: rename | a rename reverted and closed (IP 3.2) | field-closed | assertive | notice |
| `paste.notFound` | {N} ids not found | notice | Add as nodes | return: paste | IPE 4.5; the ids name nothing drawn | out-of-sight | polite | -- |
| `query.noPath` | {reason, select, components {No path: different components} direction {No directed path; one exists ignoring direction} filtered {No path in filtered graph}} | state line | none; Ignore direction; Search full graph | return: path query, with its reason | Path tool | -- | polite | -- |
| `find.none` | 0 matches[; Closest: {value}] | mark | the candidate | return: Find | Find's list, no hit anywhere | -- | polite | -- |
| `search.outsideScope` | 0 in filtered graph | mark | Search full graph | return: search | a search's result (a walk outward, never Find) | -- | polite | -- |
| `step.added` | +{N} by {command}, from {M} nodes | report line | -- | state: filter step | a grown Filter to step | -- | -- | -- |
| `selection.count` | {N} selected[; {K} left the filtered graph] | announcement | -- | state: selection | IP 3.1 | -- | polite | -- |
| `selection.cleared` | Selection cleared on canvas; {chord}: Previous selection | announcement | -- | state: selection | IPE 4.4 | -- | polite | -- |
| `walk.position` | {label}, neighbor {i} of {N}[, {direction}] | announcement | -- | state: focused node | IPE 9.2 | -- | polite | -- |
| `field.nearestValid` | Closest: {value}; Range {min} to {max} whenever a typed number is out of range, announced on commit or leaving the field, never per keystroke | field error | the value | return: option check | IP 3.2 | -- | assertive | -- |
| `command.disabledReason` | {enabling action} ("Declare a time attribute") | tooltip | the enabling action | state: command availability | IP 3.7 | -- | -- | description, palette row |
| `file.binding` | {N} attributes to bind; per slot "{slot}: needs {level}" | choice step | Apply | return: binding plan | applying a recipe or style file | -- | -- | -- |
| `file.applied` | {file} applied: {contents}[; {M} missing attribute] | notice | Undo | `file-applied` | the style layers out of sight | out-of-sight | polite | -- |
| `file.report` | per part: applied or skipped; per slot: bound, matched by hand, missing attribute | report line | -- | `file-applied` | Details | -- | -- | -- |
| `options.changed` | {N} changed ("2 changed") | mark | -- | state: option defaults | a settings button over hidden options (`options-and-encodings.md` 1) | -- | -- | -- |
| `style.unbound` | missing attribute (the tooltip names {attribute}) | mark | the binding step | return: binding plan | an unbound style row (`options-and-encodings.md` 4) | -- | -- | -- |
| `style.cannotBind` | {channel} takes {level}; {step} ("Shape takes categories; bin degree first") | tooltip | the step, when it is a command | state: channel descriptor | a disabled attribute in the binding picker | -- | -- | description, palette row |
| `style.levelGuessed` | treated as {level} ("treated as numbers") | mark | Treat as categories, Treat as numbers | state: binding | a bound pill whose level was guessed | -- | -- | -- |
| `legend.colorsMatched` | colors matched to {run} | legend note | -- | state: legend departure | a partition bound while another is compared (`options-and-encodings.md` 5) | -- | -- | -- |
| `legend.signNotShown` | by magnitude, sign not shown | legend note | -- | state: legend departure | a signed attribute on a magnitude channel (`options-and-encodings.md` 5) | -- | -- | -- |
| `export.outOfDate` | Out of date: {N} results | state line | Re-run | state: export plan | export form | -- | -- | -- |
| `export.caption` | Filtered: {steps}[; {result} on {scope}] | report line | -- | state: export plan | a picture export's caption, when the filter or a scope differs from the full graph | -- | -- | -- |
| `export.done` | {file} exported: {contents} | notice | -- | `export-finished` | always: written outside the app | outside-app | polite | -- |
| `export.failed` | Could not export {file}: {cause} | error | the chosen verb | error | export form | -- | assertive | -- |
| `capability.engine` | Engine: {engine}[; {reason}] ("CPU; WebGPU lost") | report line | -- | state: capabilities | Details | -- | -- | -- |
| `capability.canvas` | canvas not available | mark | Restart viewer when the renderer was lost; none without WebGL | state: capabilities | the canvas card | -- | polite | -- |
| `save.failed` | Could not save the project: {cause} | error | Download project file | `save-failed` | autosave failed | outside-app | assertive | notice |
| `save.state` | Not saved; View only | mark | -- (View only: Edit current version, Take over editing) | state: autosave | beside the project name while unsaved or read-only | -- | polite | -- |
| `drawn.not` | {N} {kind} not drawn[; {M} hidden] | report line | Narrow the graph...; Select hidden, Show all when hidden | state: drawing | the canvas's not-drawn line | -- | polite | legend |
| `filter.chip` | Filtered: {kept} of {total} {kind} | mark | opens the filter steps | state: scope | the filter chip while any step is on | -- | polite | -- |
| `channel.zoomToRead` | zoom to read | mark | -- | state: readability | an Appearance row whose value cannot be read at this zoom | -- | -- | -- |
| `draft.restored` | Draft restored | mark | -- | return: option check | an editor reopened on a kept invalid draft (IP 3.6) | -- | polite | -- |
| `table.scope` | Filtered graph; Selected: {N}; Members of {object}; Selected: none, showing the previous selection | state line | Show filtered graph; Previous selection | state: table scope | the table's scope line (`information-architecture.md` 8.1; `interaction-patterns.md` 3.1) | -- | polite | -- |
| `reading.notComputed` | Not computed: {band} | mark | Run | state: reading | a Statistics row not yet asked for (`files-and-recipes.md` 2) | -- | -- | -- |
| `overview.compute` | Compute the overview: {band} | tooltip | Compute the overview | state: overview | the Overview row's menu | -- | -- | -- |
| `assistant.failed` | Could not reach {provider}: {cause} | error | Send again | error | the Assistant's conversation | -- | assertive | -- |
| `layout.hiddenRead` | lays out {N} nodes, {H} hidden | state line | Filter to drawn | state: layout scope | the Layout row after Hide others (`state-matrix.md` 4.2) | -- | polite | -- |
| `edit.runLine` | waits for Run; applies as you edit | state line | Run | state: editor | the Run line of a result or layout editor (`interaction-patterns.md` 3.3) | -- | polite | -- |
| `feedback.sent` | Feedback sent | notice | -- | app | the feedback form closed | outside-app | polite | -- |
| `unexpected` | Could not {verb} {object}: internal fault (a report-class cause) | error | Report problem (app) | error | a report-class code | out-of-sight | assertive | notice |

`{contents}` names the parts a file carries or applied: data, style, recipe, notes, in that order.
A combined file's `file.report` lists each part applied or skipped. What a recipe and a style file
hold is `glossary.md`; how binding behaves is `interaction-pattern-entries.md` 6.6.

## Causes

The `{cause}` of an error, per code and discriminator, as reader text on `GraphtyError`; its slots
come from the error's `details`. A cause is checked, with worst-case slots filled, against the
width of the surface it appears on (`content-design.md` 4, Width), not against a word cap. The
class and surface are `state-matrix.md` 2.1. Report-class codes read "internal fault"; accept-state
codes are worded by `capability.*`.

| Key | Cause template |
|---|---|
| `cause.E_BAD_QUERY`, `E_BAD_SELECTOR`, `E_BAD_FORMULA` | {rule} at character {column} |
| `cause.E_UNKNOWN_ATTRIBUTE` | unknown attribute {name}[; Closest: {candidate}] |
| `cause.E_OPTION_RANGE` | {option} outside {min} to {max} |
| `cause.E_DUPLICATE_ID.name` | see `name.duplicate` |
| `cause.E_PARSE_FAILED` | line {line} is not {format} |
| `cause.E_UNKNOWN_FORMAT` | format not recognized |
| `cause.E_ID_MISSING` | row {row} has no {column} |
| `cause.E_EDGE_ENDPOINTS_UNRESOLVED` | {N} edges name missing nodes |
| `cause.E_DUPLICATE_ID.id` | {N} ids appear twice |
| `cause.E_FETCH_FAILED.local` | {file} could not be read |
| `cause.E_FETCH_FAILED.remote` | {source} did not respond |
| `cause.E_DUPLICATE_EDGE` | see `load.parallelEdges` |
| `cause.E_SCOPE_EMPTY` | 0 {kind} on {scope} |
| `cause.E_OUT_OF_MEMORY` | out of memory on {scope} |
| `cause.E_CAP_EXCEEDED` | {band} over the exact budget |
| `cause.E_NOT_CONVERGED` | not converged after {maxIterations} iterations |
| `cause.E_NO_ACCELERATOR` | WebGPU required, none available |
| `cause.E_TOO_LARGE.accelerator` | {N} {kind}; WebGPU limit {L} |
| `cause.E_TOO_LARGE.index` | {N} {kind}; index limit {L} |
| `cause.E_DEVICE_LOST` | WebGPU lost; new runs use the CPU; Re-run names that path |
| `cause.E_UNSUPPORTED.export` | {format} not supported over {N} {kind} |
| `cause.E_UNKNOWN_ALGORITHM`, `E_UNKNOWN_LAYOUT`, `E_UNKNOWN_CHANNEL`, `E_UNKNOWN_OPTION`, `E_UNKNOWN_PALETTE` (origin "document") | the mark "Needs {name}" (`glossary.md` 10) |
| `cause.E_UNKNOWN_RUN` (origin "document") | the state Detached (`glossary.md` 10) |

## Template words

The one list section 1 of `content-design.md` lints against. **Function words**: of, on, in, and,
to, a, the, by, from, as, for, no, one. **Frame words**: Could not, Closest, Range, Undone:,
Redone:, finished, canceled, removed, deleted, detached, exported, applied, read, Reading,
Running, must be unique, not found, changed, No path, matches, different, ignoring, exists, is
not, has no, appear twice, did not respond, not recognized, not supported, outside, over, limit,
budget, required, available, lost, iterations, convergence, out of memory, be read, character,
line, row, when it ends, uses. Any other word is a glossary term or is added here.

**Slot types.** `{object}`, `{result}`, `{file}`: one primary object by its row name.
`{kind}`: a glossary noun, always with a count. `{label}`: one node or edge by its label
attribute; an internal id is never a slot. `{N}`, `{K}`, `{L}` and the like: counts, formatted by
`content-design.md` 5. `{cause}`: a template from "Causes". `{band}`: a cost band.

## Sources

- `content-design.md` (the rules every row obeys); `glossary.md` 10 (state words and verbs);
  `output-homes.md` 3 (the verbs); `element-needs.md`, "Reader text and formatting"
- graphty-element on master: `src/errors/GraphtyError.ts` (the error codes the causes cover)
