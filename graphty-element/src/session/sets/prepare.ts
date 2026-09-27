/**
 * @file The five set operations as pure functions over the current records (design/sets/sets-design.md
 * sections 4.6, 12.5, 13.2).
 *
 * Each `prepare*` takes the records and one concrete command -- everything minted (id, order) and
 * everything resolved (stable edge members) already in it -- and returns the record to write, or
 * null for a no-op. It validates, clones, canonicalises and deep-freezes, and carries any top-level
 * record field it does not know through unchanged. It never writes: the store does, so a future
 * command dispatcher can call the same functions and record their output.
 *
 * Also here, because every record is built here: the compact form of a fixed set's edge members
 * (typed arrays over an interned id table, materialised as `definition.edges` on first read), the
 * member summaries a member delta updates in O(delta), and the memoised revision.
 *
 * Pure and Node-safe.
 */

import { compareIds, sortElementEdgeMembers, sortElementNodeIds } from "../../catalog/sets/canonical";
import {
    addToSum,
    EMPTY_SUM,
    fixedRevision,
    hashEdgeMember,
    hashNodeId,
    type MemberSummary,
    revisionOf,
    subtractFromSum,
} from "../../catalog/sets/hash";
import { loadSetDefinition, parseSetDefinition } from "../../catalog/sets/parse";
import type { EdgeMember, NodeId, SetCreatedFrom, SetDefinition, SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ElementSet } from "./types";

/**
 * The most edge members a member edit may touch. A step of undo history keeps the prior and next
 * record whole, about 24 bytes per edge member, so edits above this wait for a per-member op log.
 */
export const MAX_EDGE_MEMBER_EDIT = 1_000_000;

/**
 * Invocation counts the complexity tests read (design/sets plan 1.4). Internal; never reset here.
 * - `interns`: ids looked up in or added to an edge-column id table, three or fewer a member.
 */
export const prepareCounters = { interns: 0 };

/** What the prepare functions read: the live records. */
export interface RecordView {
    /**
     * One live record.
     * @param id - Its id.
     * @returns The record, or undefined.
     */
    get(id: SetId): ElementSet | undefined;
    /**
     * Every live record, in any order.
     * @returns The records.
     */
    values(): Iterable<ElementSet>;
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * A refusal about one set.
 * @param code - The error code.
 * @param message - What is wrong.
 * @param id - The set, when there is one.
 * @param details - The facts.
 * @returns The error to throw.
 */
function refuse(
    code: "E_BAD_COMMAND" | "E_DUPLICATE_ID" | "E_UNSUPPORTED" | "E_TOO_LARGE",
    message: string,
    id?: SetId,
    details: Readonly<Record<string, unknown>> = {},
): GraphtyError {
    return new GraphtyError({
        code,
        message,
        source: "data",
        ...(id === undefined ? {} : { target: { kind: "scope" as const, id } }),
        details: id === undefined ? details : { id, ...details },
    });
}

/**
 * The live record a command names.
 * @param records - The records.
 * @param id - The id.
 * @returns The record.
 * @throws `E_BAD_COMMAND` when no live set has that id.
 */
function requireRecord(records: RecordView, id: SetId): ElementSet {
    const record = records.get(id);
    if (record === undefined) {
        throw refuse("E_BAD_COMMAND", `No set has the id "${id}".`, id);
    }

    return record;
}

// ---------------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------------

/**
 * A name as the doors store it: trimmed, never empty, unique among live sets (case-sensitive).
 * @param records - The records.
 * @param name - The candidate.
 * @param self - The set being renamed, which may keep its own name.
 * @returns The trimmed name.
 * @throws `E_BAD_COMMAND` for an empty name or one longer than MAX_NAME_LENGTH,
 * `E_DUPLICATE_ID` for one another set holds.
 */
function checkName(records: RecordView, name: unknown, self?: SetId): string {
    if (typeof name !== "string" || name.trim() === "") {
        throw refuse("E_BAD_COMMAND", "A set needs a name, because the name is what a person finds it by.", self, { name });
    }

    const trimmed = name.trim();
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw refuse("E_BAD_COMMAND", `A set name is at most ${MAX_NAME_LENGTH} characters, because its id is minted from it.`, self, {
            length: trimmed.length,
        });
    }

    for (const record of records.values()) {
        if (record.name === trimmed && record.id !== self) {
            throw refuse("E_DUPLICATE_ID", `A set called "${trimmed}" already exists.`, record.id, { name: trimmed });
        }
    }

