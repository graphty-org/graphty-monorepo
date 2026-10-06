/**
 * What the OBO importer and the JSON importer's `obographs` dialect share (design section 1.0, the
 * `ontology.ts` building block): the OBO column vocabulary (names, dtypes, roles), so the `.obo` and
 * the `.json` of one ontology give the same columns, and the OBO 1.4 rule for turning the IRIs
 * OBO Graphs writes back into the identifiers the `.obo` file writes (section 4.6).
 */

import { type ColumnDecl } from "@graphty/graph-format";

/** The dtypes the OBO vocabulary uses. */
type OboDtype = "string" | "dict" | "bool" | "list" | "json";

/** One column of the OBO vocabulary. */
interface OboColumnSpec {
    /** The dtype. */
    readonly dtype: OboDtype;
    /** The role, when the column carries one. */
    readonly role?: "label" | "kind" | undefined;
}

/**
 * The node columns of the OBO vocabulary, keyed by column name (design section 4.2). The names are
 * the OBO tag names, so a Gene Ontology user finds `namespace`, `def` and `is_obsolete` under the
 * names the GO documentation uses.
 */
export const OBO_NODE_COLUMNS: Readonly<Record<string, OboColumnSpec>> = Object.freeze({
    type: { dtype: "dict" },
    name: { dtype: "string", role: "label" },
    namespace: { dtype: "dict" },
    def: { dtype: "string" },
    "def.xrefs": { dtype: "list" },
    comment: { dtype: "string" },
    synonym: { dtype: "json" },
    xref: { dtype: "list" },
    "xref.descriptions": { dtype: "json" },
    alt_id: { dtype: "list" },
    subset: { dtype: "list" },
    replaced_by: { dtype: "list" },
    consider: { dtype: "list" },
    is_obsolete: { dtype: "bool" },
    is_anonymous: { dtype: "bool" },
    builtin: { dtype: "bool" },
    created_by: { dtype: "string" },
    creation_date: { dtype: "string" },
    intersection_of: { dtype: "json" },
    union_of: { dtype: "list" },
    equivalent_to: { dtype: "list" },
    disjoint_from: { dtype: "list" },
    property_value: { dtype: "json" },
    // Typedef frames, under typedefs: "nodes"
    domain: { dtype: "string" },
    range: { dtype: "string" },
    inverse_of: { dtype: "string" },
    transitive_over: { dtype: "list" },
    disjoint_over: { dtype: "list" },
    holds_over_chain: { dtype: "json" },
    equivalent_to_chain: { dtype: "json" },
    expand_assertion_to: { dtype: "json" },
    expand_expression_to: { dtype: "json" },
    is_cyclic: { dtype: "bool" },
    is_reflexive: { dtype: "bool" },
    is_symmetric: { dtype: "bool" },
    is_anti_symmetric: { dtype: "bool" },
    is_asymmetric: { dtype: "bool" },
    is_transitive: { dtype: "bool" },
    is_functional: { dtype: "bool" },
    is_inverse_functional: { dtype: "bool" },
    is_metadata_tag: { dtype: "bool" },
    is_class_level: { dtype: "bool" },
    // OBO Graphs only
    propertyType: { dtype: "dict" },
    // what has no column of its own
    "obo.qualifiers": { dtype: "json" },
    "obo.unrecognized": { dtype: "json" },
});

/** The edge columns of the OBO vocabulary. */
const OBO_EDGE_COLUMNS: Readonly<Record<string, OboColumnSpec>> = Object.freeze({
    relation: { dtype: "dict", role: "kind" },
    qualifiers: { dtype: "json" },
    meta: { dtype: "json" },
});

/** The node column that marks a node made for an undeclared reference (design section 4.2). */
export const PLACEHOLDER_COLUMN = "graphty.placeholder";

/**
 * The declaration of an OBO vocabulary column.
 * @param domain - node or edge
 * @param name - the column name (a key of OBO_NODE_COLUMNS / OBO_EDGE_COLUMNS, or the placeholder column)
 * @returns the declaration, nullable, with origin `{ format: "obo", id: name }`
 */
