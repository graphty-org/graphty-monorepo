/**
 * `AssetRecord.parts`, `supply`'s `use` for a missing part and `assets.rename`
 * (design/rendering/node-models.md section 14.4): the record lists a model's main file, the files
 * it names and the files nothing names; a file of the set whose name differs answers a missing
 * part; and the reader's name for a model is kept on its record and in the project file.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import { assetsMember, restoreAssets } from "../../src/session/assets/projectMember";
import { baseSession } from "../helpers/project-session";

const POLICE = new Uint8Array(readFileSync(new URL("../fixtures/models/police.glb", import.meta.url)));
const COLORMAP = new Uint8Array(readFileSync(new URL("../fixtures/models/Textures/colormap.png", import.meta.url)));
const PART = "Textures/colormap.png";

describe("assets.parts", () => {
    it("lists the main file and its picture, found, for a complete set", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({
            files: new Map([
                ["police.glb", POLICE],
                [PART, COLORMAP],
            ]),
        });
        assert.equal(record.state, "accepted");
        assert.deepEqual(record.parts, [
            { name: "police.glb", role: "model", state: "found", file: "police.glb" },
            { name: PART, role: "texture", state: "found", file: PART },
        ]);
    });

    it("lists a missing picture on a model waiting for it, and a file nothing names as unused", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({
            files: new Map([
                ["police.glb", POLICE],
                ["paint.png", COLORMAP],
            ]),
        });
        assert.equal(record.state, "rejected");
        assert.deepEqual(record.parts, [
            { name: "police.glb", role: "model", state: "found", file: "police.glb" },
            { name: PART, role: "texture", state: "missing" },
            { name: "paint.png", role: "other", state: "unused" },
        ]);
    });

    it("answers a missing picture with a file of the set by `use`, moving it to the part's name", async () => {
        const assets = createAssetsApi();
        const waiting = await assets.add({
            files: new Map([
                ["police.glb", POLICE],
                ["paint.png", COLORMAP],
            ]),
        });
        const accepted = await assets.supply(waiting.id, { name: PART, use: "paint.png" });
        assert.equal(accepted.state, "accepted");
        assert.deepEqual(
            accepted.parts?.map((p) => [p.name, p.state]),
            [
                ["police.glb", "found"],
                [PART, "found"],
            ],
        );
        assert.deepEqual([...assets.files(accepted.id).keys()].sort(), ["police.glb", PART].sort());
    });

    it("refuses a `use` of a file the set does not hold with E_BAD_COMMAND", async () => {
        const assets = createAssetsApi();
        const waiting = await assets.add(new File([POLICE], "police.glb"));
        const error = await assets.supply(waiting.id, { name: PART, use: "nothing.png" }).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
    });
});

describe("assets.rename", () => {
    it("names a record, clears the name on empty, and refuses an unknown ref", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({
            files: new Map([
                ["police.glb", POLICE],
                [PART, COLORMAP],
            ]),
        });
        assert.equal(assets.rename(record.id, "Cruiser").plainName, "Cruiser");
        assert.equal(assets.get(record.id)?.plainName, "Cruiser");
        assert.equal(assets.rename(record.id, "x".repeat(300)).plainName?.length, 256);
        assert.isUndefined(assets.rename(record.id, "").plainName);
        assert.throws(() => assets.rename("asset:nothing", "No"), /No model is held/);
    });

    it("keeps the name through the project file", async () => {
        const session = await baseSession();
        const record = await session.assets.add({
            files: new Map([
                ["police.glb", POLICE],
                [PART, COLORMAP],
            ]),
        });
        session.assets.rename(record.id, "Cruiser");
        await session.styles.add({
            name: "Cars",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": record.id },
        });
        const { member } = assetsMember(session);
        assert.isNotNull(member);

        const reopened = await baseSession();
        assert.deepEqual(
            await restoreAssets(reopened, JSON.parse(JSON.stringify(member)) as Record<string, unknown>),
            [],
        );
        assert.equal(reopened.assets.get(record.id)?.plainName, "Cruiser");
    });
});
