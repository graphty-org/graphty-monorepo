/**
 * @file `setDefaultPalettes` resolves a colour binding that names no palette when the layer is
 * written, so the layer (and a saved document) names the default; a late call logs, or with
 * `reapply` re-resolves, and never touches a layer that named its palette
 * (design/extensions/simple-tier.md section 4.5).
 */

import { afterAll, afterEach, assert, describe, it, vi } from "vitest";

import { clearRegisteredPalettesForTesting, definePalette, isGraphtyError } from "../../extend";
import type { LayerSpec } from "../../session";
import { GraphtyLogger } from "../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../src/logging/types.js";
import { createGraphSession } from "../../src/session";

definePalette({ id: "acme-groups", kind: "categorical", colors: ["#0B1D51", "#1B7F79", "#F2A65A"] });
definePalette({ id: "acme-ramp", kind: "sequential", colors: ["#E8F1FA", "#0B1D51"] });
definePalette({ id: "acme-split", kind: "diverging", colors: ["#0B1D51", "#FFFFFF", "#E07A1F"] });

afterAll(() => {
    clearRegisteredPalettesForTesting();
});

const SINK = "default-palettes-test";

/**
 * Collect the element's warnings.
 * @returns The records, filled as they are logged.
 */
async function listen(): Promise<LogRecord[]> {
    resetLoggingConfig();
    await GraphtyLogger.configure({ enabled: true, level: LogLevel.WARN });
    const records: LogRecord[] = [];
    GraphtyLogger.addSink({ name: SINK, write: (record) => records.push(record) });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    return records;
}

afterEach(() => {
    GraphtyLogger.removeSink(SINK);
    resetLoggingConfig();
    vi.restoreAllMocks();
});

/**
 * A layer colouring every node from a value.
 * @param name - The layer's name.
 * @param binding - The colour binding's scale, palette and midpoint.
 * @returns The layer.
 */
function colour(name: string, binding: Record<string, unknown>): LayerSpec {
    return {
        name,
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.value", ...binding } },
    };
}

/**
 * The palette each of the caller's layers' colour binding names, by layer name.
 * @param session - The session.
 * @returns Layer name to palette id (undefined when it names none).
 */
function palettes(session: ReturnType<typeof createGraphSession>): Record<string, unknown> {
    return Object.fromEntries(
        session.styles
            .list()
            .filter((layer) => !layer.locked)
            .map((layer) => {
                const binding = layer.encode?.["node.color"];
                return [layer.name, binding !== undefined && "by" in binding ? binding.palette : undefined];
            }),
    );
}

/**
 * The code a call was refused with.
 * @param call - The call.
 * @returns The code, or null when nothing was thrown.
 */
function refusal(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : String(error);
    }

    return null;
}

describe("setDefaultPalettes", () => {
    it("names the default of each kind in a binding that names none, when the layer is written", async () => {
        const session = createGraphSession();
        await session.styles.setDefaultPalettes({
            categorical: "acme-groups",
            sequential: "acme-ramp",
            diverging: "acme-split",
        });

        await session.styles.add(colour("groups", { scale: "ordinal" }));
        await session.styles.add(colour("amounts", { scale: "linear" }));
        await session.styles.add(colour("unscaled", {}));
        await session.styles.add(colour("centred", { scale: "linear", midpoint: 0 }));
        await session.styles.add(colour("named", { scale: "ordinal", palette: "okabe-ito" }));

        assert.deepStrictEqual(palettes(session), {
            groups: "acme-groups",
            amounts: "acme-ramp",
            unscaled: "acme-ramp",
            centred: "acme-split",
            named: "okabe-ito",
        });
        assert.include(JSON.stringify(session.styles.toDocument()), '"acme-groups"');
    });

    it("leaves a binding naming no palette as it was when no default is set", async () => {
        const session = createGraphSession();
        await session.styles.add(colour("groups", { scale: "ordinal" }));

        assert.deepStrictEqual(palettes(session), { groups: undefined });
    });

    it("logs a warning naming the layers, when called after layers took the previous default", async () => {
        const records = await listen();
        const session = createGraphSession();
        await session.styles.add(colour("early", { scale: "ordinal" }));
        await session.styles.add(colour("named", { scale: "ordinal", palette: "okabe-ito" }));
        const ids = Object.fromEntries(session.styles.list().map((layer) => [layer.name, layer.id]));

        await session.styles.setDefaultPalettes({ categorical: "acme-groups" });

        const warnings = records.filter((record) => record.level === LogLevel.WARN);
        assert.strictEqual(warnings.length, 1);
        assert.deepStrictEqual(warnings[0].data, { layerIds: [ids.early] });
        assert.deepStrictEqual(palettes(session), { early: undefined, named: "okabe-ito" }, "nothing is repainted");
    });

    it("re-resolves the layers that took the previous default with reapply, and no other", async () => {
        const records = await listen();
        const session = createGraphSession();
        await session.styles.add(colour("early", { scale: "ordinal" }));
        await session.styles.setDefaultPalettes({ categorical: "okabe-ito" });
        records.length = 0;
        await session.styles.add(colour("defaulted", { scale: "ordinal" }));
        await session.styles.add(colour("named", { scale: "ordinal", palette: "okabe-ito" }));
        await session.styles.add(colour("amounts", { scale: "linear" }));

        await session.styles.setDefaultPalettes({ categorical: "acme-groups" }, { reapply: true });

        assert.strictEqual(records.length, 0);
        assert.deepStrictEqual(palettes(session), {
            early: "acme-groups",
            defaulted: "acme-groups",
            named: "okabe-ito",
            amounts: undefined,
        });
    });

    it("rejects when a reapplied layer cannot be updated, and retries that layer on the next call", async () => {
        const session = createGraphSession();
        await session.styles.setDefaultPalettes({ categorical: "okabe-ito" });
        await session.styles.add(colour("defaulted", { scale: "ordinal" }));
        const refused = new Error("refused");
        const update = vi.spyOn(session.styles, "update").mockRejectedValueOnce(refused);

        let rejected: unknown = null;
        await session.styles
            .setDefaultPalettes({ categorical: "acme-groups" }, { reapply: true })
            .catch((error: unknown) => {
                rejected = error;
            });

        assert.strictEqual(rejected, refused);
        assert.deepStrictEqual(palettes(session), { defaulted: "okabe-ito" }, "the failed layer kept the old default");

        update.mockRestore();
        await session.styles.setDefaultPalettes({ categorical: "acme-groups" }, { reapply: true });

        assert.deepStrictEqual(
            palettes(session),
            { defaulted: "acme-groups" },
            "a later call still treats it as stale",
        );
    });

    it("refuses a palette it cannot use as the default of that kind", () => {
        const session = createGraphSession();

        assert.strictEqual(
            refusal(() => session.styles.setDefaultPalettes({ categorical: "acme-missing" })),
            "E_UNKNOWN_PALETTE",
        );
        assert.strictEqual(
            refusal(() => session.styles.setDefaultPalettes({ categorical: "acme-ramp" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            refusal(() => session.styles.setDefaultPalettes({ qualitative: "acme-groups" } as never)),
            "E_BAD_COMMAND",
        );
    });
});
