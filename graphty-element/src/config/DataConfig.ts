import type { DuplicatePolicy, IdCoercion } from "@graphty/graph-format";
import { z } from "zod";

import { GraphtyError } from "../errors/GraphtyError";

// graph-format's own vocabulary for what to do with a second edge between the same ordered pair.
// The `satisfies` keeps this list identical to graph-format's type, so the element can never grow
// a policy the layer below it does not have a meaning for.
export const REPEATED_EDGE_POLICIES = [
    "keep",
    "error",
    "first",
    "last",
    "sum",
    "min",
    "max",
] as const satisfies readonly DuplicatePolicy[];

// graph-format design 14.4 names two of graph-format's four IdCoercion rules for the element
// config; "string" and "number" are importer-level rules no element config path needs. The
// `satisfies` keeps this list a strict SUBSET of graph-format's own type, so an invented or
// misspelled rule is a compile error here instead of an importer-time surprise in IO1.
const ID_COERCION_RULES = ["canonical", "keep"] as const satisfies readonly IdCoercion[];

// COMPATIBILITY NOTE, deliberate: this was a z.object(), which STRIPS an unknown key. It is now a
// z.strictObject(), which THROWS on one, matching `DataConfig` itself and the documents in
// StyleTemplate.ts that are still read (StyleTemplateV1 and TemplateMetadata are both strict; the
// layer shapes there are accepted and ignored, so they are deliberately loose). The consequence
// to know about: a persisted or hand-written template whose
// `data.knownFields` carries a key this schema does not declare used to load with the key silently
// dropped and now fails at parse, naming the key. That is the point -- `idCoersion` must not fall
// back to the default in silence -- but it is a BREAKING direction for a stored template, so a key
// removed from here later needs a StyleTemplate majorVersion bump and an upgrade step, not a
// quiet deletion.
//
// Each field below names the record key (a path such as "id" or "attrs.name") the element reads
// one fact from. Maintainer notes sit in line comments above a field's doc comment.

