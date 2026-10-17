/**
 * The `openalex` preset of the REST mapping (design section 13.3): OpenAlex's citation graph
 * around a work, or its co-authorship graph around an author, as a mapping the generic engine runs.
 * The seed's own record comes first; citing works page by cursor; referenced works are stubs until
 * hydrated or expanded. Freshness is the newest `updated_date`.
 */

import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { OPENALEX_SOURCE_ID } from "../ids.js";
import { type GraphSource, type SourceContext } from "../types.js";
import { OPENALEX_DESCRIPTOR } from "./descriptor.js";
import { type OpenAlexParams, type RestEntity, type RestMapping } from "./params.js";
import { restMethods, type RestPlan, type RestPurpose } from "./source.js";

/** OpenAlex ids are URLs under this prefix. */
const PREFIX = "https://openalex.org/";

/** The work fields every citation load selects. */
const WORK_FIELDS = "id,display_name,publication_year,cited_by_count,updated_date,referenced_works";

/**
 * A list request over works, `{ids}` batched 50 at a time and joined by `|`.
 * @param filter - the filter template
 * @param perPage - the page size
 * @param paged - whether it pages by cursor
 * @returns the request
 */
function works(filter: string, perPage: string, paged: boolean): RestMapping["requests"][string] {
    return {
        path: "/works",
        query: { filter, "per-page": perPage, select: "{select}" },
        batch: { max: 50, join: "|" },
        records: "results",
        entity: "work",
        ...(paged ? { paging: { style: "cursor", param: "cursor", first: "*", next: "meta.next_cursor" } } : {}),
    };
}

/** An entity known by its OpenAlex id and display name. */
const named: RestEntity = { id: "id", stripPrefix: PREFIX, fields: { name: "display_name" } };

/**
 * OpenAlex's citation graph as a mapping: the seed work (`{ids}`), the works citing it page by page,
 * each work's references as `cites` edges, and, when `{select}` asks for `authorships` and
 * `topics`, the authors, their institutions and the topics as nodes. Fill `{ids}` with work ids
 * and `{select}` with the fields to read. The `openalex` source chooses both from its params and
 * leaves out the rules for what is not included. Experimental.
 * @category Network sources
 */
export const OPENALEX_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://api.openalex.org",
    load: "citing",
    seed: "by-id",
    expand: { in: "citing", out: "by-id" },
    hydrate: "by-id",
    directed: true,
    modified: "updated_date",
    auth: { kind: "api-key", query: "api_key" },
    rateLimit: { requests: 10, perMs: 1000 },
    budgetHeaders: { remaining: "x-ratelimit-remaining", reset: "x-ratelimit-reset" },
    requests: {
        citing: works("cites:{ids}", "200", true),
        "by-id": works("openalex:{ids}", "50", false),
        authored: works("authorships.author.id:{ids}", "200", true),
        "authors-by-id": {
            path: "/authors",
            query: { filter: "openalex:{ids}", "per-page": "50", select: "id,display_name" },
            batch: { max: 50, join: "|" },
            records: "results",
            entity: "author",
        },
    },
    entities: {
        work: {
            id: "id",
            stripPrefix: PREFIX,
            fields: {
                title: "display_name",
                year: "publication_year",
                citedBy: "cited_by_count",
                updated: "updated_date",
            },
            edges: [
                { to: "referenced_works[]", type: "cites", entity: "work" },
                { to: "authorships[].author.id", type: "authored_by", entity: "author" },
                {
                    each: "authorships[]",
                    from: "author.id",
                    to: "institutions[].id",
                    type: "affiliated_with",
                    entity: "institution",
                },
                { to: "topics[].id", type: "has_topic", entity: "topic" },
            ],
            embedded: [
                { at: "authorships[].author", entity: "author" },
                { at: "authorships[].institutions[]", entity: "institution" },
                { at: "topics[]", entity: "topic" },
            ],
        },
        author: named,
        institution: named,
        topic: named,
    },
});

/** What `include` may hold. */
type Include = "authors" | "institutions" | "topics";

/**
 * The included kinds, from an array or a comma-separated string.
 * @param include - the param
 * @returns the set
 */
function includes(include: unknown): Set<Include> {
    const list: unknown[] = typeof include === "string" ? include.split(",") : [];
    if (Array.isArray(include)) {
        list.push(...(include as unknown[]));
    }
    const out = new Set(list.map((v) => String(v).trim()).filter((v) => v !== "") as Include[]);
    if (out.has("institutions")) {
        // an institution hangs off an author, so it brings its authors
        out.add("authors");
    }
    return out;
}

/**
 * The citation mapping without the rules for what is not included.
 * @param include - what is included
 * @returns the mapping
 */
function citationMapping(include: ReadonlySet<Include>): RestMapping {
    const { work } = OPENALEX_MAPPING.entities;
    const keepEdge = (type: string): boolean =>
        type === "cites" ||
        (type === "authored_by" && include.has("authors")) ||
        (type === "affiliated_with" && include.has("institutions")) ||
        (type === "has_topic" && include.has("topics"));
    const keepEmbedded = (entity: string): boolean => include.has(`${entity}s` as Include);
    return {
        ...OPENALEX_MAPPING,
        entities: {
            ...OPENALEX_MAPPING.entities,
            work: {
                ...work,
                edges: work.edges?.filter((e) => keepEdge(e.type)),
                embedded: work.embedded?.filter((e) => keepEmbedded(e.entity)),
            },
        },
    };
}

