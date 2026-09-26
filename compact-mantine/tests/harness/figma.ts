/**
 * Read measurements straight from the Figma study (design/ui/figma, outside the package), so a
 * browser test can say "match what Figma measured" instead of copying numbers:
 *
 * ```ts
 * const button = await figmaElement("bc/btn-primary-md-enabled--default", { tag: "button", text: "Button" });
 * expectMeasured(el, figmaSpec(button, ["height", "backgroundColor", "fontWeight"]));
 * ```
 *
 * Paths are relative to the study, without `.styles.json`; the folder abbreviations of
 * design/figma-spec.md section 0 work (`bc/`, `dt/`, ...). The files are read on the Node side
 * by the `readFigmaCapture` browser command in vitest.config.ts. The study is not in every
 * checkout: gate a suite with `describe.skipIf(!(await figmaAvailable()))`.
 */
import { commands } from "@vitest/browser/context";

import type { MeasureSpec } from "./measure";

/** One captured element, as the study's capture script wrote it. */
export interface FigmaElement {
    index: number;
    tag: string;
    cls: string;
    testid: string | null;
    role: string | null;
    aria: string | null;
    text: string;
    /** x, y, width, height in the capture's viewport */
    box: [number, number, number, number];
    /** camelCase computed styles */
    style: Record<string, string>;
}

/** One capture: its viewport, the region it was taken of, and every element. */
interface FigmaCapture {
    url: string;
    viewport: [number, number];
    rect: { x: number; y: number; width: number; height: number } | null;
    elements: FigmaElement[];
}

/** How to pick an element from a capture. Every given field must match. */
interface FigmaSelector {
    /** `elements[index]`, the citation form of the spec (`#63`) */
    index?: number;
    tag?: string;
    /** a substring of the class attribute */
    cls?: string;
    testid?: string;
    role?: string;
    /** a substring of the aria label */
    aria?: string;
    /** the element's text, exactly */
    text?: string;
    /** among several matches, take the nth (0-based) */
    nth?: number;
}

const cache = new Map<string, Promise<FigmaCapture>>();

/**
 * Whether the Figma study is in this checkout.
 * @returns true when captures can be read
 */
export async function figmaAvailable(): Promise<boolean> {
    return commands.figmaAvailable();
}

/**
 * Load a capture.
 * @param path - e.g. `bc/btn-primary-md-enabled--default` or `dark-theme/dark-panel-rect`
 * @returns the capture, with each element's index filled in
 */
export function figmaCapture(path: string): Promise<FigmaCapture> {
    let hit = cache.get(path);
    if (!hit) {
        hit = commands.readFigmaCapture(path).then((raw) => {
            const capture = raw as FigmaCapture;
            capture.elements.forEach((e, i) => {
                e.index = i;
            });
            return capture;
        });
        cache.set(path, hit);
    }
    return hit;
}

/**
 * Pick one element from a capture. Throws when nothing matches, or when several match and no
 * `nth` was given, so a test never silently measures the wrong element.
 * @param path - the capture path
 * @param selector - what to match
 * @returns the element
 */
export async function figmaElement(path: string, selector: FigmaSelector): Promise<FigmaElement> {
    const capture = await figmaCapture(path);
    if (selector.index !== undefined) {
        const el = capture.elements[selector.index];
        if (!el) {
            throw new Error(`${path} has no element #${selector.index}`);
        }
        return el;
    }
    const found = capture.elements.filter(
        (e) =>
            (selector.tag === undefined || e.tag === selector.tag) &&
            (selector.cls === undefined || e.cls.includes(selector.cls)) &&
            (selector.testid === undefined || e.testid === selector.testid) &&
            (selector.role === undefined || e.role === selector.role) &&
            (selector.aria === undefined || (e.aria ?? "").includes(selector.aria)) &&
            (selector.text === undefined || e.text === selector.text),
    );
    if (found.length === 0) {
        throw new Error(`${path}: nothing matches ${JSON.stringify(selector)}`);
    }
    if (found.length > 1 && selector.nth === undefined) {
        throw new Error(
            `${path}: ${found.length} elements match ${JSON.stringify(selector)} (#${found.map((e) => e.index).join(", #")}); pass nth or index`,
        );
    }
    return found[selector.nth ?? 0];
}

/**
 * Build a MeasureSpec from a captured element: `width` / `height` come from its box, anything
 * else from its computed style.
 * @param el - the captured element
 * @param properties - `width`, `height` and camelCase CSS properties
 * @returns the spec
 */
export function figmaSpec(el: FigmaElement, properties: readonly string[]): MeasureSpec {
    const spec: MeasureSpec = {};
    for (const p of properties) {
        if (p === "width") {
            spec.width = el.box[2];
        } else if (p === "height") {
            spec.height = el.box[3];
        } else {
            const v = el.style[p];
            if (v === undefined) {
                throw new Error(`the capture has no computed ${p} (element #${el.index})`);
            }
            spec[p] = v;
        }
    }
    return spec;
}
