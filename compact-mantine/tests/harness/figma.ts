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
 * design/figma-spec.md section 0 work (`bc/`, `dt/`, ...).
 *
 * The study itself (design/ui/figma, 943 MB) is not in git, so the tests read
 * ../figma/figma-fixture.json: exactly the fields of the captures the tests read, and nothing else.
 * `node tests/figma/figma-fixture.mjs build` regenerates it from the study, by running the browser
 * tests with FIGMA_FIXTURE_RECORD set: then every capture is read from the study (the
 * `readFigmaCapture` command in vitest.config.ts) and every field a test reads is written down.
 * Regenerate it after changing which captures, elements or properties a test reads.
 */
import { afterAll } from "vitest";
import { commands } from "vitest/browser";

import fixtureText from "../figma/figma-fixture.json?raw";
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

/** The folder abbreviations design/figma-spec.md cites captures by. */
const FIGMA_FOLDERS: Record<string, string> = {
    bc: "buttons-and-controls",
    dt: "dark-theme",
    ii: "index-and-inventory",
    cr: "contradictions-resolved",
    rs: "right-sidebar-selection",
    ls: "left-sidebar",
    pm: "popovers-and-menus",
    bt: "bottom-toolbar",
    hm: "header-and-modes",
    ma: "measurement-audit",
    ac: "accessibility",
};

/**
 * A capture path in the study's own spelling: folder abbreviation expanded, no `.styles.json`.
 * @param path - as a test gives it
 * @returns the path relative to the study
 */
function studyPath(path: string): string {
    const [head, ...rest] = path.split("/");
    return [FIGMA_FOLDERS[head] ?? head, ...rest].join("/").replace(/\.styles\.json$/, "");
}

/** One capture in the fixture: only the fields a test reads, elements keyed by index. */
interface FixtureCapture {
    url?: string;
    viewport?: [number, number];
    rect?: FigmaCapture["rect"];
    count: number;
    elements: Record<string, Partial<FigmaElement>>;
}

const fixture = JSON.parse(fixtureText) as Record<string, FixtureCapture>;
const recording = await commands.figmaRecording();
const cache = new Map<string, Promise<FigmaCapture>>();

/** Every field read while recording, as `path<TAB>index<TAB>field` (index `-` for the capture). */
const reads = new Set<string>();
if (recording) {
    afterAll(() => commands.figmaRecordReads([...reads]));
}

/**
 * The capture, wrapped so that every field a test reads is written down (recording mode only).
 * @param path - the study path
 * @param capture - the capture as the study has it
 * @returns the watched capture
 */
function watched(path: string, capture: FigmaCapture): FigmaCapture {
    const note = (index: number | "-", field: string): void => {
        reads.add(`${path}\t${String(index)}\t${field}`);
    };
    const watchStyle = (index: number, style: Record<string, string>): Record<string, string> =>
        new Proxy(style, {
            get(target, key, receiver) {
                if (typeof key === "string") {
                    note(index, `style.${key}`);
                }
                return Reflect.get(target, key, receiver) as unknown;
            },
            has(target, key) {
                if (typeof key === "string") {
                    note(index, `style.${key}`);
                }
                return Reflect.has(target, key);
            },
            ownKeys(target) {
                Object.keys(target).forEach((key) => {
                    note(index, `style.${key}`);
                });
                return Reflect.ownKeys(target);
            },
        });
    const elements = capture.elements.map((e, i) => {
        e.index = i;
        const style = watchStyle(i, e.style);
        return new Proxy(e, {
            get(target, key, receiver) {
                if (key === "style") {
                    note(i, "style");
                    return style;
                }
                if (typeof key === "string" && key !== "index") {
                    note(i, key);
                }
                return Reflect.get(target, key, receiver) as unknown;
            },
        });
    });
    return new Proxy(
        { ...capture, elements },
        {
            get(target, key, receiver) {
                if (typeof key === "string" && key !== "elements") {
                    note("-", key);
                }
                return Reflect.get(target, key, receiver) as unknown;
            },
        },
    );
}

/**
 * A capture rebuilt from the fixture: `elements` keeps the study's length and indices, with only
 * the elements (and fields) the tests read.
 * @param path - the study path
 * @returns the capture
 */
function fromFixture(path: string): FigmaCapture {
    const entry = fixture[path] as FixtureCapture | undefined;
    if (!entry) {
        throw new Error(
            `${path} is not in tests/figma/figma-fixture.json; regenerate it: node tests/figma/figma-fixture.mjs build`,
        );
    }
    const elements = new Array<FigmaElement>(entry.count);
    for (const [index, e] of Object.entries(entry.elements)) {
        elements[Number(index)] = { ...e, index: Number(index) } as FigmaElement;
    }
    return { url: entry.url ?? "", viewport: entry.viewport ?? [0, 0], rect: entry.rect ?? null, elements };
}

/**
 * Whether the Figma captures can be read. Always true: the fixture is committed.
 * @returns true
 */
export function figmaAvailable(): Promise<boolean> {
    return Promise.resolve(true);
}

/**
 * Load a capture.
 * @param path - e.g. `bc/btn-primary-md-enabled--default` or `dark-theme/dark-panel-rect`
 * @returns the capture, with each element's index filled in
 */
export function figmaCapture(path: string): Promise<FigmaCapture> {
    const key = studyPath(path);
    let hit = cache.get(key);
    if (!hit) {
        hit = recording
            ? commands.readFigmaCapture(key).then((raw) => watched(key, raw as FigmaCapture))
            : Promise.resolve(fromFixture(key));
        cache.set(key, hit);
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
