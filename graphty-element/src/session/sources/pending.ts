/**
 * The source loads an opened project holds but has not run: read synchronously, so it is kept
 * apart from load.ts, which the session loads only when a source is first used.
 */
import { registry, type SourceDescriptor } from "@graphty/graph-io";

import { ensureGraphSamplesSource } from "../../data/graphSamplesSource";
import { isLocalNetwork } from "./endpoint";
import type { SourceHost } from "./host";
import type { PendingSourceLoad, SourceLoadRecord } from "./types";

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
 * Where a load's requests go: its endpoint, else a REST mapping's own endpoint, else the source's
 * default.
 * @param record - the load
 * @returns the endpoint, or null when none is known
 */
function targetOf(record: SourceLoadRecord): string | null {
    const { mapping } = record.config as { mapping?: { endpoint?: unknown } };
    const mapped = typeof mapping?.endpoint === "string" ? mapping.endpoint : null;
    return record.endpoint ?? mapped ?? descriptorOf(record.source)?.defaultEndpoint ?? null;
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
                endpoint: targetOf(record),
                params: record.config,
                hasQuery: typeof record.config.query === "string" || record.config.mapping !== undefined,
                isLocalNetwork: isLocalNetwork(targetOf(record)),
                authRequired: descriptorOf(record.source)?.authRequired ?? "none",
                ...(slot === undefined ? {} : { credentialSlot: slot }),
            });
        });
}
