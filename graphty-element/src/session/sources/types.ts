/**
 * @file The public types of loading from a network source, click-to-expand and the project's load
 * records (design sections 14.2 to 14.4 and 16.1). Experimental.
 */

import type {
    Credential,
    CredentialKind,
    RetryOptions,
    SourceCursor,
    SourceLimitOptions,
    SourceValidators,
} from "@graphty/graph-io";

import type { NodeId } from "../../catalog/types";
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
    /** The endpoint, origin and path. */
    readonly endpoint: string | null;
    /** Whether its params carry a query a reader may want to see first. */
    readonly hasQuery: boolean;
    /** Whether the endpoint is on this machine or a local network. */
    readonly isLocalNetwork: boolean;
    /** Whether the source needs a credential. */
    readonly authRequired: "required" | "optional" | "none";
}

/** Who a recorded load's credential was, never what it was. Experimental. */
export interface SourceCredentialIdentity {
    /** The credential's kind. */
    readonly kind: CredentialKind;
    /** The origin it was sent to. */
    readonly origin: string;
    /** A basic credential's user name. */
    readonly username?: string;
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

/** What `source:expand-start` carries. Experimental. */
export interface SourceExpandStart {
    /** The seed node ids. */
    readonly seeds: readonly NodeId[];
}

/** What `source:expanded` carries. Experimental. */
export type SourceExpanded = CodedFact<"I_SOURCE_EXPANDED">;

/** What `source:expand-failed` carries: the source code and its params. Experimental. */
export type SourceExpandFailed = CodedFact;
