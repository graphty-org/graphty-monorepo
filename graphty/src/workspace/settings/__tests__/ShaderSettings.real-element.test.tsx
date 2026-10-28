/**
 * The graph's shader settings on the REAL graphty-element, driven by real input (shader-styles
 * design, section 6.5): the Background's Shader paint, Quality and Motion as the reader's
 * preferences, Motion off in the canvas menu, held shaders named in the load report with Run, the
 * Held shaders row, remembered approvals across a reload, and the quality the frame guard stepped
 * down to on the graph's Values tab. Every assertion reads the element back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { shaderTemplate } from "@graphty/graphty-element/catalog";
import { createGraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { historyTip } from "../../frame/historyWords";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { renderQualityWords } from "../../style/words";
import { Workspace } from "../../Workspace";
import { SHADER_MOTION, SHADER_QUALITY, TRUSTED_SHADERS_KEY } from "../shaderPreferences";

/** A hang guard for the element coming up, compiling and drawing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The element's crash marker: a shader being compiled or first drawn. */
const CRASH_MARKER_KEY = "graphty-shader-crash-marker";

/** A pasted sprite that does not move. */
const PLATE = `/* graphty-shader 1
{ "id": "user/plate", "name": "Plate", "place": "replace" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb, 1.0);
}
`;

type Element = HTMLElementTagNameMap["graphty-element"];

let unmount: (() => void) | undefined;

/** Clears what this file keeps in the browser. */
function clearPreferences(): void {
    for (const key of [SHADER_QUALITY.key, SHADER_MOTION.key, TRUSTED_SHADERS_KEY, CRASH_MARKER_KEY]) {
        localStorage.removeItem(key);
    }
}

beforeAll(async () => {
    await page.viewport(1366, 768);
});

beforeEach(clearPreferences);

afterEach(() => {
    unmount?.();
    unmount = undefined;
    clearPreferences();
});

/**
 * The project's element (the start screen draws a graph of its own).
 * @returns the element, once its session is up.
 */
async function projectElement(): Promise<Element> {
    let found: Element | null = null;
    await waitFor(
        () => {
            found = document.querySelector<Element>("graphty-element:not([data-start-page])");
            assert.isDefined(found?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === null) {
        throw new Error("the element never came up");
    }
    return found;
}

/**
 * Renders the workspace on Graph settings with a small graph, on the Style tab.
 * @returns the element.
 */
async function openGraphSettings(): Promise<Element> {
    const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
    ({ unmount } = render(<Workspace store={store} />));
    const element = await projectElement();
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
    await screen.findByRole("combobox", { name: "Quality" }, { timeout: TIMEOUT_MS });
    return element;
}

/**
 * Picks an option of a select in the panel.
 * @param name - the select's name.
 * @param option - the option's name.
 */
async function choose(name: string, option: string): Promise<void> {
    await userEvent.click(screen.getByRole("combobox", { name }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * Adds a Shader to the Background with its "+", which opens the gallery, and picks Nebula.
 */
async function pickNebula(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Add to background" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
    const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
    await userEvent.click(within(gallery).getByRole("button", { name: "Nebula" }));
}

/**
 * A project file holding a two-node graph drawn by a pasted shader, written by a session with no
 * canvas, so nothing on this page has approved or compiled the shader.
 * @returns the file.
 */
async function projectWithPastedShader(): Promise<File> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }]);
    const added = await session.shaders.add(PLATE);
    assert.isTrue(added.ok, "the shader text passes the checks");
    await session.styles.add({
        name: "Plates",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: "user/plate" }] },
    });
    const saved = await session.project.save();
    session.dispose();
    return new File([saved.text], "plates.graphty", { type: "application/json" });
}

/**
 * Drops a file as the browser does, on a target. A synthetic DragEvent, the one exception to real
 * input here: a page cannot start a drag of a file from the operating system.
 * @param target - where it is dropped.
 * @param file - the file.
 */
