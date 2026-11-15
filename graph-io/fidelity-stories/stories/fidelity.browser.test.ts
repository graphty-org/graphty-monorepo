/**
 * The fidelity story's lifecycle in a real browser: once `whenDone()` settles, a story that shows graphty-element's
 * screenshot has no graphty-element left on the page (it would go on drawing every frame and slow every later
 * screenshot, #4314), and the `live` one keeps its interactive canvas.
 */
import { assert, test } from "vitest";

import { ORACLE_IDS } from "../../../graphty-element/test/fidelity/oracle/oracle-library";
// A sample with no oracle: the oracle pictures are Git LFS files the browser shard does not fetch.
import sampleUrl from "../../test/corpus/styles/cx2/fidelity/imatinib-smpdb.cx2?url";
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
