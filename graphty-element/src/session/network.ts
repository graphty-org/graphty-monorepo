/**
 * @file `session.network`: the one place a fetch the page's code did not ask for waits for the
 * reader (design/rendering/node-models.md section 2.6).
 *
 * A model or texture URL named by a layer that did not come from the page's code -- a project or
 * style file, an AI command, a template, a value read from the data -- and a network-source load
 * of a reopened project are each listed as a {@link NetworkRequest}, a coded fact with the URL, its
 * host and what asked for it, and nothing is fetched until the page answers with `allow` or
 * `deny`. Allowing one request allows its host for the rest of the session, so a reader is asked
 * once per host. A project may record that it is not to ask (`setProjectPolicy("allow")`, saved in
 * the project file), and the page may stop asking altogether (`setPolicy("allow")`, the reader's own
 * preference, never saved). Private, loopback and link-local addresses are refused for anything
 * that did not come from the page's code, whatever the policy.
 */

import type { LayerId } from "../catalog/types";
import type { GraphtyWarningCode } from "../errors/codes";
import { GraphtyError } from "../errors/GraphtyError";
import type { PendingSourceLoad } from "./sources/types";

/** What a request would fetch. OPEN UNION: later releases add values. */
export type NetworkRequestKind = "model" | "texture" | "source";

/**
 * What asked for it: a layer from a project or style file or a template (`file`), a layer an AI
 * command wrote (`ai`), a value an encoding or expression read from the data (`data`), or a saved
 * network-source load of a reopened project (`source`). OPEN UNION.
 */
export type NetworkRequestAsker = "file" | "ai" | "data" | "source";

/** A fetch waiting for the page's answer: `{ code, params }`, as every fact the element reports. */
export interface NetworkRequest {
    readonly code: Extract<GraphtyWarningCode, "W_URL_NEEDS_APPROVAL">;
    readonly params: {
        /** The key `allow` and `deny` take. */
        readonly id: string;
        /** What would be fetched: origin and path, never the query or credentials. */
        readonly url: string;
        readonly host: string;
        readonly kind: NetworkRequestKind;
        readonly by: NetworkRequestAsker;
        /** The layers that name it, for a model or texture. */
        readonly layerIds: readonly LayerId[];
    };
}

/** Whether to ask before such a fetch (`"ask"`), or make it (`"allow"`). */
export type NetworkPolicy = "ask" | "allow";

/** `session.network`. */
export interface NetworkApi {
    /**
     * The fetches waiting for an answer, oldest first.
     * @returns The requests.
     */
    pending(): readonly NetworkRequest[];
    /**
     * Make a waiting fetch, and every later one to the same host this session.
     * @param id - The request's `params.id`.
     * @param options - `remember: "project"` also stops this project asking (`setProjectPolicy("allow")`).
     * @param options.remember - Whether the answer holds for the project too.
     * @returns Settles once the request is released (a source load: once it is loaded).
     * @throws A `GraphtyError` coded `E_BAD_COMMAND` for an id that is not waiting.
     */
    allow(id: string, options?: { readonly remember?: "project" }): Promise<void>;
    /**
     * Refuse a waiting fetch: a model or texture keeps its node's shape and reports
     * `E_MODEL_URL_BLOCKED`; a source load stays unloaded. Nothing happens for an unknown id.
     * @param id - The request's `params.id`.
     */
    deny(id: string): void;
    /** Whether this project asks: `"allow"` once a reader chose not to be asked again for it. Saved in the project file. */
    readonly projectPolicy: NetworkPolicy;
    /**
     * Set whether this project asks. Saved with the project; not a step of the history.
     * @param policy - The policy.
     */
    setProjectPolicy(policy: NetworkPolicy): void;
    /** Whether the page asks at all: the reader's own preference, which the page sets. Never saved. */
    readonly policy: NetworkPolicy;
    /**
     * Set whether the page asks at all. Code only: a document never sets it.
     * @param policy - The policy.
     */
    setPolicy(policy: NetworkPolicy): void;
}

/** What a model or texture asks the gate. */
export interface FetchQuestion {
    readonly url: URL;
    readonly kind: Exclude<NetworkRequestKind, "source">;
    readonly by: Exclude<NetworkRequestAsker, "source">;
    readonly layerIds: readonly LayerId[];
}

/** The network API plus what the element's own parts call. */
export interface NetworkApiInternal extends NetworkApi {
    /**
     * Whether a fetch to a host may be made now without asking.
     * @param host - The URL's host.
     * @returns True when the page, the reader or the project allowed it.
     */
    allowed(host: string): boolean;
    /**
     * Ask before a fetch: resolves true at once when the host is allowed, else when the page
     * answers. One question per URL, shared by every caller.
     * @param question - What would be fetched and who asked.
     * @returns Whether to fetch.
     */
    ask(question: FetchQuestion): Promise<boolean>;
    /**
     * Allow hosts for the session, as the page's code does (`assets.allowHosts`).
     * @param hosts - Host names.
     */
    allowHosts(hosts: readonly string[]): void;
}

/** What the session lends the gate for its network-source loads. */
export interface NetworkSources {
    pendingSourceLoads(): readonly PendingSourceLoad[];
    runPendingSourceLoad(id: string): Promise<void>;
}

