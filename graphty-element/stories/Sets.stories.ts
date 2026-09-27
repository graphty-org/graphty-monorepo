/**
 * Kept sets painted by style layers, and shown by the visibility filter.
 *
 * A kept set is a named group of nodes the session holds (`element.session.sets`). A style layer
 * paints one with the selector `{ match: "scope", scope: { set: id } }`, and from then on the
 * layer follows the set: redefine it, combine it, or change the data a rule set reads, and the
 * picture moves with it. Colouring a set is an ordinary layer -- a set has no colour of its own.
 * The visibility filter names a set with the leaf `{ kind: "scope", scope: { set: id } }` and
 * follows it the same way. A live layout lays out one set with `setLayout(type, options, { scope })`
 * and holds every other node where it is.
 *
 * Each story builds its sets and layers in its play function, through the element's session, and
 * then reads back what every node is drawn.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec, SetId } from "../src/catalog/types";
// Importing the module is what defines the <graphty-element> custom element, so this line is
// load-bearing even though only the type is named.
import { type Graphty } from "../src/graphty-element";
import { assertDrawnColour, assertGraphLoaded, assertNodesShown, drawn, holds } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

/** Eight nodes on a ring, each with a score. */
const NODES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `n${String(n)}`, score: n }));

/** The ring. */
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % NODES.length].id }));

/** The colour the element's own base layer paints every node. */
const BASE = "#6366f1";

/**
 * Build the element: the ring, laid out the same way every time.
 * @returns The element.
 */
function render(): Element {
    const element = document.createElement("graphty-element") as Graphty;
    setLayoutPreSteps(element, 2000);
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    return element;
}

const meta: Meta = {
    title: "Sets/Kept Sets",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: { delay: 800 },
    },
};
export default meta;

type Story = StoryObj;

/**
 * The element once its graph has settled.
 * @param canvasElement - Where the story rendered.
 * @returns The element.
 */
async function settled(canvasElement: HTMLElement): Promise<Graphty> {
    await waitForGraphSettled(canvasElement);

    return canvasElement.querySelector("graphty-element") as Graphty;
}

/**
 * A layer painting a kept set one colour.
 * @param name - The layer's name.
 * @param set - The set.
 * @param color - The colour.
 * @returns The layer.
 */
function paintSet(name: string, set: SetId, color: string): LayerSpec {
    return { name, selector: { match: "scope", scope: { set } }, set: { "node.color": color } };
}

/**
 * Expected colours: the named nodes in their colours, every other node in the base colour.
 * @param painted - Node id to colour.
 * @returns Every node's colour.
 */
function expecting(painted: Readonly<Record<string, string>>): Record<string, string> {
    return Object.fromEntries(NODES.map((node) => [node.id, painted[node.id] ?? BASE]));
}

/** One set, painted red: its members and nothing else. */
export const ColorASet: Story = {
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const { sets, styles } = element.session;
        const suspects = sets.create({ kind: "fixed", nodes: ["n2", "n4", "n6"], reading: "induced" }, { name: "Suspects" });
        await styles.add(paintSet("Suspects", suspects, "#e53935"));

        const scene = await drawn(canvasElement, "Sets/Kept Sets ColorASet");
        await assertGraphLoaded(scene, { nodes: 8, edges: 8 });
        await assertDrawnColour(scene, expecting({ n2: "#e53935", n4: "#e53935", n6: "#e53935" }));
    },
};

/**
 * Two sets combined three ways, each result painted: the union at the bottom, then what only the
 * first holds, then what both hold. n1 and n2 are only in A, n3 and n4 in both, n5 and n6 only in B.
 */