const GraphKnownFields = z.strictObject({
    /** The key that holds each node's id, the value edges name as their ends. Default `"id"`. */
    nodeIdPath: z.string().default("id"),
    /**
     * The key that holds each node's name, shown wherever a node is named to a reader (a result,
     * a legend row, a ranked list). Default `null`: the node's id is shown instead.
     */
    nodeLabelPath: z.string().or(z.null()).default(null),
    /** The key that holds each node's weight. Default `null`: nodes carry no weight. */
    nodeWeightPath: z.string().or(z.null()).default(null),
    /** The key that holds each node's time, for the timeline. Default `null`: nodes carry no time. */
    nodeTimePath: z.string().or(z.null()).default(null),
    /**
     * How numbers in the node time column are read: `"ms"` epoch milliseconds, `"s"` epoch seconds,
     * `"year"` years, or `"ordinal"` plain ordered numbers. Absent or `null` reads milliseconds.
     * Text and dates ignore it.
     */
    nodeTimeUnit: z.enum(["ms", "s", "year", "ordinal"]).or(z.null()).optional(),
    /**
     * The IANA time zone (such as `"Europe/Paris"`) that node times written as text without an
     * offset are read in. Absent or `null` reads UTC. A name that is not a real zone is refused
     * by `time.setField`.
     */
    nodeTimeParseZone: z.string().or(z.null()).optional(),
    /** The key that holds when each node's time ends. Read only while the timeline is on. */
    nodeTimeEndPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's list of time spells. Read only while the timeline is on. */
    nodeTimeSpellsPath: z.string().or(z.null()).optional(),
    /**
     * The key that holds each node's whole location (coordinates or a place name), for the
     * location map layout. Absent or `null`: the layout finds a location column by name or by its
     * values. While set, the per-kind location keys below are ignored.
     */
    nodeLocationPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's latitude, used with `nodeLongitudePath` by the location map. */
    nodeLatitudePath: z.string().or(z.null()).optional(),
    /** The key that holds each node's longitude, used with `nodeLatitudePath` by the location map. */
    nodeLongitudePath: z.string().or(z.null()).optional(),
    /**
     * How the location is read. `"auto"` (or absent, or `null`) reads coordinates first, then place
     * names; `"coords"` only coordinates; `"country"`, `"region"` or `"city"` read
     * `nodeLocationPath` as place names of that kind (looked up in the location map's place
     * list); `"none"` reads no location at all, and finds none by name or
     * value.
     */
    nodeLocationRole: z.enum(["auto", "coords", "country", "region", "city", "none"]).or(z.null()).optional(),
    /**
     * The key that holds what narrows each place name, such as a city's country or region. Absent:
     * a city is narrowed by a country or region column found by name.
     */
    nodeLocationWithinPath: z.string().or(z.null()).optional(),
    /** An ISO 3166-1 alpha-2 country code (such as `"FR"`) that narrows every place name. */
    nodeLocationWithin: z.string().or(z.null()).optional(),
    /**
     * The key that holds each node's coordinates as one value. The location map reads a latitude
     * and longitude pair first, then this. Set by `data.setRole`.
     */
    nodeCoordinatesPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's country name. Set by `data.setRole`. */
    nodeCountryPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's region name. Set by `data.setRole`. */
    nodeRegionPath: z.string().or(z.null()).optional(),
    /**
     * The key that holds each node's city name, narrowed by the region or country keys when they
     * are set. Set by `data.setRole`.
     */
    nodeCityPath: z.string().or(z.null()).optional(),
    /**
     * The key that holds each node's x position. With `nodeYPath` also set, a node whose two values
     * are finite numbers is drawn there, scaled by `positionScale`, in place of a record's
     * `position`. Set by `data.setRole`.
     */
    nodeXPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's y position. See `nodeXPath`. */
    nodeYPath: z.string().or(z.null()).optional(),
    /** The key that holds each node's z position. Without it, z is 0. See `nodeXPath`. */
    nodeZPath: z.string().or(z.null()).optional(),
    // The default moved from "src" because the element's own guides all teach source/target, so a
    // file written the way the documentation says produced a graph with nodes, no edges and no error.
    /**
     * The key that holds each edge's source node id. Default `null`: the element tries `source`,
     * then `src`, then `from`, and throws `E_EDGE_ENDPOINTS_UNRESOLVED` when none answers. Once
     * set, an edge record without the key is rejected rather than guessed at.
     */
    edgeSrcIdPath: z.string().or(z.null()).default(null),
    /**
     * The key that holds each edge's target node id. Default `null`: the element tries `target`,
     * then `dst`, then `to`. See `edgeSrcIdPath`.
     */
    edgeDstIdPath: z.string().or(z.null()).default(null),
    /**
     * The key that holds each edge's own id, for data whose edges carry one. A second record with
     * the same id updates the edge already there instead of adding another. Default `null`: edges
     * carry no id, and repeats are settled by their ends and `repeatedEdges`.
     */
    edgeIdPath: z.string().or(z.null()).default(null),
    // The default is "keep" because the alternative is a loss a consumer cannot detect: dropped
    // repeats never reach the store, so `statistics().repeatedEdgeCount` would read zero.
    /**
     * What happens to a second edge between the same source and target: `"keep"` both (the
     * default), `"error"` to refuse it, `"first"` or `"last"` to keep one, or `"sum"`, `"min"` or
     * `"max"` to merge them into one edge with that weight.
     */
    repeatedEdges: z.enum(REPEATED_EDGE_POLICIES).default("keep"),
    // `resolveEdgeWeight` in src/session/project/ingest.ts is the one place both probes live; the
    // "value" fallback goes away only once nothing ships a "value" key.
    /**
     * The key that holds each edge's weight. Default `"weight"`. An edge without a number under this
     * key (or every edge, when it is `null`) is read from `value` instead, and weighs 1 without one.
     */
    edgeWeightPath: z.string().or(z.null()).default("weight"),
    /**
     * What an edge's weight means to algorithms and layouts: `"distance"` (larger is farther),
     * `"strength"` (larger is closer) or `"capacity"`. Default `null`: not stated. Saved with the
     * project.
     */
    edgeWeightMeaning: z.enum(["distance", "strength", "capacity"]).or(z.null()).default(null),
    /** The key that holds each edge's time, for the timeline. Default `null`: edges carry no time. */
    edgeTimePath: z.string().or(z.null()).default(null),
    /** How numbers in the edge time column are read. See `nodeTimeUnit`. */
    edgeTimeUnit: z.enum(["ms", "s", "year", "ordinal"]).or(z.null()).optional(),
    /** The time zone edge times written as text without an offset are read in. See `nodeTimeParseZone`. */
    edgeTimeParseZone: z.string().or(z.null()).optional(),
    /** The key that holds when each edge's time ends. Read only while the timeline is on. */
    edgeTimeEndPath: z.string().or(z.null()).optional(),
    /** The key that holds each edge's list of time spells. Read only while the timeline is on. */
    edgeTimeSpellsPath: z.string().or(z.null()).optional(),
    // Must be > 0: zero collapses every file-placed node onto the origin, which reads as "unplaced",
    // and a negative factor mirrors the layout.
    /**
     * The factor a position given in the data (a record's `position`, or the x, y and z keys) is
     * multiplied by before it is drawn. Must be greater than 0. Default `1`.
     */
    positionScale: z.number().positive().default(1),
    // DEP-M6-J: nothing reads this field yet; it is declared because this is a strictObject, so a
    // config carrying it must parse. Its reader owes a test of numeric 1 versus string "1".
    /**
     * Whether a numeric id and the same number written as text (`1` and `"1"`) name one node
     * (`"canonical"`, the default) or two (`"keep"`). Accepted and saved; it has no effect yet.
     */
    idCoercion: z.enum(ID_COERCION_RULES).default("canonical"),
});