    return trimmed;
}

/** The longest set name a door accepts. */
const MAX_NAME_LENGTH = 256;

/**
 * The name the element picks when none is given: "Set N" for the smallest free N.
 * @param records - The records.
 * @returns The name.
 */
export function defaultName(records: RecordView): string {
    const taken = new Set<string>();
    for (const record of records.values()) {
        taken.add(record.name);
    }

    let n = 1;
    while (taken.has(`Set ${n}`)) {
        n++;
    }

    return `Set ${n}`;
}

// ---------------------------------------------------------------------------------------------
// The compact edge members of a fixed set
// ---------------------------------------------------------------------------------------------

/**
 * An append-only table of the ids a lineage of records names, shared by every record derived from
 * the first, so a member edit copies index arrays and never re-interns what it keeps.
 */
class Interner {
    readonly values: (string | number)[] = [];
    private readonly index = new Map<string | number, number>();

    /**
     * The slot of an id, added when new.
     * @param value - The id.
     * @returns Its slot.
     */
    intern(value: string | number): number {
        prepareCounters.interns++;
        let slot = this.index.get(value);
        if (slot === undefined) {
            slot = this.values.length;
            this.values.push(value);
            this.index.set(value, slot);
        }

        return slot;
    }

    /**
     * The slot of an id, when interned.
     * @param value - The id.
     * @returns Its slot, or undefined.
     */
    lookup(value: string | number): number | undefined {
        return this.index.get(value);
    }
}

/** No discriminator of this kind; the id slot, ordinal and among of a member are -1 when absent. */
const ABSENT = -1;

/**
 * The bytes one materialised member object is charged: a frozen object of three or four
 * properties plus its array slot, on a 64-bit engine without pointer compression.
 */
const MATERIALISED_MEMBER_BYTES = 72;

/**
 * Edge members read one at a time, without materialising them all: an array, or a fixed set's
 * compact columns, which build each member only when it is read. Internal.
 */
export interface EdgeMemberList {
    readonly length: number;
    /**
     * One member.
     * @param index - Its position.
     * @returns The member, or undefined past the end.
     */
    at(index: number): EdgeMember | undefined;
}

/**
 * A fixed set's edge members in canonical order, as five typed columns over an interned id table:
 * about 20 bytes a member instead of an object each. Door-mode members only (an id, or an ordinal
 * with among; never a key or an unknown field), which is every member a door writes.
 */
class EdgeColumns implements EdgeMemberList {
    private materialised: readonly EdgeMember[] | undefined;

    /**
     * Columns over existing arrays.
     * @param interner - The shared id table.
     * @param source - Each member's source slot.
     * @param target - Each member's target slot.
     * @param id - Each member's id slot, or -1.
     * @param ordinal - Each member's ordinal, or -1.
     * @param among - Each member's among, or -1.
     */
    constructor(
        readonly interner: Interner,
        readonly source: Uint32Array,
        readonly target: Uint32Array,
        readonly id: Int32Array,
        readonly ordinal: Int32Array,
        readonly among: Int32Array,
    ) {}

    /**
     * Columns of a given length over a table.
     * @param interner - The table.
     * @param length - The member count.
     * @returns Zeroed columns.
     */
    static empty(interner: Interner, length: number): EdgeColumns {
        return new EdgeColumns(
            interner,
            new Uint32Array(length),
            new Uint32Array(length),
            new Int32Array(length),
            new Int32Array(length),
            new Int32Array(length),
        );
    }

    /**
     * Columns holding canonical members, in the order given.
     * @param members - Canonical, sorted, de-duplicated members.
     * @param interner - The table to intern into.
     * @returns The columns.
     */
    static of(members: readonly EdgeMember[], interner = new Interner()): EdgeColumns {
        const columns = EdgeColumns.empty(interner, members.length);
        members.forEach((member, i) => {
            columns.write(i, member);
        });

        return columns;
    }

    /**
     * The member count.
     * @returns The count.
     */
    get length(): number {
        return this.source.length;
    }

    /**
     * The bytes the columns hold, for the tombstone store's accounting. The id table is shared
     * and counted once per record at 16 bytes a slot, an over-count that never under-counts.
     * @returns The byte count.
     */
    get bytes(): number {
        return this.source.byteLength * 5 + 16 * this.interner.values.length + MATERIALISED_MEMBER_BYTES * (this.materialised?.length ?? 0);
    }

