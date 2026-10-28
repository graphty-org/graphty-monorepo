// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ModelChange, ModelState } from "../src/session/types";
import { assertGraphLoaded, drawn, holds, renderedElement } from "./assertions";
import columnStlPath from "./fixtures/models/column-y-up.stl?url";
import damagedGlbPath from "./fixtures/models/damaged.glb?url";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

/**
 * Nodes drawn as 3D models (docs/guide/node-models.md). Every model here is one of the element's
 * samples or a file served by Storybook itself, so no story reaches the network.
 *
 * Each play function reads the element's `graphty-model-change` events -- recorded from the moment
 * the element is made, before any layer is added -- and asserts the state each model reached, then
 * waits for the finished frame, which is not finished while a model is still loading.
 */

/** Served files, made absolute against the page as the element requires of a URL. */
const COLUMN_STL = new URL(columnStlPath, document.baseURI).href;
const DAMAGED_GLB = new URL(damagedGlbPath, document.baseURI).href;

/** Every model event each story element has fired, from its creation. */
const changes = new WeakMap<Element, ModelChange[]>();

// Heard in the capture phase, which passes the document whether or not the event bubbles, so an
// element's first event is kept even though the story builds the element with `renderFn` alone.
document.addEventListener(
    "graphty-model-change",
    (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const seen = changes.get(event.target) ?? [];
        changes.set(event.target, seen);
        seen.push(event.detail);
    },
    true,
);

const meta: Meta = {
    title: "Styles/Node Models",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    args: {
        setup: storySetup({}),
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Wait until a model has reached one of the given states, and return that event.
 * @param canvasElement - Where the story was rendered.
 * @param ref - What the layer named.
 * @param states - The states that settle it.
 * @returns The settling event.
 */
async function settled(canvasElement: HTMLElement, ref: string, states: readonly ModelState[]): Promise<ModelChange> {
    const element = await renderedElement(canvasElement, `the story rendered no <graphty-element> for ${ref}`);
    const seen = changes.get(element) ?? [];
    const match = (change: ModelChange): boolean => change.ref === ref && states.includes(change.state);
    const found = seen.find(match);
    if (found !== undefined) {
        return found;
    }

    return new Promise((resolve) => {
        element.addEventListener("graphty-model-change", function listener(event) {
            const change = event.detail;
            if (match(change)) {
                element.removeEventListener("graphty-model-change", listener);
                resolve(change);
            }
        });
    });
}

/**
 * Every problem code a model's events carried.
 * @param canvasElement - Where the story was rendered.
 * @param ref - What the layer named.
 * @returns The codes, once each.
 */
function codesOf(canvasElement: HTMLElement, ref: string): string[] {
    const element = canvasElement.querySelector("graphty-element");
    const seen = element === null ? [] : (changes.get(element) ?? []);
    return [...new Set(seen.filter((c) => c.ref === ref).flatMap((c) => c.problems.map((p) => p.code)))];
}

/**
 * A node at a fixed place.
 * @param id - The node.
 * @param kind - Its kind.
 * @param x - Across.
 * @param y - Up.
 * @returns The node record.
 */
const at = (id: string, kind: string, x: number, y = 0): Record<string, unknown> => ({
    id,
    kind,
    position: { x, y, z: 0 },
});

/**
 * Servers as racks: the guide's first example with the sample server model. The three servers are
 * drawn as the rack; the two people keep their ordinary sphere.
 */
export const ServersAsRacks: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "Servers as racks",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'server'" },
                    set: { "node.model": "asset:sample/server" },
                },
            ],
        }),
        nodeData: [
            at("web", "server", -4),
            at("api", "server", 0),
            at("db", "server", 4),
            at("alice", "person", -2, 4),
            at("bob", "person", 2, 4),
        ],
        edgeData: [
            { source: "alice", target: "web" },
            { source: "bob", target: "api" },
            { source: "web", target: "db" },
            { source: "api", target: "db" },
        ],
    },
    play: async ({ canvasElement }) => {
        const change = await settled(canvasElement, "asset:sample/server", ["drawn", "rejected", "failed"]);
        await holds(change.state === "drawn", `the rack ended ${change.state}: ${JSON.stringify(change.problems)}`);
        await holds(change.id === "asset:sample/server", `the rack's id is ${String(change.id)}`);
        const scene = await drawn(canvasElement, "Styles/Node Models ServersAsRacks");
        await assertGraphLoaded(scene, { nodes: 5, edges: 4 });
    },
};

