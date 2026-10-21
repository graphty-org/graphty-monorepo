/**
 * Turning a REST API's records into nodes and edges (design section 13.2): each record of an
 * entity is a node, each edge rule makes edges, a target with no record yet becomes a stub, and
 * embedded records are nodes of their own entity. A stub never overwrites a full record.
 */

import { SOURCE_ENTITY_ATTR, SOURCE_STUB_ATTR } from "../ids.js";
import { type EdgeRecord, type NodeRecord } from "../types.js";
import { type RestEdgeRule, type RestEntity, type RestMapping } from "./params.js";
import { select, selectOne } from "./selectors.js";

/** What one load or expansion knows about the ids it wrote, across its pages. */
export interface RecordState {
    /** Ids written with a full record. */
    readonly full: Set<string>;
    /** Ids written as stubs. */
    readonly stubs: Set<string>;
    /** Ids the caller already holds (an expansion's seeds and `exclude`): never stubbed. */
    readonly known: ReadonlySet<string>;
    /** The newest modification time seen, for the validators. */
    modified: string | null;
}

/** The nodes and edges of one page. */
export interface PageRecords {
    readonly nodes: NodeRecord[];
    readonly edges: EdgeRecord[];
}

/**
 * A fresh state.
 * @param known - ids the caller holds already
 * @returns the state
 */
export function newState(known: Iterable<string> = []): RecordState {
    return { full: new Set(), stubs: new Set(), known: new Set(known), modified: null };
}

/**
 * An id as text, with the entity's prefix stripped.
 * @param value - what a selector reached
 * @param entity - the entity whose prefix applies
 * @returns the id, or null when the value is not one
 */
function idText(value: unknown, entity: RestEntity | undefined): string | null {
    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }
    const text = String(value);
    const prefix = entity?.stripPrefix;
    return prefix !== undefined && prefix !== "" && text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

/**
 * The value of a field selector: every value for a selector with `[]`, else the first.
 * @param record - the record
 * @param selector - the selector
 * @param index - the record's position, for `#`
 * @returns the value
 */
function fieldValue(record: unknown, selector: string, index: number): unknown {
    if (selector === "#") {
        return index;
    }
    return selector.includes("[]") ? select(record, selector) : selectOne(record, selector);
}

/** Converts the records of one page. */
class PageWriter {
    readonly out: PageRecords = { nodes: [], edges: [] };
    /** Edge rules to run once every node of the page is known, so a target on this page is no stub. */
    private readonly pending: { record: unknown; entity: string; id: string | null }[] = [];

    /**
     * Create one.
     * @param mapping - the mapping
     * @param state - the load's state
     */
    constructor(
        private readonly mapping: RestMapping,
        private readonly state: RecordState,
    ) {}

    /**
     * Add the records of an entity, and their embedded records.
     * @param records - the records
     * @param entityName - their entity
     */
    addRecords(records: readonly unknown[], entityName: string): void {
        const entity = this.mapping.entities[entityName];
        records.forEach((record, index) => {
            const id = entity.node === false ? null : idText(fieldValue(record, entity.id, index), entity);
            if (entity.node !== false) {
                if (id === null) {
                    return;
                }
                this.addNode(record, index, id, entityName, entity);
            }
            const modified = this.mapping.modified === undefined ? undefined : selectOne(record, this.mapping.modified);
            if (typeof modified === "string" && (this.state.modified === null || modified > this.state.modified)) {
                this.state.modified = modified;
            }
            this.pending.push({ record, entity: entityName, id });
            for (const em of entity.embedded ?? []) {
                this.addRecords(select(record, em.at), em.entity);
            }
        });
    }