    /**
     * One member, built for this read unless the members were already materialised.
     * @param row - The row.
     * @returns The member, or undefined past the end.
     */
    at(row: number): EdgeMember | undefined {
        if (row < 0 || row >= this.length) {
            return undefined;
        }

        return this.materialised?.[row] ?? this.member(row);
    }

    /**
     * Write one member into a row.
     * @param row - The row.
     * @param member - A canonical member.
     */
    write(row: number, member: EdgeMember): void {
        this.source[row] = this.interner.intern(member.source);
        this.target[row] = this.interner.intern(member.target);
        this.id[row] = member.id === undefined ? ABSENT : this.interner.intern(member.id);
        this.ordinal[row] = member.ordinal ?? ABSENT;
        this.among[row] = member.among ?? ABSENT;
    }

    /**
     * Copy rows from other columns over the same table.
     * @param from - The source columns.
     * @param start - The first row to copy.
     * @param end - One past the last.
     * @param at - The row to copy to.
     */
    copy(from: EdgeColumns, start: number, end: number, at: number): void {
        this.source.set(from.source.subarray(start, end), at);
        this.target.set(from.target.subarray(start, end), at);
        this.id.set(from.id.subarray(start, end), at);
        this.ordinal.set(from.ordinal.subarray(start, end), at);
        this.among.set(from.among.subarray(start, end), at);
    }

    /**
     * One member as the canonical object, keys in code-unit order.
     * @param row - The row.
     * @returns The member.
     */
    member(row: number): EdgeMember {
        const { values } = this.interner;
        const source = values[this.source[row]];
        const target = values[this.target[row]];
        if (this.id[row] !== ABSENT) {
            return { id: values[this.id[row]], source, target };
        }

        return { among: this.among[row], ordinal: this.ordinal[row], source, target };
    }

    /**
     * Every member as frozen canonical objects, built on first read and kept.
     * @returns The members.
     */
    members(): readonly EdgeMember[] {
        this.materialised ??= Object.freeze(Array.from({ length: this.length }, (_, row) => Object.freeze(this.member(row))));

        return this.materialised;
    }

    /**
     * A row against a member, in the canonical member order: (source, target, id, key, ordinal,
     * among), absent before present.
     * @param row - The row.
     * @param member - A canonical member.
     * @returns Negative, zero or positive.
     */
    compare(row: number, member: EdgeMember): number {
        const { values } = this.interner;
        const ends = compareIds(values[this.source[row]], member.source) || compareIds(values[this.target[row]], member.target);
        if (ends !== 0) {
            return ends;
        }

        const id = this.id[row] === ABSENT ? undefined : values[this.id[row]];
        const present = compareAbsent(id, member.id);
        if (present !== 0 || id !== undefined) {
            return present || compareIds(id, member.id);
        }

        const ordinal = this.ordinal[row] === ABSENT ? undefined : this.ordinal[row];
        return compareAbsent(ordinal, member.ordinal) || compareIds(ordinal ?? 0, member.ordinal ?? 0) || compareIds(this.among[row], member.among ?? ABSENT);
    }

    /**
     * The first row not below a member.
     * @param member - A canonical member.
     * @returns The row, from 0 to length.
     */
    lowerBound(member: EdgeMember): number {
        let low = 0;
        let high = this.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.compare(mid, member) < 0) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }

    /**
     * Whether a member is held.
     * @param member - A canonical member.
     * @returns True when some row equals it.
     */
    has(member: EdgeMember): boolean {
        const row = this.lowerBound(member);

        return row < this.length && this.compare(row, member) === 0;
    }
}

/**
 * Order an absent value before a present one.
 * @param left - One value.
 * @param right - The other.
 * @returns Negative when only left is absent, positive when only right is, else zero.
 */
function compareAbsent(left: unknown, right: unknown): number {
    if ((left === undefined) === (right === undefined)) {
        return 0;
    }

    return left === undefined ? -1 : 1;
}

/**
 * The first index of a sorted id array not below an id.
 * @param ids - Sorted by the member comparator.
 * @param id - The id.
 * @returns The index.
 */
