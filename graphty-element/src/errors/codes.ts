/**
 * The graphty-element error codes.
 *
 * A code is the contract; a message is not. Every failure the element reports carries one of
 * these strings, and a consumer's error handling switches on it. Messages are written for
 * people and may be reworded in any release.
 *
 * The module is free of Babylon.js, Lit and DOM references so that it can be re-exported from
 * the Node-safe entry points.
 * @module errors/codes
 */

/**
 * A machine-readable reason for a failure.
 *
 * Codes are stable across releases: a new code may be added in a minor version, an existing one
 * is removed or renamed only in a major. Sibling packages throw their own error classes, and
 * the element re-reports them as one of these codes with the original attached as `cause`.
 *
 * There is deliberately no `E_NOT_READY`. Every method is safe to call before the element is
 * ready; work queues and resolves when it runs.
 */
export type GraphtyErrorCode =
    /**
     * A command or a call is malformed: a missing required field, or two fields that may not be
     * set together (the `src` and `sample` attributes, for instance). `details` name the fields.
     * The caller fixes the call; retrying the same call always fails the same way.
     */
    | "E_BAD_COMMAND"
    /**
     * A query or pattern string does not parse. `details` carry the character offset and the
     * token that failed. The caller corrects the expression, usually in front of a person who
     * typed it.
     */
    | "E_BAD_QUERY"
    /**
     * A style layer's shape is wrong: an unknown key, a value of the wrong type, or a nested
     * member where none belongs. `details.path` names the offending path inside the layer, so
     * an editor can point at it. A wrong shape is never silently accepted.
     */
    | "E_BAD_LAYER"
    /**
     * A style layer's selector does not parse. `details.reason` is a stable code naming the
     * mistake (such as `number-needs-backticks`), so a consumer writes its own words without
     * reading the message; an expression's refusal also carries the character offset
     * (`details.position`). A `number-needs-backticks` refusal also carries `details.suggestion`,
     * the selector with every bare number put between backticks (`` minutes >= `10` ``). The
     * caller corrects the selector; the layer is not added.
     */
    | "E_BAD_SELECTOR"
    /**
     * A computed-attribute formula does not parse. `details` carry the character offset and the
     * token that failed. The caller corrects the formula.
     */
    | "E_BAD_FORMULA"
    /**
     * A selector is empty, which would match every node and every edge. An algorithm layer that
     * paints the whole graph erases every layer beneath it, so an empty selector is refused
     * rather than interpreted. The caller writes a selector that names what it means to paint.
     */
    | "E_SELECTOR_EMPTY"
    /**
     * A universal selector is combined with an encoding bound to a run that paints a value for a
     * missing result (`missing: { value }`), which would ask the element to paint elements the run
     * never measured. Without `missing`, such a layer is accepted: an element with no result is
     * not painted. The caller scopes the layer to the
     * elements that carry the run's result.
     */
    | "E_UNSCOPED_RUN_ENCODING"
    /**
     * An encoding names a scale that is not registered. `details.available` lists the registered
     * scale names. The caller picks one of those or registers its own scale first.
     */
    | "E_UNKNOWN_SCALE"
    /**
     * A style or encoding names a channel that does not exist. `details.available` lists the
     * channels for that target. Usually a spelling: a misspelled channel must never be a silent
     * no-op.
     */
    | "E_UNKNOWN_CHANNEL"
    /**
     * An option name is not one this algorithm, layout, format or exporter accepts.
     * `details.available` lists the valid names and `details.candidates` the nearest few, so the
     * caller can show "did you mean".
     */
    | "E_UNKNOWN_OPTION"
    /**
     * An option is known but its value is outside the permitted range or not one of the
     * permitted values, or a required option is missing. `details` carry `option`, the value that
     * was passed (absent when none was) and, where known, the range or the value list. An
     * algorithm's or layout's own `E_BAD_OPTION` arrives as this code. The caller clamps or
     * corrects the value.
     */
    | "E_OPTION_RANGE"
    /**
     * An expression, selector or formula names an attribute that nothing in the session answers.
     * `details.candidates` carry the nearest three names. Also a layout option that names a node
     * column the graph does not hold (`multipartite`'s `subsets`); `details` then carry `option`
     * and `column`. The caller corrects the name, or loads the data that would define it.
     */
    | "E_UNKNOWN_ATTRIBUTE"
    /**
     * A timeline call needs a time field and none is designated: `session.time.window`, `play`,
     * `stepBy` or `seek` with no attribute given. The caller designates one with
     * `session.time.setField` (or the `node-time-path` / `edge-time-path` attributes).
     */
    | "E_NO_TIME_FIELD"
    /**
     * An algorithm key is not registered. `details.available` lists the registered keys. The
     * caller picks a key from the catalogue or registers a plugin that provides it.
     */
    | "E_UNKNOWN_ALGORITHM"
    /**
     * A layout name is not registered. `details.available` lists the registered layout names.
     * An unknown layout fails loudly rather than leaving the graph in whatever arrangement it
     * already had.
     */
    | "E_UNKNOWN_LAYOUT"
    /**
     * A data format id is not one the element can import or export. `details.available` lists
     * the formats and which direction each supports. The caller picks a supported format or
     * registers a plugin for its own.
     */
    | "E_UNKNOWN_FORMAT"
    /**
     * A binding, an `encode` call or a saved document names a palette nothing registered.
     * `details.available` lists the known palette ids and `details.candidates` the nearest few.
     * The caller picks a palette from the catalogue or registers its own first.
     */
    | "E_UNKNOWN_PALETTE"
    /**
     * A camera view name is not one the element knows. `details.available` lists the registered
     * view ids. The caller picks one of those or registers its own view first.
     */
    | "E_UNKNOWN_CAMERA"
    /**
     * `data.generate` names a generator the catalogue does not list. `details.available` lists
     * the generator names. The caller picks one from `catalog.generators()`.
     */
    | "E_UNKNOWN_GENERATOR"
    /**
     * `data.loadDataset` names a dataset the catalogue does not list. `details.available` lists
     * the dataset names. The caller picks one from `catalog.datasets()`.
     */
    | "E_UNKNOWN_DATASET"
    /**
     * A logging configuration names a log destination nothing registered. `details.available`
     * lists the registered sink ids. The caller registers the sink before naming it, which is
     * what makes a destination configurable by name rather than by holding a live object.
     */
    | "E_UNKNOWN_SINK"
    /**
     * A selector, encoding or document refers to a run id that this session does not hold --
     * usually a saved artifact re-opened against a session where the run has not been started.
     * `details.candidates` carry the nearest run ids. The caller re-runs the algorithm or
     * rebinds the artifact.
     */
    | "E_UNKNOWN_RUN"
    /**
     * A styles call names a layer id the stack does not hold -- usually one removed a moment
     * earlier, so the caller's layer list is stale. The call itself is well formed, which is why
     * this is not `E_BAD_COMMAND`. `details.known` lists the ids the stack does hold. The caller
     * refreshes its layer list.
     */
    | "E_UNKNOWN_LAYER"
    /**
     * A call names a node or an edge id this graph does not hold -- usually an id kept from
     * before a load or a removal. The call itself is well formed. `details.kind` says whether a
     * node or an edge was asked for and `details.id` carries the id. Also a layout or algorithm
     * option that names a node the graph does not hold (a `bfs` start, a `radial` root); `details`
     * then carry `option` and the `id`, or the node `index` a sibling package was handed. The
     * caller refreshes the id it holds.
     */
    | "E_UNKNOWN_ELEMENT"
    /**
     * A saved document's content is malformed: not the kind it claims, a required member missing
     * or of the wrong type, a member named `__proto__`, or nesting past the limit. `details` name
     * what is wrong. Nothing in the session changed. The document is fixed at its source; reading
     * it again fails the same way. (design/documents/README.md, "Error and warning codes")
     */
    | "E_BAD_DOCUMENT"
    /**
     * A saved document, or a member of one, has a `version` this release does not read.
     * `details` are `{ kind, found, reads }`. Nothing in the session changed. The caller opens it
     * with a release that reads that version; it is never guessed at.
     */
    | "E_UNSUPPORTED_VERSION"
    /**
     * Opening a project would replace a session holding changes that were never saved
     * (`session.project.dirty`). Nothing in the session changed. The caller saves first, or opens
     * again with `{ discard: true }` once the reader agreed to lose them.
     */
    | "E_UNSAVED_CHANGES"
    /**
     * An autosave entry another tab or element is writing, so it cannot be restored or removed
     * from here. `details.id` names it. The caller waits for that tab to close, or picks another.
     */
    | "E_AUTOSAVE_ENTRY_TAKEN"
    /**
     * An autosave entry that does not exist (it was removed, or never written under this key).
     * `details.id` names it. The caller lists the entries again.
     */
    | "E_AUTOSAVE_UNKNOWN_ENTRY"
    /**
     * A document being serialised refers to a run whose id was derived rather than author
     * assigned, so the reference would resolve differently on reload. The caller re-runs with an
     * explicit `as:` id and saves again.
     */
    | "E_UNSTABLE_RUN_ID"
    /**
     * An id that must be unique is already taken -- a node or edge id arriving twice under a
     * plan that does not merge, or a saved scope, layer or run name that already exists.
     * `details.id` names it. The caller chooses another id or asks for merge behaviour.
     */
    | "E_DUPLICATE_ID"
    /**
     * Two edges run between the same ordered pair of nodes and `data.knownFields.repeatedEdges`
     * is `"error"`. `details` name both endpoints and the index of the edge already present. The
     * caller sets the policy to `keep`, `first`, `last`, `sum`, `min` or `max`.
     */
    | "E_DUPLICATE_EDGE"
    /**
     * A plugin is registered twice under one kind and name with a different implementation, and
     * the registration asked for strict behaviour. `details` name the kind and the name. The
     * caller removes one registration, or registers into its own `createRegistry()` instance.
     */
    | "E_DUPLICATE_PLUGIN"
    /**
     * The target is owned by the element and may not be removed or edited: the base and
     * selection style layers carry `locked: true` and exist by construction. `details` name the
     * target. The caller adds its own layer above instead of editing the protected one.
     */
    | "E_PROTECTED"
    /**
     * The target is locked by the reader: a style layer whose row, or a folder holding it, has
     * the reader's lock on (`styles.lockRow`). `details` name the layer and the locked row. The
     * caller unlocks the row first, or leaves the layer as it is.
     */
    | "E_LOCKED"
    /**
     * A source could not be fetched: a network failure, a non-2xx status, a CORS refusal or an
     * unreadable file. `details` carry the url and the status where there was one, and `cause`
     * carries the original failure. Recoverable by retrying, except a client error (a 4xx other
     * than 408 and 429), which fails after one request with `recoverable: false`.
     */
    | "E_FETCH_FAILED"
    /**
     * A source was fetched but could not be parsed as the format it claimed to be. `details`
     * carry the format, the line and, where the parser reported one, the column. The caller
     * corrects the file, or re-imports naming the true format.
     */
    | "E_PARSE_FAILED"
    /**
     * A graphty project or document file (one `session.project.save` writes) was handed to a data
     * import (`session.data.import`, `session.data.prepare`, a data source) instead of being
     * opened. `details` are `{ kind, use: "project.open" }`: the document's `kind`, and the verb
     * that opens it. Nothing in the session changed. The caller opens the file with
     * `session.project.open`, which reads data files too.
     */
    | "E_PROJECT_FILE_AS_DATA"
    /**
     * An edge table declares no endpoint columns and contains none of the accepted pairs
     * (`source`/`target`, `src`/`dst`, `from`/`to`). `details.columns` list what the file does
     * contain. The caller re-imports with an `ImportPlan` naming the endpoint columns. The
     * element never loads an edgeless graph in silence.
     */
    | "E_EDGE_ENDPOINTS_UNRESOLVED"
    /**
     * A row carries no usable identifier: the node id column is absent, empty or null for that
     * row. `details` carry the row index and the column that was tried. The caller corrects the
     * import plan or the data.
     */
    | "E_ID_MISSING"
    /**
     * A load read its source to the end and found nothing in it: no node records and no edge
     * records. It is reported as a failure rather than as a success with zero counts, and a
     * load asked to `replace` keeps the graph it would have replaced. `details` carry the
     * format. The caller checks the file, or the format it was read as.
     */
    | "E_EMPTY_LOAD"
    /**
     * A load was overtaken: a REPLACING load was called after it, or `clearData` ran, so its data
     * would have replaced or mixed into the newer dataset. It stops without touching the graph.
     * `details` carry the format. Not a fault in the source; the caller ignores it, or loads
     * again.
     */
    | "E_SUPERSEDED"
    /**
     * The graph exceeds a hard structural limit of an index or of the accelerator, and no scope
     * or sample makes the work runnable. `details` carry the size and the limit. Distinct from
     * `E_CAP_EXCEEDED`, which a smaller scope or an approximate method can get past.
     */
    | "E_TOO_LARGE"
    /**
     * An allocation failed, or the work would exceed the session's memory budget.
     * `details` carry the budget and the estimate where one exists. The caller loads a subset,
     * raises `runColumnBudgetBytes`, or frees another session.
     */
    | "E_OUT_OF_MEMORY"
    /**
     * A run's estimated cost is above `config.exactComputationSeconds` and it has no approximate
     * method, or exactness was demanded with `{ exact: true }`. `details` carry the estimate,
     * the cap, the graph size and the scopes that would fit. Also the reason a style layer is
     * disabled when a categorical encoding has more distinct values than the palette's capacity
     * and no `other` binding was declared, and the refusal of `styles.encode({ column })` for a
     * categorical column with more distinct values than the attribute walk counts (`details.limit`).
     *
     * The caller narrows the scope, samples, raises the cap, or accepts the approximation.
     */
    | "E_CAP_EXCEEDED"
    /**
     * A scope resolved to nothing, so the operation has no elements to work on -- an empty
     * selection, a predicate that matches no node, a saved set whose members have all left the
     * graph. The caller widens the scope; the session is unchanged.
     */
    | "E_SCOPE_EMPTY"
    /**
     * An iterative algorithm used every pass it was allowed without meeting its tolerance, so it
     * has no answer to publish. `details` carry the algorithm, `maxIterations` and `tolerance`,
     * and `cause` the algorithm's own error. The caller raises the run's `maxIterations` param,
     * or loosens `tolerance`, and runs again; the same params always fail the same way.
     */
    | "E_NOT_CONVERGED"
    /**
     * A layout that only arranges planar graphs (`planar`) was given a graph that cannot be drawn
     * without crossing edges, such as K5 or the Petersen graph. `details` carry `nodeCount` and
     * `edgeCount` of the graph it tested, and `cause` the layout package's own error. The layout
     * places nothing: every node stays where it was before. It stays the chosen layout, and it
     * arranges the graph again when the graph changes. The caller picks another layout, or changes
     * the graph.
     */
    | "E_NOT_PLANAR"
    /**
     * The graph is not connected, and the layout or algorithm only works on a connected one: the
     * `bfs` layout reaches every node from its start or places none. `details` carry `nodeCount`
     * and, from a layout, `reached`, the nodes it did reach; `cause` is the sibling package's own
     * error. A layout that refuses places nothing: every node stays where it was, and it arranges
     * the graph again when the graph changes. The caller picks another layout or start, or
     * connects the graph.
     */
    | "E_NOT_CONNECTED"
    /**
     * The graph is not bipartite -- its nodes cannot be split into two sides with every edge
     * running between them -- and the algorithm (bipartite matching) only works on one that is.
     * `cause` is the algorithm's own error. The caller picks another algorithm, or names the two
     * sides itself.
     */
    | "E_NOT_BIPARTITE"
    /**
     * The graph has no nodes, and the algorithm has nothing to compute over. Distinct from
     * `E_SCOPE_EMPTY`, which a wider scope can get past: here the graph itself is empty. `cause`
     * is the algorithm's own error. The caller loads data first.
     */
    | "E_EMPTY_GRAPH"
    /**
     * The algorithm is defined for undirected graphs only and was given a directed one. `cause`
     * is the algorithm's own error. The caller loads the graph as undirected, or picks the
     * directed variant of the algorithm.
     */
    | "E_NEEDS_UNDIRECTED"
    /**
     * The algorithm is defined for directed graphs only (strongly connected components, a
     * topological sort) and was given an undirected one. `cause` is the algorithm's own error. The
     * caller loads the graph as directed, or picks the undirected variant of the algorithm.
     */
    | "E_NEEDS_DIRECTED"
    /**
     * An edge weight is one the algorithm or layout cannot use: negative where weights are
     * distances (a shortest path, `kamada-kawai`), infinite or NaN. `details.weight` carries the
     * value when the sibling package reported it, and `cause` its own error. The caller corrects
     * the weights, or runs unweighted.
     */
    | "E_BAD_WEIGHT"
    /**
     * An option names a node or edge attribute whose values are of a type the layout or algorithm
     * cannot read -- a `bipartite` side that is not true or false, layers that are not whole
     * numbers or categories. `details` carry `option`, `column`, the `dtype` it has and the
     * `expected` dtypes. The caller names another attribute, or converts this one.
     */
    | "E_ATTRIBUTE_TYPE"
    /**
     * A shortest path could not be walked back from the predecessors an accelerator returned: the
     * walk met a gap or went round a cycle. A CPU search never produces such predecessors; this is
     * a fault of the accelerator, surfaced instead of a wrong path. `cause` is the algorithm's own
     * error. The caller runs again with the `acceleration` attribute set to `off`.
     */
    | "E_BAD_PATH"
    /**
     * An accelerator counted more shortest paths between a pair of nodes than its counters hold,
     * so every betweenness score it computed is wrong, and none is published. `cause` is the
     * algorithm's own error. The caller runs again with the `acceleration` attribute set to
     * `off`; the CPU path counts in double precision and does not overflow.
     */
    | "E_PATH_COUNT_OVERFLOW"
    /**
     * Acceleration was required (the `acceleration` attribute set to `required`) and no
     * accelerator is available. `details` carry the reason acceleration is absent. The caller
     * installs the optional peer package, or drops back to `auto` and accepts the CPU path.
     */
    | "E_NO_ACCELERATOR"
    /**
     * No accelerator factory is registered, so the element never looked for a GPU. Usually
     * `import "@graphty/graphty-element/webgpu"` was never evaluated -- not written, or its module
     * failed to load (a network error, a blocked request, a stale dev-server cache). Reported
     * through `capabilities.acceleration`; a registration that arrives later switches
     * acceleration on without the consumer doing anything.
     */
    | "E_NO_ACCELERATOR_REGISTERED"
    /**
     * A registered accelerator factory threw while setting up, with an error that is not one of
     * the other acceleration codes -- a module of the backend that failed to load, or a defect in
     * the backend. `reason` carries what it threw. Reported through `capabilities.acceleration`;
     * the CPU path runs.
     */
    | "E_ACCELERATOR_FAILED"
    /**
     * The runtime exposes no WebGPU at all: no `navigator.gpu`, usually because the page is not
     * in a secure context or the browser does not implement it. Reported through
     * `capabilities.acceleration` rather than thrown during ordinary use.
     */
    | "E_NO_WEBGPU"
    /**
     * WebGPU exists but no adapter could be acquired -- no suitable device, or the browser
     * refused the request. Reported through `capabilities.acceleration`.
     */
    | "E_NO_ADAPTER"
    /**
     * An adapter was found but it is a software rasteriser, which is slower than the element's
     * own CPU path. Acceleration stays off and says why, rather than making the graph slower in
     * silence.
     */
    | "E_SOFTWARE_ONLY"
    /**
     * An adapter was found, it answered, and its answers are wrong. Before any of the element's
     * work goes to an accelerator, the accelerator is asked to compute something whose answer is
     * already known; a device that gets that wrong is refused, and the CPU path runs. The
     * software renderer that ships with Windows is the device this exists for: it miscomputes
     * shaders that pass a value across a workgroup barrier, so every prefix sum, sort and grid
     * layout above one comes back wrong -- with plausible numbers and no error anywhere.
     *
     * `details` carry what the accelerator reported about the disagreement. Reported through
     * `capabilities.acceleration` rather than thrown during ordinary use. Nothing the caller
     * changes helps; a driver update might.
     */
    | "E_DEVICE_INCORRECT"
    /**
     * The GPU device was lost mid-session -- a driver reset, a tab suspension, or the browser
     * reclaiming the device. `details.reason` carries what the runtime said. The element reports
     * the loss and continues on the CPU path; it never finishes an in-flight accelerated run on
     * the CPU in silence.
     */
    | "E_DEVICE_LOST"
    /**
     * No WebGL context could be created, so nothing can be rendered. `details` carry what the
     * canvas reported. The session's data and results still work; only the view is unavailable.
     */
    | "E_NO_WEBGL"
    /**
     * A feature the caller asked for needs an optional peer package that is not installed.
     * `details.package` names the package to install and `details.feature` the feature that
     * needs it (for the in-browser AI provider, `"webllm"`). The caller installs the package, or
     * picks a feature that does not need it.
     */
    | "E_MISSING_PACKAGE"
    /**
     * The operation is well formed but this build or this host cannot perform it: a
     * worker-hosted session asked for `snapshot()`, a mutating command asked to jump the queue,
     * an export format the platform has no encoder for. `details.reason` says which. The caller
     * uses the stated alternative; retrying does not help. Also what `styles.encode({ column })`
     * and `styles.proposeEncoding` refuse a column with when it has no default drawing on that
     * channel (groups on a size, a time column); `details` then carry `kind`, `name`, `channel`
     * and `measurement`, and naming a `scale` draws it anyway.
     */
    | "E_UNSUPPORTED"
    /**
     * The target may not be mutated from here. A session that shares another session's data core
     * refuses structural mutation, and refuses to dispose the owner while a sharer is live.
     * `details` name the owning session. The caller applies the change through the owner.
     */
    | "E_READONLY"
    /**
     * The session, run or view has been disposed and no longer accepts work. `details` name what
     * was disposed. The caller creates a new session; nothing about the disposed one recovers.
     */
    | "E_DISPOSED"
    /**
     * An extension's own code threw: a function in a simple-tier definition (an algorithm's
     * `node`, a layout's `place`), called by the element. `details.extension` is the extension's
     * id, `details.member` the function, and `cause` the original error. The extension's author
     * fixes their code; this is not a defect in graphty-element, which is what `E_INTERNAL` means.
     */
    | "E_EXTENSION_FAILED"
    /**
     * A command was dispatched through a transaction's `tx` after the transaction's callback had
     * settled, so the step it belonged to was already recorded. `details.transaction` names the
     * transaction. The caller dispatches everything the transaction should contain before its
     * callback returns (awaiting what it needs), or dispatches later work through the session as
     * its own step.
     */
    | "E_TRANSACTION_CLOSED"
    /**
     * A command needs a node or edge id (or a whole graph or pin slice) that an open transaction
     * has written and holds until it is recorded. It fails at once rather than waiting, because
     * the transaction's callback may itself be waiting on this command. `details.transaction`
     * names the transaction and `details.key` the held key. The caller dispatches the command
     * through that transaction's `tx`, or dispatches it again once the transaction has settled.
     */
    | "E_HELD_BY_TRANSACTION"
    /**
     * The browser refused a request to a network source and hid why. `details.cause` is `"cors"`, `"unreachable"`, `"local-network"` or `"unknown"`; `details.url` the address, origin and path.
     */
    | "E_SOURCE_BLOCKED"
    /**
     * A network source wants a credential, or refused the one given. `details.origin` is the host that asked, `details.status` its status, `details.stored` true when the credential came from the element's store. Experimental.
     */
    | "E_SOURCE_AUTH"
    /**
     * A network source refused the request for this credential. `details.status`, `details.serverCode`. Experimental.
     */
    | "E_SOURCE_FORBIDDEN"
    /**
     * The item a network source was asked for does not exist. `details.what`, `details.value`. Experimental.
     */
    | "E_SOURCE_NOT_FOUND"
    /**
     * A network source answered 429 after the retries. `details.retryAfterMs`. Recoverable later. Experimental.
     */
    | "E_SOURCE_QUOTA"
    /**
     * A load from a network source passed its `timeoutMs`, or the server's own timeout. `details.timeoutMs`, `details.serverSide`. Experimental.
     */
    | "E_SOURCE_TIMEOUT"
    /**
     * A database rejected the query. `details.serverCode`, `line`, `column`, `serverMessage`. Experimental.
     */
    | "E_SOURCE_QUERY"
    /**
     * A query returned no node, relationship or path. `details.columns`. Experimental.
     */
    | "E_SOURCE_NOT_A_GRAPH"
    /**
     * A network source answered with a body of the wrong shape. `details.expected`, `details.contentType`. Experimental.
     */
    | "E_SOURCE_RESPONSE"
    /**
     * A redirect, or a changed origin, while a credential was attached; it was not followed. `details.from`, `details.to`. Experimental.
     */
    | "E_SOURCE_REDIRECT"
    /**
     * The source cannot run here. `details.runtime`, `details.reason` (`"cors"`, `"needs-peer-dependency"`, `"insecure-endpoint"`, ...), `details.package`. Experimental.
     */
    | "E_SOURCE_RUNTIME"
    /**
     * A source parameter or load option is invalid. `details.name`, `details.reason`. Experimental.
     */
    | "E_SOURCE_PARAM"
    /**
     * A load cap was reached under `onLimit: "error"`. `details.limit`, `details.value`. Experimental.
     */
    | "E_SOURCE_LIMIT"
    /**
     * No network source has that id. `details.id`, `details.known`. Experimental.
     */
    | "E_SOURCE_UNKNOWN"
    /**
     * A load an opened project holds has not been run since it opened, so nothing may fetch for it
     * yet: no refresh, next page, check or expansion. `runPendingSourceLoad(details.id)` runs it,
     * once the reader approved. Nothing was fetched. `details.id`. Experimental.
     */
    | "E_SOURCE_PENDING"
    /**
     * No load the graph holds has that key: `data.removeSource`, `data.refresh`,
     * `data.checkSource` and `data.more` take a key `data.sources()` or `data.loads()` lists.
     * `details.key`, `details.known`. Experimental.
     */
    | "E_LOAD_UNKNOWN"
    /**
     * The source, or the element, lacks the feature asked for. `details.feature`, `details.needs`. Experimental.
     */
    | "E_SOURCE_UNSUPPORTED"
    /**
     * A malformed network source at registration. `details.id`, `details.reason`. Experimental.
     */
    | "E_SOURCE_INVALID"
    /**
     * A credential whose secret is a function (a token refresher, a custom or AWS credential) cannot be remembered. `details.kind`. Experimental.
     */
    | "E_CREDENTIAL_NOT_STORABLE"
    /**
     * An invariant inside the element broke. This is a bug in graphty-element, not in the call.
     * `details` and `cause` carry whatever is safe to report. The caller files an issue with the
     * message; nothing it can change will avoid it.
     */
    /**
     * A model URL answered with an error or not at all. `params.url` (no query), `params.status` (a number, or null when there was no answer: offline, CORS and DNS look alike), `params.offline`. Reported in an asset record's `problems`.
     */
    | "E_MODEL_FETCH"
    /**
     * A model URL may not be fetched: not http or https, carrying a user name or password, or named by a layer that did not come from the page's code. `params.hosts`; `params.denied` when the reader refused it; `params.part` (the part's name) for a part handed to `assets.supply` by URL. A private, loopback or link-local host is refused for a supplied part whoever asks.
     */
    | "E_MODEL_URL_BLOCKED"
    /**
     * A model is over a limit of `session.assets`. `params.what` (`bytes`, `unzipped`, `triangles`, `textureBytes`, `textureSize`, `decodedBytes`, `sessionBytes`, `documentBytes`, `count`), `params.found`, `params.limit`; `params.item` names what was counted.
     */
    | "E_MODEL_TOO_LARGE"
    /**
     * A model's structure is unsafe or broken, found before anything decodes it. `params.rule` (`index`, `cycle`, `parent`, `depth`, `accessor`, `json`, `instancing`, `image`, `length`, `header`, `path`).
     */
    | "E_MODEL_STRUCTURE"
    /**
     * A recognized 3D format graphty-element does not load (FBX, USDZ, DAE, .blend, 3MF, splats, .babylon, a point cloud). `params.format`, `params.fileName`.
     * `params.assetKind` is `"image"` when `node.model` names a picture and `"model"` when `node.texture` names a model.
     */
    | "E_MODEL_FORMAT_UNSUPPORTED"
    /**
     * No model format matches the bytes or the name. `params.fileName`.
     */
    | "E_MODEL_FORMAT_UNKNOWN"
    /**
     * Two different main files in one set, or two paths that differ only in case. `params.candidates`
     * (at most 64, sorted) and `params.more` (how many were left out, when any); settle it with
     * `add`'s `main` option.
     */
    | "E_MODEL_AMBIGUOUS"
    /**
     * A file a model references (a `.bin`, a texture, an `.mtl`) is not in the set. One per missing
     * part, all at once, in the order the main file names them. `params.name`, `params.referencedBy`,
     * `params.role` (`geometry`, `materials`, `texture`; OPEN UNION), `params.optional` (true for a
     * part the model can be drawn without: a picture or an `.mtl`), and for a model fetched by URL
     * `params.tried` (the addresses tried, without queries, at most 4).
     */
    | "E_MODEL_MISSING_FILE"
    /**
     * A reference matched more than one file of the set by case or base name, so none was used.
     * `params.name`, `params.referencedBy`, `params.candidates`.
     */
    | "E_MODEL_PART_AMBIGUOUS"
    /**
     * An address answered with a web page (HTML), not a model or a picture. `params.url` (no query),
     * `params.host`, `params.part` (the part's name, for a part), and `params.suggested` when the
     * address of the file behind the page is known by its pattern (a GitHub or GitLab `blob` page).
     */
    | "E_MODEL_WEB_PAGE"
    /**
     * A part a model cannot be drawn without (geometry) was asked to be skipped. `params.name`, `params.role`.
     */
    | "E_MODEL_PART_REQUIRED"
    /**
     * A model references something outside its file set (a web address, `blob:`, `file:`, a path leaving the set). `params.url`.
     */
    | "E_MODEL_EXTERNAL_URL"
    /**
     * A model is compressed (Draco, meshopt, KTX2) and no decoder is bundled. `params.extension`, `params.package`.
     */
    | "E_MODEL_DECODER_UNAVAILABLE"
    /**
     * Babylon.js could not read a model that passed every check, or the model chunk could not load. `params.format`.
     */
    | "E_MODEL_PARSE"
    /**
     * A model's .zip cannot be read safely. `params.reason` (`corrupt`, `encrypted`, `empty`, `duplicate`, `ratio`, `entries`, `name`, `path`, `nested`).
     */
    | "E_MODEL_ZIP"
    /**
     * An asset name is held by different files, or is in the reserved `asset:sample/` space. `params.id`.
     */
    | "E_MODEL_NAME_TAKEN"
    /**
     * An asset id the session holds no accepted model for. `details.id`.
     */
    | "E_MODEL_UNKNOWN_ASSET"
    /**
     * A model a project file embeds does not match the digest the file records for it (or its id,
     * for an unnamed asset), so it was not added. `params.id`.
     */
    | "E_MODEL_DIGEST_MISMATCH"
    | "E_INTERNAL";

