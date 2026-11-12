/**
 * The SPARQL the source sends: the caller's CONSTRUCT or DESCRIBE with the paging the source
 * adds (`ORDER BY` the template's variables, `LIMIT` and `OFFSET`), and the generated queries of
 * "all", "neighborhood" and expand (`VALUES ?s { ... }`).
 */

/** Characters an IRIREF may not hold. */
const NOT_IRI = /[\s<>"{}|^`\\]/;

/** A language tag a filter may name. */
const LANGUAGE = /^[a-z]{1,8}(-[a-z\d]{1,8})*$/i;

/** The query forms, as the first keyword after the prologue. */
type QueryForm = "construct" | "describe" | "select" | "ask" | null;

/** What paging the caller's query takes. */
interface UserQuery {
    /** Its form. */
    readonly form: QueryForm;
    /** Whether it sets its own LIMIT or OFFSET, so the source sends it as written. */
    readonly ownLimit: boolean;
    /** Whether it orders its solutions itself. */
    readonly ordered: boolean;
    /** The variables of a CONSTRUCT template, in order, for ORDER BY. */
    readonly templateVars: readonly string[];
}

/**
 * The query with IRIs, strings and comments blanked out, so keywords and braces can be found.
 * @param query - the query
 * @returns the bare text
 */
function bare(query: string): string {
    return query
        .replaceAll(/<[^<>\s]*>/g, "<>")
        .replaceAll(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
        .replaceAll(/#[^\n]*/g, "");
}

/** The keywords of SPARQL Update, which a query this source sends never holds. */
const UPDATE_KEYWORDS = /\b(INSERT|DELETE|LOAD|CLEAR|DROP|CREATE|ADD|MOVE|COPY|WITH)\b/i;

/** One declaration of the prologue, as `bare` leaves it: `BASE <>` or `PREFIX ex: <>`. */
const DECLARATION = /^\s*(?:BASE|PREFIX\s*[^\s:<]*:)\s*<>/i;

/**
 * Bare text after its prologue, one declaration at a time.
 * @param text - the bare text
 * @returns what follows the prologue
 */
function afterPrologue(text: string): string {
    let rest = text;
    for (let found = DECLARATION.exec(rest); found !== null; found = DECLARATION.exec(rest)) {
        rest = rest.slice(found[0].length);
    }
    return rest;
}

/**
 * The bare text with variables and prefixed names blanked too, so a name such as `ex:LIMIT` or
 * `?DELETE` is never read as a keyword.
 * @param text - the bare text after the prologue
 * @returns the text holding only keywords, punctuation and blanks
 */
function keywordsOnly(text: string): string {
    // one run of name characters at a time: a run holding a colon is a prefixed name
    return text.replaceAll(/[?$]\w+/g, "?v").replaceAll(/[\w.%:-]+/g, (run) => (run.includes(":") ? "_" : run));
}

/**
 * Whether bare text holds a `;` outside every brace: SPARQL Update separates its operations so, and
 * a query never holds one there.
 * @param text - the text
 * @returns true when it does
 */
function semicolonOutside(text: string): boolean {
    let depth = 0;
    for (const char of text) {
        if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;
        } else if (char === ";" && depth <= 0) {
            return true;
        }
    }
    return false;
}

/**
 * Read what paging a caller's query takes. Its form is the first keyword after the prologue; a
 * text that holds an update keyword, or a `;` outside braces, has no form, so it is refused.
 * @param query - the query
 * @returns its form, its own modifiers and its template variables
 */
export function readQuery(query: string): UserQuery {
    const body = afterPrologue(bare(query));
    const text = keywordsOnly(body);
    const first = /^\s*([A-Za-z]+)/.exec(text)?.[1]?.toUpperCase() ?? "";
    const update = UPDATE_KEYWORDS.test(text) || semicolonOutside(text);
    const form = !update && ["CONSTRUCT", "DESCRIBE", "SELECT", "ASK"].includes(first) ? first.toLowerCase() : null;
    // the solution modifiers follow the last closing brace (a trailing VALUES block is not handled)
    const tail = text.slice(text.lastIndexOf("}") + 1);
    let templateVars: string[] = [];
    if (form === "construct") {
        const template = /\bCONSTRUCT\s*\{([^}]*)\}/i.exec(body)?.[1] ?? "";
        templateVars = [...new Set(template.match(/[?$]\w+/g) ?? [])].map((v) => `?${v.slice(1)}`);
    }
    return {
        form: form as QueryForm,
        ownLimit: /\b(LIMIT|OFFSET)\b/i.test(tail),
        ordered: /\bORDER\s+BY\b/i.test(tail),
        templateVars,
    };
}

/**
 * The caller's query with one page's modifiers added.
 * @param query - the query
 * @param shape - what readQuery found
 * @param limit - solutions per page
 * @param offset - solutions to skip
 * @returns the query to send
 */
export function pagedQuery(query: string, shape: UserQuery, limit: number, offset: number): string {
    const order = shape.ordered || shape.templateVars.length === 0 ? "" : `\nORDER BY ${shape.templateVars.join(" ")}`;
    const skip = offset > 0 ? ` OFFSET ${String(offset)}` : "";
    return `${query.trimEnd()}${order}\nLIMIT ${String(limit)}${skip}`;
}

/**
 * An IRI as a SPARQL term, or null when it cannot be one.
 * @param id - the id
 * @returns `<iri>`, or null
 */
export function iriTerm(id: unknown): string | null {
    const text = String(id);
    return /^[a-z][\w+.-]*:/i.test(text) && !NOT_IRI.test(text) ? `<${text}>` : null;
}

/** What generated queries keep: literals in a language, edges along some predicates. */
interface TripleFilter {
    /** Keep literals tagged with this language or untagged; "" keeps every literal. */
    readonly language: string;
    /** Keep edges whose predicate starts with one of these IRIs; empty keeps every edge. */
    readonly predicates: readonly string[];
}

/**
 * The FILTERs of generated queries, or "" for none. Both values are checked by the caller.
 * @param filter - the language and the predicate prefixes
 * @returns the FILTER clauses
 */
function filters(filter: TripleFilter): string {
    const { language, predicates } = filter;
    const lang =
        language === "" ? "" : ` FILTER(!isLiteral(?o) || lang(?o) = "" || langMatches(lang(?o), "${language}"))`;
    const along = predicates.map((p) => `STRSTARTS(STR(?p), "${p}")`).join(" || ");
    return predicates.length === 0 ? lang : `${lang} FILTER(isLiteral(?o) || ${along})`;
}

/**
 * Whether a language tag may go into a FILTER.
 * @param language - the tag
 * @returns whether it is well formed
 */
export function validLanguage(language: string): boolean {
    return LANGUAGE.test(language);
}

/**
 * Mode "all": every triple, ordered so pages are stable.
 * @param filter - what to keep
 * @param limit - solutions per page
 * @param offset - solutions to skip
 * @returns the query
 */
export function allQuery(filter: TripleFilter, limit: number, offset: number): string {
    return pagedQuery(
        `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o .${filters(filter)} }`,
        { form: "construct", ownLimit: false, ordered: false, templateVars: ["?s", "?p", "?o"] },
        limit,
        offset,
    );
}

/**
 * The triples around some IRIs: out (`VALUES ?s`), in (`VALUES ?o`) or both.
 * @param iris - the IRIs as terms
 * @param direction - which triples
 * @param filter - what to keep
 * @param limit - solutions per page
 * @param offset - solutions to skip
 * @returns the query
 */
export function aroundQuery(
    iris: readonly string[],
    direction: "out" | "in" | "both",
    filter: TripleFilter,
    limit: number,
    offset: number,
): string {
    const values = iris.join(" ");
    const out = `{ VALUES ?s { ${values} } ?s ?p ?o .${filters(filter)} }`;
    const inward = `{ VALUES ?o { ${values} } ?s ?p ?o .${filters({ ...filter, language: "" })} }`;
    let where = `${out} UNION ${inward}`;
    if (direction !== "both") {
        where = direction === "out" ? out : inward;
    }
    return pagedQuery(
        `CONSTRUCT { ?s ?p ?o } WHERE { ${where} }`,
        { form: "construct", ownLimit: false, ordered: false, templateVars: ["?s", "?p", "?o"] },
        limit,
        offset,
    );
}