function lowerBoundId(ids: readonly NodeId[], id: NodeId): number {
    let low = 0;
    let high = ids.length;
    while (low < high) {
        const mid = (low + high) >>> 1;
        if (compareIds(ids[mid], id) < 0) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low;
}

/**
 * Whether a sorted id array holds an id.
 * @param ids - Sorted by the member comparator.
 * @param id - The id.
 * @returns True when present.
 */
function hasId(ids: readonly NodeId[], id: NodeId): boolean {
    const at = lowerBoundId(ids, id);

    return at < ids.length && compareIds(ids[at], id) === 0;
}

// ---------------------------------------------------------------------------------------------
// Side tables keyed by the frozen definition: its edge columns, its opacity, its member summary
// and its revision. Derived or cached, never part of the record.
// ---------------------------------------------------------------------------------------------

const columnsOf = new WeakMap<SetDefinition, EdgeColumns>();
/** Definitions the element built from a snapshot, already canonical and frozen. */
const prebuilt = new WeakSet<SetDefinition>();
const opacityOf = new WeakMap<SetDefinition, string | null>();
const summariesOf = new WeakMap<SetDefinition, { readonly nodes: MemberSummary; readonly edges: MemberSummary }>();
const revisionsOf = new WeakMap<SetDefinition, string>();

const NO_MEMBERS: MemberSummary = { count: 0, sum: EMPTY_SUM };

/**
 * The first kind or field of a definition this element does not know, or null. A definition a
 * door built is known to be null; any other (a restored one) is checked once and remembered.
 * @param definition - The definition.
 * @returns The name, or null.
 */
export function opaqueName(definition: SetDefinition): string | null {
    let name = opacityOf.get(definition);
    if (name === undefined) {
        name = loadSetDefinition(definition).opaque?.first ?? null;
        opacityOf.set(definition, name);
    }

    return name;
}

/**
 * A fixed set's node and edge summaries, computed in full the first time and remembered.
 * @param definition - A fixed definition with no unknown content.
 * @returns The summaries.
 */
function summaryOf(definition: Extract<SetDefinition, { kind: "fixed" }>): { nodes: MemberSummary; edges: MemberSummary } {
    let summary = summariesOf.get(definition);
    if (summary === undefined) {
        let nodes = EMPTY_SUM;
        for (const id of definition.nodes) {
            nodes = addToSum(nodes, hashNodeId(id));
        }

        const columns = columnsOf.get(definition);
        let edges = EMPTY_SUM;
        for (let row = 0; row < (columns?.length ?? 0); row++) {
            edges = addToSum(edges, hashEdgeMember((columns as EdgeColumns).member(row), true));
        }

        summary = {
            nodes: { count: definition.nodes.length, sum: nodes },
            edges: { count: columns?.length ?? 0, sum: edges },
        };
        summariesOf.set(definition, summary);
    }

    return summary;
}

/**
 * A definition's `r1:` revision, memoised per frozen definition. A fixed set's comes from its
 * member summaries, so after a member delta it costs nothing more than the delta did.
 * @param definition - The definition.
 * @returns The revision.
 */
function revisionFor(definition: SetDefinition): string {
    let revision = revisionsOf.get(definition);
    if (revision === undefined) {
        if (definition.kind === "fixed" && opaqueName(definition) === null && columnsOf.has(definition)) {
            const { nodes, edges } = summaryOf(definition);
            revision = fixedRevision(definition.reading, nodes, edges);
        } else {
            revision = revisionOf(definition);
        }

        revisionsOf.set(definition, revision);
    }

    return revision;
}

// ---------------------------------------------------------------------------------------------
// Building frozen values
// ---------------------------------------------------------------------------------------------

/**
 * Freeze a plain value all the way down.
 * @param value - The value, owned by the caller.
 * @returns The same value, frozen.
 */
function deepFreeze<T>(value: T): T {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
    }

    return value;
}

/**
 * A fixed definition over frozen nodes and edge columns: `edges` (when any) is an accessor that
 * materialises the members on first read. Keys in canonical order.
 * @param reading - `induced` or `listed`.
 * @param nodes - Canonical node ids, frozen.
 * @param columns - Canonical edge members.
 * @param summary - The member summaries, when already known.
 * @param summary.nodes - The node members' summary.
 * @param summary.edges - The edge members' summary.
 * @returns The frozen definition.
 */
