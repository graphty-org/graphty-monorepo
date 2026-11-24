/**
 * `session.fonts` with no FontFace (Node): fonts are recorded, undone and saved in project and style
 * files, a family is taken once, and a document whose font data does not hash to its digest is
 * refused.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors/GraphtyError";
import { createGraphSession } from "../../src/session";
import { FONT_BYTE_LIMIT } from "../../src/session/fonts";

/** A WOFF2 signature and a few bytes. */
const FONT = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 1, 2, 3]);

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

describe("session.fonts without a page", () => {
    it("records a font, returns it again for the same bytes, and undoes the add", async () => {
        const session = createGraphSession();
        const record = await session.fonts.add(FONT, { family: "Node Font" });
        assert.strictEqual(record.format, "woff2");
        assert.deepEqual(await session.fonts.add(FONT, { family: "Node Font" }), record);
        assert.lengthOf(session.fonts.list(), 1);
        await session.undo();
        assert.deepEqual(session.fonts.list(), []);
        await session.redo();
        assert.deepEqual(session.fonts.list(), [record]);
        await session.fonts.remove("Node Font");
        assert.deepEqual(session.fonts.list(), []);
    });

    it("refuses a taken family, a file that is no font and one over the limit", async () => {
        const session = createGraphSession();
        await session.fonts.add(FONT, { family: "Node Font" });
        const other = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 9]);
        assert.strictEqual(await codeOf(session.fonts.add(other, { family: "NODE FONT" })), "E_FONT_FAMILY_TAKEN");
        assert.strictEqual(await codeOf(session.fonts.add(new Uint8Array([1, 2, 3, 4]))), "E_FONT_PARSE");
        const huge = {
            name: "huge.woff2",
            size: FONT_BYTE_LIMIT + 1,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        };
        assert.strictEqual(await codeOf(session.fonts.add(huge)), "E_FONT_TOO_LARGE");
    });

    it("names a font after its file, else after its digest", async () => {
        const session = createGraphSession();
        const file = {
            name: "Outfit.woff2",
            size: FONT.length,
            arrayBuffer: () => Promise.resolve(FONT.slice().buffer),
        };
        assert.strictEqual((await session.fonts.add(file)).family, "Outfit");
        const bare = await session.fonts.add(new Uint8Array([0, 1, 0, 0, 7]));
        assert.strictEqual(bare.format, "ttf");
        assert.strictEqual(bare.family, `Font ${bare.sha256.slice(0, 8)}`);
    });

    it("carries the font through a project file and a style document, one entry each", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const record = await session.fonts.add(FONT, { family: "Saved Font" });
        const saved = JSON.parse((await session.project.save()).text) as {
            members: { kind: string; fonts?: unknown[] }[];
        };
        const style = saved.members.find((member) => member.kind === "graphty-style");
        assert.lengthOf(style?.fonts ?? [], 1);

        const opened = createGraphSession();
        await opened.project.open(JSON.stringify(saved));
        assert.deepEqual(opened.fonts.list(), [record]);

        const document = session.styles.toDocument();
        assert.lengthOf(document.fonts ?? [], 1);
        const applied = createGraphSession();
        await applied.styles.applyTemplate(document);
        assert.deepEqual(applied.fonts.list(), [record]);
    });

    it("refuses a style document whose font does not hash to its digest", async () => {
        const session = createGraphSession();
        await session.fonts.add(FONT, { family: "Bad Font" });
        const document = session.styles.toDocument();
        const font = document.fonts?.[0];
        assert.isDefined(font);
        const bad = { ...document, fonts: [{ ...font, sha256: "0".repeat(64) }] };
        assert.strictEqual(await codeOf(createGraphSession().styles.applyTemplate(bad)), "E_BAD_DOCUMENT");
        const malformed = { ...document, fonts: [{ ...font, format: "pdf" }] } as never;
        assert.strictEqual(await codeOf(createGraphSession().styles.applyTemplate(malformed)), "E_BAD_COMMAND");
    });

    it("leaves no font behind when another project opens", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const plain = (await session.project.save()).text;
        await session.fonts.add(FONT, { family: "Gone Font" });
        await session.project.open(plain, { discard: true });
        assert.deepEqual(session.fonts.list(), []);
    });
});