/**
 * A notice that stops nothing: a report entry, never thrown. OPEN UNION: codes may be added in a
 * minor release (design/documents/README.md, "Error and warning codes").
 */
export type GraphtyWarningCode =
    /** An object member this reader does not know: kept or ignored, as the document's rules say; the JSON pointer names it. */
    | "W_UNKNOWN_MEMBER"
    /** A note's `time` or `edited` is more than a day after the moment it was opened; kept as read. */
    | "W_FUTURE_TIME"
    /**
     * A member of a kind this reader does not know: skipped, the rest of the file still read
     * (`params.index`, `params.kind`). Also a `graphty-sources` entry of a load kind it does not
     * know: kept and never run (`params.kind`, `params.pointer`, `params.found`).
     */
    | "W_UNKNOWN_KIND"
    /** A project's data is not the data its results were saved against: the results keyed by edge position were left out. */
    | "W_DATA_DIFFERS"
    /** A run was still computing when the project was saved, so the file does not hold it. */
    | "W_RUN_PENDING"
    /**
     * A style layer's `{ match: "ids" }` selector names ids no element of the layer's target answers
     * to, by either spelling of an integer id, so they paint nothing. `params.target` is `"node"` or
     * `"edge"`, and `params.ids` the ids as the layer named them.
     */
    | "W_UNKNOWN_ID"
    /**
     * A style layer writes a color with an alpha (`#rrggbbaa`, `rgba()`) to a channel that cannot
     * draw it translucent, so the color is drawn opaque. `params.channel` is the channel and
     * `params.path` where in the layer the color sits. Today only `node.outline` cannot.
     */
    | "W_ALPHA_IGNORED"
    /**
     * A style layer writes a text size under 1 (a label's, a tooltip's or an arrow caption's),
     * which draws no text. `params.channel` is the channel, `params.path` where in the layer the
     * size sits, and `params.value` the size.
     */
    | "W_TEXT_TOO_SMALL"
    /**
     * A style layer binds a whole label style channel (`node.labelStyle`) to a path. No scale
     * produces a whole label style, so the binding paints nothing. `params.channel` is the channel,
     * `params.path` where in the layer, and `params.fieldChannels` the label field channels that
     * can be bound instead.
     */
    | "W_LABEL_STYLE_BOUND"
    /**
     * A layout that places nodes from their data found no usable `data.position` (`{ x, y, z? }`
     * or `[x, y, z?]`) for some nodes, and put them at the origin or left them where they were.
     * Emitted as a `layout-warning` event. `params.missing` is how many nodes had none and
     * `params.total` how many the layout placed. Today only the `fixed` layout reports it.
     */
    | "W_NO_POSITION"
    /**
     * A layout was given options it does not take, and ran without them. Emitted as a
     * `layout-warning` event by the layouts that do not refuse an unknown option with
     * `E_UNKNOWN_OPTION`: `ngraph`, `forceatlas2`, `spring` and `spring-electrical`.
     * `params.options` lists the names it ignored and `params.available` the names it takes.
     */
    | "W_UNKNOWN_OPTION"
    /**
     * A layout was given a dimension option (such as `dim: 3`) while the graph is in 2D mode, and
     * was computed in 2D instead: a 2D view always draws a 2D layout. Emitted as a `layout-warning`
     * event. `params.requested` holds the options as given and `params.used` the values used, by
     * name. In 3D mode the caller's dimension options are kept, so `dim: 2` lays a 3D view out flat.
     */
    | "W_DIMENSION_OVERRIDDEN"
    /**
     * A model's up axis is a guess (STL is taken as Z up, PLY as Y up). `params.format`, `params.up`;
     * `node.modelSourceUp` turns it.
     */
    | "W_MODEL_UP_GUESSED"
    /** A model holds animation clips and is drawn in its rest pose. `params.clips` names them. */
    | "W_MODEL_HAS_ANIMATIONS"
    /**
     * A layer colors model nodes whose `node.modelTint` is off, so the color is not drawn.
     * `params.layerIds` names the layers that write `node.color`.
     */
    | "W_MODEL_COLOR_IGNORED"
    /** A model is over the comfortable size (section 8.2 of the design). `params.triangles`, `params.materials`, `params.nodes`. */
    | "W_MODEL_HEAVY"
    /** The triangles drawn for models across the scene pass `sceneTriangleBudget`. `params.nodes`, `params.triangles`, `params.budget`. */
    | "W_MODEL_BUDGET"
    /** More than 100 nodes draw a model with see-through parts, which may sort wrongly where they overlap. `params.nodes`. */
    | "W_MODEL_TRANSPARENT"
    /** Textures larger than `maxTextureSize` pixels a side were drawn smaller. `params.from`, `params.to`. */
    | "W_MODEL_TEXTURES_REDUCED"
    /**
     * A project was saved with a layer naming a model the session does not hold (a URL that never
     * loaded, or an asset id it has no accepted model for), so the file does not carry it.
     * `params.ref` is what the layers named and `params.layerIds` the layers.
     */
    | "W_MODEL_NOT_EMBEDDED"
    /**
     * A fetch the page's code did not ask for waits for the reader (`session.network`): a model URL
     * from a project or style file, an AI command or the data, a reopened project's source load, or
     * a part handed to `assets.supply` by its URL on another host (`by: "supplied"`).
     * `params.id`, `params.url` (no query), `params.host`, `params.kind`, `params.by`,
     * `params.layerIds`.
     */
    | "W_URL_NEEDS_APPROVAL"
    /**
     * A project file carries a network approval policy (`graphty-session` `network`), which an
     * older release wrote. It is ignored: nothing saved in a file can make the element fetch
     * without asking. `params.kind` is the member, `"graphty-session"`.
     */
    | "W_NETWORK_POLICY_IGNORED"
    /**
     * A model or picture a project keeps by URL loaded from that URL, and is not the file the
     * project was saved with: the file at the URL changed. It is drawn. `params.url`,
     * `params.expected` and `params.found` (SHA-256 digests).
     */
    | "W_MODEL_CHANGED"
    /**
     * A model reference was resolved by case or by base name to the one file of the set that
     * matched. It is drawn. `params.name`, `params.used`, `params.referencedBy`.
     */
    | "W_MODEL_PART_SUBSTITUTED"
    /**
     * A model is drawn without a picture or `.mtl` the reader chose to skip. `params.name`, `params.role`.
     */
    | "W_MODEL_PART_SKIPPED"
    /**
     * A file supplied for a model matched none of its missing parts, and was not used. `params.fileName`.
     */
    | "W_MODEL_PART_UNUSED"
    /**
     * A project was asked to keep a model by its URL, but its parts came from several places
     * (`assets.supply`), so no one URL brings it back: it was embedded instead. `params.url` (no
     * query), `params.reason` (`parts`).
     */
    | "W_MODEL_NOT_KEPT_BY_URL"
    /**
     * A layout that has Graphviz route the edges between nodes it placed (the `fixed` layout with
     * `edgeRoutes: "graphviz"`) could not: the nodes are placed all the same and the edges drawn the
     * element's way. Emitted as a `layout-warning` event. `params.reason` is the Graphviz failure
     * reason, such as `graphviz.unavailable` or `graphviz.timeout`.
     */
    | "W_ROUTES_NOT_LAID"
    /**
     * A project save left values whose names mark a credential (`api_key`, `token`, ...) out of
     * the `graphty-sources` member: query parameters of a URL load's address, or of a network
     * load's endpoint, cursor or REST mapping. `params.id` is the load's id and `params.names` the
     * names left out. See the project file guide, "What a save leaves out".
     */
    | "W_SOURCE_URL_REDACTED"
    /**
     * A `graphty-sources` entry of an opened project names a network source this release has not
     * registered: its elements are there and the entry is written back, but it is not offered to
     * run. `params.id` is the entry's id and `params.source` the source id.
     */
    | "W_SOURCE_UNREGISTERED"
    /**
     * A `graphty-sources` member says `data: "steps"` but the file embeds the graph: the embedded
     * data applied. `params.graph` names the graph, null for the file's one graph.
     */
    | "W_SOURCE_STEPS_IGNORED"
    /**
     * A member of an older version was read and upgraded to the version this release writes; a
     * save writes the new version. `params.kind` is the member's kind, `params.found` the version
     * read and `params.version` the version it was upgraded to.
     */
    | "W_VERSION_UPGRADED"
    /**
     * The `location-map` layout found no usable location for some nodes, and put them in its tray
     * or left them where they were. `params.missing` counts nodes with no value, `params.unparsed`
     * values no location format reads, `params.outOfRange` values out of range (see
     * `W_LOCATION_OUT_OF_RANGE`), `params.unplaced` all of them together, `params.total` every
     * node, `params.ids` the unplaced nodes' ids (so a count can select them), and
     * `params.samples` up to eight `{ id, value, code }` (code `syntax` or `short-code`).
     */
    | "W_LOCATION_UNPARSED"
    /**
     * The `location-map` layout read locations it cannot place: latitude beyond +/-90 degrees or
     * longitude beyond +/-180, or on a flat Web Mercator map a latitude past +/-85.05, which that
     * projection cannot show. They go to the tray. `params.count`, `params.unplaced` (every
     * unplaced node, these included), `params.total`, `params.ids` and up to eight
     * `params.samples` `{ id, value, code }`.
     */
    | "W_LOCATION_OUT_OF_RANGE"
    /**
     * The `location-map` layout's `format: "auto"` found more than one format that reads the
     * column about as well, and used the first: a decimal pair that reads as well longitude first
     * (`lon-lat`) is the common case. `params.formats` (the one used first) and `params.column`.
     */
    | "W_LOCATION_AMBIGUOUS"
    /**
     * The `location-map` layout's `format: "auto"` read a column of decimal pairs longitude first,
     * because latitude first would put latitudes beyond +/-90. `params.column`.
     */
    | "W_LOCATION_SWAPPED";

