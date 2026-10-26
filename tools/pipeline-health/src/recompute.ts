// One collector cycle's derived data (design/ci/health-dashboard.md, section 10.3): the dirty 5-minute buckets and
// their parents recomputed from raw (never incremented), the SLA engine run on the rollups, every view rewritten
// (src/views), and the alerts the evaluation is due sent (section 13). The read Lambda answers only from the views.

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import { type AlertsResult, sendAlerts } from "./alerts/index.js";
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
    const rolled = await recompute(store, now);
    const evaluation = await evaluate(store, now);
    const views = await writeViews(store, now, SLAS, evaluation);
    const alerts = await sendAlerts({
        evaluation,
        store,
        now,
        getSecret: deps.getSecret ?? ssmSecret,
        fetch: deps.fetch ?? globalThis.fetch,
    });
    console.log(JSON.stringify({ alerts }));
    return { ...rolled, pages: views.views, alerts };
}
