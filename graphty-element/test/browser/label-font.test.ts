/**
 * Labels are drawn in the pinned test font, not in whatever the machine has installed.
 *
 * The browser setup registers the committed Inter file under the name "Verdana", the element's
 * default label font (`test/helpers/pin-label-font.ts`). If that registration stops happening,
 * each machine falls back to its own font and label pixels differ between hosts again (#234).
 */

import { assert, describe, it } from "vitest";

import { PINNED_LABEL_FONT_FAMILY, PINNED_LABEL_FONT_URL } from "../helpers/pin-label-font";

describe("the pinned label font", () => {
    it("is the face the page draws Verdana with", () => {
        const faces = [...document.fonts].filter((face) => face.family.replace(/"/g, "") === PINNED_LABEL_FONT_FAMILY);

        assert.lengthOf(faces, 1, "exactly one face is registered under the element's default label font");
        assert.strictEqual(faces[0].status, "loaded");
        assert.isTrue(document.fonts.check(`48px ${PINNED_LABEL_FONT_FAMILY}`), "Verdana is ready to draw");
        assert.match(PINNED_LABEL_FONT_URL, /inter-latin.*\.woff2/);
    });

    it("measures label text exactly as the committed file does", async () => {
        // The same file loaded under a name nothing else can have. A canvas measures with the face
        // the page resolves a family to, so the two widths agree only when "Verdana" resolves to
        // the committed file -- a host font of any other design measures differently.
        const probe = new FontFace("graphty-pinned-font-probe", `url(${PINNED_LABEL_FONT_URL})`, { weight: "100 900" });
        document.fonts.add(await probe.load());

        const ctx = document.createElement("canvas").getContext("2d");
        assert.isNotNull(ctx);

        const text = "Graphty label Wij 0123456789";
        ctx.font = `48px ${PINNED_LABEL_FONT_FAMILY}`;
        const asVerdana = ctx.measureText(text).width;
        ctx.font = "48px graphty-pinned-font-probe";
        const asCommittedFile = ctx.measureText(text).width;
        ctx.font = "48px serif";
        const asSerif = ctx.measureText(text).width;

        document.fonts.delete(probe);

        assert.strictEqual(asVerdana, asCommittedFile);
        assert.notStrictEqual(asCommittedFile, asSerif, "the probe itself resolved to a fallback font");
    });
});
