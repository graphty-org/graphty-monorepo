/**
 * @file The public types of loading from a network source, click-to-expand and the project's load
 * records (design sections 14.2 to 14.4 and 16.1). Experimental.
 */

import type {
    Credential,
    CredentialKind,
    RetryOptions,
    SourceCursor,
    SourceInfo,
    SourceLimitOptions,
    SourceValidators,
} from "@graphty/graph-io";

import type { AttributeDescriptor, NodeId, SourceKey } from "../../catalog/types";
import type { CodedFact } from "../shared";
import type { LoadChoices } from "../types";

/**
 * How a load from a network source runs. The credential is used for this call only: it is never
 * recorded, journaled, saved or sent in an event. Experimental.
 */
export interface SourceLoadOptions extends LoadChoices {
    /** For `mode: "merge"`: keep (the default) or update the attributes of a node already there. */
    readonly existing?: "keep" | "update";
    /** The credential; looked up in the element's credential store by source and origin when absent. */
    readonly credential?: Credential;
    /** The service's address; the source's default when absent. */
    readonly endpoint?: string;
    /** Allow a query that writes. Never recorded. */
    readonly write?: boolean;
    /** The caps; every default is "no limit". */
    readonly limits?: SourceLimitOptions;
    /** How to retry, or false never to. */
    readonly retry?: RetryOptions | false;
    /** Where to resume a capped load. */
    readonly cursor?: SourceCursor;
    /** Cancels the load. */
    readonly signal?: AbortSignal;
    /** The fetch to use instead of the global one: recorded responses in a test or a story. */
    readonly fetch?: typeof fetch;
    /**
     * What a click or double-click on a node this load brought fetches, in place of the element's
     * `behavior.expand` config. Recorded with the load (`SourceLoadRecord.expand`).
     */
    readonly expand?: ExpandBehavior;
}

/** What `data.import` takes for a network source: its id and its params. Experimental. */
export interface SourceInput {
    /** The source id, as `listSources()` names it. */
    readonly source: string;
    /** Its params. */
    readonly config: Readonly<Record<string, unknown>>;
    /** What the reader calls the data. */
    readonly name?: string;
}

/**
 * What a click or double-click on a node fetches, in the element's `behavior.expand` config.
 * Every default is neutral: nothing expands until `trigger` is set. Experimental.
 */
export interface ExpandBehavior {
    /** What expands a node. @defaultValue "none" */
    readonly trigger?: "none" | "click" | "double-click";
    /** How many hops. @defaultValue 1 */
    readonly depth?: number;
    /** Which edges to follow. @defaultValue "both" */
    readonly direction?: "out" | "in" | "both";
    /** At most this many new nodes per expansion; no limit by default. */
    readonly limit?: number;
    /** Only these relationship types. */
    readonly relationshipTypes?: readonly string[];
    /** "continue" feeds new nodes to the running layout; "none" leaves them where they start. @defaultValue "continue" */
    readonly layout?: "continue" | "none";
}

/** The options of `data.expand(ids, options)`. Experimental. */
export interface ExpandOptions extends Omit<ExpandBehavior, "trigger"> {
    /** The credential; looked up in the store when absent. */
    readonly credential?: Credential;
    /** Cancels the expansion. */
    readonly signal?: AbortSignal;
    /** The fetch to use instead of the global one. */
    readonly fetch?: typeof fetch;
}

/** A source load an opened project holds but has not run: nothing fetches by itself. Experimental. */
export interface PendingSourceLoad {
    /** The load's key. */
    readonly id: string;
    /** The source id. */
    readonly source: string;
    /**
     * Where its requests go, origin and path: the recorded endpoint, else a REST mapping's own
     * endpoint, else the source's default; null when none is known.
     */
    readonly endpoint: string | null;
    /**
     * The params the file recorded and a run sends as they are -- a Cypher or SPARQL `query`, a
     * REST `mapping` -- so an application can show the reader exactly what will run before asking.
     */
    readonly params: Readonly<Record<string, unknown>>;
    /** Whether its params carry a query a reader may want to see first. */
    readonly hasQuery: boolean;
    /** Whether the endpoint is on this machine or a local network. */
    readonly isLocalNetwork: boolean;
    /** Whether the source needs a credential. */
    readonly authRequired: "required" | "optional" | "none";
    /**
     * The credential slot the load filled when it ran, as the project file names it (`"default"`
     * for a source that declares none); absent when it used no credential. The credential itself
     * is never in the file: look it up, or ask the reader, by this slot.
     * @since 3.30.0
     */
    readonly credentialSlot?: string;
}

