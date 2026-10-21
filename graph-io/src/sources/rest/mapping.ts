/**
 * Checking a REST mapping before it runs (design section 13.2). A mapping is JSON data, typed into
 * a form or read from a project file, so every field is checked and every problem is a coded
 * issue naming where it is.
 */

import { type RestEdgeRule, type RestEntity, type RestMapping, type RestRequest } from "./params.js";
import { parseSelector } from "./selectors.js";
import { templateNames } from "./templates.js";

/**
 * What is wrong with one field of a mapping. Open union.
 * @category Network sources
 */
export type RestMappingIssueCode =
    | "version" // version is not 1
    | "endpoint" // not an http(s) URL, or one holding a user, query or fragment
    | "missing" // a required field is absent or of the wrong type
    | "unknown-request" // names a request the mapping lacks
    | "unknown-entity" // names an entity the mapping lacks
    | "selector" // not a selector
    | "template" // malformed braces or slot names
    | "paging" // an unknown paging style or a bad paging field
    | "batch" // batch.max is not a positive integer, or join is not a string
    | "number" // not a positive number
    | (string & {}); // NOSONAR(S4335): the open-union idiom keeps the listed codes in editor completion

/**
 * One problem `checkRestMapping` found. Experimental.
 * @category Network sources
 */
export interface RestMappingIssue {
    /** What is wrong. */
    readonly code: RestMappingIssueCode;
    /** Where, as a dotted path into the mapping (`requests.citing.paging.next`). */
    readonly at: string;
}

/** The checks' accumulator. */
type Push = (code: RestMappingIssueCode, at: string) => void;

/**
 * Whether a value is a plain object.
 * @param v - the value
 * @returns true for an object that is not an array
 */
