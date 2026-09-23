import type { DuplicatePolicy, IdCoercion } from "@graphty/graph-format";
import { z } from "zod/v4";

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
const GraphKnownFields = z.strictObject({
    nodeIdPath: z.string().default("id"),
    // What to CALL a node, as distinct from how to address it. A result card naming the busiest
    // node, a legend row and a ranked list all want a name a reader recognises, and an id is only
    // sometimes one: a GML file keys its nodes by integer while carrying the name beside it. Null
    // means the element has not been told, and every reader falls back to the printed id -- which
    // is honest, because an id a person chose often IS the name.
    nodeLabelPath: z.string().or(z.null()).default(null),
    nodeWeightPath: z.string().or(z.null()).default(null),
    nodeTimePath: z.string().or(z.null()).default(null),
    // Null means "probe": the element reads source/target, then src/dst, then from/to, once per
    // batch of edge records, and throws E_EDGE_ENDPOINTS_UNRESOLVED when none of them answers.
    // Naming an expression here settles the question and turns the probe off -- a record that does
    // not answer a declared expression is a rejected record, not a reason to guess again. The
    // default moved from "src" because the element's own guides all teach source/target, so a file
    // written the way the documentation says produced a graph with nodes, no edges and no error.
    edgeSrcIdPath: z.string().or(z.null()).default(null),
    edgeDstIdPath: z.string().or(z.null()).default(null),
    // The record key that identifies an edge, for data that carries genuine edge identifiers. A
    // second record with the same value merges into the edge already present instead of creating
    // one. Null -- the default -- means the records carry no edge identity, so a repeat is decided
    // by its endpoints and `repeatedEdges` alone.
    edgeIdPath: z.string().or(z.null()).default(null),
    // What happens to a second record naming an ordered pair the graph already holds. The
    // vocabulary is graph-format's, unchanged, because inventing a second spelling for a policy
    // that already has one is exactly the translation this release removes.
    //
    // The default is "keep" -- both edges exist, each with its own id, weight and attributes --
    // because the alternative is a loss a consumer cannot detect: the dropped repeats never reach
    // the store, so `statistics().repeatedEdgeCount` is structurally pinned at zero and there is
    // no number anywhere that disagrees with the load. Keeping them changes edge counts on any
    // multigraph, which is a change a consumer can see, measure and turn off with one word.
    repeatedEdges: z.enum(REPEATED_EDGE_POLICIES).default("keep"),
    // graph-format design 14.4 rule 10: the element default is "weight", which is what the io
    // importers write. DataManager reads this path first and falls back to the literal "value"
    // key, because "value" is what every weighted dataset, fixture and story in this repository
    // carries; `resolveEdgeWeight` in src/data/ingest.ts is the one place both probes live.
    // Without that fallback every weighted dataset here would silently read as unweighted, so the
    // fallback goes away only once nothing ships a "value" key.
    edgeWeightPath: z.string().or(z.null()).default("weight"),
    edgeTimePath: z.string().or(z.null()).default(null),
    // graph-format design 14.4's addNodes row: a record's data.position is written into the
    // importer-seed column SCALED to scene units by this factor. It must be > 0. Zero collapses
    // every file-placed node onto the scene origin, which is indistinguishable from the NaN the
    // design reserves for "unplaced", and a negative factor point-reflects the whole layout; zod
    // already rejects NaN and Infinity, so those two are the only reachable nonsense values.
    positionScale: z.number().positive().default(1),
    // graph-format design 14.4's retirement paragraph (:4204): "canonical" makes a numeric id and
    // the string form of the same number ONE node; "keep" leaves them distinct, which is what a
    // JSON numeric-id node list plus a CSV string-id edge list needs to stay honest.
    // DEP-M6-J: the design's default is source-dependent ("canonical" for text sources, "keep" for
    // JSON) and no DataSource exposes its kind to the config layer, so ONE unconditional default
    // ships. Nothing in M6 READS this field; IO1 gives it meaning, and IO1 owes an explicit test
    // for the numeric 1 versus string "1" case, because "canonical" merges those two ids into one
    // node and "keep" does not. It is declared now because this is a strictObject: a config that
    // sets a key the schema has not declared is a parse ERROR, so the key has to exist here before
    // any config is allowed to carry it.
    idCoercion: z.enum(ID_COERCION_RULES).default("canonical"),
});

/**
 * One entry of the load-time algorithm list: an algorithm, or an algorithm with run options.
 *
 * A string is the algorithm alone -- a catalogue key such as "pagerank" or a 1.x address such as
 * "graphty:pagerank". The object form carries the options `session.runs.start` takes that mean
 * something before anyone has seen the graph: `params`, `style` (see `RunStyle`), `seed` and `as`.
 * The rest are left out on purpose: `signal`, `onProgress`, `queue` and `dryRun` belong to a
 * caller that is there to watch or steer the run, `scope` names a view of data that does not exist
 * yet, and `timeBoxMs`, `exact` and `sample` are answers to a cost the caller has not seen.
 * The object is strict, so a misspelled option fails instead of being dropped.
 */
const AlgorithmName = z.string().trim().min(1);
const AlgorithmWithOptions = z.strictObject({
    algorithm: AlgorithmName,
    params: z.record(z.string(), z.unknown()).optional(),
    style: z
        .union([
            z.boolean(),
            z.strictObject({ size: z.union([z.boolean(), z.tuple([z.number(), z.number()]).readonly()]).optional() }),
        ])
        .optional(),
    seed: z.number().optional(),
    as: z.string().min(1).optional(),
});
export const AlgorithmOnLoad = z.union([AlgorithmName, AlgorithmWithOptions]);
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
            typeof entry === "object" && entry !== null ? AlgorithmWithOptions.safeParse(entry) : AlgorithmName.safeParse(entry);

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
