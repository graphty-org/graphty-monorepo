/**
 * @file `session.network`: the one place a fetch the page's code did not ask for waits for the
 * reader (design/rendering/node-models.md section 2.6).
 *
 * A model or texture URL named by a layer that did not come from the page's code -- a project or
 * style file, an AI command, a template, a value read from the data -- and a network-source load
 * of a reopened project are each listed as a {@link NetworkRequest}, a coded fact with the URL, its
 * host and what asked for it, and nothing is fetched until the page answers with `allow` or
 * `deny`. Allowing one request allows its host for the rest of the session, so a reader is asked
 * once per host. Nothing saved in a project file can stop the asking: a reader's "don't ask again
 * for this project" is kept by the page, on the reader's machine, keyed by `session.project.id`,
 * and handed back with `setProjectHosts`; the page may stop asking altogether (`setPolicy("allow")`,
 * the reader's own preference, never saved). Private, loopback and link-local addresses are refused
 * for anything that did not come from the page's code, whatever the policy.
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
 * network-source load of a reopened project (`source`), or a part of a model handed to
 * `assets.supply` by its URL on another host (`supplied`). OPEN UNION.
 */
export type NetworkRequestAsker = "file" | "ai" | "data" | "source" | "supplied";

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
     * @returns Settles once the request is released (a source load: once it is loaded).
     * @throws A `GraphtyError` coded `E_BAD_COMMAND` for an id that is not waiting.
     */
    allow(id: string): Promise<void>;
    /**
     * Refuse a waiting fetch: a model or texture keeps its node's shape and reports
     * `E_MODEL_URL_BLOCKED`; a source load stays unloaded. Nothing happens for an unknown id.
     * @param id - The request's `params.id`.
     */
    deny(id: string): void;
    /**
     * Hand back the hosts a reader chose not to be asked about again for one project, from your
     * page's own storage on the reader's machine. graphty-element calls `lookup` with
     * `session.project.id` now and each time a project opens, before anything is fetched, and
     * allows the hosts it returns until another project opens. Nothing in a project file does
     * this, so a file received from someone else always asks. Never saved; `null` stops it.
     * @param lookup - The project's id to the host names (`"models.example.com"`) to allow.
     * @example
     * ```ts
     * session.network.setProjectHosts((projectId) => JSON.parse(localStorage.getItem(projectId) ?? "[]"));
     * ```
     */
    setProjectHosts(lookup: ((projectId: string) => readonly string[]) | null): void;
    /** Whether the page asks at all: the reader's own preference, which the page sets. Never saved. */
    readonly policy: NetworkPolicy;
    /**
     * Set whether the page asks at all. Code only: a document never sets it.
     * @param policy - The policy.
     */
    setPolicy(policy: NetworkPolicy): void;
}

/**
 * Whether dotted IPv4 octets are private, loopback, link-local, shared, benchmarking, reserved,
 * multicast or broadcast.
 * @param a - The first octet.
 * @param b - The second.
 * @param c - The third.
 * @returns True for such an address.
 */
function privateV4(a: number, b: number, c: number): boolean {
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0 && c === 0) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19))
    );
}

/**
 * An IPv6 address as its eight 16-bit groups.
 * @param name - The address, without brackets, as the URL parser writes it (no dotted tail).
 * @returns The groups, or undefined when it is not one.
 */
function v6Groups(name: string): number[] | undefined {
    const halves = name.split("::");
    if (halves.length > 2) {
        return undefined;
    }

    const read = (half: string): number[] => (half === "" ? [] : half.split(":").map((g) => Number.parseInt(g, 16)));
    const head = read(halves[0]);
    const tail = halves.length === 2 ? read(halves[1]) : [];
    const groups =
        halves.length === 2 ? [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail] : head;
    return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
        ? groups
        : undefined;
}

/**
 * Whether an IPv6 address is private: loopback, unspecified, IPv4-compatible or mapped, unique
 * local, link-local, site-local or multicast, or a NAT64 or 6to4 address whose IPv4 is private.
 * @param name - The address, without brackets.
 * @returns True for such an address.
 */
