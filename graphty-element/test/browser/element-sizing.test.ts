/**
 * How big `<graphty-element>` is when the page says nothing, and when the page does.
 *
 * The element used to declare no host styles, so the tag was `display: inline` with no height of
 * its own. Its canvas is sized `height: 100%`, which then resolved to `auto` and fell back to the
 * canvas's intrinsic 300x150 ratio: a bare tag in a 1000px-wide page drew a 1000x500 graph, and a
 * height set on the tag itself was ignored because heights do not apply to inline boxes.
 *
 * The contract now: the host is a block that fills its parent's width (`width: 100%`). Its height is
 * the parent's when the parent has a definite height (`height: 100%`), the element's own when the
 * page sets one, and otherwise half its width (`aspect-ratio: 2 / 1`, which applies only while the
 * used height is `auto`) -- the same 2:1 a bare tag always drew. The ratio is never a minimum
 * (`min-width: 0`), so the element never forces a grid or flex container wider than its page.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
});

/**
 * Mounts an element inside a parent with the given inline style.
 * @param parentStyle - CSS text for the parent div.
 * @param elementStyle - CSS text for the element itself.
 * @returns The rendered size of the element's canvas.
 */
async function canvasSize(parentStyle: string, elementStyle = ""): Promise<{ width: number; height: number }> {
    const parent = document.createElement("div");
    parent.setAttribute("style", parentStyle);
    document.body.appendChild(parent);
    mounted.push(parent);

    const element = document.createElement("graphty-element");
    element.setAttribute("style", elementStyle);
    parent.appendChild(element);
    await element.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = element.shadowRoot?.querySelector("canvas");
    assert.exists(canvas, "the element renders a canvas");
    const rect = canvas.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
}

/**
 * Mounts an element and returns its host's computed display.
 * @returns The computed `display` of the host.
 */
function hostDisplay(): string {
    const element = document.createElement("graphty-element");
    document.body.appendChild(element);
    mounted.push(element);
    return getComputedStyle(element).display;
}

test("the host is a block box", () => {
    assert.equal(hostDisplay(), "block");
});

test("a bare element in an unsized parent is full width and 2:1, as it always was", async () => {
    const size = await canvasSize("width: 1000px;");
    assert.deepEqual(size, { width: 1000, height: 500 });
});

test("a height set on the element itself is honoured", async () => {
    const size = await canvasSize("width: 800px;", "height: 600px;");
    assert.deepEqual(size, { width: 800, height: 600 });
});

test("an element in a fixed-size parent fills it", async () => {
    const size = await canvasSize("width: 800px; height: 600px;");
    assert.deepEqual(size, { width: 800, height: 600 });
});

test("an element in a parent sized by its insets fills it", async () => {
    const size = await canvasSize("position: fixed; left: 0; top: 0; width: 700px; bottom: calc(100vh - 300px);");
    assert.deepEqual(size, { width: 700, height: 300 });
});

/**
 * Mounts an element inside a page laid out by `pageStyle`, between a header and a footer, and
 * measures the page and the element.
 * @param pageStyle - CSS text for the page container.
 * @returns The page's scroll width and the element's rendered size.
 */
async function pageLayout(pageStyle: string): Promise<{ pageScrollWidth: number; width: number; height: number }> {
    const page = document.createElement("div");
    page.setAttribute("style", pageStyle);
    document.body.appendChild(page);
    mounted.push(page);

    const header = document.createElement("div");
    header.style.cssText = "height: 40px;";
    const element = document.createElement("graphty-element");
    const footer = document.createElement("div");
    footer.style.cssText = "height: 40px;";
    page.append(header, element, footer);
    await element.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const rect = element.getBoundingClientRect();
    return { pageScrollWidth: page.scrollWidth, width: Math.round(rect.width), height: Math.round(rect.height) };
}

// Issue #3597: the 2:1 aspect-ratio made the element's automatic minimum width twice its height,
// so an implicit (auto) grid column grew wider than the page.
test("in a grid page with an auto column the element is no wider than the page", async () => {
    const result = await pageLayout("display: grid; grid-template-rows: auto 1fr auto; width: 600px; height: 600px;");
    assert.deepEqual(result, { pageScrollWidth: 600, width: 600, height: 520 });
});
