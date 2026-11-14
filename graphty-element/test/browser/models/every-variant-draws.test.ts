/**
 * Every model variant in test/fixtures/models/variants (manifest.json, written by generate.ts)
 * added, pictured and drawn in a real browser: each accepted variant's thumbnail is drawn and,
 * for a colored one, shows its color; each draws as a model on every node of a layer; a refused
 * variant is refused with its code; a variant that passes intake but cannot be read fails its
 * picture with a coded error and settles `failed`.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { operationQueueOf } from "../../../src/Graph";
import manifest from "../../fixtures/models/variants/manifest.json";
import { colorShare, drawnShare, type PictureColor } from "../../helpers/pictureFacts";
import { drawnAsModel, mount, nextModelEvent } from "./helpers";

/** Every fixture file, by its path below the variants folder. */
const URLS = import.meta.glob<string>("../../fixtures/models/variants/*/**", {
    query: "?url",
    import: "default",
    eager: true,
});

/** One manifest entry (see generate.ts). */
interface Variant {
    readonly id: string;
    readonly files: string[];
    readonly color: string;
    readonly refused: { code: string } | null;
    readonly needs?: string;
    readonly drawFails?: string[];
}

/**
 * A variant's files.
 * @param variant - The variant.
 * @returns path to bytes.
 */
async function filesOf(variant: Variant): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();
    for (const name of variant.files) {
        const url = URLS[`../../fixtures/models/variants/${variant.id}/${name}`];
        files.set(name, new Uint8Array(await (await fetch(url)).arrayBuffer()));
    }
    return files;
}

describe("every model variant draws", () => {
    it.each((manifest as Variant[]).map((v) => [v.id, v] as const))("%s", async (_id, variant) => {
        const element = await mount();
        const record = await element.session.assets.add(
            { files: await filesOf(variant) },
            variant.needs === undefined ? {} : { skipped: [variant.needs] },
        );
        if (variant.refused !== null) {
            assert.strictEqual(record.state, "rejected");
            assert.strictEqual(record.problems[0]?.code, variant.refused.code);
            return;
        }
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));

        const layer = {
            name: "Models",
            target: "node" as const,
            selector: { match: "everything" as const },
            set: { "node.model": record.id },
        };
        element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
        if (variant.drawFails !== undefined) {
            const { drawFails } = variant;
            const error = await element.modelThumbnail(record.id, { size: 96 }).catch((e: unknown) => e);
            assert.isTrue(isGraphtyError(error) && drawFails.includes(error.code), String(error));
            const failed = nextModelEvent(element, (change) => change.ref === record.id && change.state === "failed");
            await element.session.styles.add(layer);
            assert.include(drawFails, (await failed).problems[0]?.code);
            return;
        }

        const picture = await element.modelThumbnail(record.id, { size: 96 }).catch((error: unknown) => {
            throw new Error(isGraphtyError(error) ? `${error.code} ${JSON.stringify(error.details)}` : String(error));
        });
        assert.isAtLeast(await drawnShare(picture), 0.03, "the model is drawn");
        if (variant.color !== "any") {
            assert.isAtLeast(
                await colorShare(picture, variant.color as PictureColor),
                0.01,
                `it shows ${variant.color}`,
            );
        }

        const drawn = nextModelEvent(element, (change) => change.ref === record.id && change.state === "drawn");
        await element.session.styles.add(layer);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        for (const id of ["a", "b", "c"]) {
            assert.isTrue(drawnAsModel(element.graph, id), `${id} is drawn as the model`);
        }
    });
});