/** The models of {@link ModelPerCategory}: one per kind; the robot is listed nowhere. */
const BY_KIND = {
    server: "asset:sample/server",
    person: "asset:sample/person",
    tree: "asset:sample/tree",
    crate: "asset:sample/box",
} as const;

/**
 * Model by kind: one encoding of the `kind` column draws each kind as its own sample model. The
 * robot's kind is not in the map, so it keeps its ordinary shape.
 */
export const ModelPerCategory: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#38A169" },
            layers: [
                {
                    name: "Model by kind",
                    target: "node",
                    selector: { match: "everything" },
                    encode: {
                        "node.model": { by: "data.kind", scale: "passthrough", map: { ...BY_KIND }, unmapped: "skip" },
                    },
                },
            ],
        }),
        nodeData: [
            at("web", "server", -6),
            at("db", "server", -3),
            at("alice", "person", 0),
            at("bob", "person", 3),
            at("oak", "tree", 6),
            at("crate", "crate", -3, 4),
            at("r2", "robot", 3, 4),
        ],
        edgeData: [
            { source: "alice", target: "web" },
            { source: "bob", target: "db" },
            { source: "web", target: "db" },
            { source: "oak", target: "crate" },
            { source: "r2", target: "bob" },
        ],
    },
    play: async ({ canvasElement }) => {
        for (const ref of Object.values(BY_KIND)) {
            const change = await settled(canvasElement, ref, ["drawn", "rejected", "failed"]);
            await holds(change.state === "drawn", `${ref} ended ${change.state}: ${JSON.stringify(change.problems)}`);
        }

        const scene = await drawn(canvasElement, "Styles/Node Models ModelPerCategory");
        await assertGraphLoaded(scene, { nodes: 7, edges: 5 });
    },
};

/**
 * Tint on and off: the same rack and the same orange, with `node.modelTint` on for the left row
 * and off for the right. The tinted racks take the color with their shading kept; the untinted ones
 * keep the model's own gray, and the element reports the color it did not draw as
 * `W_MODEL_COLOR_IGNORED`.
 */
export const TintOnAndOff: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            layers: [
                {
                    name: "Racks in orange",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.model": "asset:sample/server", "node.color": "#DD6B20" },
                },
                {
                    name: "Tint on",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'tinted'" },
                    set: { "node.modelTint": true },
                },
                {
                    name: "Tint off",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'plain'" },
                    set: { "node.modelTint": false },
                },
            ],
        }),
        nodeData: [at("t1", "tinted", -6), at("t2", "tinted", -3), at("p1", "plain", 3), at("p2", "plain", 6)],
        edgeData: [
            { source: "t1", target: "t2" },
            { source: "p1", target: "p2" },
        ],
    },
    play: async ({ canvasElement }) => {
        const change = await settled(canvasElement, "asset:sample/server", ["drawn", "rejected", "failed"]);
        await holds(change.state === "drawn", `the racks ended ${change.state}: ${JSON.stringify(change.problems)}`);
        const scene = await drawn(canvasElement, "Styles/Node Models TintOnAndOff");
        await assertGraphLoaded(scene, { nodes: 4, edges: 2 });
        const codes = codesOf(canvasElement, "asset:sample/server");
        await holds(
            codes.includes("W_MODEL_COLOR_IGNORED"),
            `the untinted racks' orange is reported as not drawn; the codes were ${JSON.stringify(codes)}`,
        );
    },
};

/**
 * An STL turned upright: STL files do not say which way is up, so the element takes Z as up and
 * says so (`W_MODEL_UP_GUESSED`). This column was made with Y up, so the left node, drawn as
 * guessed, lies on its side; the right node names the file's up axis with `node.modelSourceUp` and
 * stands upright, its point at the top.
 */
