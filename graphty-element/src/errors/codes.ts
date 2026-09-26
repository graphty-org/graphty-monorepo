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
     * A style layer's selector does not parse. `details` carry the character offset. The caller
     * corrects the selector; the layer is not added.
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
     * A universal selector is combined with an encoding bound to a run, which would ask the
     * element to paint elements the run never measured. The caller scopes the layer to the
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
     * permitted values. `details` carry the range or the value list alongside what was passed.
     * The caller clamps or corrects the value.
     */
    | "E_OPTION_RANGE"
    /**
     * An expression, selector or formula names an attribute that nothing in the session answers.
     * `details.candidates` carry the nearest three names. The caller corrects the name, or loads
     * the data that would define it.
     */
    | "E_UNKNOWN_ATTRIBUTE"
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
     * and no `other` binding was declared.
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
     * Acceleration was required (the `acceleration` attribute set to `required`) and no
     * accelerator is available. `details` carry the reason acceleration is absent. The caller
     * installs the optional peer package, or drops back to `auto` and accepts the CPU path.
     */
    | "E_NO_ACCELERATOR"
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
     * The operation is well formed but this build or this host cannot perform it: a
     * worker-hosted session asked for `snapshot()`, a mutating command asked to jump the queue,
     * an export format the platform has no encoder for. `details.reason` says which. The caller
     * uses the stated alternative; retrying does not help.
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
     * An invariant inside the element broke. This is a bug in graphty-element, not in the call.
     * `details` and `cause` carry whatever is safe to report. The caller files an issue with the
     * message; nothing it can change will avoid it.
     */
    | "E_INTERNAL";

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
    E_UNKNOWN_ALGORITHM: "E_UNKNOWN_ALGORITHM",
    E_UNKNOWN_LAYOUT: "E_UNKNOWN_LAYOUT",
    E_UNKNOWN_FORMAT: "E_UNKNOWN_FORMAT",
    E_UNKNOWN_PALETTE: "E_UNKNOWN_PALETTE",
    E_UNKNOWN_CAMERA: "E_UNKNOWN_CAMERA",
    E_UNKNOWN_SINK: "E_UNKNOWN_SINK",
    E_UNKNOWN_RUN: "E_UNKNOWN_RUN",
    E_UNSTABLE_RUN_ID: "E_UNSTABLE_RUN_ID",
    E_DUPLICATE_ID: "E_DUPLICATE_ID",
    E_DUPLICATE_EDGE: "E_DUPLICATE_EDGE",
    E_DUPLICATE_PLUGIN: "E_DUPLICATE_PLUGIN",
    E_PROTECTED: "E_PROTECTED",
    E_FETCH_FAILED: "E_FETCH_FAILED",
    E_PARSE_FAILED: "E_PARSE_FAILED",
    E_EDGE_ENDPOINTS_UNRESOLVED: "E_EDGE_ENDPOINTS_UNRESOLVED",
    E_ID_MISSING: "E_ID_MISSING",
    E_EMPTY_LOAD: "E_EMPTY_LOAD",
    E_SUPERSEDED: "E_SUPERSEDED",
    E_TOO_LARGE: "E_TOO_LARGE",
    E_OUT_OF_MEMORY: "E_OUT_OF_MEMORY",
    E_CAP_EXCEEDED: "E_CAP_EXCEEDED",
    E_SCOPE_EMPTY: "E_SCOPE_EMPTY",
    E_NOT_CONVERGED: "E_NOT_CONVERGED",
    E_NO_ACCELERATOR: "E_NO_ACCELERATOR",
    E_NO_WEBGPU: "E_NO_WEBGPU",
    E_NO_ADAPTER: "E_NO_ADAPTER",
    E_SOFTWARE_ONLY: "E_SOFTWARE_ONLY",
    E_DEVICE_INCORRECT: "E_DEVICE_INCORRECT",
    E_DEVICE_LOST: "E_DEVICE_LOST",
    E_NO_WEBGL: "E_NO_WEBGL",
    E_UNSUPPORTED: "E_UNSUPPORTED",
    E_READONLY: "E_READONLY",
    E_DISPOSED: "E_DISPOSED",
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
    | "E_TOO_LARGE";

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