function fixedDefinition(
    reading: "induced" | "listed",
    nodes: readonly NodeId[],
    columns: EdgeColumns,
    summary?: { nodes: MemberSummary; edges: MemberSummary },
): SetDefinition {
    const definition: Record<string, unknown> = {};
    if (columns.length > 0) {
        Object.defineProperty(definition, "edges", { enumerable: true, get: () => columns.members() });
    }

    definition.kind = "fixed";
    definition.nodes = nodes;
    definition.reading = reading;
    const frozen = Object.freeze(definition) as unknown as SetDefinition;
    columnsOf.set(frozen, columns);
    opacityOf.set(frozen, null);
    if (summary !== undefined) {
        summariesOf.set(frozen, summary);
    }

    return frozen;
}

/**
 * A stable-form definition, validated in door mode, canonical, frozen, owning none of the
 * caller's objects.
 * @param definition - The definition; edge members already stable.
 * @returns The frozen definition.
 * @throws `E_BAD_COMMAND` for anything malformed, unknown or reserved.
 */
function freezeDefinition(definition: unknown): SetDefinition {
    if (isPrebuilt(definition)) {
        return definition;
    }

    const canonical = parseSetDefinition(definition);
    if (canonical.kind === "fixed") {
        // The canonical node array is already a fresh copy, so it is frozen in place.
        return fixedDefinition(canonical.reading, Object.freeze(canonical.nodes), EdgeColumns.of(canonical.edges ?? []));
    }

    const frozen = deepFreeze(structuredClone(canonical));
    opacityOf.set(frozen, null);

    return frozen;
}

/**
 * A listed fixed definition built from members the element read off a snapshot, canonical and
 * frozen in the compact column form. The work a caller's definition needs at the synchronous
 * commit (validating, canonicalising, sorting, interning) happens here instead, so a materialising
 * door does it in its asynchronous step. Internal.
 * @param nodes - Node ids, any order.
 * @param members - Stable edge members with their ends already canonical, any order.
 * @returns The frozen definition, which `set.create` stores as it is.
 */
export function prebuiltListed(nodes: readonly NodeId[], members: readonly EdgeMember[]): SetDefinition {
    const definition = fixedDefinition("listed", Object.freeze(sortElementNodeIds(nodes)), EdgeColumns.of(sortElementEdgeMembers(members)));
    prebuilt.add(definition);

    return definition;
}

/**
 * Whether a value is a definition {@link prebuiltListed} built. Internal.
 * @param definition - The value.
 * @returns True when it is.
 */
export function isPrebuilt(definition: unknown): definition is SetDefinition {
    return typeof definition === "object" && definition !== null && prebuilt.has(definition as SetDefinition);
}

/**
 * A record: the stored fields as own enumerable properties, plus a non-enumerable `revision`
 * accessor, frozen.
 * @param fields - `{ id, name, order, definition, createdFrom }` and any unknown fields, frozen.
 * @returns The record.
 */
function makeRecord(fields: Readonly<Record<string, unknown>>): ElementSet {
    const record = { ...fields } as Record<string, unknown>;
    const definition = record.definition as SetDefinition;
    Object.defineProperty(record, "revision", { enumerable: false, get: () => revisionFor(definition) });

    return Object.freeze(record) as unknown as ElementSet;
}

/**
 * A record restored from stored state (a file, an undo step): validated in load mode, so an
 * unknown kind or field is kept and the definition is opaque. Unknown top-level fields are kept.
 * @param value - The stored record `{ id, name, order, definition, createdFrom, ... }`.
 * @returns The frozen record, ready for the store's `put`.
 * @throws `E_BAD_COMMAND` for a record missing a field or holding a malformed known node.
 */
export function loadRecord(value: unknown): ElementSet {
    const stored = value as Readonly<Record<string, unknown>> | null;
    if (
        typeof stored !== "object" ||
        stored === null ||
        typeof stored.id !== "string" ||
        !stored.id.startsWith("set_") ||
        typeof stored.name !== "string" ||
        typeof stored.order !== "number" ||
        !Number.isFinite(stored.order) ||
        typeof stored.createdFrom !== "object" ||
        stored.createdFrom === null
    ) {
        throw refuse("E_BAD_COMMAND", "A stored set needs an id starting set_, a name, an order and a createdFrom.", undefined, {
            record: value,
        });
    }

    const { definition, opaque } = loadSetDefinition(stored.definition);
    const clone = deepFreeze(structuredClone({ ...stored, definition: null }));
    let frozen: SetDefinition;
    if (opaque === undefined && definition.kind === "fixed") {
        frozen = freezeDefinition(definition);
    } else {
        frozen = deepFreeze(structuredClone(definition));
        opacityOf.set(frozen, opaque?.first ?? null);
    }

    return makeRecord({ ...clone, definition: frozen });
}