/** Who a recorded load's credential was, never what it was. Experimental. */
export interface SourceCredentialIdentity {
    /** The credential's kind. */
    readonly kind: CredentialKind;
    /** The origin it was sent to. */
    readonly origin: string;
    /** A basic credential's user name. */
    readonly username?: string;
    /**
     * The credential slot it filled (`"api_key"` for OpenAlex, `"default"` for a source that
     * declares none), as a project file records it.
     * @since 3.30.0
     */
    readonly slot?: string;
}

/** One expansion of a recorded load. Experimental. */
export interface SourceExpansionRecord {
    /** Its key, also in `_source.loads`. */
    readonly key: string;
    /** The seeds. */
    readonly ids: readonly NodeId[];
    /** The depth. */
    readonly depth: number;
    /** The direction. */
    readonly direction: "out" | "in" | "both";
    /** The limit, when one was set. */
    readonly limit?: number;
    /** When it finished, ISO-8601. */
    readonly at: string;
    /** Where it continues, or null. */
    readonly next: SourceCursor | null;
    /** What tells whether it changed. */
    readonly validators: SourceValidators;
}

/**
 * One load from a network source as a project records it: everything needed to refresh it, and
 * never a secret. Experimental.
 */
export interface SourceLoadRecord {
    /** Its key, also in `_source.loads`. */
    readonly key: string;
    /** The source id. */
    readonly source: string;
    /** The source's descriptor version. */
    readonly version: number;
    /** The params, a REST mapping included. */
    readonly config: Readonly<Record<string, unknown>>;
    /** The endpoint, origin and path only. */
    readonly endpoint: string | null;
    /** The recorded load options: idPrefix, existing, limits and the like. */
    readonly options: Readonly<Record<string, unknown>>;
    /** When the fetch finished, ISO-8601. */
    readonly loadedAt: string;
    /** Pages read, so a refresh reads as many. */
    readonly pages: number;
    /** Where it continues, or null. */
    readonly next: SourceCursor | null;
    /** What tells whether it changed. */
    readonly validators: SourceValidators;
    /** Who the credential was, or null. */
    readonly credential: SourceCredentialIdentity | null;
    /** Its expansions, in order. */
    readonly expansions: readonly SourceExpansionRecord[];
    /**
     * How many nodes the source holds for this load, when known: the nodes a complete load read,
     * or the count a sample publishes. Absent when the source does not say.
     */
    readonly total?: number;
    /** How many edges the source holds for this load, when it counted them or a complete read did. */
    readonly totalEdges?: number;
    /** The load's own expand behavior (`SourceLoadOptions.expand`), when it was given one. */
    readonly expand?: ExpandBehavior;
}

/** How many nodes and edges. Experimental. */
export interface SourceCounts {
    /** Nodes. */
    readonly nodes: number;
    /** Edges. */
    readonly edges: number;
}

/**
 * What `data.previewSource` read: a few rows of a source, loading nothing. Experimental.
 */
export interface SourcePreview {
    /** At most `maxNodes` node rows, as a load would hold them, without the `_source.` facts. */
    readonly nodes: readonly Readonly<Record<string, unknown>>[];
    /**
     * Each of `nodes`, in order, as its id and its name: the value at the configured
     * `data.knownFields.nodeLabelPath`, as `data.name(id)` reads it once the node is loaded, else
     * the id.
     * @since 3.30.0
     */
    readonly rows: readonly SourcePreviewRow[];
    /** The edge rows between those nodes. */
    readonly edges: readonly Readonly<Record<string, unknown>>[];
    /** The columns of those rows, node columns first, described as `data.attributes()` describes them. */
    readonly columns: readonly AttributeDescriptor[];
    /** Whether the source holds more than the preview shows. */
    readonly more: boolean;
    /**
     * Facts about the server as codes, one per fact, empty when it gave none: `source.product`,
     * `source.version`, `source.readOnly`
     * (`value` `"enforced"` or `"not-enforced"`), `source.profile` and any other the source gives,
     * each with its `value`.
     * @since 3.30.0
     */
    readonly serverFacts: readonly CodedFact[];
    /** What the read reported: graph-io's issue codes (`W_SOURCE_LIMIT`, ...) and their params. */
    readonly issues: readonly CodedFact[];
}

