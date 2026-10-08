/**
 * The canvas inside `<graphty-element>` takes keyboard focus, so a keyboard or screen-reader user
 * meets it on every walk through the page. It must have a name, show where focus is, and never
 * take focus on its own.
 *
 * - Its accessible name is the host's standard `aria-label`, so the page names the drawing in its
 *   own words: `<graphty-element aria-label="Network drawing">`.
 * - The browser's own focus ring is drawn inside the canvas, so a page that clips the box the
 *   element fills (an `overflow: hidden` panel, the usual app layout) does not cut it off.
 * - It carries no `autofocus`, so mounting the element leaves the page's focus where it was.
 * - Focusing the host focuses the canvas (`delegatesFocus`), so a page that hands focus to the
 *   drawing, or a dialog that returns focus to it, needs no reach into the shadow root.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";
import { userEvent } from "vitest/browser";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
});

/**
 * Mounts an element, with the given host attributes, inside a parent that clips its overflow.
 * @param attributes - Attributes to set on the host before it is connected.
 * @returns The host and its canvas.
 */
async function mount(
    attributes: Record<string, string> = {},
): Promise<{ host: HTMLElement; canvas: HTMLCanvasElement }> {
    const parent = document.createElement("div");
    parent.setAttribute("style", "width: 400px; height: 300px; overflow: hidden;");
    document.body.appendChild(parent);
    mounted.push(parent);

    const host = document.createElement("graphty-element");
    for (const [name, value] of Object.entries(attributes)) {
        host.setAttribute(name, value);
    }

    parent.appendChild(host);
    await host.updateComplete;
    const canvas = host.shadowRoot?.querySelector("canvas");
    assert.exists(canvas, "the element renders a canvas");
    return { host, canvas };
}

test("the canvas is named by the host's aria-label, and follows it", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    assert.strictEqual(canvas.getAttribute("aria-label"), "Network drawing");

    host.setAttribute("aria-label", "Florentine families");
    assert.strictEqual(canvas.getAttribute("aria-label"), "Florentine families");

    host.removeAttribute("aria-label");
    assert.isNull(canvas.getAttribute("aria-label"));
});

test("mounting the element leaves focus where it was", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    mounted.push(input);
    input.focus();

    const { canvas } = await mount();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    assert.isFalse(canvas.hasAttribute("autofocus"), "the canvas carries autofocus");
    assert.strictEqual(document.activeElement, input, "mounting the element moved focus");
});

test("keyboard focus on the canvas draws the browser's ring inside the canvas", async () => {
    const before = document.createElement("button");
    before.textContent = "before";
    document.body.prepend(before);
    mounted.push(before);
    const { host, canvas } = await mount();

    before.focus();
    await userEvent.tab();

    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "Tab did not reach the canvas");
    assert.isTrue(canvas.matches(":focus-visible"));
    const style = getComputedStyle(canvas);
    assert.notStrictEqual(style.outlineStyle, "none", "no focus ring");
    assert.isBelow(
        parseFloat(style.outlineOffset),
        0,
        "the ring is drawn outside the canvas, where a clipping parent hides it",
    );
});

test("focusing the host focuses the canvas, so a page can hand focus to the drawing", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });

    host.focus();

    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "host.focus() did not reach the canvas");
    assert.strictEqual(document.activeElement, host);
});

test("focus handed to the drawing as the element is connected survives its first render", async () => {
    const host = document.createElement("graphty-element");
    host.setAttribute("aria-label", "Network drawing");
    const parent = document.createElement("div");
    parent.setAttribute("style", "width: 400px; height: 300px;");
    document.body.appendChild(parent);
    mounted.push(parent);
    parent.appendChild(host);

    // Before the element's first update, as a page does on the render that mounts it.
    host.focus();
    await host.updateComplete;

    const canvas = host.shadowRoot?.querySelector("canvas");
    assert.exists(canvas);
    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "the first render dropped focus to the page");
});

test("a pointer press focuses the canvas without the keyboard ring, even after a key press", async () => {
    const before = document.createElement("input");
    document.body.prepend(before);
    mounted.push(before);
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    // The handlers that focus the canvas on a press are attached once the scene is up.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // A key press last: Chrome's script focus then counts as keyboard focus.
    before.focus();
    await userEvent.keyboard("a");
    await userEvent.click(canvas, { position: { x: 200, y: 150 } });
    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "the press did not focus the canvas");
    assert.strictEqual(getComputedStyle(canvas).outlineStyle, "none", "a pointer press drew the keyboard ring");

    // A key pressed in the drawing brings the ring back: the reader is on the keyboard now.
    await userEvent.keyboard("{Shift}");
    assert.notStrictEqual(getComputedStyle(canvas).outlineStyle, "none", "a key press left the ring hidden");
});