// ---------------------------------------------------------------------------------------------
// The five operations
// ---------------------------------------------------------------------------------------------

/** `set.create`, concrete: everything minted and resolved. */
interface CreateCommand {
    readonly id: SetId;
    readonly name: string;
    readonly order: number;
    /** Edge members in stable form. */
    readonly definition: unknown;
    readonly createdFrom: SetCreatedFrom;
}

/**
 * `set.create`.
 * @param records - The records.
 * @param command - The concrete command.
 * @returns The new record.
 * @throws `E_BAD_COMMAND` for a bad name, a live id or a malformed definition; `E_DUPLICATE_ID`
 * for a taken name.
 */
export function prepareCreate(records: RecordView, command: CreateCommand): ElementSet {
    if (records.get(command.id) !== undefined) {
        throw refuse("E_BAD_COMMAND", `A set with the id "${command.id}" already exists.`, command.id);
    }

    const name = checkName(records, command.name);
    const definition = freezeDefinition(command.definition);

    return makeRecord({
        id: command.id,
        name,
        order: command.order,
        definition,
        createdFrom: deepFreeze(structuredClone(command.createdFrom)),
    });
}

/**
 * `set.rename`. Keeps the id, the definition (so the revision) and every unknown field.
 * @param records - The records.
 * @param command - The set and its new name.
 * @param command.id - The set.
 * @param command.name - The new name.
 * @returns The new record, or null when the trimmed name is the current one.
 * @throws `E_BAD_COMMAND` for an unknown id or an empty name; `E_DUPLICATE_ID` for a taken name.
 */
export function prepareRename(records: RecordView, command: { readonly id: SetId; readonly name: string }): ElementSet | null {
    const prior = requireRecord(records, command.id);
    // An unchanged name is a no-op before uniqueness, so a loaded slice with duplicate names can
    // still "rename" a set to its own name.
    if (typeof command.name === "string" && command.name.trim() === prior.name) {
        return null;
    }

    const name = checkName(records, command.name, command.id);

    return makeRecord({ ...prior, name });
}

/**
 * Refuse to rewrite a definition holding content this element does not know.
 * @param record - The record about to be rewritten.
 * @throws `E_UNSUPPORTED` with `details.reason: "opaque-content"`.
 */
function refuseOpaque(record: ElementSet): void {
    const name = opaqueName(record.definition);
    if (name !== null) {
        throw refuse(
            "E_UNSUPPORTED",
            `Set "${record.name}" holds "${name}", which this graphty-element does not know, so its definition cannot be ` +
                "rewritten without losing it. Rename or remove it, or update graphty-element.",
            record.id,
            { reason: "opaque-content", name },
        );
    }
}

/**
 * Whether two sorted id arrays hold the same ids.
 * @param a - One.
 * @param b - The other.
 * @returns True when equal element by element.
 */
function sameIds(a: readonly NodeId[], b: readonly NodeId[]): boolean {
    return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * `set.redefine`. A redefine that changes only a fixed set's reading shares the prior member
 * arrays, so history copies nothing.
 * @param records - The records.
 * @param command - The set and its new definition, edge members stable.
 * @param command.id - The set.
 * @param command.definition - The new definition.
 * @returns The new record, or null when the canonical definition is unchanged.
 * @throws `E_BAD_COMMAND` for an unknown id or a malformed definition; `E_UNSUPPORTED` for an
 * opaque prior definition.
 */
export function prepareRedefine(records: RecordView, command: { readonly id: SetId; readonly definition: unknown }): ElementSet | null {
    const prior = requireRecord(records, command.id);
    refuseOpaque(prior);
    const canonical = parseSetDefinition(command.definition);
    const previous = prior.definition;

    if (JSON.stringify(canonical) === JSON.stringify(previous)) {
        return null;
    }

    let definition: SetDefinition;
    const priorColumns = columnsOf.get(previous);
    if (
        canonical.kind === "fixed" &&
        previous.kind === "fixed" &&
        priorColumns !== undefined &&
        sameIds(canonical.nodes, previous.nodes) &&
        JSON.stringify(canonical.edges ?? []) === JSON.stringify(previous.edges ?? [])
    ) {
        definition = fixedDefinition(canonical.reading, previous.nodes, priorColumns, summariesOf.get(previous));
    } else {
        definition = freezeDefinition(canonical);
    }

    return makeRecord({ ...prior, definition });
}

/** `set.members`, concrete: members in stable form. */
interface MembersCommand {
    readonly id: SetId;
    readonly add?: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeMember[] };
    readonly remove?: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeMember[] };
}