export const CombineTwoSets: Story = {
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const { sets, styles } = element.session;
        const a = sets.create({ kind: "fixed", nodes: ["n1", "n2", "n3", "n4"], reading: "induced" }, { name: "A" });
        const b = sets.create({ kind: "fixed", nodes: ["n3", "n4", "n5", "n6"], reading: "induced" }, { name: "B" });
        const union = await sets.combine("union", [{ set: a }, { set: b }], { name: "A or B" });
        const difference = await sets.combine("difference", [{ set: a }, { set: b }], { name: "A but not B" });
        const intersection = await sets.combine("intersection", [{ set: a }, { set: b }], { name: "A and B" });
        await styles.add(paintSet("A or B", union, "#43a047"));
        await styles.add(paintSet("A but not B", difference, "#fb8c00"));
        await styles.add(paintSet("A and B", intersection, "#8e24aa"));

        const scene = await drawn(canvasElement, "Sets/Kept Sets CombineTwoSets");
        await assertGraphLoaded(scene, { nodes: 8, edges: 8 });
        await assertDrawnColour(
            scene,
            expecting({ n1: "#fb8c00", n2: "#fb8c00", n3: "#8e24aa", n4: "#8e24aa", n5: "#43a047", n6: "#43a047" }),
        );
    },
};

/**
 * A rule set, `score > 5`, follows the data: raising n1's score adds it to the set, and the layer
 * paints it without being touched.
 */
export const RuleSetFollowsData: Story = {
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const { sets, styles } = element.session;
        const high = sets.create({ kind: "rule", where: "data.score > `5`", reading: "induced" }, { name: "High scores" });
        await styles.add(paintSet("High scores", high, "#1e88e5"));

        const before = await drawn(canvasElement, "Sets/Kept Sets RuleSetFollowsData, before");
        await assertDrawnColour(before, expecting({ n6: "#1e88e5", n7: "#1e88e5", n8: "#1e88e5" }));

        await element.updateNodes([{ id: "n1", score: 9 }]);

        const after = await drawn(canvasElement, "Sets/Kept Sets RuleSetFollowsData");
        await assertDrawnColour(after, expecting({ n1: "#1e88e5", n6: "#1e88e5", n7: "#1e88e5", n8: "#1e88e5" }));
    },
};

/**
 * The visibility filter shows one set, and follows it: redefining the set moves what is on
 * screen with no new filter.
 */
export const FilterToASet: Story = {
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const { sets, visibility } = element.session;
        const focus = sets.create({ kind: "fixed", nodes: ["n1", "n2", "n3"], reading: "induced" }, { name: "Focus" });
        await visibility.set({ kind: "scope", scope: { set: focus } });

        const before = await drawn(canvasElement, "Sets/Kept Sets FilterToASet, before");
        await assertGraphLoaded(before, { nodes: 8, edges: 8 });
        await assertNodesShown(before, ["n1", "n2", "n3"]);

        sets.redefine(focus, { kind: "fixed", nodes: ["n5", "n6", "n7", "n8"], reading: "induced" });

        const after = await drawn(canvasElement, "Sets/Kept Sets FilterToASet");
        await assertNodesShown(after, ["n5", "n6", "n7", "n8"]);
    },
};

/**
 * One set laid out on its own: `setLayout("ngraph", ..., { scope: { set } })` rearranges n1 to n4
 * and holds n5 to n8 exactly where the first layout left them.
 */
export const LayoutOneSet: Story = {
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const before = await drawn(canvasElement, "Sets/Kept Sets LayoutOneSet, before");
        const cluster = element.session.sets.create({ kind: "fixed", nodes: ["n1", "n2", "n3", "n4"], reading: "induced" }, { name: "Cluster" });

        await element.setLayout("ngraph", { seed: 7 }, { scope: { set: cluster } });
        await waitForGraphSettled(canvasElement);

        const after = await drawn(canvasElement, "Sets/Kept Sets LayoutOneSet");
        await assertGraphLoaded(after, { nodes: 8, edges: 8 });
        const at = (scene: typeof before, id: string): readonly number[] => scene.nodes.find((node) => node.id === id)?.position ?? [];
        for (const id of ["n5", "n6", "n7", "n8"]) {
            const [was, is] = [at(before, id), at(after, id)];
            await holds(
                was.length === 3 && was.every((value, axis) => Math.abs(value - is[axis]) < 1e-3),
                `${id} is outside the set, so the layout must not move it: it was at ${String(was)} and is at ${String(is)}`,
            );
        }

        const moved = ["n1", "n2", "n3", "n4"].filter((id) => at(before, id).some((value, axis) => Math.abs(value - at(after, id)[axis]) > 1e-3));
        await holds(moved.length > 0, "the set's own nodes were laid out again, so at least one of them moved");
    },
};
