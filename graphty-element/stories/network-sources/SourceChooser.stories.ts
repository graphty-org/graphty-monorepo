/**
 * @file A source chooser built from the catalog: every sample every registered source lists on
 * its descriptor (`sourceDescriptors()` from `./catalog`), one button each, with the counts the
 * sample declares. Clicking one loads it by its id, `session.data.loadSample(id)`, which brings
 * its params, its endpoint and the login its service publishes.
 * The play function clicks NDEx's WikiPathways WP5483.
 *
 * The buttons, their order and their words are the story's: the catalog hands back data
 * (`plainName`, `counts`, `whole`), and an application decides how to show it. Recorded, only the
 * samples with a recording in `fixtures/sources/` load; the others print the replay's refusal.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { userEvent } from "storybook/test";

import { sourceDescriptors } from "../../catalog.ts";
import { replayFetch, type SourceLoadOptions } from "../../index.ts";
import { holds } from "../assertions";
import ndexRecordings from "../fixtures/sources/ndex-wp5483.json";
import openalexRecordings from "../fixtures/sources/openalex-citing.json";
import stringRecordings from "../fixtures/sources/string-tp53.json";
import { errorFacts, loadFacts, parts, render, type SourceArgs, sourceMeta } from "./shared";

/** Every recording a sample in the catalog can be answered from. */
const RECORDINGS = [...ndexRecordings, ...openalexRecordings, ...stringRecordings];

/** One button of the chooser. */
interface Choice {
    readonly source: string;
    readonly sample: NonNullable<ReturnType<typeof sourceDescriptors>[number]["descriptor"]["samples"]>[number];
}

/**
 * Every sample in the catalog.
 * @returns The choices, in catalog order.
 */
function choices(): Choice[] {
    return sourceDescriptors().flatMap((info) =>
        (info.descriptor.samples ?? []).map((sample) => ({ source: info.id, sample })),
    );
}

/**
 * The element, the facts line and a column of sample buttons.
 * @returns The story's root.
 */
function renderChooser(): HTMLElement {
    const graph = render();
    graph.style.flex = "1";
    graph.style.minWidth = "0";
    const list = document.createElement("div");
    list.dataset.role = "samples";
    list.style.cssText =
        "display: flex; flex-direction: column; gap: 4px; flex: 0 0 300px; overflow: auto; padding: 8px;";
    for (const { source, sample } of choices()) {
        const button = document.createElement("button");
        button.dataset.sample = sample.id;
        button.style.cssText = "text-align: left; font: 12px monospace;";
        const counts = sample.counts === undefined ? "" : ` (${String(sample.counts.nodes ?? "?")} nodes)`;
        button.textContent = `${source}: ${sample.plainName}${counts}${sample.whole === false ? ", part" : ""}`;
        list.append(button);
    }
    const root = document.createElement("div");
    root.style.cssText = "display: flex; width: 100%; height: 860px;";
    root.append(list, graph);
    return root;
}

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Network sources/Source chooser",
    render: renderChooser,
};
export default meta;

/** Every sample in the catalog; NDEx's WikiPathways WP5483 clicked. */
export const Samples: StoryObj<SourceArgs> = {
    args: { live: false },
    play: async ({ canvasElement, args }) => {
        const { element, facts } = await parts(canvasElement);
        const options: SourceLoadOptions = args.live ? {} : { fetch: replayFetch(RECORDINGS) };
        const byId = new Map(choices().map((choice) => [choice.sample.id, choice]));
        let loading: Promise<void> = Promise.resolve();
        for (const button of canvasElement.querySelectorAll<HTMLButtonElement>("[data-sample]")) {
            button.addEventListener("click", () => {
                const choice = byId.get(button.dataset.sample ?? "");
                if (choice === undefined) {
                    return;
                }
                facts.textContent = `loading ${choice.sample.id}`;
                loading = element.session.data.loadSample(choice.sample.id, options).then(
                    () => {
                        facts.textContent = `${choice.sample.id}\n${loadFacts(element)}`;
                    },
                    (error: unknown) => {
                        facts.textContent = `${choice.sample.id}\n${errorFacts(error)}`;
                    },
                );
            });
        }

        const wp5483 = canvasElement.querySelector<HTMLButtonElement>("[data-sample=ndex-wp5483]");
        await holds(wp5483 !== null, "the catalog lists no ndex-wp5483 sample");
        if (wp5483 !== null) {
            await userEvent.click(wp5483);
        }
        await loading;
        await element.waitForStableFrame();
        await holds(element.session.data.nodes().length === 57, "WP5483 loaded its 57 nodes");
    },
};
