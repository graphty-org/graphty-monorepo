/**
 * @file The one place that creates, changes and serializes the records of loads from network
 * sources (design section 16.1). A record holds what a refresh needs -- the source, its version,
 * the params, the endpoint, the load options, the cursor, the validators and who the credential
 * was -- and never a secret or the `write` flag. Experimental: the shape awaits the owner's final
 * word, which is why nothing else writes it.
 */

import type { Credential, SourceCursor, SourceValidators } from "@graphty/graph-io";

import type { NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ExpandBehavior, SourceCredentialIdentity, SourceExpansionRecord, SourceLoadRecord } from "./types";

/** The version of the records' own shape, which `toMember` and `fromMember` move them in. */
export const LEDGER_VERSION = 1;

/** The load options a record keeps; everything else (credential, write, signal, fetch) is dropped. */
const RECORDED_OPTIONS: readonly string[] = [
    "mode",
    "existing",
    "idPrefix",
    "joinOn",
    "columnPrefix",
    "keep",
    "limits",
];

/** What a project file holds under the member. */
export interface SourceRecordMember {
    /** The shape's version. */
    readonly version: number;
    /** The records, in load order. */
    readonly loads: readonly SourceLoadRecord[];
}

/** Where a load read from: a URL, its text, or nothing. */
type Endpoint = URL | string | null;

/** What a finished load tells the ledger. */
export interface LoadFacts {
    readonly source: string;
    readonly version: number;
    readonly config: Readonly<Record<string, unknown>>;
    readonly endpoint: Endpoint;
    readonly options?: Readonly<Record<string, unknown>>;
    readonly pages?: number;
    readonly next?: SourceCursor | null;
    readonly validators?: SourceValidators;
    readonly credential?: Credential | null;
    /** When it finished; now when absent. */
    readonly loadedAt?: string;
    /** How many nodes the source holds for it, when known. */
    readonly total?: number;
    /** The load's own expand behavior. */
    readonly expand?: ExpandBehavior;
}

/** What a finished expansion tells the ledger. */
export interface ExpansionFacts {
    readonly ids: readonly NodeId[];
    readonly depth?: number;
    readonly direction?: "out" | "in" | "both";
    readonly limit?: number;
    readonly next?: SourceCursor | null;
    readonly validators?: SourceValidators;
    readonly at?: string;
}

/**
 * A URL as a record keeps it: origin and path, never a query string or a user name.
 * @param endpoint - the endpoint
 * @returns origin plus path, or null
 */
function originPath(endpoint: Endpoint): string | null {
    if (endpoint === null) {
        return null;
    }
    const url = new URL(String(endpoint));
    return `${url.protocol}//${url.host}${url.pathname}`;
}

/**
 * A deep copy of JSON data, so a record never shares a value its caller can change. A credential
 * serializes as `{ kind, origins }` only, so even a misplaced one carries no secret.
 * @param value - the value
 * @returns the copy
 */
function plain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T; // NOSONAR(S7784): the JSON round trip applies toJSON, so a credential copy keeps no secret
}

/**
 * Who a credential was, never what it was.
 * @param credential - the credential
 * @param endpoint - the load's endpoint
 * @returns the identity, or null
 */
function identityOf(credential: Credential | null | undefined, endpoint: Endpoint): SourceCredentialIdentity | null {
    if (credential === null || credential === undefined) {
        return null;
    }
    const url = endpoint === null ? null : new URL(String(endpoint));
    const origin = credential.origins[0] ?? (url === null ? "" : `${url.protocol}//${url.host}`);
    return {
        kind: credential.kind,
        origin,
        ...(credential.username === undefined ? {} : { username: credential.username }),
    };
}

/**
 * Throw the refusal of a malformed member.
 * @param message - what is wrong
 */
function badMember(message: string): never {
    throw new GraphtyError({ code: "E_BAD_DOCUMENT", source: "data", message, details: { member: "graphty-sources" } });
}

/** The load records of one session. Experimental. */
export class SourceLedger {
    /** Called after every change to the records; autosave hears it to write the sources member. */
    readonly changed = new Set<() => void>();
    private records: SourceLoadRecord[] = [];
    private serial = 0;

    /**
     * Record a finished load.
     * @param facts - what the load did
     * @returns its record
     */
    addLoad(facts: LoadFacts): SourceLoadRecord {
        const options: Record<string, unknown> = {};
        for (const name of RECORDED_OPTIONS) {
            if (facts.options?.[name] !== undefined) {
                options[name] = facts.options[name];
            }
        }
        const record: SourceLoadRecord = {
            key: `load-${String(++this.serial)}`,
            source: facts.source,
            version: facts.version,
            config: plain(facts.config),
            endpoint: originPath(facts.endpoint),
            options: plain(options),
            loadedAt: facts.loadedAt ?? new Date().toISOString(),
            pages: facts.pages ?? 1,
            next: facts.next ?? null,
            validators: plain(facts.validators ?? {}),
            credential: identityOf(facts.credential, facts.endpoint),
            expansions: [],
            ...(facts.total === undefined ? {} : { total: facts.total }),
            ...(facts.expand === undefined ? {} : { expand: plain(facts.expand) }),
        };
        this.set([...this.records, record]);
        return record;
    }

    /**
     * What changes whenever a record does: a value to key a memo with.
     * @returns an object that is the same until a record changes
     */
    version(): object {
        return this.records;
    }

