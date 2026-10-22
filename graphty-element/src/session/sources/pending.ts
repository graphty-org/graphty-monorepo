/**
 * The source loads an opened project holds but has not run: read synchronously, so it is kept
 * apart from load.ts, which the session loads only when a source is first used.
 */
import { registry, type SourceDescriptor } from "@graphty/graph-io";

import { ensureGraphSamplesSource } from "../../data/graphSamplesSource";
import type { SourceHost } from "./host";
import type { PendingSourceLoad } from "./types";

/**
 * A source's descriptor, read from the registry without loading the source's code.
 * @param id - the source id
 * @returns the descriptor, or undefined for an id no source has
 */
export function descriptorOf(id: string): SourceDescriptor | undefined {
    ensureGraphSamplesSource();
    return registry.listSources().find((info) => info.id === id)?.descriptor;
}

/**
 * Whether an endpoint is on this machine or a local network.
 * @param endpoint - the endpoint, or null
 * @returns true for loopback, RFC 1918 and `.local` hosts
 */
function isLocalNetwork(endpoint: string | null): boolean {
    if (endpoint === null) {
        return false;
    }

    const host = new URL(endpoint).hostname.replaceAll(/(?:^\[)|(?:\]$)/g, "");
    return (
        host === "localhost" ||
        host === "::1" ||
        host.endsWith(".local") ||
        host.startsWith("127.") ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
}

/**
 * The source loads an opened project holds but has not run.
 * @param host - the session pieces
 * @returns one entry per waiting load
 */
export function pendingSourceLoads(host: SourceHost): readonly PendingSourceLoad[] {
    return host.ledger
        .loads()
        .filter((record) => host.pending.has(record.key))
        .map((record) => {
            const slot = host.credentialSlotOf(record.key);
            return Object.freeze({
                id: record.key,
                source: record.source,
                endpoint: record.endpoint,
                hasQuery: typeof record.config.query === "string" || record.config.mapping !== undefined,
                isLocalNetwork: isLocalNetwork(record.endpoint),
                authRequired: descriptorOf(record.source)?.authRequired ?? "none",
                ...(slot === undefined ? {} : { credentialSlot: slot }),
            });
        });
}
