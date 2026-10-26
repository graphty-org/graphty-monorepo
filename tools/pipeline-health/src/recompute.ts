// One collector cycle's derived data (design/ci/health-dashboard.md, section 10.3): the dirty 5-minute buckets and
// their parents recomputed from raw (never incremented), the SLA engine run on the rollups, and every precomputed
// read item rewritten, gzipped, under `PAGE#<name>`. The read Lambda answers only from those items.

import { gunzipSync, gzipSync } from "node:zlib";

import { recompute } from "./model/rollup.js";
import type { BatchOp, Item, Store } from "./model/store.js";
import { buildPages } from "./pages.js";
import { evaluate } from "./sla/engine.js";

/** The key of one read item: `status`, `page/<page>/<range>`, `section/<page>/<section>/<range>[/<kind>]`. */
export const pageKey = (name: string) => ({ pk: `PAGE#${name}`, sk: "-" });

export interface PageItem extends Item {
    gz: Uint8Array;
    at: number;
}

/** The stored JSON of one read item, gzipped, or undefined when it was never written. */
export async function readPage(store: Store, name: string): Promise<{ gz: Buffer; at: number } | undefined> {
    const item = (await store.get(pageKey(name))) as PageItem | undefined;
    return item && { gz: Buffer.from(item.gz), at: item.at };
}

export const unzip = (gz: Buffer) => gunzipSync(gz).toString("utf8");

/**
 * Recomputes the rollups, judges every member and rewrites every read item.
 * @param store - the table
 * @param now - the cycle's time, epoch ms
 * @returns what it did, for the log
 */
export async function recomputeAll(
    store: Store,
    now: number,
): Promise<{ buckets: number; items: number; pages: number }> {
    const rolled = await recompute(store, now);
    const ev = await evaluate(store, now);
    const pages = await buildPages(store, ev, now);
    // ponytail: every item is rewritten each cycle (about 40 x 6 KB); write only changed ones if the bill shows it.
    const ops: BatchOp[] = [...pages].map(([name, body]) => ({
        put: { ...pageKey(name), gz: gzipSync(JSON.stringify(body)), at: now },
    }));
    await store.batch(ops);
    return { ...rolled, pages: pages.size };
}