/** One row of a source preview: the node's id and its name. Experimental. */
export interface SourcePreviewRow {
    /** The node's id. */
    readonly id: NodeId;
    /** Its name, as `data.name(id)` reads it once the node is loaded: the configured label, else the id. */
    readonly name: string;
}

/** The options of `data.previewSource`. Experimental. */
export interface SourcePreviewOptions extends Omit<SourceLoadOptions, "mode" | "cursor"> {
    /** At most this many nodes. @defaultValue 25 */
    readonly maxNodes?: number;
}

/** The options of `data.more`. Experimental. */
export interface SourceMoreOptions extends SourceLoadOptions {
    /** The load to page, by its key in `data.loads()`; the newest load that has more when absent. */
    readonly load?: string;
}

/** What `data.checkSource` found. Experimental. */
export interface SourceCheck {
    /** Whether the source changed since the load; null when the source cannot tell. */
    readonly changed: boolean | null;
}

/** What `data.refresh` did: counts of nodes and edges, the difference only. Experimental. */
export interface SourceRefreshReport {
    /** What the source has now that the graph did not. */
    readonly added: SourceCounts;
    /** What the load brought that the source no longer has, and no other load supplied. */
    readonly removed: SourceCounts;
    /** What the source now says differently. */
    readonly updated: SourceCounts;
    /**
     * `I_SOURCE_REFRESHED` when anything differed, `I_SOURCE_UNCHANGED` when nothing did; its
     * params are `added`, `removed` and `updated`, each a `[nodes, edges]` pair.
     * @since 3.30.0
     */
    readonly fact: CodedFact<"I_SOURCE_REFRESHED" | "I_SOURCE_UNCHANGED">;
}

/** What a source can do beyond one load, for a form to offer or leave out. Experimental. */
export interface SourceFeatures {
    /** Fetch a node's neighbors (`data.expand`, a double-click). */
    readonly expand: boolean;
    /** Read the next page of a capped load (`data.more`). */
    readonly more: boolean;
    /** Read the load again and apply the difference (`data.refresh`). */
    readonly refresh: boolean;
}

/** One network source as `sourceDescriptors()` lists it: graph-io's entry and its features. Experimental. */
export interface SourceCatalogEntry extends SourceInfo {
    /** What it can do beyond one load. */
    readonly features: SourceFeatures;
}

/** What `data.collapse(id)` did. Experimental. */
export interface CollapseResult {
    /** The node ids removed. */
    readonly removedNodes: readonly NodeId[];
    /** How many edges were removed. */
    readonly removedEdges: number;
    /** Facts about what was kept: `W_COLLAPSE_KEPT` with `{ ids, reason }`. */
    readonly kept: readonly CodedFact<"W_COLLAPSE_KEPT">[];
}

/**
 * What `data.expand` did, one fact for the whole call: `I_SOURCE_EXPANDED` when it brought
 * something, `I_SOURCE_NOTHING_NEW` when every neighbor the source returned was there already.
 * Its params: `seeds`, `added` as `[nodes, edges]`, and `partial`, true while a capped expansion
 * has more. Experimental.
 */
export type SourceExpandResult = CodedFact<"I_SOURCE_EXPANDED" | "I_SOURCE_NOTHING_NEW">;

/** Where a node came from, as `data.nodeSource(id)` reads it. Experimental. */
export interface NodeSource {
    /** The load that brought it, a key from `data.loads()`. */
    readonly loadKey: string;
    /** The `data.sources()` entry that lists it, or null when none does. */
    readonly source: SourceKey | null;
    /** Whether its source can fetch its neighbors and the node has some it has not fetched. */
    readonly canExpand: boolean;
    /** How many neighbors the source holds that the graph does not, or null when unknown. */
    readonly hiddenNeighbors: number | null;
    /** Whether the node has been expanded, so `data.collapse` has something to take back. */
    readonly expanded: boolean;
}

/** What `source:expand-start` carries. Experimental. */
export interface SourceExpandStart {
    /** The seed node ids. */
    readonly seeds: readonly NodeId[];
}

/** What `source:expanded` carries. Experimental. */
export type SourceExpanded = CodedFact<"I_SOURCE_EXPANDED">;

/** What `source:expand-failed` carries: the source code and its params. Experimental. */
export type SourceExpandFailed = CodedFact;
