import { assertDistinctPicture, assertGraphLoaded, drawn, holds, renderedElement } from "../../assertions";
import {
    afterLoadSource,
    algorithmMetaBase,
    CAT_NETWORK,
    documented,
    type Story,
    storySetup,
    waitForGraphSettled,
} from "../helpers";

/**
 * Algorithms / Link prediction. The story keeps the component id it had under Algorithms /
 * Combined, so its story id and screenshot do not change; Combined.stories.ts declares the Docs
 * page for that id, so this file declares none.
 */
const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Link prediction",
    id: "algorithms-combined",
    tags: ["!autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    `Link prediction scores the pairs of nodes that are not joined yet by how likely they are to ` +
                    `be joined next. Its result is a list of scored pairs, not a value on each node, so it suggests ` +
                    `no style: what to draw from it is the page's choice. The story draws ${CAT_NETWORK}.`,
            },
        },
    },
};
export default meta;

/** What the story paints the two ends of the most likely new link. */
const PREDICTED_COLOUR = "#d55e00";

/**
 * Link Prediction - the pair of unjoined nodes most likely to be joined next
 *
 * A prediction is a list of scored pairs, not a value on a node or an edge, so the run suggests no
 * style at all: a predicted link is an edge that does not exist yet. What to draw from it is the
 * reader's choice, and this story makes it: it reads the best pair off the result and paints its
 * two ends vermilion with a layer of its own, leaving every other node as it was.
 */
export const LinkPrediction: Story = {
    name: "Link prediction",
    ...documented(
        {
            args: {
                setup: storySetup({ algorithms: [], preSteps: 8000 }),
                runAlgorithmsOnLoad: false,
            },
            play: async ({ canvasElement }) => {
                await waitForGraphSettled(canvasElement);

                const { session } = await renderedElement(
                    canvasElement,
                    "LinkPrediction: no <graphty-element> rendered",
                );
                const layersBefore = session.styles.list().length;
                const result = await session.runs.start("link-prediction", { topK: 1 });
                const pairs = result.graph.pairs as readonly { source: string; target: string; score: number }[];
                const [best] = pairs;

                await holds(
                    pairs.length === 1 && best.score > 0,
                    `expected one scored pair, got ${JSON.stringify(pairs)}`,
                );
                await holds(
                    session.styles.list().length === layersBefore,
                    "a pair list suggests no style, so the run must add no layer by itself",
                );

                await session.styles.add({
                    name: "Most likely new link",
                    target: "node",
                    selector: { match: "ids", nodes: [best.source, best.target] },
                    set: { "node.color": PREDICTED_COLOUR },
                });

                const scene = await drawn(canvasElement, "Algorithms/Combined LinkPrediction");

                await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

                const painted = scene.nodes
                    .filter((node) => node.hex?.toLowerCase() === PREDICTED_COLOUR)
                    .map((node) => node.id);

                await holds(
                    [...painted].sort().join(",") === [best.source, best.target].sort().join(","),
                    `expected exactly ${best.source} and ${best.target} painted, drew ${painted.join(", ")}`,
                );
                await assertDistinctPicture(scene, "Algorithms/Combined");
            },
        },
        {
            caption:
                "The two cats not yet friends who are most likely to become friends next, by shared friends, are " +
                "painted orange. A prediction is a list of pairs, so the story paints them with a layer of its own.",
            code: afterLoadSource([
                'const result = await session.runs.start("link-prediction", { topK: 1 });',
                "const [best] = result.graph.pairs;",
                "await session.styles.add({",
                '    name: "Most likely new link",',
                '    target: "node",',
                '    selector: { match: "ids", nodes: [best.source, best.target] },',
                '    set: { "node.color": "#d55e00" },',
                "});",
            ]),
        },
    ),
};