function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Check a selector field.
 * @param value - the field
 * @param at - where it is
 * @param push - the accumulator
 * @param required - whether it must be present
 * @param index - whether `#` (the record's position) is allowed
 */
function checkSelector(value: unknown, at: string, push: Push, required: boolean, index = false): void {
    if (value === undefined && !required) {
        return;
    }
    if (typeof value !== "string") {
        push("missing", at);
    } else if (!(index && value === "#") && parseSelector(value) === null) {
        push("selector", at);
    }
}

/**
 * Check a template field.
 * @param value - the field
 * @param at - where it is
 * @param push - the accumulator
 */
function checkTemplate(value: unknown, at: string, push: Push): void {
    if (typeof value !== "string") {
        push("missing", at);
    } else if (templateNames(value) === null) {
        push("template", at);
    }
}

/**
 * Check a request's query templates.
 * @param query - the query field
 * @param at - where the request is
 * @param push - the accumulator
 */
function checkQuery(query: RestRequest["query"], at: string, push: Push): void {
    if (query === undefined) {
        return;
    }
    if (!isObject(query)) {
        push("missing", `${at}.query`);
        return;
    }
    for (const [k, v] of Object.entries(query)) {
        checkTemplate(v, `${at}.query.${k}`, push);
    }
}

/**
 * Whether a batch field is well formed: a positive integer max and a string join.
 * @param batch - the batch field
 * @returns true when it is
 */
function isBatch(batch: RestRequest["batch"]): boolean {
    return isObject(batch) && Number.isInteger(batch.max) && batch.max >= 1 && typeof batch.join === "string";
}

/**
 * Check one request.
 * @param r - the request
 * @param at - where it is
 * @param entities - the mapping's entity names
 * @param push - the accumulator
 */
function checkRequest(r: RestRequest, at: string, entities: ReadonlySet<string>, push: Push): void {
    if (!isObject(r)) {
        push("missing", at);
        return;
    }
    if (r.method !== undefined && r.method !== "GET" && r.method !== "POST") {
        push("missing", `${at}.method`);
    }
    checkTemplate(r.path, `${at}.path`, push);
    if (typeof r.path === "string" && !r.path.startsWith("/")) {
        push("template", `${at}.path`);
    }
    checkQuery(r.query, at, push);
    checkSelector(r.records, `${at}.records`, push, true);
    if (typeof r.entity !== "string") {
        push("missing", `${at}.entity`);
    } else if (!entities.has(r.entity)) {
        push("unknown-entity", `${at}.entity`);
    }
    if (r.batch !== undefined && !isBatch(r.batch)) {
        push("batch", `${at}.batch`);
    }
    if (r.paging !== undefined) {
        checkPaging(r.paging, `${at}.paging`, push);
    }
}

/**
 * Check a paging field.
 * @param p - the paging
 * @param at - where it is
 * @param push - the accumulator
 */
function checkPaging(p: RestRequest["paging"], at: string, push: Push): void {
    const paging = p as Record<string, unknown> | undefined;
    if (!isObject(paging)) {
        push("paging", at);
        return;
    }
    switch (paging.style) {
        case "cursor":
            if (typeof paging.param !== "string" || typeof paging.first !== "string") {
                push("paging", at);
            }
            checkSelector(paging.next, `${at}.next`, push, true);
            break;
        case "offset": {
            const size = paging.size as Record<string, unknown> | undefined;
            const ok =
                typeof paging.param === "string" &&
                isObject(size) &&
                typeof size.param === "string" &&
                Number.isInteger(size.value) &&
                (size.value as number) > 0 &&
                (paging.unit === undefined || paging.unit === "items" || paging.unit === "pages") &&
                (paging.base === undefined || paging.base === 0 || paging.base === 1);
            if (!ok) {
                push("paging", at);
            }
            break;
        }
        case "link-header":
            if (paging.rel !== undefined && typeof paging.rel !== "string") {
                push("paging", at);
            }
            break;
        case "next-url":
            checkSelector(paging.next, `${at}.next`, push, true);
            break;
        default:
            push("paging", `${at}.style`);
    }
}

/**
 * Check one edge rule.
 * @param rule - the rule
 * @param at - where it is
 * @param entities - the mapping's entity names
 * @param push - the accumulator
 */
function checkEdgeRule(rule: RestEdgeRule, at: string, entities: ReadonlySet<string>, push: Push): void {
    if (!isObject(rule)) {
        push("missing", at);
        return;
    }
    const r = rule as Record<string, unknown>;
    if (typeof r.type !== "string") {
        push("missing", `${at}.type`);
    }
    checkSelector(r.each, `${at}.each`, push, false);
    if ("pairs" in r) {
        checkSelector(r.pairs, `${at}.pairs`, push, true);
    } else {
        checkSelector(r.to, `${at}.to`, push, true);
        checkSelector(r.from, `${at}.from`, push, false);
        if (isObject(r.fields)) {
            for (const [k, v] of Object.entries(r.fields)) {
                checkSelector(v, `${at}.fields.${k}`, push, true);
            }
        } else if (r.fields !== undefined) {
            push("missing", `${at}.fields`);
        }
    }
    if (r.entity !== undefined && (typeof r.entity !== "string" || !entities.has(r.entity))) {
        push("unknown-entity", `${at}.entity`);
    }
}

/**
 * Check one entity.
 * @param e - the entity
 * @param at - where it is
 * @param entities - the mapping's entity names
 * @param push - the accumulator
 */
function checkEntity(e: RestEntity, at: string, entities: ReadonlySet<string>, push: Push): void {
    if (!isObject(e)) {
        push("missing", at);
        return;
    }
    checkSelector(e.id, `${at}.id`, push, true, true);
    if (e.stripPrefix !== undefined && typeof e.stripPrefix !== "string") {
        push("missing", `${at}.stripPrefix`);
    }
    if (e.label !== undefined && typeof e.label !== "string") {
        push("missing", `${at}.label`);
    }
    if (e.node !== undefined && e.node) {
        push("missing", `${at}.node`);
    }
    if (isObject(e.fields)) {
        for (const [k, v] of Object.entries(e.fields)) {
            checkSelector(v, `${at}.fields.${k}`, push, true, true);
        }
    } else if (e.fields !== undefined) {
        push("missing", `${at}.fields`);
    }
    if (Array.isArray(e.edges)) {
        (e.edges as readonly RestEdgeRule[]).forEach((rule, i) => {
            checkEdgeRule(rule, `${at}.edges.${String(i)}`, entities, push);
        });
    } else if (e.edges !== undefined) {
        push("missing", `${at}.edges`);
    }
    if (Array.isArray(e.embedded)) {
        e.embedded.forEach((em, i) => {
            const where = `${at}.embedded.${String(i)}`;
            if (!isObject(em)) {
                push("missing", where);
                return;
            }
            checkSelector(em.at, `${where}.at`, push, true);
            if (typeof em.entity !== "string" || !entities.has(em.entity)) {
                push("unknown-entity", `${where}.entity`);
            }
        });
    } else if (e.embedded !== undefined) {
        push("missing", `${at}.embedded`);
    }
}

/**
 * Check the mapping's top-level names of requests.
 * @param m - the mapping
 * @param requests - its request names
 * @param push - the accumulator
 */
function checkRequestNames(m: RestMapping, requests: ReadonlySet<string>, push: Push): void {
    const names: [string, unknown][] = [
        ["load", m.load],
        ["hydrate", m.hydrate],
        ["seed", m.seed],
    ];
    if (isObject(m.expand)) {
        names.push(["expand.in", m.expand.in], ["expand.out", m.expand.out]);
    } else {
        names.push(["expand", m.expand]);
    }
    for (const [at, name] of names) {
        if (name === undefined && at !== "load") {
            continue;
        }
        if (typeof name !== "string") {
            push("missing", at);
        } else if (!requests.has(name)) {
            push("unknown-request", at);
        }
    }
}

/**
 * Check the endpoint.
 * @param endpoint - the field
 * @param push - the accumulator
 */
function checkEndpoint(endpoint: unknown, push: Push): void {
    let url: URL | null = null;
    try {
        url = new URL(typeof endpoint === "string" ? endpoint : "");
    } catch {
        // not a URL
    }
    if (
        url === null ||
        (url.protocol !== "https:" && url.protocol !== "http:") ||
        url.username !== "" ||
        url.password !== "" ||
        url.search !== "" ||
        url.hash !== ""
    ) {
        push("endpoint", "endpoint");
    }
}

/**
 * Check a REST mapping without running it: the version, the endpoint, every request (templates,
 * selectors, paging, batching) and entity (selectors, edge rules, embedded records), and that every
 * name it uses exists. Experimental.
 * @param mapping - the mapping, as data from anywhere
 * @returns every problem found; empty when the mapping can run
 * @category Network sources
 */
export function checkRestMapping(mapping: unknown): readonly RestMappingIssue[] {
    const issues: RestMappingIssue[] = [];
    const push: Push = (code, at) => {
        issues.push(Object.freeze({ code, at }));
    };
    if (!isObject(mapping)) {
        push("missing", "");
        return issues;
    }
    const m = mapping as unknown as RestMapping;
    if (m.version !== 1) {
        push("version", "version");
    }
    checkEndpoint(m.endpoint, push);
    const requests = isObject(m.requests) ? m.requests : {};
    const entities = isObject(m.entities) ? m.entities : {};
    if (!isObject(m.requests)) {
        push("missing", "requests");
    }
    if (!isObject(m.entities)) {
        push("missing", "entities");
    }
    const entityNames = new Set(Object.keys(entities));
    for (const [name, r] of Object.entries(requests)) {
        checkRequest(r, `requests.${name}`, entityNames, push);
    }
    for (const [name, e] of Object.entries(entities)) {
        checkEntity(e, `entities.${name}`, entityNames, push);
    }
    checkRequestNames(m, new Set(Object.keys(requests)), push);
    checkLimits(m, push);
    checkSelector(m.modified, "modified", push, false);
    if (m.directed !== undefined && typeof m.directed !== "boolean") {
        push("missing", "directed");
    }
    return issues;
}

/**
 * Check the rate limit and the budget headers.
 * @param m - the mapping
 * @param push - the accumulator
 */
function checkLimits(m: RestMapping, push: Push): void {
    for (const [at, value] of [
        ["rateLimit.requests", m.rateLimit?.requests],
        ["rateLimit.perMs", m.rateLimit?.perMs],
    ] as const) {
        if (m.rateLimit !== undefined && !(typeof value === "number" && value > 0)) {
            push("number", at);
        }
    }
    if (
        m.budgetHeaders !== undefined &&
        (typeof m.budgetHeaders.remaining !== "string" ||
            (m.budgetHeaders.reset !== undefined && typeof m.budgetHeaders.reset !== "string"))
    ) {
        push("missing", "budgetHeaders");
    }
}
