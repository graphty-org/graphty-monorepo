/**
 * Reading the N-Triples a CONSTRUCT or DESCRIBE answers, and turning triples into nodes and edges:
 * an IRI or blank-node object is an edge from the subject, a literal is an attribute of the
 * subject named by the predicate's local name.
 */

/** One RDF term. */
export type Term =
    | { readonly kind: "iri"; readonly value: string }
    | { readonly kind: "bnode"; readonly value: string }
    | { readonly kind: "literal"; readonly value: string; readonly lang: string; readonly datatype: string };

/** One triple. */
export interface Triple {
    /** The subject: an IRI or a blank node. */
    readonly s: Term;
    /** The predicate IRI. */
    readonly p: string;
    /** The object. */
    readonly o: Term;
}

/** One term at the sticky position: an IRI, a blank node, or a literal with its tag or type. */
const TERM = /\s*(?:<([^<>]*)>|_:([\w.-]*[\w-])|"((?:[^"\\]|\\.)*)"(?:@([A-Za-z][\w-]*)|\^\^<([^<>]*)>)?)/y;

/** The end of a statement: a dot, then an optional comment. */
const END = /\s*\.\s*(?:#.*)?$/y;

/** The XSD namespace. */
const XSD = "http://www.w3.org/2001/XMLSchema#";

/** The XSD numeric types, read as numbers. */
const NUMERIC: ReadonlySet<string> = new Set(
    [
        "integer",
        "decimal",
        "double",
        "float",
        "int",
        "long",
        "short",
        "byte",
        "nonNegativeInteger",
        "nonPositiveInteger",
        "positiveInteger",
        "negativeInteger",
        "unsignedInt",
        "unsignedLong",
        "unsignedShort",
        "unsignedByte",
    ].map((t) => XSD + t),
);

/**
 * Undo N-Triples escapes.
 * @param text - escaped text
 * @returns the text
 */
function unescape(text: string): string {
    if (!text.includes("\\")) {
        return text;
    }
    const simple: Readonly<Record<string, string>> = { t: "\t", b: "\b", n: "\n", r: "\r", f: "\f" };
    return text.replaceAll(
        /\\(?:u([\da-fA-F]{4})|U([\da-fA-F]{8})|(.))/g,
        (_m, u4?: string, u8?: string, c?: string) => {
            const hex = u4 ?? u8;
            if (hex !== undefined) {
                return String.fromCodePoint(Number.parseInt(hex, 16));
            }
            return simple[c ?? ""] ?? c ?? "";
        },
    );
}

/**
 * Read one term at `at`.
 * @param line - the line
 * @param at - where to start
 * @returns the term and where it ended, or null when there is none
 */
function readTerm(line: string, at: number): { term: Term; end: number } | null {
    TERM.lastIndex = at;
    const m = TERM.exec(line);
    if (m === null) {
        return null;
    }
    const [, iri, bnode, lexical, lang, datatype] = m;
    let term: Term;
    if (iri !== undefined) {
        term = { kind: "iri", value: unescape(iri) };
    } else if (bnode === undefined) {
        term = {
            kind: "literal",
            value: unescape(lexical ?? ""),
            lang: lang?.toLowerCase() ?? "",
            datatype: datatype ?? "",
        };
    } else {
        term = { kind: "bnode", value: `_:${bnode}` };
    }
    return { term, end: TERM.lastIndex };
}

/**
 * Parse N-Triples.
 * @param text - the document
 * @returns the triples, or the 1-based number of the first line that is not a triple
 */
export function parseNTriples(text: string): { triples: Triple[]; badLine: number | null } {
    const triples: Triple[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("#")) {
            continue;
        }
        const s = readTerm(line, 0);
        const p = s === null ? null : readTerm(line, s.end);
        const o = p === null ? null : readTerm(line, p.end);
        END.lastIndex = o?.end ?? 0;
        if (
            s === null ||
            p === null ||
            o === null ||
            s.term.kind === "literal" ||
            p.term.kind !== "iri" ||
            !END.test(line)
        ) {
            return { triples, badLine: i + 1 };
        }
        triples.push({ s: s.term, p: p.term.value, o: o.term });
    }
    return { triples, badLine: null };
}

/**
 * The local name of an IRI: what follows its last `#`, else its last `/`, else its last `:`.
 * @param iri - the IRI
 * @returns the local name, or the whole IRI when nothing follows
 */
export function localName(iri: string): string {
    const cut = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"), iri.lastIndexOf(":"));
    const name = iri.slice(cut + 1);
    return name === "" ? iri : name;
}

/**
 * A literal's value: numbers and booleans as such, everything else as its text.
 * @param term - the literal
 * @returns the value
 */
function literalValue(term: Extract<Term, { kind: "literal" }>): string | number | boolean {
    if (NUMERIC.has(term.datatype)) {
        const n = Number(term.value);
        return Number.isFinite(n) ? n : term.value;
    }
    if (term.datatype === `${XSD}boolean`) {
        return term.value === "true" || term.value === "1";
    }
    return term.value;
}

/**
 * Whether a literal's language tag passes a language filter (SPARQL's langMatches, plus untagged).
 * @param lang - the literal's tag, lowercase
 * @param want - the filter, lowercase, or "" for none
 * @returns whether to keep it
 */
function languageMatches(lang: string, want: string): boolean {
    return want === "" || lang === "" || lang === want || lang.startsWith(`${want}-`);
}

/** The nodes and edges of some triples. */
export interface Graphed {
    /** Each subject's literal attributes, by subject id; a predicate's first value wins. */
    readonly nodes: Map<string, Record<string, string | number | boolean>>;
    /** One edge per IRI or blank-node object. */
    readonly edges: { source: string; target: string; type: string; predicate: string }[];
}

/**
 * Turn triples into nodes and edges.
 * @param triples - the triples
 * @param language - the language filter, lowercase, or ""
 * @param into - nodes and edges to add to
 * @returns the nodes and edges
 */
export function graphTriples(triples: readonly Triple[], language: string, into?: Graphed): Graphed {
    const out: Graphed = into ?? { nodes: new Map(), edges: [] };
    for (const { s, p, o } of triples) {
        let attrs = out.nodes.get(s.value);
        if (attrs === undefined) {
            attrs = {};
            out.nodes.set(s.value, attrs);
        }
        if (o.kind === "literal") {
            const key = localName(p);
            // ponytail: one value per predicate (the first); a list column if multi-valued literals matter
            if (languageMatches(o.lang, language) && !(key in attrs)) {
                attrs[key] = literalValue(o);
            }
        } else {
            out.edges.push({ source: s.value, target: o.value, type: localName(p), predicate: p });
        }
    }
    return out;
}

/**
 * One canonical line per triple, for the content hash.
 * @param t - the triple
 * @returns the line
 */
export function canonicalTriple(t: Triple): string {
    const o = t.o.kind === "literal" ? JSON.stringify([t.o.value, t.o.lang, t.o.datatype]) : t.o.value;
    return `${t.s.value} ${t.p} ${o}`;
}
