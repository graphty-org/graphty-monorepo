/**
 * @file A source chooser built from the catalog: every sample every registered source lists on its
 * descriptor (`sourceDescriptors()` from `./catalog`), offered as the story's `sample` control by
 * its readable name. The story loads the chosen one by its id, `session.data.loadSample(id)`,
 * which brings its params, its endpoint and the login its service publishes.
 *
 * The control's labels and the words on the canvas are the story's: the catalog hands back data
 * (`plainName`, `counts`, `whole`), and an application decides how to show it. Recorded, a sample
 * loads from the recordings in `fixtures/sources/`, or, for graph-samples' datasets, from the
 * copies Storybook serves from graph-samples' build; any other says so and waits for `live`.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { sourceDescriptors } from "../../catalog.ts";
import { replayFetch, type SourceLoadOptions } from "../../index.ts";
import { holds } from "../assertions";
import depsDevRecordings from "../fixtures/sources/deps-dev-webpack.json";
import ndexRecordings from "../fixtures/sources/ndex-wp5483.json";
import neo4jRecordings from "../fixtures/sources/neo4j-movies-all.json";
import openalexRecordings from "../fixtures/sources/openalex-citing.json";
import stringRecordings from "../fixtures/sources/string-tp53.json";
import {
    errorFacts,
    frameWithLabels,
    labelLayer,
    loadFacts,
    parts,
    render,
    type SourceArgs,
    storyText,
} from "./shared";

/** Every recording a sample in the catalog can be answered from. */
const RECORDINGS = [
    ...ndexRecordings,
    ...openalexRecordings,
    ...stringRecordings,
    ...neo4jRecordings,
    ...depsDevRecordings,
];

/** Where graph-samples' datasets live, and where this Storybook serves its copies of them. */
const DATASETS_HOST = "https://graphty.app/data/graph-samples/v1/";
const DATASETS_HERE = "./graph-samples-data/v1/";

/** A graph larger than this is drawn without labels: thousands of words would be unreadable. */
const LABEL_LIMIT = 100;

/** One sample of the catalog, with the source that lists it. */
interface Choice {
    readonly source: string;
    readonly sourceName: string;
    readonly sample: NonNullable<ReturnType<typeof sourceDescriptors>[number]["descriptor"]["samples"]>[number];
}

/**
 * Every sample in the catalog.
 * @returns The choices, in catalog order.
 */
function choices(): Choice[] {
    return sourceDescriptors().flatMap((info) =>
        (info.descriptor.samples ?? []).map((sample) => ({
            source: info.id,
            sourceName: info.descriptor.plainName,
            sample,
        })),
    );
}

/**
 * A sample's size, as words.
 * @param choice - The sample.
 * @returns The size, or "" when the catalog gives none.
 */
function size(choice: Choice): string {
    const { counts, whole } = choice.sample;
    if (counts?.nodes === undefined) {
        return whole === false ? "part of a larger graph" : "";
    }
    const text = `${counts.nodes.toLocaleString("en-US")} nodes, ${(counts.edges ?? 0).toLocaleString("en-US")} edges`;
    return whole === false ? `part of ${text}` : text;
}

/**
 * The control's label for a sample.
 * @param choice - The sample.
 * @returns The label.
 */
function optionLabel(choice: Choice): string {
    const counts = size(choice);
    return `${choice.sourceName}: ${choice.sample.plainName}${counts === "" ? "" : ` (${counts})`}`;
}

/**
 * The line drawn above the graph for a sample.
 * @param choice - The sample, if the control names one.
 * @returns The caption.
 */
function caption(choice: Choice | undefined): string {
    if (choice === undefined) {
        return "Choose a sample with the sample control.";
    }
    const counts = size(choice);
    return (
        `Catalog sample "${choice.sample.plainName}", from ${choice.sourceName}${counts === "" ? "" : ` (${counts})`}. ` +
        "Pick another with the sample control."
    );
}

/** The story's controls: the sample, and whether to ask the real service. */
interface ChooserArgs extends SourceArgs {
    readonly sample: string;
}

/**
 * A fetch that answers from the recordings, and graph-samples' dataset requests from the copies
 * this Storybook serves.
 * @returns The fetch.
 */
function recordedFetch(): typeof fetch {
    const replay = replayFetch(RECORDINGS);
    return (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        return url.startsWith(DATASETS_HOST) ? localDataset(url.slice(DATASETS_HOST.length)) : replay(input, init);
    };
}

/**
 * One of graph-samples' dataset files from this Storybook, gzipped as graphty.app sends it. A
 * server that labels the file `Content-Encoding: gzip` has the browser unzip it on arrival, so
 * the bytes are zipped again when they no longer start with gzip's magic number.
 * @param file - The file's name.
 * @returns The response.
 */