    /**
     * Write a full record.
     * @param record - the record
     * @param index - its position
     * @param id - its id
     * @param entityName - its entity
     * @param entity - the entity
     */
    private addNode(record: unknown, index: number, id: string, entityName: string, entity: RestEntity): void {
        const attrs: Record<string, unknown> = { labels: [entity.label ?? entityName] };
        if (entity.fields === undefined) {
            // without fields every top-level scalar is kept
            for (const [k, v] of Object.entries(record as Record<string, unknown>)) {
                if (
                    k !== "id" &&
                    k !== "labels" &&
                    (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
                ) {
                    attrs[k] = v;
                }
            }
        } else {
            for (const [name, selector] of Object.entries(entity.fields)) {
                const v = fieldValue(record, selector, index);
                if (v !== undefined) {
                    attrs[name] = v;
                }
            }
        }
        if (this.state.stubs.has(id)) {
            // the full record replaces a stub written earlier
            attrs[SOURCE_STUB_ATTR] = false;
        }
        this.state.full.add(id);
        this.out.nodes.push({ id, ...attrs });
    }

    /**
     * Make sure an edge end exists: a stub when no record of it was written and the caller does not
     * hold it.
     * @param id - the id
     * @param entity - its entity, when known
     */
    private end(id: string, entity: string | undefined): void {
        const { full, stubs, known } = this.state;
        if (full.has(id) || stubs.has(id) || known.has(id)) {
            return;
        }
        stubs.add(id);
        this.out.nodes.push({
            id,
            [SOURCE_STUB_ATTR]: true,
            ...(entity === undefined ? {} : { [SOURCE_ENTITY_ATTR]: entity }),
        });
    }

    /**
     * Run one edge rule over a record.
     * @param rule - the rule
     * @param record - the record
     * @param entityName - the record's entity
     * @param recordId - the record's id (null for a container)
     */
    private runRule(rule: RestEdgeRule, record: unknown, entityName: string, recordId: string | null): void {
        const scopes = rule.each === undefined ? [record] : select(record, rule.each);
        if ("pairs" in rule) {
            this.runPairsRule(rule, scopes, entityName);
        } else {
            this.runLinkRule(rule, scopes, entityName, recordId);
        }
    }

    /**
     * Run a pairs rule: an edge between every two distinct ids in each scope.
     * @param rule - the rule
     * @param scopes - the scopes it runs over
     * @param entityName - the record's entity
     */
    private runPairsRule(
        rule: Extract<RestEdgeRule, { pairs: string }>,
        scopes: readonly unknown[],
        entityName: string,
    ): void {
        const entityOf = rule.entity ?? entityName;
        const entity = this.mapping.entities[entityOf];
        for (const scope of scopes) {
            const ids = [...new Set(select(scope, rule.pairs).map((v) => idText(v, entity)))].filter(
                (v): v is string => v !== null,
            );
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    this.end(ids[i], entityOf);
                    this.end(ids[j], entityOf);
                    this.out.edges.push({ source: ids[i], target: ids[j], type: rule.type });
                }
            }
        }
    }

    /**
     * Run a from/to rule: an edge from the record (or a selected id) to each selected id.
     * @param rule - the rule
     * @param scopes - the scopes it runs over
     * @param entityName - the record's entity
     * @param recordId - the record's id (null for a container)
     */
    private runLinkRule(
        rule: Exclude<RestEdgeRule, { pairs: string }>,
        scopes: readonly unknown[],
        entityName: string,
        recordId: string | null,
    ): void {
        const own = this.mapping.entities[entityName];
        const targetEntity = rule.entity === undefined ? own : this.mapping.entities[rule.entity];
        for (const scope of scopes) {
            const from = rule.from === undefined ? recordId : idText(selectOne(scope, rule.from), own);
            if (from === null) {
                continue;
            }
            const tos = select(scope, rule.to)
                .map((t) => idText(t, targetEntity))
                .filter((v): v is string => v !== null);
            for (const to of tos) {
                this.end(from, rule.from === undefined ? entityName : undefined);
                this.end(to, rule.entity);
                this.out.edges.push({ ...edgeFields(rule.fields, scope), source: from, target: to, type: rule.type });
            }
        }
    }

    /**
     * Run the edge rules of every record added.
     * @returns the page
     */
    finish(): PageRecords {
        for (const { record, entity, id } of this.pending) {
            for (const rule of this.mapping.entities[entity].edges ?? []) {
                this.runRule(rule, record, entity, id);
            }
        }
        this.pending.length = 0;
        return this.out;
    }
}

/**
 * An edge's fields, read from its scope.
 * @param fields - the rule's field selectors
 * @param scope - the scope the edge came from
 * @returns the fields that have a value
 */
function edgeFields(fields: Readonly<Record<string, string>> | undefined, scope: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [name, selector] of Object.entries(fields ?? {})) {
        const v = fieldValue(scope, selector, 0);
        if (v !== undefined) {
            out[name] = v;
        }
    }
    return out;
}

/**
 * The nodes and edges of one page of records.
 * @param mapping - the mapping
 * @param groups - the page's records, by entity (a seed's records first)
 * @param state - the load's state, updated
 * @returns the nodes and edges
 */
export function toRecords(
    mapping: RestMapping,
    groups: readonly { readonly records: readonly unknown[]; readonly entity: string }[],
    state: RecordState,
): PageRecords {
    const writer = new PageWriter(mapping, state);
    for (const g of groups) {
        writer.addRecords(g.records, g.entity);
    }
    return writer.finish();
}