/** One question waiting. */
interface Waiting {
    readonly request: NetworkRequest;
    readonly answer: (allowed: boolean) => void;
    readonly settled: Promise<boolean>;
}

/**
 * The URL as a request shows it: origin and path.
 * @param url - The URL.
 * @returns The text.
 */
function shown(url: URL): string {
    return `${url.origin}${url.pathname}`.slice(0, 2048);
}

/**
 * Build `session.network`.
 * @param publish - Publishes `network:pending` for each new request.
 * @param sources - The session's network-source loads, listed and run through the same gate.
 * @returns The API.
 */
export function createNetworkApi(
    publish: (request: NetworkRequest) => void,
    sources?: NetworkSources,
): NetworkApiInternal {
    let policy: NetworkPolicy = "ask";
    let projectPolicy: NetworkPolicy = "ask";
    const hosts = new Set<string>();
    const waiting = new Map<string, Waiting>();
    const dismissed = new Set<string>();
    let next = 0;

    const sourceRequests = (): NetworkRequest[] =>
        (sources?.pendingSourceLoads() ?? [])
            .filter((load) => !dismissed.has(load.id))
            .map((load) => {
                let host = "";
                let url = load.endpoint ?? "";
                try {
                    const parsed = new URL(load.endpoint ?? "");
                    ({ host } = parsed);
                    url = shown(parsed);
                } catch {
                    // A source with no endpoint: its id is all there is to show.
                }

                return Object.freeze({
                    code: "W_URL_NEEDS_APPROVAL" as const,
                    params: Object.freeze({
                        id: load.id,
                        url,
                        host,
                        kind: "source" as const,
                        by: "source" as const,
                        layerIds: [],
                    }),
                });
            });

    const release = (allow: (request: NetworkRequest) => boolean): void => {
        for (const [key, each] of [...waiting]) {
            if (allow(each.request)) {
                waiting.delete(key);
                each.answer(true);
            }
        }

        // A waiting source load on an allowed host runs too, when it needs no credential: one
        // that does waits for the page, which has the reader's login to give it.
        for (const request of sourceRequests()) {
            const load = sources?.pendingSourceLoads().find((each) => each.id === request.params.id);
            if (load !== undefined && load.authRequired !== "required" && api.allowed(request.params.host)) {
                dismissed.add(load.id);
                void sources?.runPendingSourceLoad(load.id).catch(() => {
                    dismissed.delete(load.id);
                });
            }
        }
    };

    const api: NetworkApiInternal = {
        pending() {
            return Object.freeze([...[...waiting.values()].map((each) => each.request), ...sourceRequests()]);
        },

        async allow(id, options = {}) {
            if (options.remember === "project") {
                api.setProjectPolicy("allow");
            }

            const held = [...waiting.values()].find((each) => each.request.params.id === id);
            if (held !== undefined) {
                hosts.add(held.request.params.host.toLowerCase());
                release((request) => request.params.host.toLowerCase() === held.request.params.host.toLowerCase());
                return;
            }

            if (sourceRequests().some((request) => request.params.id === id)) {
                await sources?.runPendingSourceLoad(id);
                return;
            }

            if (options.remember === "project") {
                return; // Already released by the project policy.
            }

            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                source: "data",
                message: `No fetch waiting has the id ${id}.`,
                details: { id },
            });
        },

        deny(id) {
            for (const [key, each] of waiting) {
                if (each.request.params.id === id) {
                    waiting.delete(key);
                    each.answer(false);
                }
            }

            dismissed.add(id);
        },

        get projectPolicy() {
            return projectPolicy;
        },

        setProjectPolicy(value) {
            projectPolicy = value === "allow" ? "allow" : "ask";
            // Also after a project opens: its source loads on allowed hosts run now.
            release(() => projectPolicy === "allow");
        },

        get policy() {
            return policy;
        },

        setPolicy(value) {
            policy = value === "allow" ? "allow" : "ask";
            if (policy === "allow") {
                release(() => true);
            }
        },

        allowed(host) {
            return policy === "allow" || projectPolicy === "allow" || hosts.has(host.toLowerCase());
        },

        ask(question) {
            if (api.allowed(question.url.host)) {
                return Promise.resolve(true);
            }

            const key = question.url.href;
            const held = waiting.get(key);
            if (held !== undefined) {
                return held.settled;
            }

            let answer: (allowed: boolean) => void = () => undefined;
            const settled = new Promise<boolean>((resolve) => {
                answer = resolve;
            });
            const request: NetworkRequest = Object.freeze({
                code: "W_URL_NEEDS_APPROVAL" as const,
                params: Object.freeze({
                    id: `request-${String(++next)}`,
                    url: shown(question.url),
                    host: question.url.host,
                    kind: question.kind,
                    by: question.by,
                    layerIds: Object.freeze([...question.layerIds]),
                }),
            });
            waiting.set(key, { request, answer, settled });
            publish(request);
            return settled;
        },

        allowHosts(list) {
            for (const host of list) {
                hosts.add(host.toLowerCase());
            }

            release((request) => hosts.has(request.params.host.toLowerCase()));
        },
    };

    return api;
}
