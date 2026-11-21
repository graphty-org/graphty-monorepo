/**
 * The fidelity story's lifecycle in a real browser: once `whenDone()` settles, a story that shows graphty-element's
 * screenshot has no graphty-element left on the page (it would go on drawing every frame and slow every later
 * screenshot, #4314), and the `live` one keeps its interactive canvas.
 */
import { assert, test } from "vitest";

import { sampleData, samplePictureUrls } from "../../../graphty-element/test/fidelity/load-sample";
import { ORACLE_IDS } from "../../../graphty-element/test/fidelity/oracle/oracle-library";
// A sample with no oracle: the oracle pictures are Git LFS files the browser shard does not fetch.
import sampleUrl from "../../test/corpus/styles/cx2/fidelity/imatinib-smpdb.cx2?url";
// A sheet whose image annotations name the cytoscape.js logo on raw.githubusercontent.com.
import picturesSheetUrl from "../../test/fidelity/specimens/cx2/specimen-images-charts-p4.cx2?url";
import { fidelityStory } from "./fidelity";

const SAMPLE = "cx2-imatinib-smpdb";

type Root = HTMLElement & { whenDone: () => Promise<void> };

for (const live of [false, true]) {
    test(`live ${String(live)}: ${live ? "keeps" : "removes"} the element once done`, async () => {
        // An oracle added for it would be an LFS pointer here, undecodable: pick another sample then.
        assert.notInclude(ORACLE_IDS, SAMPLE);
        const story = fidelityStory(SAMPLE, sampleUrl);
        // The story renders from its args alone; it reads nothing of Storybook's context.
        const render = story.render as unknown as (args: { live: boolean }) => Root;
        const root = render({ live });
        document.body.append(root);
        try {
            await root.whenDone();
            assert.notInclude(root.textContent, "Failed:");
            assert.strictEqual(root.querySelector("graphty-element") !== null, live);
        } finally {
            root.remove();
        }
    });
}

// raw.githubusercontent.com answering 503 once left the logo out of one of two captures of this sheet's story (#9247):
// the element loads exactly the picture the file names, so the file must name the committed copy, never the internet.
test("a sample's internet pictures load from their committed copies", async () => {
    const stored = new Uint8Array(await (await fetch(picturesSheetUrl)).arrayBuffer());
    const { sha256, data } = await sampleData(stored, false);
    const text = await data.text();
    const copies = samplePictureUrls();
    assert.isAbove(copies.size, 0);
    for (const [internet, copy] of copies) {
        assert.notInclude(text, internet);
        assert.include(text, copy);
        assert.notStrictEqual(new URL(copy).host, new URL(internet).host);
        const img = new Image();
        img.src = copy;
        await img.decode();
        assert.isAbove(img.naturalWidth, 0);
    }
    // the hash is still the stored file's, which the oracle's provenance names
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", stored));
    assert.strictEqual(sha256, [...digest].map((b) => b.toString(16).padStart(2, "0")).join(""));
});
