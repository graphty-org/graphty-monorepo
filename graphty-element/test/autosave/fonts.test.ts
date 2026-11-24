/**
 * An uploaded font's bytes are kept in an autosave entry's `asset:<sha256>` part, once, never in
 * the `rest` part a style change rewrites; reassembly puts them back where `project.save()` writes
 * them.
 */

import { assert, describe, it } from "vitest";

import { buildParts, EVERY_PART, reassemble } from "../../src/autosave/parts";
import { baseSession } from "../helpers/project-session";

/** A WOFF2 signature and a few bytes: all a session with no FontFace reads. */
const FONT = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 5, 6, 7, 8, 9]);

describe("autosave parts and uploaded fonts", () => {
    it("keeps a font's bytes in one asset part and puts them back on reassembly", async () => {
        const session = await baseSession();
        const font = await session.fonts.add(FONT, { family: "Autosave Font" });
        const { parts } = buildParts(session, new Set(EVERY_PART), new Map(), new Map());

        const assetParts = Object.keys(parts).filter((name) => name.startsWith("asset:"));
        assert.deepEqual(assetParts, [`asset:${font.sha256}`]);
        const rest = JSON.parse(parts.rest ?? "{}") as { style: { fonts: Record<string, unknown>[] } };
        assert.deepEqual(rest.style.fonts, [
            { family: "Autosave Font", sha256: font.sha256, format: "woff2", byteLength: 9 },
        ]);

        const textParts = Object.fromEntries(
            Object.entries(parts).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        );
        const document = reassemble({ id: "x", runs: [] } as never, textParts);
        const style = (document.members as Record<string, unknown>[]).find((member) => member.kind === "graphty-style");
        const saved = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        const savedStyle = saved.members.find((member) => member.kind === "graphty-style");
        assert.deepEqual(style?.fonts, savedStyle?.fonts);

        // Written once: a later build that knows the part is stored writes it again never.
        const again = buildParts(session, new Set(["rest"]), new Map(), new Map(), new Set([font.sha256]));
        assert.notProperty(again.parts, `asset:${font.sha256}`);
        assert.isTrue(again.assets?.has(font.sha256));
    });
});