/**
 * Validate and canonicalise a member delta through the one validator.
 * @param delta - The members.
 * @returns Sorted, de-duplicated canonical nodes and edges.
 * @throws `E_BAD_COMMAND` for a malformed member.
 */
function canonicalDelta(delta: MembersCommand["add"]): { nodes: readonly NodeId[]; edges: readonly EdgeMember[] } {
    const parsed = parseSetDefinition({ kind: "fixed", nodes: delta?.nodes ?? [], edges: delta?.edges ?? [], reading: "listed" });
    if (parsed.kind !== "fixed") {
        throw new Error("unreachable: a fixed definition parsed as another kind");
    }

    return { nodes: parsed.nodes, edges: parsed.edges ?? [] };
}

/**
 * `set.members`: remove, then add. Fixed sets only. Removing a node also removes every edge
 * member incident to it. The revision's member sums move by exactly the members that changed.
 * @param records - The records.
 * @param command - The set and its delta.
 * @param limit - The most edge members an edit may touch.
 * @returns The new record, or null when every added member was present and every removed one absent.
 * @throws `E_BAD_COMMAND` for an unknown id, a set that is not fixed or a malformed member;
 * `E_UNSUPPORTED` for opaque content; `E_TOO_LARGE` above the edge-member limit.
 */
export function prepareMembers(records: RecordView, command: MembersCommand, limit = MAX_EDGE_MEMBER_EDIT): ElementSet | null {
    const prior = requireRecord(records, command.id);
    refuseOpaque(prior);
    const previous = prior.definition;
    const columns = columnsOf.get(previous);
    if (previous.kind !== "fixed" || columns === undefined) {
        throw refuse("E_BAD_COMMAND", `Set "${prior.name}" is a ${previous.kind} set; only a fixed set has members to add or remove.`, prior.id, {
            kind: previous.kind,
        });
    }

    const add = canonicalDelta(command.add);
    const remove = canonicalDelta(command.remove);
    if (columns.length + add.edges.length > limit) {
        throw refuse(
            "E_TOO_LARGE",
            `Set "${prior.name}" would hold more than ${limit} edge members, too many to edit one step at a time.`,
            prior.id,
            { edges: columns.length, limit },
        );
    }

    const known = summariesOf.get(previous);
    let nodeSum = known?.nodes.sum ?? EMPTY_SUM;
    let edgeSum = known?.edges.sum ?? EMPTY_SUM;

    // Remove: the named nodes, every edge member touching one of them, and the named edges.
    let {nodes} = previous;
    const droppedNodes = remove.nodes.filter((id) => hasId(nodes, id));
    if (droppedNodes.length > 0) {
        const gone = new Set(droppedNodes);
        nodes = nodes.filter((id) => !gone.has(id));
        if (known !== undefined) {
            for (const id of droppedNodes) {
                nodeSum = subtractFromSum(nodeSum, hashNodeId(id));
            }
        }
    }

    const slots = new Set<number>();
    for (const id of remove.nodes) {
        const slot = columns.interner.lookup(id);
        if (slot !== undefined) {
            slots.add(slot);
        }
    }

    const droppedRows: number[] = [];
    for (const member of remove.edges) {
        const row = columns.lowerBound(member);
        if (row < columns.length && columns.compare(row, member) === 0) {
            droppedRows.push(row);
        }
    }

    if (slots.size > 0) {
        for (let row = 0; row < columns.length; row++) {
            if (slots.has(columns.source[row]) || slots.has(columns.target[row])) {
                droppedRows.push(row);
            }
        }
    }

    let edges = columns;
    const dropped = [...new Set(droppedRows)].sort((a, b) => a - b);
    if (dropped.length > 0) {
        edges = EdgeColumns.empty(columns.interner, columns.length - dropped.length);
        let at = 0;
        let start = 0;
        for (const row of dropped) {
            edges.copy(columns, start, row, at);
            at += row - start;
            start = row + 1;
            if (known !== undefined) {
                edgeSum = subtractFromSum(edgeSum, hashEdgeMember(columns.member(row), true));
            }
        }

        edges.copy(columns, start, columns.length, at);
    }

    // Add: the named nodes and edges not already held.
    const newNodes = add.nodes.filter((id) => !hasId(nodes, id));
    if (newNodes.length > 0) {
        const merged: NodeId[] = [];
        let from = 0;
        for (const id of newNodes) {
            const at = lowerBoundId(nodes, id);
            for (; from < at; from++) {
                merged.push(nodes[from]);
            }

            merged.push(id);
            if (known !== undefined) {
                nodeSum = addToSum(nodeSum, hashNodeId(id));
            }
        }

        for (; from < nodes.length; from++) {
            merged.push(nodes[from]);
        }

        nodes = merged;
    }

    const newEdges = add.edges.filter((member) => !edges.has(member));
    if (newEdges.length > 0) {
        const merged = EdgeColumns.empty(edges.interner, edges.length + newEdges.length);
        let from = 0;
        let at = 0;
        for (const member of newEdges) {
            const row = edges.lowerBound(member);
            merged.copy(edges, from, row, at);
            at += row - from;
            from = row;
            merged.write(at++, member);
            if (known !== undefined) {
                edgeSum = addToSum(edgeSum, hashEdgeMember(member, true));
            }
        }

        merged.copy(edges, from, edges.length, at);
        edges = merged;
    }

    if (nodes === previous.nodes && edges === columns) {
        return null;
    }

    const summary =
        known === undefined
            ? undefined
            : { nodes: { count: nodes.length, sum: nodeSum }, edges: edges.length === 0 ? NO_MEMBERS : { count: edges.length, sum: edgeSum } };
    const definition = fixedDefinition(
        previous.reading,
        nodes === previous.nodes ? nodes : Object.freeze(nodes),
        edges,
        summary,
    );

    return makeRecord({ ...prior, definition });
}