/**
 * Every code, as a lookup table.
 *
 * The `satisfies` clause is what keeps this table and the union above from drifting: a code
 * missing here fails to type-check, and a code here that is not in the union fails too.
 */
const CODE_TABLE = {
    E_BAD_COMMAND: "E_BAD_COMMAND",
    E_BAD_QUERY: "E_BAD_QUERY",
    E_BAD_LAYER: "E_BAD_LAYER",
    E_BAD_SELECTOR: "E_BAD_SELECTOR",
    E_BAD_FORMULA: "E_BAD_FORMULA",
    E_SELECTOR_EMPTY: "E_SELECTOR_EMPTY",
    E_UNSCOPED_RUN_ENCODING: "E_UNSCOPED_RUN_ENCODING",
    E_UNKNOWN_SCALE: "E_UNKNOWN_SCALE",
    E_UNKNOWN_CHANNEL: "E_UNKNOWN_CHANNEL",
    E_UNKNOWN_OPTION: "E_UNKNOWN_OPTION",
    E_OPTION_RANGE: "E_OPTION_RANGE",
    E_UNKNOWN_ATTRIBUTE: "E_UNKNOWN_ATTRIBUTE",
    E_NO_TIME_FIELD: "E_NO_TIME_FIELD",
    E_UNKNOWN_ALGORITHM: "E_UNKNOWN_ALGORITHM",
    E_UNKNOWN_LAYOUT: "E_UNKNOWN_LAYOUT",
    E_UNKNOWN_FORMAT: "E_UNKNOWN_FORMAT",
    E_UNKNOWN_PALETTE: "E_UNKNOWN_PALETTE",
    E_UNKNOWN_CAMERA: "E_UNKNOWN_CAMERA",
    E_UNKNOWN_GENERATOR: "E_UNKNOWN_GENERATOR",
    E_UNKNOWN_DATASET: "E_UNKNOWN_DATASET",
    E_UNKNOWN_SINK: "E_UNKNOWN_SINK",
    E_UNKNOWN_RUN: "E_UNKNOWN_RUN",
    E_UNKNOWN_LAYER: "E_UNKNOWN_LAYER",
    E_UNKNOWN_ELEMENT: "E_UNKNOWN_ELEMENT",
    E_BAD_DOCUMENT: "E_BAD_DOCUMENT",
    E_UNSUPPORTED_VERSION: "E_UNSUPPORTED_VERSION",
    E_UNSAVED_CHANGES: "E_UNSAVED_CHANGES",
    E_AUTOSAVE_ENTRY_TAKEN: "E_AUTOSAVE_ENTRY_TAKEN",
    E_AUTOSAVE_UNKNOWN_ENTRY: "E_AUTOSAVE_UNKNOWN_ENTRY",
    E_UNSTABLE_RUN_ID: "E_UNSTABLE_RUN_ID",
    E_DUPLICATE_ID: "E_DUPLICATE_ID",
    E_DUPLICATE_EDGE: "E_DUPLICATE_EDGE",
    E_DUPLICATE_PLUGIN: "E_DUPLICATE_PLUGIN",
    E_PROTECTED: "E_PROTECTED",
    E_LOCKED: "E_LOCKED",
    E_FETCH_FAILED: "E_FETCH_FAILED",
    E_PARSE_FAILED: "E_PARSE_FAILED",
    E_PROJECT_FILE_AS_DATA: "E_PROJECT_FILE_AS_DATA",
    E_EDGE_ENDPOINTS_UNRESOLVED: "E_EDGE_ENDPOINTS_UNRESOLVED",
    E_ID_MISSING: "E_ID_MISSING",
    E_EMPTY_LOAD: "E_EMPTY_LOAD",
    E_SUPERSEDED: "E_SUPERSEDED",
    E_TOO_LARGE: "E_TOO_LARGE",
    E_OUT_OF_MEMORY: "E_OUT_OF_MEMORY",
    E_CAP_EXCEEDED: "E_CAP_EXCEEDED",
    E_SCOPE_EMPTY: "E_SCOPE_EMPTY",
    E_NOT_CONVERGED: "E_NOT_CONVERGED",
    E_NOT_PLANAR: "E_NOT_PLANAR",
    E_NOT_CONNECTED: "E_NOT_CONNECTED",
    E_NOT_BIPARTITE: "E_NOT_BIPARTITE",
    E_EMPTY_GRAPH: "E_EMPTY_GRAPH",
    E_NEEDS_UNDIRECTED: "E_NEEDS_UNDIRECTED",
    E_NEEDS_DIRECTED: "E_NEEDS_DIRECTED",
    E_BAD_WEIGHT: "E_BAD_WEIGHT",
    E_ATTRIBUTE_TYPE: "E_ATTRIBUTE_TYPE",
    E_BAD_PATH: "E_BAD_PATH",
    E_PATH_COUNT_OVERFLOW: "E_PATH_COUNT_OVERFLOW",
    E_NO_ACCELERATOR: "E_NO_ACCELERATOR",
    E_NO_ACCELERATOR_REGISTERED: "E_NO_ACCELERATOR_REGISTERED",
    E_ACCELERATOR_FAILED: "E_ACCELERATOR_FAILED",
    E_NO_WEBGPU: "E_NO_WEBGPU",
    E_NO_ADAPTER: "E_NO_ADAPTER",
    E_SOFTWARE_ONLY: "E_SOFTWARE_ONLY",
    E_DEVICE_INCORRECT: "E_DEVICE_INCORRECT",
    E_DEVICE_LOST: "E_DEVICE_LOST",
    E_NO_WEBGL: "E_NO_WEBGL",
    E_MISSING_PACKAGE: "E_MISSING_PACKAGE",
    E_UNSUPPORTED: "E_UNSUPPORTED",
    E_READONLY: "E_READONLY",
    E_DISPOSED: "E_DISPOSED",
    E_EXTENSION_FAILED: "E_EXTENSION_FAILED",
    E_TRANSACTION_CLOSED: "E_TRANSACTION_CLOSED",
    E_HELD_BY_TRANSACTION: "E_HELD_BY_TRANSACTION",
    E_SOURCE_BLOCKED: "E_SOURCE_BLOCKED",
    E_SOURCE_AUTH: "E_SOURCE_AUTH",
    E_SOURCE_FORBIDDEN: "E_SOURCE_FORBIDDEN",
    E_SOURCE_NOT_FOUND: "E_SOURCE_NOT_FOUND",
    E_SOURCE_QUOTA: "E_SOURCE_QUOTA",
    E_SOURCE_TIMEOUT: "E_SOURCE_TIMEOUT",
    E_SOURCE_QUERY: "E_SOURCE_QUERY",
    E_SOURCE_NOT_A_GRAPH: "E_SOURCE_NOT_A_GRAPH",
    E_SOURCE_RESPONSE: "E_SOURCE_RESPONSE",
    E_SOURCE_REDIRECT: "E_SOURCE_REDIRECT",
    E_SOURCE_RUNTIME: "E_SOURCE_RUNTIME",
    E_SOURCE_PARAM: "E_SOURCE_PARAM",
    E_SOURCE_LIMIT: "E_SOURCE_LIMIT",
    E_SOURCE_UNKNOWN: "E_SOURCE_UNKNOWN",
    E_SOURCE_PENDING: "E_SOURCE_PENDING",
    E_LOAD_UNKNOWN: "E_LOAD_UNKNOWN",
    E_SOURCE_UNSUPPORTED: "E_SOURCE_UNSUPPORTED",
    E_SOURCE_INVALID: "E_SOURCE_INVALID",
    E_CREDENTIAL_NOT_STORABLE: "E_CREDENTIAL_NOT_STORABLE",
    E_MODEL_FETCH: "E_MODEL_FETCH",
    E_MODEL_URL_BLOCKED: "E_MODEL_URL_BLOCKED",
    E_MODEL_TOO_LARGE: "E_MODEL_TOO_LARGE",
    E_MODEL_STRUCTURE: "E_MODEL_STRUCTURE",
    E_MODEL_FORMAT_UNSUPPORTED: "E_MODEL_FORMAT_UNSUPPORTED",
    E_MODEL_FORMAT_UNKNOWN: "E_MODEL_FORMAT_UNKNOWN",
    E_MODEL_AMBIGUOUS: "E_MODEL_AMBIGUOUS",
    E_MODEL_MISSING_FILE: "E_MODEL_MISSING_FILE",
    E_MODEL_PART_AMBIGUOUS: "E_MODEL_PART_AMBIGUOUS",
    E_MODEL_WEB_PAGE: "E_MODEL_WEB_PAGE",
    E_MODEL_PART_REQUIRED: "E_MODEL_PART_REQUIRED",
    E_MODEL_EXTERNAL_URL: "E_MODEL_EXTERNAL_URL",
    E_MODEL_DECODER_UNAVAILABLE: "E_MODEL_DECODER_UNAVAILABLE",
    E_MODEL_PARSE: "E_MODEL_PARSE",
    E_MODEL_ZIP: "E_MODEL_ZIP",
    E_MODEL_NAME_TAKEN: "E_MODEL_NAME_TAKEN",
    E_MODEL_UNKNOWN_ASSET: "E_MODEL_UNKNOWN_ASSET",
    E_MODEL_DIGEST_MISMATCH: "E_MODEL_DIGEST_MISMATCH",
    E_INTERNAL: "E_INTERNAL",
} as const satisfies Record<GraphtyErrorCode, GraphtyErrorCode>;

