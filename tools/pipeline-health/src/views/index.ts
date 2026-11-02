// writeViews(): the collector's last step each cycle. It evaluates the SLAs, builds every page payload and stores
// each as one gzipped JSON item under viewKey(), which the read handler serves as is (Content-Encoding: gzip).

import { gunzipSync, gzipSync } from "node:zlib";

import type { Item, Store } from "../model/store.js";
import { type SlaConfig, SLAS } from "../sla/config.js";
import { evaluate, type Evaluation } from "../sla/engine.js";
import { buildViews, type View } from "./build.js";
import { viewKey, type ViewRoute } from "./keys.js";

export { buildViews, ISSUE_RANGES, RANGES, SLOW_RANGES, type View, type ViewBody } from "./build.js";
export { viewKey, type ViewRoute } from "./keys.js";

/** DynamoDB's item limit is 400 KB; leave room for the key and attributes. */
export const MAX_VIEW_BYTES = 390_000;

export interface ViewItem extends Item {
    pk: string;
    sk: string;
    /** Gzipped JSON of the payload. */
    gz: Uint8Array;
    generated: number;
}

/**
 * Builds and stores every view; returns what it wrote. Throws, writing nothing, when one would not fit an item.
 * @param store - the table to read the collected items from and write the views to
 * @param nowMs - the current time in epoch milliseconds
 * @param cfg - the SLA definitions to evaluate
 * @param ev - this cycle's evaluate() result, when the caller already has it
 * @returns how many views it wrote, their total gzipped bytes, and the largest one
 */
export async function writeViews(
    store: Store,
    nowMs: number,
    cfg: SlaConfig = SLAS,
    ev?: Evaluation,
): Promise<{ views: number; bytes: number; largest: { route: ViewRoute; bytes: number } }> {
    const views: View[] = await buildViews(store, nowMs, ev ?? (await evaluate(store, nowMs, cfg)), cfg);
    const items: ViewItem[] = views.map((v) => ({
        ...viewKey(v.route),
        gz: gzipSync(JSON.stringify(v.body)),
        generated: nowMs,
    }));
    let largest = { route: views[0].route, bytes: 0 };
    items.forEach((it, i) => {
        if (it.gz.byteLength > largest.bytes) {
            largest = { route: views[i].route, bytes: it.gz.byteLength };
        }
    });
    if (largest.bytes > MAX_VIEW_BYTES) {
        throw new Error(`view ${viewKey(largest.route).pk} is ${largest.bytes} bytes gzipped, over ${MAX_VIEW_BYTES}`);
    }
    await store.batch(items.map((put) => ({ put })));
    return { views: items.length, bytes: items.reduce((s, it) => s + it.gz.byteLength, 0), largest };
}

/**
 * The stored gzipped JSON of one view, or undefined before the first cycle wrote it.
 * @param store - the table holding the views
 * @param route - which view to read
 * @returns the gzipped bytes, or undefined when the view is not stored yet
 */
export async function readView(store: Store, route: ViewRoute): Promise<Uint8Array | undefined> {
    const item = await store.get(viewKey(route));
    return item?.gz instanceof Uint8Array ? item.gz : undefined;
}

/**
 * The payload of one stored view, parsed (the MCP server and tests; the read handler sends the bytes as they are).
 * @param store - the table holding the views
 * @param route - which view to read
 * @returns the parsed payload, or undefined when the view is not stored yet
 */
export async function readViewJson(store: Store, route: ViewRoute): Promise<unknown> {
    const gz = await readView(store, route);
    return gz && JSON.parse(gunzipSync(gz).toString("utf8"));
}
