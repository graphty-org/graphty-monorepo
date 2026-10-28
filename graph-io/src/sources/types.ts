/**
 * The network source contract (design sections 2, 2.1 to 2.3, 8, 12.5 and 16.1): what a source is,
 * what it receives, what it returns, and the options of the load functions.
 *
 * Experimental: the contract is frozen only after the built-in sources are built on it (design
 * section 22, item 1). Every union of names is open (`| (string & {})`), so a release can add a
 * value; handle values you do not know.
 */

import { type FreezeOptions, type GraphSink, type NodeId } from "@graphty/graph-format";

import { type ImportReportBuilder } from "../common/report.js";
import { type BuilderSeed } from "../registry.js";
import { type CommonImportOptions, type ImportInput, type ImportReport } from "../types.js";

/**
 * What kind of service a source reads. Open union.
 * @category Network sources
 */
export type SourceKind =
    "repository" | "database" | "sparql" | "rest" | "graphql" | "file-host" | "other" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * An optional capability a source has. Open union.
 * @category Network sources
 */
export type SourceFeature = "expand" | "probe" | "list" | "page" | "validate" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * Where code runs. Open union.
 * @category Network sources
 */
export type SourceRuntime = "browser" | "node" | "worker" | "other" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * The type of one source parameter, for a form. Open union.
 * @category Network sources
 */
export type SourceParamType =
    "string" | "text" | "query" | "integer" | "number" | "boolean" | "enum" | "url" | "node-id" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * The language of a `query` parameter. Open union.
 * @category Network sources
 */
export type QueryLanguage = "cypher" | "opencypher" | "gremlin" | "sparql" | "graphql" | "jmespath" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * Why a source cannot run in a runtime. Open union.
 * @category Network sources
 */
export type SourceRuntimeReason =
    | "cors"
    | "needs-websocket"
    | "needs-secure-context"
    | "insecure-endpoint"
    | "needs-node"
    | "needs-peer-dependency"
    | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * The kind of a credential. Open union.
 * @category Network sources
 */
export type CredentialKind = "bearer" | "basic" | "api-key" | "aws-sigv4" | "custom" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * A credential made by one of the `credentials` factories. The secret is held where no code can
 * read it back: `JSON.stringify` and `util.inspect` show only `{ kind, origins }`. Experimental.
 * @category Network sources
 */
export interface Credential {
    /** What kind of credential it is. */
    readonly kind: CredentialKind;
    /**
     * The origins it may be sent to. Empty means "the load's endpoint origin", decided when it is
     * used.
     */
    readonly origins: readonly string[];
    /** The user name of a `basic` credential, which is not a secret; undefined for other kinds. */
    readonly username?: string | undefined;
}

/**
 * AWS credentials for `credentials.awsSigV4`. Experimental.
 * @category Network sources
 */
export interface AwsCredentials {
    /** The access key id. */
    readonly accessKeyId: string;
    /** The secret access key. */
    readonly secretAccessKey: string;
    /** The session token of temporary credentials. */
    readonly sessionToken?: string | undefined;
}

/**
 * One node a `records` source returns: its id and its attributes. Experimental.
 * @category Network sources
 */
export type NodeRecord = {
    /** The id. */
    readonly id: NodeId;
} & Readonly<Record<string, unknown>>;

/**
 * One edge a `records` source returns: its ends, an optional id, and its attributes. Experimental.
 * @category Network sources
 */
export type EdgeRecord = {
    /** The source node's id. */
    readonly source: NodeId;
    /** The target node's id. */
    readonly target: NodeId;
    /** The id. */
    readonly id?: NodeId;
} & Readonly<Record<string, unknown>>;

/**
 * Where a paged load resumes. Opaque and JSON-serializable; only the source that made it reads it.
 * @category Network sources
 */
export type SourceCursor = Readonly<Record<string, string | number | boolean | null>>;

/**
 * One page of a `records` source. Experimental.
 * @category Network sources
 */