// The object form carries only the `session.runs.start` options that mean something before anyone
// has seen the graph. `signal`, `onProgress`, `queue` and `dryRun` belong to a caller watching the
// run, `scope` names a view that does not exist yet, and `timeBoxMs`, `exact` and `sample` answer
// a cost nobody has seen. The object is strict, so a misspelled option fails instead of being dropped.
const AlgorithmName = z.string().trim().min(1);
const AlgorithmWithOptions = z.strictObject({
    /** The algorithm: a catalog key such as `"pagerank"`, or an address such as `"graphty:pagerank"`. */
    algorithm: AlgorithmName,
    /** The algorithm's own options, as `session.runs.start` takes them. */
    params: z.record(z.string(), z.unknown()).optional(),
    /**
     * What the element paints when the run first completes. `false` paints nothing; `{ size: true }`
     * also sizes nodes (or widens edges) by the result, and `{ size: [min, max] }` sets the range.
     * See `RunStyle`.
     */
    style: z
        .union([
            z.boolean(),
            z.strictObject({
                /** `true` to size by the result as well, or the `[min, max]` size range to use. */
                size: z.union([z.boolean(), z.tuple([z.number(), z.number()]).readonly()]).optional(),
            }),
        ])
        .optional(),
    /** The seed for an algorithm that uses randomness, so every load gives the same result. */
    seed: z.number().optional(),
    /** The id to give the run, so a saved project or a later call can name it. */
    as: z.string().min(1).optional(),
});
/**
 * One entry of the list of algorithms to run when data loads (`algorithmsOnLoad`, or
 * `data.algorithms` in a config): an algorithm name such as `"pagerank"`, or an object
 * `{ algorithm, params?, style?, seed?, as? }` that also passes run options.
 * @example
 * ```ts
 * element.algorithmsOnLoad = ["degree", { algorithm: "pagerank", style: true, seed: 1 }];
 * ```
 */
export const AlgorithmOnLoad = z.union([AlgorithmName, AlgorithmWithOptions]);
/**
 * One entry of the list of algorithms to run when data loads: an algorithm name, or
 * `{ algorithm, params?, style?, seed?, as? }`.
 */
export type AlgorithmOnLoad = z.infer<typeof AlgorithmOnLoad>;

/**
 * Check a load-time algorithm list, entry by entry.
 * @param value - What the caller handed over.
 * @returns The list, parsed.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` naming the first bad entry and its index.
 */
export function parseAlgorithmsOnLoad(value: unknown): AlgorithmOnLoad[] {
    if (!Array.isArray(value)) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `The algorithms to run on load must be a list, not ${JSON.stringify(value)}.`,
            source: "config",
            details: { value },
        });
    }

    return value.map((entry: unknown, index) => {
        // Parsed against the one form it is trying to be, so the issue names the bad option rather
        // than "matched neither form".
        const parsed =
            typeof entry === "object" && entry !== null
                ? AlgorithmWithOptions.safeParse(entry)
                : AlgorithmName.safeParse(entry);

        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const where = issue.path.length > 0 ? ` at "${issue.path.join(".")}"` : "";

            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message:
                    `Algorithm on load #${index} (${JSON.stringify(entry)}) is not valid${where}: ${issue.message}. ` +
                    `Each entry is an algorithm name, or { algorithm, params?, style?, seed?, as? }.`,
                source: "config",
                details: { index, entry, path: issue.path },
            });
        }

        return parsed.data;
    });
}

export const DataConfig = z.strictObject({
    algorithms: z.array(AlgorithmOnLoad).optional(),
    knownFields: GraphKnownFields.prefault({}),
    // graph-format design 14.4 rule 1: under "auto" the builder starts directed and unlocked so a
    // file header can set the direction while the builder is still empty; an explicit boolean
    // calls lockDirected(). Record-pushed data never changes the direction.
    directed: z.union([z.boolean(), z.literal("auto")]).default("auto"),
});