function privateV6(name: string): boolean {
    const g = v6Groups(name);
    if (g === undefined) {
        return true; // Not readable as an address: refused rather than guessed.
    }

    const v4 = (high: number, low: number): boolean => privateV4(high >> 8, high & 0xff, low >> 8);
    return (
        g.slice(0, 5).every((x) => x === 0) ||
        (g[0] & 0xfe00) === 0xfc00 ||
        (g[0] & 0xffc0) === 0xfe80 ||
        (g[0] & 0xffc0) === 0xfec0 ||
        (g[0] & 0xff00) === 0xff00 ||
        (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0) && v4(g[6], g[7])) ||
        (g[0] === 0x2002 && v4(g[1], g[2]))
    );
}

/**
 * Whether a host is private, loopback or link-local, which a fetch not from the page's code never
 * reaches. It reads the host as written: a public name that resolves to a private address is not
 * seen here, and only the reader's per-host answer stands in its way.
 * @param host - The URL's host name.
 * @returns True for such a host.
 */
export function isPrivateHost(host: string): boolean {
    const name = host
        .replaceAll(/(?:^\[)|(?:\]$)/g, "")
        .toLowerCase()
        .replace(/\.$/, "");
    // A trailing dot (`localhost.`) names the same host.
    if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "0.0.0.0") {
        return true;
    }

    const v4 = /^(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(name);
    if (v4 !== null) {
        return privateV4(Number(v4[1]), Number(v4[2]), Number(v4[3]));
    }

    return name.includes(":") && privateV6(name);
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
     * @returns True when the page or the reader allowed it, for the session or this project.
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
    /** Ask the page's `setProjectHosts` lookup again: a project opened, or its loads were restored. */
    projectChanged(): void;
    /**
     * Be told whenever hosts may have become allowed, so a fetch refused earlier can be made now.
     * @param listener - Called after each change.
     * @returns Stops watching.
     */
    watchAllowed(listener: () => void): () => void;
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
 * @param projectId - The open project's id, for the page's `setProjectHosts` lookup.
 * @returns The API.
 */
export function createNetworkApi(
    publish: (request: NetworkRequest) => void,
    sources?: NetworkSources,
    projectId?: () => string,
): NetworkApiInternal {
    let policy: NetworkPolicy = "ask";
    const hosts = new Set<string>();
    // The hosts the page remembers for the open project: replaced whenever a project opens.
    let projectLookup: ((id: string) => readonly string[]) | null = null;
    const projectHosts = new Set<string>();
    const waiting = new Map<string, Waiting>();
    const dismissed = new Set<string>();
    const allowWatchers = new Set<() => void>();
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

        for (const watcher of [...allowWatchers]) {
            watcher();
        }
    };

    const api: NetworkApiInternal = {
        pending() {
            return Object.freeze([...[...waiting.values()].map((each) => each.request), ...sourceRequests()]);
        },

        async allow(id) {
            const held = [...waiting.values()].find((each) => each.request.params.id === id);
            if (held !== undefined) {
                // A question with no host never leaves an empty name allowed for everything else.
                if (held.request.params.host !== "") {
                    hosts.add(held.request.params.host.toLowerCase());
                }

                release((request) => request.params.host.toLowerCase() === held.request.params.host.toLowerCase());
                return;
            }

            if (sourceRequests().some((request) => request.params.id === id)) {
                await sources?.runPendingSourceLoad(id);
                return;
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

        setProjectHosts(lookup) {
            projectLookup = lookup;
            api.projectChanged();
        },

        projectChanged() {
            projectHosts.clear();
            let listed: readonly unknown[] = [];
            try {
                const id = projectId?.();
                listed = projectLookup === null || id === undefined ? [] : projectLookup(id);
            } catch {
                // A page whose storage fails remembers nothing: the reader is asked.
            }

            for (const host of Array.isArray(listed) ? listed : []) {
                if (typeof host === "string") {
                    projectHosts.add(host.toLowerCase());
                }
            }

            release((request) => projectHosts.has(request.params.host.toLowerCase()));
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
            const lower = host.toLowerCase();
            return policy === "allow" || hosts.has(lower) || projectHosts.has(lower);
        },

        ask(question) {
            // Only a web address with a host is ever asked about; anything else is refused.
            if (question.url.host === "" || (question.url.protocol !== "https:" && question.url.protocol !== "http:")) {
                return Promise.resolve(false);
            }

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
                if (host !== "") {
                    hosts.add(host.toLowerCase());
                }
            }

            release((request) => hosts.has(request.params.host.toLowerCase()));
        },

        watchAllowed(listener) {
            allowWatchers.add(listener);
            return () => {
                allowWatchers.delete(listener);
            };
        },
    };

    return api;
}