export function oboColumnDecl(domain: "node" | "edge", name: string): ColumnDecl {
    if (name === PLACEHOLDER_COLUMN) {
        return { name, dtype: "bool", nullable: true, origin: { format: "graphty", id: "placeholder" } };
    }
    const spec = (domain === "node" ? OBO_NODE_COLUMNS : OBO_EDGE_COLUMNS)[name];
    const decl: ColumnDecl = { name, dtype: spec.dtype, nullable: true, origin: { format: "obo", id: name } };
    if (spec.dtype === "list") {
        decl.itemDtype = "string";
    }
    if (spec.role !== undefined) {
        decl.role = spec.role;
    }
    return decl;
}

/** The OBO PURL base every OBO Foundry IRI starts with. */
const OBO_PURL = "http://purl.obolibrary.org/obo/";

/** The oboInOwl namespace of the OBO-to-OWL mapping's annotation properties. */
const OBO_IN_OWL = "http://www.geneontology.org/formats/oboInOwl#";

/**
 * An IRI as the identifier the `.obo` file writes (the OBO 1.4 mapping, section 5.9, read
 * backwards): `http://purl.obolibrary.org/obo/GO_0008150` is `GO:0008150` (the prefix is the text
 * before the first underscore), and `http://purl.obolibrary.org/obo/go#regulates` (how the OWL
 * translation writes an unprefixed OBO id: subsets, relations, synonym types) is `regulates`.
 * Every other IRI, and an OBO PURL that fits neither form (`.../obo/T/Female`), is kept.
 * @param iri - the IRI
 * @returns the CURIE or local id, or the IRI unchanged
 */
export function compactOboIri(iri: string): string {
    if (!iri.startsWith(OBO_PURL)) {
        return iri;
    }
    const rest = iri.slice(OBO_PURL.length);
    const hash = rest.indexOf("#");
    if (hash > 0) {
        const local = rest.slice(hash + 1);
        return local.length > 0 && !rest.slice(0, hash).includes("/") ? local : iri;
    }
    const underscore = rest.indexOf("_");
    if (underscore <= 0 || rest.includes("/") || underscore === rest.length - 1) {
        return iri;
    }
    return `${rest.slice(0, underscore)}:${rest.slice(underscore + 1)}`;
}

/** The OBO synonym scopes. */
export const SYNONYM_SCOPES: ReadonlySet<string> = new Set(["EXACT", "BROAD", "NARROW", "RELATED"]);

/**
 * The OBO synonym scope of an OBO Graphs synonym predicate (`hasExactSynonym`, with or without the
 * oboInOwl namespace).
 * @param pred - the predicate
 * @returns the scope, or null for a predicate that is not one of the four
 */
export function synonymScopeOf(pred: string): string | null {
    const local = pred.startsWith(OBO_IN_OWL) ? pred.slice(OBO_IN_OWL.length) : pred;
    const match = /^has(Exact|Broad|Narrow|Related)Synonym$/.exec(local);
    return match === null ? null : match[1].toUpperCase();
}

/**
 * The OBO tag a `basicPropertyValues` predicate of OBO Graphs came from (the OBO-to-OWL mapping of
 * the tags that are annotations), so the `.json` of an ontology fills the same columns as its
 * `.obo`. `shorthand` is the relation's short name; every predicate not listed is a
 * `property_value`.
 */
export const OBOGRAPHS_PREDICATE_TAGS: ReadonlyMap<string, string> = new Map([
    [`${OBO_IN_OWL}hasOBONamespace`, "namespace"],
    [`${OBO_IN_OWL}hasAlternativeId`, "alt_id"],
    [`${OBO_IN_OWL}created_by`, "created_by"],
    [`${OBO_IN_OWL}creation_date`, "creation_date"],
    [`${OBO_PURL}IAO_0100001`, "replaced_by"],
    [`${OBO_IN_OWL}consider`, "consider"],
    [`${OBO_IN_OWL}shorthand`, "shorthand"],
]);