function dropOn(target: EventTarget, file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Opens a project file from the start screen, as Open does.
 * @param file - the file.
 * @returns the store and the project's element, once the file opened.
 */
async function openFromStart(file: File): Promise<{ store: WorkspaceStore; element: Element }> {
    const store = createWorkspaceStore();
    ({ unmount } = render(<Workspace store={store} />));
    dropOn(globalThis, file);
    const element = await projectElement();
    await waitFor(
        () => {
            assert.match(store.get().notice?.message ?? "", /^Opened plates/);
        },
        { timeout: TIMEOUT_MS },
    );
    return { store, element };
}

/**
 * A project shader's state.
 * @param element - the element.
 * @param id - the shader.
 * @returns its state.
 */
function stateOf(element: Element, id: string): string | undefined {
    return element.session.shaders.list().find((shader) => shader.id === id)?.state;
}

describe("the graph's shader settings", () => {
    it("Shader then Nebula in the Background writes the background config and opens its settings, which write parameters", async () => {
        const element = await openGraphSettings();
        await pickNebula();
        await waitFor(() => {
            const { background } = element.session.config;
            assert.strictEqual(background.shader?.id, "nebula");
        });

        // The pick opens its settings, as a style row's pick does: each parameter by its own name.
        const drift = await screen.findByRole("spinbutton", { name: "Drift" }, { timeout: TIMEOUT_MS });
        await userEvent.clear(drift);
        await userEvent.type(drift, "0{Enter}");
        await waitFor(() => {
            const { background } = element.session.config;
            assert.deepEqual(background.shader?.params, { drift: 0 });
        });
    });

    it("Background + then Shader opens the shared gallery listing only background shaders, with no place filter", async () => {
        const element = await openGraphSettings();
        await userEvent.click(screen.getByRole("button", { name: "Add to background" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        assert.strictEqual(gallery.dataset.tab, "background", "the one gallery, opened for the background");
        assert.isNull(within(gallery).queryByRole("radiogroup", { name: "Place" }), "the background has no place");
        const background = element.session.catalog
            .shaders()
            .filter((shader) => shader.target === "background")
            .map((shader) => shader.plainName);
        const tiles = within(within(gallery).getByRole("group", { name: "Shaders" })).getAllByRole("button");
        assert.isAbove(tiles.length, 0);
        assert.sameMembers(
            tiles.map((tile) => tile.getAttribute("aria-label")),
            background,
        );
    });

    it("the Background shader gallery starts with New shader..., whose Add sets the background as one step", async () => {
        const element = await openGraphSettings();
        // The background template under an id only the pasted text names, so the id read back proves the paste
        // reached the dialog (it opens on the template itself). Not a copy of Nebula: Add waits for the element's
        // test frame, which refuses a shader over its time budget, and Nebula is near that budget on a busy
        // machine (#4301).
        const text = shaderTemplate({ target: "background" }).replace(
            '"user/my-background"',
            '"user/pasted-background"',
        );
        await userEvent.click(screen.getByRole("button", { name: "Add to background" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: "New shader" });
        const box = within(dialog).getByRole<HTMLTextAreaElement>("textbox", { name: "Shader code" });
        await userEvent.fill(box, text);
        const steps = element.session.history.position;
        const add = within(dialog).getByRole("button", { name: "Add" });
        await waitFor(
            () => {
                assert.isNull(add.getAttribute("aria-disabled"), "Add is enabled");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(add);
        await waitFor(
            () => {
                const { background } = element.session.config;
                assert.strictEqual(background.shader?.id, "user/pasted-background");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(element.session.history.position, steps + 1, "one step");
    });

    it("keeps Quality and Motion as the reader's and hands them to the element, across a reload", async () => {
        const element = await openGraphSettings();
        await choose("Quality", "Low");
        await choose("Motion", "Off");
        assert.strictEqual(element.shaderSettings.quality, "low");
        assert.strictEqual(element.shaderSettings.motion, "off");
        assert.strictEqual(localStorage.getItem(SHADER_QUALITY.key), "low");

        unmount?.();
        const next = await openGraphSettings();
        assert.strictEqual(next.shaderSettings.quality, "low");
        assert.strictEqual(next.shaderSettings.motion, "off");
    });

    it("Motion off in the canvas menu stops shader motion, and the menu then offers Motion on", async () => {
        const element = await openGraphSettings();
        const surface = document.querySelector<HTMLElement>(".ws-canvas-surface");
        assert.isNotNull(surface);
        await userEvent.click(surface, { button: "right", position: { x: 4, y: 4 } });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Motion off" }));
        assert.strictEqual(element.shaderSettings.motion, "off");
        assert.strictEqual(element.renderQuality.motion, "still");

        await userEvent.click(surface, { button: "right", position: { x: 4, y: 4 } });
        await screen.findByRole("menuitem", { name: "Motion on" });
        assert.isNull(screen.queryByRole("menuitem", { name: "Motion off" }));

        // Motion on goes back to the system's own preference, not a permanent "on".
        await userEvent.click(screen.getByRole("menuitem", { name: "Motion on" }));
        assert.strictEqual(element.shaderSettings.motion, "system");
    });

    it("offers Motion on when the system asks for reduced motion, and then overrides it", async () => {
        const send = cdp() as unknown as { send: (method: string, params?: object) => Promise<unknown> };
        await send.send("Emulation.setEmulatedMedia", {
            features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        try {
            const element = await openGraphSettings();
            await pickNebula();
            await waitFor(
                () => {
                    assert.strictEqual(
                        element.renderQuality.motion,
                        "still",
                        "the system's preference holds shaders still",
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            const surface = document.querySelector<HTMLElement>(".ws-canvas-surface");
            assert.isNotNull(surface);
            await userEvent.click(surface, { button: "right", position: { x: 4, y: 4 } });
            // Already still: the menu offers to start motion, never to stop it again.
            await userEvent.click(await screen.findByRole("menuitem", { name: "Motion on" }));
            assert.isNull(screen.queryByRole("menuitem", { name: "Motion off" }));
            assert.strictEqual(element.shaderSettings.motion, "on", "the reader overrides the system's preference");
        } finally {
            await send.send("Emulation.setEmulatedMedia", { features: [] });
        }
    });

    it("names the background and the parameter in Undo", async () => {
        const element = await openGraphSettings();
        await pickNebula();
        await waitFor(() => {
            assert.strictEqual(historyTip(element.session, true), "Undo changing the background");
        });
        const settings = await screen.findByRole("dialog", { name: "Nebula settings" }, { timeout: TIMEOUT_MS });
        const stars = within(settings).getByRole("spinbutton", { name: "Stars" });
        await userEvent.clear(stars);
        await userEvent.type(stars, "0.2{Enter}");
        await waitFor(() => {
            assert.strictEqual(historyTip(element.session, true), "Undo changing Nebula stars");
        });
    });

    it("names a file's pasted shader in the load report; Run draws it, and a reload does not hold it again", async () => {
        const file = await projectWithPastedShader();
        const first = await openFromStart(file);
        assert.strictEqual(first.store.get().notice?.message, "Opened plates.graphty. Held: Plate");
        assert.strictEqual(stateOf(first.element, "user/plate"), "held");

        await userEvent.click(await screen.findByRole("button", { name: "Run" }));
        await waitFor(
            () => {
                assert.strictEqual(stateOf(first.element, "user/plate"), "ready");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(JSON.parse(localStorage.getItem(TRUSTED_SHADERS_KEY) ?? "[]") as string[], 1);
        // A reload follows a page hide, which lets the crash marker go; here it goes once the
        // shader has drawn calmly.
        await waitFor(
            () => {
                assert.isNull(localStorage.getItem(CRASH_MARKER_KEY));
            },
            { timeout: TIMEOUT_MS },
        );

        unmount?.();
        const second = await openFromStart(file);
        assert.strictEqual(second.store.get().notice?.message, "Opened plates.graphty");
        assert.notStrictEqual(stateOf(second.element, "user/plate"), "held");
    });

    it("lists held shaders in Graph settings, where Run draws one", async () => {
        const { store, element } = await openFromStart(await projectWithPastedShader());
        act(() => {
            store.set({ notice: null, inspected: { kind: "graph" } });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
        const row = await screen.findByTestId("held-shaders");
        await userEvent.click(within(row).getByRole("button", { name: "Held shaders, 1" }));
        const list = await screen.findByRole("list", { name: "Held shaders" });
        assert.include(list.textContent ?? "", "Instead of the node, Used by 1");
        await userEvent.click(within(list).getByRole("button", { name: "Run Plate" }));
        await waitFor(
            () => {
                assert.strictEqual(stateOf(element, "user/plate"), "ready");
            },
            { timeout: TIMEOUT_MS },
        );
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("held-shaders"));
        });
    });

    it("shows the quality the frame guard stepped down to under Quality, not among the graph's statistics", async () => {
        const element = await openGraphSettings();
        await choose("Quality", "High");
        await waitFor(
            () => {
                assert.strictEqual(element.renderQuality.level, "high");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isNull(screen.queryByText(/^Now /));
        await pickNebula();

        // A GPU that takes 80 ms per frame, at the one place the element learns about the GPU:
        // the WebGL 2 fence after each frame reads unsignalled until that long after it was made.
        // The canvas's own context: asking a canvas again hands back the one it already has.
        const canvas = (element.shadowRoot ?? element).querySelector("canvas");
        const gl = canvas?.getContext("webgl2");
        if (gl === null || gl === undefined) {
            throw new Error("the element draws with no WebGL 2 context");
        }
        const { fenceSync, getSyncParameter } = gl;
        const made = new WeakMap<WebGLSync, number>();
        gl.fenceSync = (condition, flags) => {
            const fence = fenceSync.call(gl, condition, flags);
            if (fence !== null) {
                made.set(fence, performance.now() + 80);
            }
            return fence;
        };
        gl.getSyncParameter = (sync, pname) => {
            const ready = made.get(sync);
            if (pname === gl.SYNC_STATUS && ready !== undefined) {
                return performance.now() < ready ? gl.UNSIGNALED : gl.SIGNALED;
            }
            return getSyncParameter.call(gl, sync, pname) as unknown;
        };
        try {
            // Over the slow-frame line the guard steps to Medium; a software rasterizer slow enough
            // to cross the long-frame line on the nebula alone steps heavy shaders off first.
            // Either way the line says what it stepped to.
            const line = await screen.findByText(/^Now /, {}, { timeout: TIMEOUT_MS });
            assert.isTrue(
                screen.getByRole("combobox", { name: "Quality" }).getAttribute("aria-describedby")?.includes(line.id),
            );
            // The guard may step again while the slow frames go on: the line follows it.
            await waitFor(() => {
                const quality = element.renderQuality;
                assert.isTrue(quality.level !== "high" || quality.heavy === "off", "the guard stepped down");
                assert.strictEqual(screen.getByText(/^Now /).textContent, `Now ${renderQualityWords(quality)}`);
            });
            await userEvent.click(screen.getByRole("tab", { name: "Values" }));
            assert.isNull(screen.queryByText("Shader quality"), "not among the statistics");
        } finally {
            gl.fenceSync = fenceSync;
            gl.getSyncParameter = getSyncParameter;
        }
    });
});
