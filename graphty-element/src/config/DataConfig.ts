import type { IdCoercion } from "@graphty/graph-format";
import { z } from "zod/v4";

// graph-format design 14.4 names two of graph-format's four IdCoercion rules for the element
// config; "string" and "number" are importer-level rules no element config path needs. The
// `satisfies` keeps this list a strict SUBSET of graph-format's own type, so an invented or
// misspelled rule is a compile error here instead of an importer-time surprise in IO1.
const ID_COERCION_RULES = ["canonical", "keep"] as const satisfies readonly IdCoercion[];

// COMPATIBILITY NOTE, deliberate: this was a z.object(), which STRIPS an unknown key. It is now a
// z.strictObject(), which THROWS on one, matching `DataConfig` itself and every other object in
// StyleTemplate.ts (StyleTemplateV1, AppliedNodeStyle, CalculatedStyle, TemplateMetadata are all
// strict already). The consequence to know about: a persisted or hand-written template whose
// `data.knownFields` carries a key this schema does not declare used to load with the key silently
// dropped and now fails at parse, naming the key. That is the point -- `idCoersion` must not fall
// back to the default in silence -- but it is a BREAKING direction for a stored template, so a key
// removed from here later needs a StyleTemplate majorVersion bump and an upgrade step, not a
// quiet deletion.
const GraphKnownFields = z.strictObject({
    nodeIdPath: z.string().default("id"),
    nodeWeightPath: z.string().or(z.null()).default(null),
    nodeTimePath: z.string().or(z.null()).default(null),
    edgeSrcIdPath: z.string().default("src"),
    edgeDstIdPath: z.string().default("dst"),
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

export const DataConfig = z.strictObject({
    algorithms: z.array(z.string()).optional(),
    knownFields: GraphKnownFields.prefault({}),
    // graph-format design 14.4 rule 1: under "auto" the builder starts directed and unlocked so a
    // file header can set the direction while the builder is still empty; an explicit boolean
    // calls lockDirected(). Record-pushed data never changes the direction.
    directed: z.union([z.boolean(), z.literal("auto")]).default("auto"),
});