export const StlTurnedUpright: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#805AD5", "node.modelTint": true, "node.model": COLUMN_STL },
            layers: [
                {
                    name: "Turned upright",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'upright'" },
                    set: { "node.modelSourceUp": "y" },
                },
            ],
        }),
        nodeData: [at("as-guessed", "guessed", -3), at("upright", "upright", 3)],
        edgeData: [],
    },
    play: async ({ canvasElement }) => {
        const change = await settled(canvasElement, COLUMN_STL, ["drawn", "rejected", "failed"]);
        await holds(change.state === "drawn", `the column ended ${change.state}: ${JSON.stringify(change.problems)}`);
        const scene = await drawn(canvasElement, "Styles/Node Models StlTurnedUpright");
        await assertGraphLoaded(scene, { nodes: 2, edges: 0 });
        const codes = codesOf(canvasElement, COLUMN_STL);
        await holds(codes.includes("W_MODEL_UP_GUESSED"), `the guess is reported; codes ${JSON.stringify(codes)}`);
    },
};

/**
 * A failed model shows the placeholder: the layer names a GLB file that was cut short, the element
 * refuses it before drawing anything, and the nodes keep their ordinary shape (`node.shape`, a box
 * here), so nothing is missing from the picture. The other two nodes draw the sample rack.
 */
export const FailedModelPlaceholder: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#E53E3E", "node.shape": "box" },
            layers: [
                {
                    name: "Damaged model",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'broken'" },
                    set: { "node.model": DAMAGED_GLB },
                },
                {
                    name: "Working model",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'server'" },
                    set: { "node.model": "asset:sample/server" },
                },
            ],
        }),
        nodeData: [at("b1", "broken", -6), at("b2", "broken", -3), at("s1", "server", 3), at("s2", "server", 6)],
        edgeData: [
            { source: "b1", target: "b2" },
            { source: "b2", target: "s1" },
            { source: "s1", target: "s2" },
        ],
    },
    play: async ({ canvasElement }) => {
        const broken = await settled(canvasElement, DAMAGED_GLB, ["drawn", "rejected", "failed"]);
        await holds(
            broken.state === "rejected" || broken.state === "failed",
            `the damaged model ended ${broken.state}`,
        );
        await holds(broken.problems.length > 0, "the damaged model says why it was not drawn");
        const working = await settled(canvasElement, "asset:sample/server", ["drawn", "rejected", "failed"]);
        await holds(working.state === "drawn", `the rack ended ${working.state}`);
        const scene = await drawn(canvasElement, "Styles/Node Models FailedModelPlaceholder");
        await assertGraphLoaded(scene, { nodes: 4, edges: 3 });
    },
};

/** Served by Storybook at a folder of their own: a three-file glTF and a picture. */
const CRATE_GLTF = new URL("served-models/crate/crate.gltf", document.baseURI).href;
const STRIPES_PNG = new URL("served-models/stripes.png", document.baseURI).href;

/**
 * A model and a picture loaded by URL: the crates are a glTF in three files (crate.gltf, its .bin
 * and its wood picture) loaded by the .gltf's URL alone, which brings the other two from beside
 * it; the people are spheres with a striped picture pasted on by URL (`node.texture`).
 */
export const ModelAndTextureByUrl: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            layers: [
                {
                    name: "Crates by URL",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'crate'" },
                    set: { "node.model": CRATE_GLTF },
                },
                {
                    name: "Striped texture by URL",
                    target: "node",
                    selector: { match: "expression", where: "data.kind == 'person'" },
                    set: { "node.texture": STRIPES_PNG },
                },
            ],
        }),
        nodeData: [
            at("c1", "crate", -4),
            at("c2", "crate", 0),
            at("c3", "crate", 4),
            at("p1", "person", -2, 4),
            at("p2", "person", 2, 4),
        ],
        edgeData: [
            { source: "p1", target: "c1" },
            { source: "p2", target: "c2" },
            { source: "c2", target: "c3" },
        ],
    },
    play: async ({ canvasElement }) => {
        const crate = await settled(canvasElement, CRATE_GLTF, ["drawn", "rejected", "failed"]);
        await holds(crate.state === "drawn", `the crate ended ${crate.state}: ${JSON.stringify(crate.problems)}`);
        const stripes = await settled(canvasElement, STRIPES_PNG, ["drawn", "rejected", "failed"]);
        await holds(
            stripes.state === "drawn",
            `the stripes ended ${stripes.state}: ${JSON.stringify(stripes.problems)}`,
        );
        const scene = await drawn(canvasElement, "Styles/Node Models ModelAndTextureByUrl");
        await assertGraphLoaded(scene, { nodes: 5, edges: 3 });
    },
};