/**
 * The co-authorship mapping: works are containers, every two authors of one work are joined by a
 * `coauthor` edge, and an author expands through the works they wrote.
 * @param include - what is included
 * @param seedIsWork - whether the load starts from a work
 * @returns the mapping
 */
function coauthorshipMapping(include: ReadonlySet<Include>, seedIsWork: boolean): RestMapping {
    const institutions = include.has("institutions");
    return {
        ...OPENALEX_MAPPING,
        load: seedIsWork ? "by-id" : "authored",
        seed: undefined,
        expand: "authored",
        hydrate: "authors-by-id",
        directed: false,
        entities: {
            ...OPENALEX_MAPPING.entities,
            work: {
                id: "id",
                // a rule's `from` is read with the record's own prefix
                stripPrefix: PREFIX,
                node: false,
                edges: [
                    { pairs: "authorships[].author.id", type: "coauthor", entity: "author" },
                    ...(institutions
                        ? [
                              {
                                  each: "authorships[]",
                                  from: "author.id",
                                  to: "institutions[].id",
                                  type: "affiliated_with",
                                  entity: "institution",
                              },
                          ]
                        : []),
                ],
                embedded: [
                    { at: "authorships[].author", entity: "author" },
                    ...(institutions ? [{ at: "authorships[].institutions[]", entity: "institution" }] : []),
                ],
            },
        },
    };
}

/**
 * An OpenAlex id param: `W123` or its URL form, checked so a value cannot add a filter.
 * @param value - the param
 * @param name - its name
 * @param letter - the id's kind letter
 * @param ctx - the context
 * @returns the bare id
 */
function openalexId(value: unknown, name: string, letter: string, ctx: SourceContext): string {
    const text = typeof value === "string" ? value.trim().replace(PREFIX, "") : "";
    if (!new RegExp(String.raw`^${letter}\d+$`, "i").test(text)) {
        failOn(ctx.report, "E_SOURCE_PARAM", `${name} is not an OpenAlex id`, { name, reason: "format" });
    }
    return text.toUpperCase();
}

/**
 * The plan of an OpenAlex call.
 * @param params - the params
 * @param ctx - the context
 * @param purpose - what the plan is for
 * @returns the mapping and values
 */
function plan(params: OpenAlexParams, ctx: SourceContext, purpose: RestPurpose): RestPlan {
    const graph = params.graph ?? "citation";
    const include = includes(params.include);
    const hasWork = params.work !== undefined && params.work !== "";
    const hasAuthor = params.author !== undefined && params.author !== "";
    if (purpose !== "expand" && hasWork === hasAuthor) {
        failOn(ctx.report, "E_SOURCE_PARAM", "give exactly one of work and author", {
            name: "work",
            reason: hasWork ? "exclusive" : "required",
        });
    }
    let seed = "";
    if (hasWork) {
        seed = openalexId(params.work, "work", "W", ctx);
    } else if (hasAuthor) {
        seed = openalexId(params.author, "author", "A", ctx);
    }
    if (graph === "coauthorship") {
        return {
            mapping: coauthorshipMapping(include, hasWork),
            values: { ids: seed, select: purpose === "validate" ? "id,updated_date" : "id,updated_date,authorships" },
        };
    }
    let select =
        WORK_FIELDS + (include.has("authors") ? ",authorships" : "") + (include.has("topics") ? ",topics" : "");
    if (purpose === "validate") {
        select = "id,updated_date";
    }
    const mapping = citationMapping(include);
    return {
        mapping: hasWork ? mapping : { ...mapping, load: "authored", seed: undefined },
        values: { ids: seed, select },
    };
}

/** OpenAlex's own ids: a kind letter and digits. */
const ANY_ID = /^[WAIT]\d+$/;

const methods = restMethods<OpenAlexParams>(plan, false);

/**
 * The OpenAlex preset (https://openalex.org): `work` (the citation graph around a work, default)
 * or `author` (the works they wrote), `graph: "coauthorship"` for authors joined by shared works,
 * and `include` (`"authors"`, `"institutions"`, `"topics"`) for more node kinds. Without a key,
 * the first page loads and a later one warns W_SOURCE_AUTH with `report.source.next`; pass
 * `credentials.apiKey({ query: "api_key" }, key)` and continue with the cursor. Experimental.
 * @category Network sources
 */
export const openalexSource: GraphSource<OpenAlexParams> = defineSource<OpenAlexParams>({
    id: OPENALEX_SOURCE_ID,
    descriptor: OPENALEX_DESCRIPTOR,
    ...methods,
    expand(request, sink, ctx) {
        for (const id of request.ids) {
            if (!ANY_ID.test(String(id))) {
                failOn(ctx.report, "E_SOURCE_PARAM", "an expansion seed is not an OpenAlex id", {
                    name: "ids",
                    reason: "format",
                });
            }
        }
        return methods.expand(request, sink, ctx);
    },
});
