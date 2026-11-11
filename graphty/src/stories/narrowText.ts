/**
 * @file Finds text a reader cannot read because its box is too narrow: a text field, or words cut
 * short with "...", whose inside is narrower than four characters of its own font. A label's
 * source button four characters wide read "n..." for "name" (issue #6406); every story is checked
 * for it after its play function (.storybook/vitest.setup.ts).
 */

/** How many characters the narrowest usable text box shows: "name" in full. */
export const NARROWEST_CHARACTERS = 4;

/** The input types a reader types words or numbers into. */
const TYPED = new Set(["", "text", "search", "email", "url", "tel", "number", "password"]);

/**
 * The width of `NARROWEST_CHARACTERS` digits in an element's font.
 * @param element - the element.
 * @param context - a canvas context to measure with.
 * @returns the width in CSS pixels.
 */
function floorOf(element: Element, context: CanvasRenderingContext2D): number {
    context.font = getComputedStyle(element).font;
    return context.measureText("0".repeat(NARROWEST_CHARACTERS)).width;
}

/**
 * The width inside an element's padding.
 * @param element - the element.
 * @returns the width in CSS pixels.
 */
function innerWidth(element: HTMLElement): number {
    const style = getComputedStyle(element);
    return element.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
}

/**
 * Whether an element is a text field or words cut short, and drawn.
 * @param element - the element.
 * @returns whether it is checked.
 */
function isChecked(element: HTMLElement): boolean {
    if (element.getClientRects().length === 0 || getComputedStyle(element).visibility === "hidden") {
        return false;
    }
    if (element instanceof HTMLTextAreaElement) {
        return true;
    }
    if (element instanceof HTMLInputElement) {
        return TYPED.has(element.getAttribute("type") ?? "");
    }
    return getComputedStyle(element).textOverflow === "ellipsis" && element.scrollWidth > element.clientWidth;
}

/**
 * A name for an element a reader would recognize: its accessible name, its placeholder or its words.
 * @param element - the element.
 * @returns the name.
 */
function nameOf(element: HTMLElement): string {
    const named =
        element.getAttribute("aria-label") ??
        element.closest("[aria-label]")?.getAttribute("aria-label") ??
        element.getAttribute("placeholder") ??
        element.textContent;
    return `${element.tagName.toLowerCase()} "${(named ?? "").trim().slice(0, 60)}"`;
}

/**
 * Every drawn text field, and every run of words cut short, under `root` whose inside is narrower
 * than `NARROWEST_CHARACTERS` characters of its own font.
 * @param root - where to look; the whole page by default, since pop-overs are drawn in the body.
 * @returns one line per box: its name, its inside width and the floor.
 */
export function narrowTextBoxes(root: ParentNode = document): string[] {
    const context = document.createElement("canvas").getContext("2d");
    if (context === null) {
        return [];
    }
    const found: string[] = [];
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
        if (!isChecked(element)) {
            continue;
        }
        const inside = innerWidth(element);
        const floor = floorOf(element, context);
        if (inside < floor) {
            found.push(`${nameOf(element)} is ${inside.toFixed(1)} px inside, under ${floor.toFixed(1)} px`);
        }
    }
    return found;
}