/**
 * Every error code the element can report, in the order the reference documentation lists them.
 *
 * Useful for building an error-handling table, for generating documentation, and for asserting
 * that a consumer handles the whole surface.
 */
export const GRAPHTY_ERROR_CODES: readonly GraphtyErrorCode[] = Object.freeze(Object.values(CODE_TABLE));

/**
 * The subset of codes that describe why hardware acceleration is unavailable or has stopped.
 *
 * This is the type of `capabilities.acceleration.code`, where a code is reported rather than
 * thrown: absence of acceleration is a state the consumer renders, not a failure it catches.
 */
export type AccelerationErrorCode =
    | "E_NO_WEBGPU"
    | "E_NO_ADAPTER"
    | "E_SOFTWARE_ONLY"
    | "E_DEVICE_INCORRECT"
    | "E_DEVICE_LOST"
    | "E_TOO_LARGE"
    | "E_NO_ACCELERATOR_REGISTERED"
    | "E_ACCELERATOR_FAILED";

/**
 * Every code that can appear on `capabilities.acceleration.code`.
 */
export const ACCELERATION_ERROR_CODES: readonly AccelerationErrorCode[] = Object.freeze([
    CODE_TABLE.E_NO_WEBGPU,
    CODE_TABLE.E_NO_ADAPTER,
    CODE_TABLE.E_SOFTWARE_ONLY,
    CODE_TABLE.E_DEVICE_INCORRECT,
    CODE_TABLE.E_DEVICE_LOST,
    CODE_TABLE.E_TOO_LARGE,
    CODE_TABLE.E_NO_ACCELERATOR_REGISTERED,
    CODE_TABLE.E_ACCELERATOR_FAILED,
]);

/**
 * Narrows an unknown value to a `GraphtyErrorCode`.
 *
 * Use it on a code string that arrived from outside the element -- a sibling package's error, a
 * saved document, a message from a worker -- before switching on it.
 * @param value - The value to test.
 * @returns True when the value is one of the element's error codes.
 */
export function isGraphtyErrorCode(value: unknown): value is GraphtyErrorCode {
    return typeof value === "string" && Object.hasOwn(CODE_TABLE, value);
}
