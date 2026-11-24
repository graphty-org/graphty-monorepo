/**
 * `session.fonts` in a browser: an uploaded font is a face on the page, a label drawn in its family
 * before it arrived is rebuilt, and a project file carries it to a fresh session that has the face
 * before its first label is built.
 */

import type { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, expect, it } from "vitest";

import { isGraphtyError } from "../../src/errors/GraphtyError";
import { noteLabelFont, watchFontLoads } from "../../src/meshes/labelFonts";
import { createGraphSession } from "../../src/session";
import interLatin from "../fonts/inter-latin.woff2?url";

/**
 * The committed Inter file's bytes.
 * @returns The bytes.
 */
async function interBytes(): Promise<Uint8Array> {
    return new Uint8Array(await (await fetch(interLatin)).arrayBuffer());
}

/**
 * The width a canvas measures a string at in a family.
 * @param family - The family.
 * @returns The width, in pixels.
 */
function widthIn(family: string): number {
    const ctx = document.createElement("canvas").getContext("2d");
    assert.isNotNull(ctx);
    ctx.font = `48px "${family}", monospace`;
    return ctx.measureText("Graphty label Wij 0123456789").width;
}

/**
 * The code a promise rejects with.
 * @param promise - The promise.
 * @returns The code.
 */
async function codeOf(promise: PromiseLike<unknown>): Promise<string> {
    try {
        await promise;
    } catch (error) {
        return isGraphtyError(error) ? error.code : String(error);
    }

    return "resolved";
}

describe("session.fonts", () => {
    it("puts an added font on the page, once per bytes and family", async () => {
        const session = createGraphSession();
        const bytes = await interBytes();
        const record = await session.fonts.add(bytes, { family: "Fonts Test Inter" });
        await session.styles.settled();

        assert.deepEqual(session.fonts.list(), [record]);
        assert.strictEqual(record.format, "woff2");
        assert.strictEqual(record.byteLength, bytes.length);
        assert.isTrue([...document.fonts].some((face) => face.family.includes("Fonts Test Inter")));
        assert.notStrictEqual(widthIn("Fonts Test Inter"), widthIn("no such family"));

        assert.deepEqual(await session.fonts.add(bytes, { family: "Fonts Test Inter" }), record);
        assert.lengthOf(session.fonts.list(), 1);
        session.dispose();
    });

    it("names a File's family after its name", async () => {
        const session = createGraphSession();
        const file = new File([await (await fetch(interLatin)).arrayBuffer()], "Fonts Test Named.woff2");
        assert.strictEqual((await session.fonts.add(file)).family, "Fonts Test Named");
        session.dispose();
    });

    it("refuses a taken family and bytes that are not a font", async () => {
        const session = createGraphSession();
        await session.fonts.add(await interBytes(), { family: "Fonts Test Taken" });
        const other = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 9, 9, 9, 9]);
        assert.strictEqual(
            await codeOf(session.fonts.add(other, { family: "fonts test taken" })),
            "E_FONT_FAMILY_TAKEN",
        );
        assert.strictEqual(await codeOf(session.fonts.add(other, { family: "Fonts Test Bad" })), "E_FONT_PARSE");
        assert.strictEqual(
            await codeOf(session.fonts.add(new Uint8Array([1, 2, 3, 4, 5]), { family: "Fonts Test Junk" })),
            "E_FONT_PARSE",
        );
        assert.lengthOf(session.fonts.list(), 1);
        session.dispose();
    });

    it("rebuilds a label drawn in the family before the font arrived", async () => {
        const session = createGraphSession();
        const scene = {} as Scene;
        const rebuilt: string[] = [];
        const stop = watchFontLoads(scene, (families) => rebuilt.push(...families));
        // The page has no face for it, so `check` answers true and it is recorded as loaded.
        noteLabelFont(scene, "normal", '"Fonts Test Late"');
        const before = widthIn("Fonts Test Late");

        await session.fonts.add(await interBytes(), { family: "Fonts Test Late" });
        await expect.poll(() => rebuilt).toContain("fonts test late");
        assert.notStrictEqual(widthIn("Fonts Test Late"), before, "the rebuilt label measures in the new face");
        stop();
        session.dispose();
    });

    it("takes the font off again on undo", async () => {
        const session = createGraphSession();
        await session.fonts.add(await interBytes(), { family: "Fonts Test Undo" });
        await session.undo();
        await session.styles.settled();
        assert.deepEqual(session.fonts.list(), []);
        assert.isFalse([...document.fonts].some((face) => face.family.includes("Fonts Test Undo")));
        session.dispose();
    });

    it("saves the font in the project file and has its face before a fresh session's first label", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const record = await session.fonts.add(await interBytes(), { family: "Fonts Test Saved" });
        const { text } = await session.project.save();
        const saved = JSON.parse(text) as { members: { kind: string; fonts?: { data: string }[] }[] };
        const fonts = saved.members.flatMap((member) => (member.kind === "graphty-style" ? (member.fonts ?? []) : []));
        assert.lengthOf(fonts, 1);
        assert.match(fonts[0].data, /^[A-Za-z0-9+/]+=*$/);

        // A face this test added is taken off the page first, so the open has to put it back.
        for (const face of [...document.fonts].filter((each) => each.family.includes("Fonts Test Saved"))) {
            document.fonts.delete(face);
        }

        const opened = createGraphSession();
        await opened.project.open(text);
        await opened.styles.settled();
        assert.deepEqual(opened.fonts.list(), [record]);
        assert.isTrue([...document.fonts].some((face) => face.family.includes("Fonts Test Saved")));
        session.dispose();
        opened.dispose();
    });
});