export interface RecordBatch {
    /** The nodes of the page. */
    readonly nodes?: readonly NodeRecord[] | undefined;
    /** The edges of the page; an edge to a node not loaded adds that node. */
    readonly edges?: readonly EdgeRecord[] | undefined;
    /** Where to resume; null or absent on the last page. */
    readonly next?: SourceCursor | null | undefined;
    /** Graph facts: `name`, `description`, `modified` (strings) and `directed` (boolean). */
    readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * What a `file` source returns: a body the format importers read. Experimental.
 * @category Network sources
 */
export interface SourceFile {
    /** A fetch Response (streamed) or any importer input. */
    readonly body: Response | ImportInput;
    /** The format ("cx2"), or omitted to detect it. */
    readonly format?: string | undefined;
    /** A file name hint for detection. */
    readonly filename?: string | undefined;
    /** A MIME type hint for detection. */
    readonly mimeType?: string | undefined;
    /** Graph facts the file itself does not hold, written after it is read, as `RecordBatch.meta`. */
    readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * What `ctx.fetch` accepts beside fetch's own init. Experimental.
 * @category Network sources
 */
export type SourceRequestInit = RequestInit & {
    /** false: never retry this request. */
    readonly retry?: false | undefined;
    /** Mark a POST as safe to retry (a read-only query). GET and HEAD always are. */
    readonly idempotent?: boolean | undefined;
    /**
     * Statuses outside 200 to 299 that are returned to the source instead of raised as coded issues
     * (a query error body the source reads itself, a 304). Default none; 304 is always returned.
     */
    readonly allowStatus?: readonly number[] | undefined;
};

/**
 * The caps of a load. Every default is "no limit". Experimental.
 * @category Network sources
 */
export interface SourceLimitOptions {
    /**
     * Stop once this many nodes were written. Checked after each page a source returns, so a load
     * can end one page past it (a page of works whose references become stub nodes can be
     * thousands); a database source also sends it to the server as a LIMIT.
     */
    readonly maxNodes?: number | undefined;
    /** Stop once this many edges were written. Checked after each page, as `maxNodes` is. */
    readonly maxEdges?: number | undefined;
    /** Stop once this many decoded response bytes were read. */
    readonly maxBytes?: number | undefined;
    /** Stop before sending more requests than this. */
    readonly maxRequests?: number | undefined;
    /** Fail with E_SOURCE_TIMEOUT once the load has run this long. */
    readonly timeoutMs?: number | undefined;
    /**
     * "stop" (default): keep what came first, warn W_SOURCE_LIMIT and record where to resume.
     * "error": fail with E_SOURCE_LIMIT.
     * @defaultValue "stop"
     */
    readonly onLimit?: "stop" | "error" | undefined;
}

/**
 * The caps as a source sees them. Experimental.
 * @category Network sources
 */
export type SourceLimits = Readonly<SourceLimitOptions> & {
    /**
     * Whether a node or edge cap has been reached. Under "stop" it warns W_SOURCE_LIMIT once and
     * returns true; under "error" it throws E_SOURCE_LIMIT.
     * @returns true when the source should stop
     */
    reached(): boolean;
};

/**
 * How `ctx.fetch` retries. Defaults: 3 retries, full-jitter backoff from 500 ms to 30 s.
 * @category Network sources
 */
export interface RetryOptions {
    /** Retries after the first attempt. @defaultValue 3 */
    readonly retries?: number | undefined;
    /** The first backoff ceiling in milliseconds. @defaultValue 500 */
    readonly baseDelayMs?: number | undefined;
    /** The largest backoff in milliseconds. @defaultValue 30000 */
    readonly maxDelayMs?: number | undefined;
}

/**
 * How much a source holds for a load, as it counted it, so a caller can show "100 of 28,455".
 * Experimental.
 * @category Network sources
 */
export interface SourceTotal {
    /** The nodes the load's params match at the source. */
    readonly nodes?: number | undefined;
    /** The edges the load's params match at the source. */
    readonly edges?: number | undefined;
}

/**
 * Facts a source reports with `ctx.finish()`. Experimental.
 * @category Network sources
 */
export interface SourceFinish {
    /** Where to resume; null or absent when the load is complete. */
    readonly next?: SourceCursor | null | undefined;
    /** Facts about the server: `{ product: "Neo4j", version: "5.24" }`. */
    readonly server?: Readonly<Record<string, string>> | undefined;
    /** What a metered service says is left. */
    readonly budget?:
        | {
              /** What the service says is left. */
              readonly remaining: number;
              /** When it resets, in milliseconds from now. */
              readonly resetMs?: number | undefined;
          }
        | undefined;
    /** What lets a later call tell whether the data changed. */
    readonly validators?: SourceValidators | undefined;
    /** What the source holds for this load, when it counted: the nodes and edges it matches. */
    readonly total?: SourceTotal | undefined;
}

/**
 * What every source method receives: the one place auth, redirects, retries, limits, cancellation
 * and progress are implemented. A source never calls the global `fetch`. Experimental.
 * @category Network sources
 */
export interface SourceContext {
    /**
     * fetch() with the credential, the redirect guard, retries, the signal, the byte cap and
     * progress. A relative URL resolves against `endpoint`. A status of 401, 403, 404, 429 or any
     * other outside 200 to 299 is raised as its coded issue unless `init.allowStatus` lists it.
     */
    readonly fetch: (input: string | URL, init?: SourceRequestInit) => Promise<Response>;
    /** `fetch` and parse the body as JSON; a body that is not JSON is E_SOURCE_RESPONSE. */
    readonly fetchJson: <T = unknown>(input: string | URL, init?: SourceRequestInit) => Promise<T>;
    /** The caller's endpoint, else the descriptor's default, else null. */
    readonly endpoint: URL | null;
    /** Aborts when the caller cancels or the load times out. */
    readonly signal: AbortSignal;
    /** The report of this load. */
    readonly report: ImportReportBuilder;
    /** The caps; `reached()` counts what the sink received. */
    readonly limits: SourceLimits;
    /**
     * Report progress.
     * @param done - how much is done
     * @param total - the total, when the service says it
     * @param unit - what is counted
     */
    progress(done: number, total?: number, unit?: "items" | "bytes"): void;
    /** The caller's `cursor`, or null on a first load. */
    readonly cursor: SourceCursor | null;
    /**
     * Finish an `import()` source: record where to resume and the server facts, and return the report.
     * @param result - the cursor and facts
     * @returns the report
     */
    finish(result?: SourceFinish): ImportReport;
    /** Where this load runs. */
    readonly runtime: SourceRuntime;
}

/**
 * One parameter a form asks for. Experimental.
 * @category Network sources
 */
export interface SourceParamDescriptor {
    /** The key in the params object. */
    readonly name: string;
    /** Its default name; catalog data an application may replace. */
    readonly plainName: string;
    /** Its type. */
    readonly type: SourceParamType;
    /** Whether it must be given. */
    readonly required?: boolean | undefined;
    /** The value used when it is not given. */
    readonly default?: unknown;
    /** The smallest number allowed. */
    readonly min?: number | undefined;
    /** The largest number allowed. */
    readonly max?: number | undefined;
    /** The allowed values of an "enum". */
    readonly values?:
        | readonly {
              /** The value a form submits. */
              readonly value: string;
              /** Its default name; catalog data. */
              readonly label: string;
          }[]
        | undefined;
    /** The language of a "query". */
    readonly language?: QueryLanguage | undefined;
    /** Whether a form may hide it by default. */
    readonly advanced?: boolean | undefined;
    /** "filter": compiled into the query, so filtering happens at the source. */
    readonly role?: "filter" | undefined;
    /** What it means; catalog data. */
    readonly description?: string | undefined;
}

/**
 * A public example a source offers. Experimental.
 * @category Network sources
 */
export interface SourceSample {
    /** Its id ("neo4j-movies"). */
    readonly id: string;
    /** Its default name; catalog data. */
    readonly plainName: string;
    /** The params that load it. */
    readonly params: Readonly<Record<string, unknown>>;
    /** The endpoint, when not the source's default. */
    readonly endpoint?: string | undefined;
    /** A login the service publishes for everyone; never stored. */
    readonly publicLogin?:
        | {
              /** The user name. */
              readonly username: string;
              /** The password, published by the service for everyone. */
              readonly password: string;
          }
        | undefined;
    /** How big it is. */
    readonly counts?:
        | {
              /** How many nodes. */
              readonly nodes?: number | undefined;
              /** How many edges. */
              readonly edges?: number | undefined;
          }
        | undefined;
    /** false: too big to load whole; start from a neighborhood. */
    readonly whole?: boolean | undefined;
    /**
     * A node cap for loading the sample when the caller gives none, for a sample too big to load
     * whole that pages: the load stops at the first page past it, and its cursor reads on.
     */
    readonly firstPage?: number | undefined;
}

/**
 * One credential a source takes, as its descriptor declares it: a name a project file records
 * instead of the credential, the kind, whether a load needs it, and for an API key how it is sent.
 * `credentials.forSlot(slot, value)` makes the credential it describes. Experimental.
 * @category Network sources
 */
export interface SourceCredentialSlot {
    /** The slot's name, recorded as a load's `credentialSlot` ("api_key", "default"). */
    readonly name: string;
    /** The credential kind it takes. */
    readonly kind: CredentialKind;
    /** Whether a load needs it. @defaultValue false */
    readonly required?: boolean | undefined;
    /** Its default name; catalog data an application may replace by name. */
    readonly plainName?: string | undefined;
    /** For an API key: the query parameter or request header it is sent in. */
    readonly send?:
        | {
              /** The query parameter the key is sent in. */
              readonly query: string;
          }
        | {
              /** The request header the key is sent in. */
              readonly header: string;
          }
        | undefined;
}

/**
 * What a form needs to ask for a source's parameters, as data. Only `plainName` and `params` are
 * required. Experimental.
 * @category Network sources
 */
export interface SourceDescriptor {
    /** The source's default name; catalog data an application may replace by id. */
    readonly plainName: string;
    /** The parameters. */
    readonly params: readonly SourceParamDescriptor[];
    /** Bump when params or cursors change shape. @defaultValue 1 */
    readonly version?: number | undefined;
    /** What kind of service it is. @defaultValue "other" */
    readonly kind?: SourceKind | undefined;
    /** The credential kinds it takes. @defaultValue [] */
    readonly auth?: readonly CredentialKind[] | undefined;
    /** Whether a credential is needed. @defaultValue "none" */
    readonly authRequired?: "required" | "optional" | "none" | undefined;
    /**
     * The credential slots it takes. A source that takes a credential (`auth`) and declares none
     * has one slot, `default`: `credentialSlots(descriptor)` reads either. @defaultValue []
     */
    readonly credentials?: readonly SourceCredentialSlot[] | undefined;
    /**
     * Where an `api-key` credential goes, for a form that asks for the key alone: pass it to
     * `credentials.apiKey(descriptor.apiKey, key)`. Absent when the caller must say.
     */
    readonly apiKey?:
        | {
              /** The request header that carries the key. */
              readonly header: string;
          }
        | {
              /** The query parameter that carries the key. */
              readonly query: string;
          }
        | undefined;
    /** The endpoint used when the caller names none. @defaultValue null */
    readonly defaultEndpoint?: string | null | undefined;
    /** Where it runs; a runtime marked unsupported is refused with E_SOURCE_RUNTIME before any request. */
    readonly runtimes?:
        | Readonly<
              Partial<
                  Record<
                      SourceRuntime,
                      {
                          /** Whether it runs there. */
                          readonly supported: boolean;
                          /** Why not, when it does not. */
                          readonly reason?: SourceRuntimeReason;
                      }
                  >
              >
          >
        | undefined;
    /**
     * What it needs from a browser. Absent means "not declared": nothing is checked first.
     * `secureContext: true` is checked before any request.
     */
    readonly needs?:
        | {
              /** Request headers the service must allow from a page. */
              readonly headers?: readonly string[] | undefined;
              /** Whether it needs a WebSocket. */
              readonly websocket?: boolean | undefined;
              /** Whether it needs a secure context (Web Crypto). */
              readonly secureContext?: boolean | undefined;
          }
        | undefined;
    /** Paces `ctx.fetch`: at most `requests` per `perMs`, and `concurrent` at once. */
    readonly rateLimit?:
        | {
              /** At most this many requests per period. */
              readonly requests: number;
              /** The period, in milliseconds. */
              readonly perMs: number;
              /** At most this many requests at once. */
              readonly concurrent?: number;
          }
        | undefined;
    /** The optional features it has; default: from the methods present. */
    readonly features?: readonly SourceFeature[] | undefined;
    /**
     * Upgrade params recorded by an older version.
     * @param params - the old params
     * @param fromVersion - the version they were recorded with
     * @returns the params for the current version
     */
    readonly migrateParams?:
        ((params: Record<string, unknown>, fromVersion: number) => Record<string, unknown>) | undefined;
    /** Public examples to offer. */
    readonly samples?: readonly SourceSample[] | undefined;
}

/**
 * A request to fetch the neighborhood of some nodes. Experimental.
 * @category Network sources
 */
export interface ExpandRequest<P> {
    /** The params the nodes were loaded with. */
    readonly params: P;
    /** The seed node ids. */
    readonly ids: readonly NodeId[];
    /** How many hops. @defaultValue 1 */
    readonly depth?: number | undefined;
    /** Which edges to follow. @defaultValue "both" */
    readonly direction?: "out" | "in" | "both" | undefined;
    /** At most this many new nodes. */
    readonly limit?: number | undefined;
    /** Only these relationship types. */
    readonly relationshipTypes?: readonly string[] | undefined;
    /** Nodes already loaded; an optimization only. */
    readonly exclude?: readonly NodeId[] | undefined;
}

/**
 * What `probe` answers: the params and credential work. Experimental.
 * @category Network sources
 */
export interface SourceProbe {
    /** Always true; a failure throws its coded issue. */
    readonly ok: true;
    /** Facts about the server. */
    readonly server?: Readonly<Record<string, string>> | undefined;
    /** How big the graph is, when the service says. */
    readonly counts?:
        | {
              /** How many nodes. */
              readonly nodes?: number | undefined;
              /** How many edges. */
              readonly edges?: number | undefined;
              /** How many bytes the download is. */
              readonly bytes?: number | undefined;
          }
        | undefined;
}

/**
 * A search of what a source holds. Experimental.
 * @category Network sources
 */
export interface SourceListQuery<P> {
    /** Params narrowing the search. */
    readonly params: Partial<P>;
    /** Search text. */
    readonly search?: string | undefined;
    /** Where to resume. */
    readonly cursor?: SourceCursor | undefined;
    /** Items per page. */
    readonly size?: number | undefined;
}

/**
 * One item a search found. Experimental.
 * @category Network sources
 */
export interface SourceListItem {
    /** The params that load it. */
    readonly params: Readonly<Record<string, unknown>>;
    /** Its name in the service; the consumer's data. */
    readonly name: string;
    /** Its node count, when known. */
    readonly nodeCount?: number | undefined;
    /** Its edge count, when known. */
    readonly edgeCount?: number | undefined;
    /** When it last changed, ISO-8601. */
    readonly modified?: string | undefined;
}

/**
 * A page of search results. Experimental.
 * @category Network sources
 */
export interface SourceListing {
    /** The items. */
    readonly items: readonly SourceListItem[];
    /** Where the next page starts, or null. */
    readonly next: SourceCursor | null;
    /** The total, when the service says. */
    readonly total?: number | undefined;
}

/**
 * What lets a later call tell whether a source's data changed. Experimental.
 * @category Network sources
 */
export interface SourceValidators {
    /** An HTTP ETag. */
    readonly etag?: string | undefined;
    /** An HTTP Last-Modified. */
    readonly lastModified?: string | undefined;
    /** The service's own modification time. */
    readonly modified?: string | undefined;
    /** The server's version. */
    readonly serverVersion?: string | undefined;
    /** SHA-256 of the canonical rows loaded. */
    readonly contentHash?: string | undefined;
}

/**
 * What `validate` answers. Experimental.
 * @category Network sources
 */
export interface SourceFreshness {
    /** Whether the data changed. */
    readonly status: "current" | "changed" | "unverifiable";
    /** What told. */
    readonly via?: "etag" | "modified" | "version" | "hash" | undefined;
    /** When it changed, ISO-8601. */
    readonly changedAt?: string | undefined;
    /** The new validators. */
    readonly validators: SourceValidators;
}

/**
 * The `source` member of an ImportReport from a source load. Experimental.
 * @category Network sources
 */
export interface SourceReportInfo {
    /** The source id. */
    readonly id: string;
    /** The source's descriptor version. */
    readonly version: number;
    /** The endpoint, origin and path only. */
    readonly endpoint: string | null;
    /** Requests sent. */
    readonly requests: number;
    /** Decoded response bytes read. */
    readonly bytes: number;
    /** Where to resume; null when the load is complete. Pass it as `cursor`. */
    readonly next: SourceCursor | null;
    /** Facts about the server. */
    readonly server?: Readonly<Record<string, string>> | undefined;
    /** What a metered service says is left. */
    readonly budget?:
        | {
              /** What the service says is left. */
              readonly remaining: number;
              /** When it resets, in milliseconds from now. */
              readonly resetMs?: number | undefined;
          }
        | undefined;
    /** What lets a later call tell whether the data changed. */
    readonly validators?: SourceValidators | undefined;
    /** What the source holds for this load, when it counted: the nodes and edges it matches. */
    readonly total?: SourceTotal | undefined;
}

/**
 * The read method of a `records` source: return a page of nodes and edges, or an async iterable
 * of pages. Experimental.
 * @category Network sources
 */
export type RecordsFn<P> = (params: P, ctx: SourceContext) => Promise<RecordBatch> | AsyncIterable<RecordBatch>;
/**
 * The read method of a `file` source: return a body the format importers read. Experimental.
 * @category Network sources
 */
export type FileFn<P> = (params: P, ctx: SourceContext) => Promise<SourceFile>;
/**
 * The read method of an `import` source: write into the sink and return the report. Experimental.
 * @category Network sources
 */
export type ImportFn<P> = (params: P, sink: GraphSink, ctx: SourceContext) => Promise<ImportReport>;

/**
 * What every source has beside its one read method. Experimental.
 * @category Network sources
 */
export interface SourceBase<P> {
    /** Lowercase letters, digits and dashes. A separate name space from formats. */
    readonly id: string;
    /** What a form needs; optional for a source used only from code. */
    readonly descriptor?: SourceDescriptor | undefined;
    /** The node record's id field, when not `id`. */
    readonly idKey?: string | undefined;
    /** The edge record's source field, when not `source`. */
    readonly sourceKey?: string | undefined;
    /** The edge record's target field, when not `target`. */
    readonly targetKey?: string | undefined;
    /**
     * Fetch the neighborhood of some nodes into the sink.
     * @param request - the seeds and how far to go
     * @param sink - where to write
     * @param ctx - the context
     * @returns the report
     */
    expand?(request: ExpandRequest<P>, sink: GraphSink, ctx: SourceContext): Promise<ImportReport>;
    /**
     * Check the params and the credential without loading.
     * @param params - the params
     * @param ctx - the context
     * @returns what the service said
     */
    probe?(params: P, ctx: SourceContext): Promise<SourceProbe>;
    /**
     * Search what the source holds.
     * @param query - the search
     * @param ctx - the context
     * @returns one page of results
     */
    list?(query: SourceListQuery<P>, ctx: SourceContext): Promise<SourceListing>;
    /**
     * Tell whether data loaded earlier changed.
     * @param params - the params it was loaded with
     * @param seen - the validators recorded then
     * @param ctx - the context
     * @returns whether it changed
     */
    validate?(params: P, seen: SourceValidators, ctx: SourceContext): Promise<SourceFreshness>;
}

/**
 * A network source: an id, an optional descriptor, and exactly one of three read methods, simplest
 * first: `records` (return nodes and edges, or an async iterable of pages), `file` (return a body
 * the format importers read) or `import` (write into the sink yourself). Experimental.
 * @category Network sources
 */
export type GraphSource<P = Record<string, unknown>> =
    | (SourceBase<P> & {
          /** Return `{ nodes, edges }`, or an async iterable of such pages. */
          readonly records: RecordsFn<P>;
          /** Absent: a source has exactly one read method. */
          readonly file?: never;
          /** Absent: a source has exactly one read method. */
          readonly import?: never;
      })
    | (SourceBase<P> & {
          /** Return a file the format importers read. */
          readonly file: FileFn<P>;
          /** Absent: a source has exactly one read method. */
          readonly records?: never;
          /** Absent: a source has exactly one read method. */
          readonly import?: never;
      })
    | (SourceBase<P> & {
          /** Write into the sink. */
          readonly import: ImportFn<P>;
          /** Absent: a source has exactly one read method. */
          readonly records?: never;
          /** Absent: a source has exactly one read method. */
          readonly file?: never;
      });

/**
 * A source registered by its descriptor, whose code loads on first use. Experimental.
 * @category Network sources
 */
export interface LazySource {
    /** The source id. */
    readonly id: string;
    /** The descriptor, available without loading the code. */
    readonly descriptor: SourceDescriptor;
    /**
     * Load the source.
     * @returns the source
     */
    readonly load: () => Promise<GraphSource<never>>;
}

/**
 * One registered source, as `listSources()` describes it. Experimental.
 * @category Network sources
 */
export interface SourceInfo {
    /** The source id. */
    readonly id: string;
    /** Its descriptor (a bare one, `{ plainName: id, params: [] }`, for a source without one). */
    readonly descriptor: SourceDescriptor;
    /** Whether its code is loaded. */
    readonly loaded: boolean;
}

/**
 * The options of `loadFromSource()` and the other source functions. Experimental.
 * @category Network sources
 */
export interface LoadFromSourceOptions extends CommonImportOptions {
    /** The service's address; required unless the source has a default. */
    readonly endpoint?: string | URL | undefined;
    /** The credential, sent only to the endpoint's origin or the credential's own `origins`. */
    readonly credential?: Credential | undefined;
    /** Where to resume a capped load: the earlier `report.source.next`. */
    readonly cursor?: SourceCursor | null | undefined;
    /** The caps. */
    readonly limits?: SourceLimitOptions | undefined;
    /** How to retry, or false never to. */
    readonly retry?: RetryOptions | false | undefined;
    /** Prepended to every node id, to keep two loads' ids apart. */
    readonly idPrefix?: string | undefined;
    /** Send a credential without TLS to a host that is not loopback. @defaultValue false */
    readonly allowInsecure?: boolean | undefined;
    /** The fetch to use instead of the global one (tests, recorded responses, Node agents). */
    readonly fetch?: typeof fetch | undefined;
    /** Sent as User-Agent in Node. No default string. */
    readonly userAgent?: string | undefined;
    /** Settings for the builder (loadFromSource and expandFromSource). */
    readonly builder?: BuilderSeed | undefined;
    /** Settings for the freeze (loadFromSource and expandFromSource). */
    readonly freeze?: FreezeOptions | undefined;
}