    /**
     * Record a finished expansion of a load.
     * @param loadKey - the load's key
     * @param facts - what the expansion did
     * @returns its record
     */
    addExpansion(loadKey: string, facts: ExpansionFacts): SourceExpansionRecord {
        const load = this.require(loadKey);
        const expansion: SourceExpansionRecord = {
            key: `${loadKey}/x${String(load.expansions.length + 1)}`,
            ids: [...facts.ids],
            depth: facts.depth ?? 1,
            direction: facts.direction ?? "both",
            ...(facts.limit === undefined ? {} : { limit: facts.limit }),
            at: facts.at ?? new Date().toISOString(),
            next: facts.next ?? null,
            validators: plain(facts.validators ?? {}),
        };
        this.replace(loadKey, { ...load, expansions: [...load.expansions, expansion] });
        return expansion;
    }

    /**
     * Change where a load continues.
     * @param loadKey - the load's key
     * @param next - the new cursor, or null when it is complete
     */
    setNext(loadKey: string, next: SourceCursor | null): void {
        this.replace(loadKey, { ...this.require(loadKey), next });
    }

    /**
     * Record that a load ran again (a waiting load of an opened project) or read more pages: its
     * key, source, config and options stay; what the fetch found replaces what was there.
     * @param loadKey - the load's key
     * @param facts - what the run found
     * @param facts.pages - pages read in this run, added to the record's
     * @param facts.next - where it continues now
     * @param facts.validators - what tells whether it changed
     * @param facts.credential - the credential used, for its identity
     * @param facts.endpoint - the endpoint it ran against
     * @param facts.total - how many nodes the source holds for it, when the run found out
     */
    refreshLoad(
        loadKey: string,
        facts: Pick<LoadFacts, "next" | "validators" | "credential" | "endpoint" | "total"> & {
            readonly pages?: number;
        },
    ): void {
        const load = this.require(loadKey);
        this.replace(loadKey, {
            ...load,
            ...(facts.total === undefined ? {} : { total: facts.total }),
            loadedAt: new Date().toISOString(),
            pages: load.pages + (facts.pages ?? 0),
            next: facts.next ?? null,
            validators: plain(facts.validators ?? load.validators),
            credential: identityOf(facts.credential, facts.endpoint ?? load.endpoint) ?? load.credential,
        });
    }

    /**
     * Every record, in load order.
     * @param live - when given, only the loads and expansions whose keys are in it: the ones the
     *     graph still holds rows of, so an undone load or expansion is not listed
     * @returns frozen copies
     */
    loads(live?: ReadonlySet<string>): readonly SourceLoadRecord[] {
        const records =
            live === undefined
                ? this.records
                : this.records
                      .filter((r) => live.has(r.key))
                      .map((r) => ({ ...r, expansions: r.expansions.filter((x) => live.has(x.key)) }));
        return Object.freeze(records.map((r) => Object.freeze(plain(r))));
    }

    /**
     * The first source load among a node's `_source.loads` keys: an expansion's key names its load.
     * @param keys - the node's `_source.loads`
     * @returns the record, or undefined when none of them is a source load
     */
    loadOf(keys: readonly string[]): SourceLoadRecord | undefined {
        for (const key of keys) {
            const record = this.records.find((r) => r.key === key.split("/")[0]);
            if (record !== undefined) {
                return record;
            }
        }
        return undefined;
    }

    /**
     * The member a project file saves.
     * @returns the version and the records
     */
    toMember(): SourceRecordMember {
        return { version: LEDGER_VERSION, loads: plain(this.records) };
    }

    /**
     * Replace every record with a saved member's.
     * @param member - what a project file held
     * @throws A `GraphtyError` with `E_UNSUPPORTED_VERSION` for a newer shape, `E_BAD_DOCUMENT` for a malformed one.
     */
    fromMember(member: unknown): void {
        if (typeof member !== "object" || member === null) {
            badMember("The graphty-sources member is not an object.");
        }
        const { version, loads } = member as { version?: unknown; loads?: unknown };
        if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
            badMember("The graphty-sources member has no version.");
        }
        if (version > LEDGER_VERSION) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED_VERSION",
                source: "data",
                message: `The graphty-sources member is version ${String(version)}; this element reads up to ${String(LEDGER_VERSION)}.`,
                details: { member: "graphty-sources", version, supported: LEDGER_VERSION },
            });
        }
        if (!Array.isArray(loads)) {
            badMember("The graphty-sources member has no loads list.");
        }
        for (const r of loads as unknown[]) {
            const record = r as Partial<SourceLoadRecord> | null;
            if (
                typeof record?.key !== "string" ||
                typeof record.source !== "string" ||
                !Array.isArray(record.expansions)
            ) {
                badMember("A graphty-sources record has no key, source or expansions.");
            }
        }
        this.set(plain(loads as SourceLoadRecord[]));
        this.serial = Math.max(0, ...this.records.map((r) => Number(/^load-(\d+)$/.exec(r.key)?.[1] ?? 0)));
    }

    /** Forget every record. */
    clear(): void {
        this.set([]);
    }

    /**
     * A record by key.
     * @param key - the key
     * @returns the record
     */
    private require(key: string): SourceLoadRecord {
        const record = this.records.find((r) => r.key === key);
        if (record === undefined) {
            throw new GraphtyError({ code: "E_INTERNAL", source: "data", message: `No source load has key ${key}.` });
        }
        return record;
    }

    /**
     * Swap a record for its new value.
     * @param key - the key
     * @param record - the new record
     */
    private replace(key: string, record: SourceLoadRecord): void {
        this.set(this.records.map((r) => (r.key === key ? record : r)));
    }

    /**
     * Take new records and tell every listener.
     * @param records - the records
     */
    private set(records: SourceLoadRecord[]): void {
        this.records = records;
        for (const listener of this.changed) {
            listener();
        }
    }
}
