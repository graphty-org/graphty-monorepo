// One collector cycle's derived data (design/ci/health-dashboard.md, section 10.3): the dirty 5-minute buckets and
// their parents recomputed from raw (never incremented), the SLA engine run on the rollups, every view rewritten
// (src/views), and the alerts the evaluation is due sent (section 13). The read Lambda answers only from the views.

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import { type AlertsResult, sendAlerts } from "./alerts/index.js";
import { dirtyKey, floorTo, MIN, REFOLD_MS } from "./model/items.js";
import { FOLD_VERSION } from "./model/metrics.js";
import { getCursor, recordSource, setCursor } from "./model/raw.js";
import { recompute } from "./model/rollup.js";
import type { Store } from "./model/store.js";
import { SLAS } from "./sla/config.js";
import { evaluate } from "./sla/engine.js";
import { writeViews } from "./views/index.js";

let ssm: SSMClient | undefined;

/**
 * An SSM SecureString, decrypted; undefined when the parameter does not exist.
 * @param name - the parameter name
 * @returns the decrypted value, or undefined when it does not exist
 */
export async function ssmSecret(name: string): Promise<string | undefined> {
    try {
        ssm ??= new SSMClient({});
        const out = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
        return out.Parameter?.Value;
    } catch (err) {
        if ((err as Error)?.name === "ParameterNotFound") {
            return undefined;
        }
        throw err;
    }
}

/**
 * Marks every 5-minute bucket of the last REFOLD_MS dirty once per FOLD_VERSION, so items stored before a fold
 * changed (ci.full_shard_time's budget) are folded again; recompute drains the marks newest first over later cycles.
 * @param store - the table
 * @param now - the cycle's time, epoch ms
 * @returns the buckets marked
 */
export async function refold(store: Store, now: number): Promise<number> {
    if ((await getCursor(store, "fold-version")) === FOLD_VERSION) {
        return 0;
    }
    // ponytail: marks every bucket (8064), not only those holding shard runs; a key-per-kind index if folds change often.
    const ops = [];
    for (let t = floorTo(now - REFOLD_MS, "5m"); t <= now; t += 5 * MIN) {
        ops.push({ put: { ...dirtyKey(t), start: t, markedAt: now } });
    }
    await store.batch(ops);
    await setCursor(store, "fold-version", FOLD_VERSION, now);
    return ops.length;
}

export interface RecomputeDeps {
    getSecret?: (name: string) => Promise<string | undefined>;
    fetch?: typeof globalThis.fetch;
}

/**
 * Recomputes the rollups, judges every member, rewrites every view and sends the alerts due.
 * @param store - the table
 * @param now - the cycle's time, epoch ms
 * @param deps - the SSM getter and fetch the alerts use (SSM and global fetch by default)
 * @returns what it did, for the log
 */
export async function recomputeAll(
    store: Store,
    now: number,
    deps: RecomputeDeps = {},
): Promise<{ buckets: number; items: number; pages: number; alerts: AlertsResult }> {
    // A background re-mark: its failure is logged and retried next cycle, never a reason to skip the live hour.
    await refold(store, now).catch((err: unknown) => {
        console.error(JSON.stringify({ refold: String(err) }));
    });
    const rolled = await recompute(store, now);
    const evaluation = await evaluate(store, now);
    // Alerts before the pages: a cycle whose pages fail still pages the owner, and the "views" write time ages
    // data.collector, so pages that keep failing page too.
    const alerts = await sendAlerts({
        evaluation,
        store,
        now,
        getSecret: deps.getSecret ?? ssmSecret,
        fetch: deps.fetch ?? globalThis.fetch,
    });
    console.warn(JSON.stringify({ alerts }));
    let views: Awaited<ReturnType<typeof writeViews>>;
    try {
        views = await writeViews(store, now, SLAS, evaluation);
    } catch (err) {
        await recordSource(store, "views", now, { ok: false, error: String(err) });
        throw err;
    }
    await recordSource(store, "views", now, { ok: true });
    return { ...rolled, pages: views.views, alerts };
}