/**
 * `set.remove`: checks the set exists.
 * @param records - The records.
 * @param command - The set.
 * @param command.id - Its id.
 * @returns The id to delete.
 * @throws `E_BAD_COMMAND` for an unknown id.
 */
export function prepareRemove(records: RecordView, command: { readonly id: SetId }): SetId {
    return requireRecord(records, command.id).id;
}

/**
 * A fixed definition's listed edge members, read through its compact columns when it has them, so
 * a resolution never materialises `definition.edges`.
 * @param definition - A fixed definition.
 * @returns The members.
 */
export function listedEdgesOf(definition: Extract<SetDefinition, { kind: "fixed" }>): EdgeMemberList {
    return columnsOf.get(definition) ?? definition.edges ?? [];
}

/**
 * Door-mode edge members in the compact column form a fixed set holds them in: about 20 bytes a
 * member plus the interned ids, instead of an object each.
 * @param members - Members with an id, or an ordinal with among.
 * @returns The members, and the bytes they hold by the columns' accounting.
 */
export function compactEdgeMembers(members: readonly EdgeMember[]): EdgeMemberList & { readonly bytes: number } {
    return EdgeColumns.of(members);
}

/**
 * A record's size by this module's own accounting, which the scale tests hold to a budget: 64 bytes of
 * fields plus two a name character, 8 a node member plus the edge columns for a fixed set, two a
 * JSON character of the definition for anything else.
 * @param record - The record.
 * @returns The byte count.
 */
export function recordBytes(record: ElementSet): number {
    const { definition } = record;
    const columns = columnsOf.get(definition);
    const body =
        definition.kind === "fixed" && columns !== undefined
            ? 8 * definition.nodes.length + columns.bytes
            : 2 * JSON.stringify(definition).length;

    return 64 + 2 * record.name.length + body;
}

/**
 * Whether a definition holds an edge member: a binary search over a fixed set's edge columns, a
 * scan of anything else's edges (a path's steps, a restored fixed set).
 * @param definition - The definition.
 * @param member - A canonical member.
 * @returns True when some edge member equals it.
 */
export function holdsEdgeMember(definition: SetDefinition, member: EdgeMember): boolean {
    const columns = columnsOf.get(definition);
    if (columns !== undefined) {
        return columns.has(member);
    }

    if (definition.kind !== "fixed" && definition.kind !== "path") {
        return false;
    }

    const same = (other: EdgeMember): boolean =>
        other.source === member.source &&
        other.target === member.target &&
        other.id === member.id &&
        other.key === member.key &&
        other.ordinal === member.ordinal &&
        other.among === member.among;

    return (definition.edges ?? []).some((step) => (Array.isArray(step) ? (step as readonly EdgeMember[]).some(same) : step !== null && same(step as EdgeMember)));
}
