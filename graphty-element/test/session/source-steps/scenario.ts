/**
 * @file The reference model's scenario for the source-steps session tests: a transactions file,
 * its accounts, merchants and devices, bank B and KYC alerts, and the phases that build on them.
 */

import { assert } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

export const TRANSACTIONS = [
    "txn_id,account_id,merchant_id,amount,holder_name,merchant_name,category,device_id,os",
    "T-1,A-1,M-1,10,Ann,Shop,food,D-1,ios",
    "T-2,A-1,M-2,20,Ann,Cafe,food,D-1,ios",
    "T-3,A-2,M-1,5,Bo,Shop,food,,",
    "T-4,A-3,M-3,7,Cy,Cash,atm,D-2,android",
].join("\n");

export const ACCOUNTS = ["account_id,holder,email,opened", "A-1,Ann,a@x,2020", "A-2,Bob,b@x,2021", "A-9,Dee,d@x,2022"].join(
    "\n",
);

export const MERCHANTS = ["merchant_id,city", "M-1,Oslo", "M-2,Bergen"].join("\n");

export const BANK_B = ["txn_id,account_id,merchant_id,amount", "X-1,A-1,M-1,4", "X-2,B-7,M-9,6"].join("\n");

/** The column the transactions read their source end from. */
export const ACCOUNT = "account_id";

export const KYC = ["alert_id,account_id,score", "K-0,A-1,5", "K-1,A-2,3", "K-2,A-77,1"].join("\n");

/**
 * Assert that a call is refused with a code.
 * @param call - The call.
 * @param code - The code.
 * @returns The error's details.
 */
export async function refused(call: () => Promise<unknown>, code: string): Promise<Record<string, unknown>> {
    let caught: unknown = null;
    try {
        await call();
    } catch (error) {
        caught = error;
    }
    assert.strictEqual((caught as { code?: string } | null)?.code, code);
    return (caught as { details?: Record<string, unknown> }).details ?? {};
}

/**
 * Load an edge file under the experiment.
 * @param session - The session.
 * @param data - The CSV.
 * @param name - Its name.
 * @param mode - `"merge"` to add it beside what is loaded.
 * @returns The source's id.
 */
export async function edgeFile(session: GraphSession, data: string, name: string, mode?: "merge"): Promise<string> {
    await session.data.import(
        { type: "csv", config: { data }, name },
        {
            ...(mode === undefined ? {} : { mode }),
            edges: {
                from: { column: "account_id", space: "account" },
                to: { column: "merchant_id", space: "merchant" },
                id: "txn_id",
            },
        },
    );
    return session.data.sources().at(-1)?.key ?? "";
}

/**
 * Phase 1: the transactions draw at once, their ends typed by end rules.
 * @param session - The session to load into; a fresh one with the experiment on by default.
 * @returns The session and the transactions' source.
 */
export async function phase1(
    session: GraphSession = createGraphSession({ features: ["source-steps"] }),
): Promise<{ session: GraphSession; t: string }> {
    const t = await edgeFile(session, TRANSACTIONS, "transactions.csv");
    await session.data.declareType({ name: "account", kind: "node", rules: [{ source: t, end: "source" }] });
    await session.data.declareType({ name: "merchant", kind: "node", rules: [{ source: t, end: "target" }] });
    await session.data.declareType({ name: "transfer", kind: "edge", rules: [{ source: t }] });
    return { session, t };
}

/**
 * Phase 2: holder onto accounts, merchant fields onto merchants, devices extracted.
 * @param into - The session to load into, as {@link phase1} takes it.
 * @returns The session, the transactions' source and the devices' part.
 */
export async function phase2(into?: GraphSession): Promise<{ session: GraphSession; t: string; part: number }> {
    const { session, t } = await phase1(into);
    await session.data.moveColumns(t, { columns: ["holder_name"], to: "source" });
    await session.data.moveColumns(t, { columns: ["merchant_name", "category"], to: "target" });
    const part = await session.data.extract(t, { column: "device_id", type: "device", columns: ["os"] });
    await session.data.declareType({ name: "used", kind: "edge", rules: [{ source: t, part }] });
    return { session, t, part };
}

/**
 * Phase 6: holder renamed so the columns meet, accounts.csv staged and merged on account_id.
 * @param unmatchedFrom - What an account no transaction names does.
 * @param into - The session to load into, as {@link phase1} takes it.
 * @returns The session and the two sources.
 */
export async function phase6(
    unmatchedFrom?: "keep" | "drop",
    into?: GraphSession,
): Promise<{ session: GraphSession; t: string; a: string }> {
    const { session, t } = await phase2(into);
    await session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    const a = await session.data.stage(
        { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
        { key: "account_id", type: "account" },
    );
    await session.data.merge({
        from: { source: a, field: "account_id" },
        into: { space: "account" },
        ...(unmatchedFrom === undefined ? {} : { unmatchedFrom }),
    });
    return { session, t, a };
}

/**
 * Merchants merged, then bank B staged and added with no join.
 * @returns The session and the sources.
 */
export async function full(): Promise<{ session: GraphSession; t: string; a: string; m: string; b: string }> {
    const r = await phase6();
    const { session } = r;
    const m = await session.data.stage(
        { type: "csv", config: { data: MERCHANTS }, name: "merchants.csv" },
        { key: "merchant_id", type: "merchant" },
    );
    await session.data.merge({ from: { source: m, field: "merchant_id" }, into: { space: "merchant" } });
    const b = await edgeFile(session, BANK_B, "bankB.csv", "merge");
    return { ...r, m, b };
}

/**
 * How many nodes of each space the graph holds.
 * @param session - The session.
 * @returns Nodes by space.
 */
export function spaces(session: GraphSession): Record<string, number> {
    return Object.fromEntries(session.data.spaces().map((s) => [s.space, s.nodes]));
}

/**
 * The NodeIds of an edge's ends.
 * @param session - The session.
 * @returns `source>target` for every edge.
 */
export function ends(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((e) => `${String(e.source)}>${String(e.target)}`)
        .sort();
}
