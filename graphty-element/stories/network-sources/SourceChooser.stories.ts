/**
 * @file A source chooser built from the catalog: every example every registered source lists on
 * its descriptor (`sourceDescriptors()` from `./catalog`), offered as the story's `example`
 * control by its readable name. The story loads the chosen one with
 * `session.data.loadExample(source, id)`, which brings its params, its endpoint and the login its
 * service publishes. graph-samples' datasets are not examples (they load with `loadDataset`).
 *
 * The control's labels and the words on the canvas are the story's: the catalog hands back data
 * (`plainName`, `counts`, `whole`), and an application decides how to show it. Recorded, an
 * example loads from the recordings in `fixtures/sources/`; any other says so and waits for `live`.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { sourceDescriptors } from "../../catalog.ts";
import { replayFetch, type SourceExample, type SourceLoadOptions } from "../../index.ts";
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

/** Every recording an example in the catalog can be answered from. */
const RECORDINGS = [
    ...ndexRecordings,
    ...openalexRecordings,
    ...stringRecordings,
    ...neo4jRecordings,
    ...depsDevRecordings,
];

/** A graph larger than this is drawn without labels: thousands of words would be unreadable. */
const LABEL_LIMIT = 100;

/** One example of the catalog, with the source that lists it. */
interface Choice {
    /** `<source>/<example id>`: example ids are unique only within their source. */
    readonly key: string;
    readonly source: string;
    readonly sourceName: string;
    readonly example: SourceExample;
}

/**
 * Every example in the catalog.
 * @returns The choices, in catalog order.
 */
function choices(): Choice[] {
    return sourceDescriptors().flatMap((info) =>
        (info.descriptor.examples ?? []).map((example) => ({
            key: `${info.id}/${example.id}`,
            source: info.id,
            sourceName: info.descriptor.plainName,
            example,
        })),
    );
}

/**
 * An example's size, as words.
 * @param choice - The example.
 * @returns The size, or "" when the catalog gives none.
 */
function size(choice: Choice): string {
    const { counts, whole } = choice.example;
    if (counts?.nodes === undefined) {
        return whole === false ? "part of a larger graph" : "";
    }
    const text = `${counts.nodes.toLocaleString("en-US")} nodes, ${(counts.edges ?? 0).toLocaleString("en-US")} edges`;
    return whole === false ? `part of ${text}` : text;
}

/**
 * The control's label for an example.
 * @param choice - The example.
 * @returns The label.
 */
function optionLabel(choice: Choice): string {
    const counts = size(choice);
    return `${choice.sourceName}: ${choice.example.plainName}${counts === "" ? "" : ` (${counts})`}`;
}

/**
 * The line drawn above the graph for an example.
 * @param choice - The example, if the control names one.
 * @returns The caption.
 */
function caption(choice: Choice | undefined): string {
    if (choice === undefined) {
        return "Choose an example with the example control.";
    }
    const counts = size(choice);
    return (
        `Catalog example "${choice.example.plainName}", from ${choice.sourceName}${counts === "" ? "" : ` (${counts})`}. ` +
        "Pick another with the example control."
    );
}

/** The story's controls: the example (`<source>/<id>`), and whether to ask the real service. */
interface ChooserArgs extends SourceArgs {
    readonly example: string;
}

const CHOICES = choices();

/** The least code that builds the same chooser on a page. */
const CODE = `import { sourceDescriptors } from "@graphty/graphty-element/catalog";

const graph = document.querySelector("graphty-element");
const select = document.querySelector("select");
for (const { id, descriptor } of sourceDescriptors()) {
    for (const example of descriptor.examples ?? []) {
        select.add(new Option(descriptor.plainName + ": " + example.plainName, id + "/" + example.id));
    }
}
select.onchange = () => {
    const [source, example] = select.value.split("/");
    graph.session.data.loadExample(source, example);
};`;
const BY_KEY = new Map(CHOICES.map((choice) => [choice.key, choice]));

const meta: Meta<ChooserArgs> = {
    title: "Data/Network sources/Source chooser",
    id: "network-sources-source-chooser",
    component: "graphty-element",
    tags: ["autodocs"],
    render: (args) => render(caption(BY_KEY.get(args.example))),
    argTypes: {
        example: {
            control: "select",
            options: CHOICES.map((choice) => choice.key),
            labels: Object.fromEntries(CHOICES.map((choice) => [choice.key, optionLabel(choice)])),
            description: "The catalog example to load",
        },
        live: { control: "boolean", description: "Ask the real service instead of its recordings" },
    },
    parameters: {
        controls: { include: ["example", "live"] },
        docs: {
            description: {
                component:
                    "Every example the registered network sources list in the catalog, offered as one control. " +
                    "Read them with `sourceDescriptors()` from `@graphty/graphty-element/catalog` and load one " +
                    "with `graph.session.data.loadExample(source, id)`.",
            },
        },
    },
};
export default meta;

/** Every example in the catalog, one control; STRING's TP53 partners chosen. */
export const Examples: StoryObj<ChooserArgs> = {
    args: { example: "rest/string-tp53", live: false },
    parameters: storyText({
        // the caption is drawn by the meta's render, from the chosen example
        caption: "",
        description:
            "A source chooser built from the catalog: every example that every registered source lists " +
            "(`sourceDescriptors()` from `@graphty/graphty-element/catalog`) is an option of the `example` " +
            "control, named by its `plainName` and sized by its `counts`. Choosing one loads it with " +
            "`session.data.loadExample(source, id)`, which brings the example's params, its address and " +
            "the login its service publishes, and draws it with labels from its `name`, `title` or `label`. " +
            "Recorded, the examples with a recording load offline; turn on `live` to fetch any of them " +
            "from its real service (the largest take a while).",
        use:
            "To offer a reader every public server the registered sources know about, without writing a " +
            "list of your own: a source you register with `examples` on its descriptor shows up here too.",
        code: CODE,
        controls:
            "`example` picks the catalog example to load; `live` fetches it from its real service instead " +
            "of the recordings, which also loads the examples that have no recording here.",
    }),
    play: async ({ canvasElement, args }) => {
        const { element, facts } = await parts(canvasElement);
        const choice = BY_KEY.get(args.example);
        await holds(choice !== undefined, `the catalog lists no example "${args.example}"`);
        if (choice === undefined) {
            return;
        }
        const nodes = choice.example.counts?.nodes ?? 0;
        if (nodes <= LABEL_LIMIT) {
            for (const field of ["label", "title", "name"]) {
                await element.session.styles.add(labelLayer(field));
            }
        }
        const options: SourceLoadOptions = args.live ? {} : { fetch: replayFetch(RECORDINGS) };
        facts.textContent = `loading ${choice.key}`;
        try {
            await element.session.data.loadExample(choice.source, choice.example.id, options);
            facts.textContent = `${choice.key}\n${loadFacts(element)}`;
        } catch (error) {
            facts.textContent = args.live
                ? `${choice.key}\n${errorFacts(error)}`
                : `${choice.key}: no recording of this example here; turn on live to fetch it from its service\n${errorFacts(error)}`;
        }
        // a large graph keeps its layout moving for a while; the reader watches it settle
        if (nodes <= LABEL_LIMIT) {
            await frameWithLabels(element);
        }
        if (args.example === "rest/string-tp53" && !args.live) {
            await holds(element.session.data.nodes().length === 21, "STRING's TP53 example loaded its 21 proteins");
        }
    },
};