async function localDataset(file: string): Promise<Response> {
    const response = await globalThis.fetch(DATASETS_HERE + file);
    if (!response.ok) {
        return response;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const zipped = bytes[0] === 0x1f && bytes[1] === 0x8b;
    const body = zipped
        ? bytes
        : await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    return new Response(body, { headers: { "content-type": "application/gzip" } });
}

const CHOICES = choices();

/** The least code that builds the same chooser on a page. */
const CODE = `import { sourceDescriptors } from "@graphty/graphty-element/catalog";

const graph = document.querySelector("graphty-element");
const select = document.querySelector("select");
for (const { descriptor } of sourceDescriptors()) {
    for (const sample of descriptor.samples ?? []) {
        select.add(new Option(descriptor.plainName + ": " + sample.plainName, sample.id));
    }
}
select.onchange = () => graph.session.data.loadSample(select.value);`;
const BY_ID = new Map(CHOICES.map((choice) => [choice.sample.id, choice]));

const meta: Meta<ChooserArgs> = {
    title: "Data/Network sources/Source chooser",
    id: "network-sources-source-chooser",
    component: "graphty-element",
    tags: ["autodocs"],
    render: (args) => render(caption(BY_ID.get(args.sample))),
    argTypes: {
        sample: {
            control: "select",
            options: CHOICES.map((choice) => choice.sample.id),
            labels: Object.fromEntries(CHOICES.map((choice) => [choice.sample.id, optionLabel(choice)])),
            description: "The catalog sample to load",
        },
        live: { control: "boolean", description: "Ask the real service instead of its recordings" },
    },
    parameters: {
        controls: { include: ["sample", "live"] },
        docs: {
            description: {
                component:
                    "Every sample the registered network sources list in the catalog, offered as one control. " +
                    "Read them with `sourceDescriptors()` from `@graphty/graphty-element/catalog` and load one " +
                    "with `graph.session.data.loadSample(id)`.",
            },
        },
    },
};
export default meta;

/** Every sample in the catalog, one control; STRING's TP53 partners chosen. */
export const Samples: StoryObj<ChooserArgs> = {
    args: { sample: "string-tp53", live: false },
    parameters: storyText({
        // the caption is drawn by the meta's render, from the chosen sample
        caption: "",
        description:
            "A source chooser built from the catalog: every sample that every registered source lists " +
            "(`sourceDescriptors()` from `@graphty/graphty-element/catalog`) is an option of the `sample` " +
            "control, named by its `plainName` and sized by its `counts`. Choosing one loads it with " +
            "`session.data.loadSample(id)`, which brings the sample's params, its address and the login " +
            "its service publishes, and draws it with labels from its `name`, `title` or `label`. " +
            "Recorded, the samples with a recording load offline; turn on `live` to fetch any of them " +
            "from its real service (the largest take a while).",
        use:
            "To offer a reader every ready-made network the registered sources know about, without writing " +
            "a list of your own: a source you register with `samples` on its descriptor shows up here too.",
        code: CODE,
        controls:
            "`sample` picks the catalog sample to load; `live` fetches it from its real service instead of " +
            "the recordings, which also loads the samples that have no recording here.",
    }),
    play: async ({ canvasElement, args }) => {
        const { element, facts } = await parts(canvasElement);
        const choice = BY_ID.get(args.sample);
        await holds(choice !== undefined, `the catalog lists no sample "${args.sample}"`);
        if (choice === undefined) {
            return;
        }
        const nodes = choice.sample.counts?.nodes ?? 0;
        if (nodes <= LABEL_LIMIT) {
            for (const field of ["label", "title", "name"]) {
                await element.session.styles.add(labelLayer(field));
            }
        }
        const options: SourceLoadOptions = args.live ? {} : { fetch: recordedFetch() };
        facts.textContent = `loading ${choice.sample.id}`;
        try {
            await element.session.data.loadSample(choice.sample.id, options);
            facts.textContent = `${choice.sample.id}\n${loadFacts(element)}`;
        } catch (error) {
            facts.textContent = args.live
                ? `${choice.sample.id}\n${errorFacts(error)}`
                : `${choice.sample.id}: no recording of this sample here; turn on live to fetch it from its service\n${errorFacts(error)}`;
        }
        // a large graph keeps its layout moving for a while; the reader watches it settle
        if (nodes <= LABEL_LIMIT) {
            await frameWithLabels(element);
        }
        if (args.sample === "string-tp53" && !args.live) {
            await holds(element.session.data.nodes().length === 21, "STRING's TP53 sample loaded its 21 proteins");
        }
    },
};
