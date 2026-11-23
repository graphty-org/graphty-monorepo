/**
 * Every model variant in babylonjs-models/test/fixtures/variants (manifest.json, written by generate.ts)
 * added, pictured and drawn in a real browser: each accepted variant's thumbnail is drawn and,
 * for a colored one, shows its color; each draws as a model on every node of a layer; a refused
 * variant is refused with its code; a variant that passes intake but cannot be read fails its
 * picture with a coded error and settles `failed`.
 */

import { unzipSync } from "fflate";
import { assert, describe, it } from "vitest";

import manifest from "../../../../babylonjs-models/test/fixtures/variants/manifest.json";
import { isGraphtyError } from "../../../src/errors";
import { operationQueueOf } from "../../../src/Graph";
import { colorRow, colorShare, differingShare, drawnShare, type PictureColor } from "../../helpers/pictureFacts";
import { drawnAsModel, mount, nextModelEvent } from "./helpers";

/** Every fixture file, by its path below the variants folder. */
const URLS = import.meta.glob<string>("../../../../babylonjs-models/test/fixtures/variants/*/**", {
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
    readonly upright?: { readonly top: PictureColor; readonly bottom: PictureColor };
}

/**
 * A variant's files.
 * @param variant - The variant.
 * @returns path to bytes.
 */
async function filesOf(variant: Variant): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();
    for (const name of variant.files) {
        const url = URLS[`../../../../babylonjs-models/test/fixtures/variants/${variant.id}/${name}`];
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
        if (variant.upright !== undefined) {
            const { top, bottom } = variant.upright;
            const [topRow, bottomRow] = [await colorRow(picture, top), await colorRow(picture, bottom)];
            assert.isBelow(
                topRow,
                bottomRow,
                `${top} (row ${String(topRow)}) is drawn above ${bottom} (row ${String(bottomRow)})`,
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

    // The KTX2 sample's colors are not one strong color, so it is checked against the same cube
    // with no texture: a texture that is not transcoded and drawn leaves the bare white cube.
    it("a KTX2 texture is drawn, not left out", async () => {
        const variant = (manifest as Variant[]).find((v) => v.id === "gltf-ktx2") as Variant;
        const files = await filesOf(variant);
        const json = JSON.parse(new TextDecoder().decode(files.get("cube.gltf"))) as {
            materials: { pbrMetallicRoughness: Record<string, unknown> }[];
        };
        delete json.materials[0].pbrMetallicRoughness.baseColorTexture;
        const bare = new Map(files);
        bare.set("cube.gltf", new TextEncoder().encode(JSON.stringify(json)));
        const element = await mount();
        const textured = await element.session.assets.add({ files });
        const plain = await element.session.assets.add({ files: bare });
        assert.strictEqual(textured.state, "accepted", JSON.stringify(textured.problems));
        assert.strictEqual(plain.state, "accepted", JSON.stringify(plain.problems));
        const pictures = [
            await element.modelThumbnail(textured.id, { size: 96 }),
            await element.modelThumbnail(plain.id, { size: 96 }),
        ] as const;
        assert.isAtLeast(await differingShare(...pictures), 0.03, "the texture changes the picture");
    });

    it("refuses an unbundled SOG (Gaussian splats) whose meta file has another name", async () => {
        const sog = (manifest as Variant[]).find((v) => v.id === "sog") as Variant;
        const [bundle] = (await filesOf(sog)).values();
        const files = new Map<string, Uint8Array>(Object.entries(unzipSync(bundle)));
        files.set("scene.json", files.get("meta.json") as Uint8Array);
        files.delete("meta.json");
        const element = await mount();
        const record = await element.session.assets.add({ files });
        assert.strictEqual(record.state, "rejected");
        assert.deepInclude(record.problems[0], { code: "E_MODEL_FORMAT_UNSUPPORTED" });
        assert.strictEqual(record.problems[0]?.params.format, "sog");
    });
});
