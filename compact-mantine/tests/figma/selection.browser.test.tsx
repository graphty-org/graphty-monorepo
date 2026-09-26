/**
 * The selection controls against the Figma study (design/figma-spec.md 4.2, 5): every expected
 * value is read from the capture the spec cites (figmaElement / figmaSpec), except where Figma
 * draws the state in a pseudo element the capture could not see (the switch track and knob) or
 * has no counterpart at all (Radio, Slider, NavLink, Pagination, Stepper, Burger); those compare
 * against the token values the spec's tables give.
 *
 * States are driven with real input (hover, press, keyboard focus) through the harness.
 */
import {
    Anchor,
    Burger,
    Checkbox,
    NavLink,
    Pagination,
    Radio,
    SegmentedControl,
    Slider,
    Stepper,
    Switch,
    Tabs,
    Tooltip,
} from "@mantine/core";
import { commands, page, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it } from "vitest";

import { AlignmentMatrix } from "../../src/components/selection/AlignmentMatrix";
import {
    drive,
    type DriveState,
    expectMeasured,
    figmaAvailable,
    figmaCapture,
    type FigmaElement,
    figmaElement,
    figmaSpec,
    type MeasureSpec,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

afterEach(resetHarness);

const FACE = ["width", "height", "backgroundColor", "borderTopColor", "borderTopWidth", "borderStyle", "borderRadius", "outline", "outlineOffset"];
const TYPE = ["fontSize", "lineHeight", "fontWeight", "letterSpacing"];

/** A glyph for the segmented options, 24 x 24 like Figma's icon boxes. */
function Glyph(): React.JSX.Element {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" />
        </svg>
    );
}

const ALIGN_OPTIONS = [
    { value: "left", label: <Glyph /> },
    { value: "center", label: <Glyph /> },
    { value: "right", label: <Glyph /> },
];

const available = await figmaAvailable();

/** The checkbox face (the 16 x 16 span) inside a capture's region. */
async function checkboxFace(path: string): Promise<FigmaElement> {
    const capture = await figmaCapture(path);
    const r = capture.rect ?? { x: 0, y: 0, width: Infinity, height: Infinity };
    const found = capture.elements.filter(
        (e) =>
            e.tag === "span" &&
            e.box[2] === 16 &&
            e.box[3] === 16 &&
            e.style.borderRadius === "2px" &&
            e.box[0] >= r.x &&
            e.box[1] >= r.y &&
            e.box[0] < r.x + r.width &&
            e.box[1] < r.y + r.height,
    );
    if (found.length !== 1) {
        throw new Error(`${path}: ${String(found.length)} checkbox faces in the region`);
    }
    return found[0];
}

/**
 * Drive a state, then let a 100ms colour transition (checkbox fill, switch track) finish.
 * @param el - the element
 * @param state - the state
 */
async function settle(el: HTMLElement, state: DriveState): Promise<void> {
    await drive(el, state);
    await new Promise((resolve) => setTimeout(resolve, 150));
}

/**
 * The RGB pixels of an element as the browser painted it, row by row.
 * @param el - the element to capture
 * @returns rows of [r, g, b]
 */
async function pixels(el: HTMLElement): Promise<number[][][]> {
    // At vitest's default 414 x 896 viewport the test frame is scaled down to fit the runner's
    // window, and so are its screenshots; a smaller viewport paints them 1:1.
    await page.viewport(600, 400);
    let base64: string;
    try {
        base64 = await page.screenshot({ element: el, base64: true, save: false });
    } finally {
        await page.viewport(414, 896);
    }
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return Array.from({ length: bitmap.height }, (_, y) =>
        Array.from({ length: bitmap.width }, (_, x) => Array.from(data.slice((y * bitmap.width + x) * 4, (y * bitmap.width + x) * 4 + 3))),
    );
}

describe.skipIf(!available)("Checkbox (5.4)", () => {
    const neutral = (props: Record<string, unknown> = {}) => (
        <Checkbox variant="neutral" aria-label="Clip content" {...props} />
    );

    it.each([
        ["unchecked", {}, "bc/checkbox-neutral-unchecked--default", "rest"],
        ["unchecked hover", {}, "bc/checkbox-neutral-unchecked--hover", "hover"],
        ["unchecked pressed", {}, "bc/checkbox-neutral-unchecked--pressed", "press"],
        ["checked", { defaultChecked: true }, "bc/checkbox-neutral-checked--default", "rest"],
        ["checked hover", { defaultChecked: true }, "bc/checkbox-neutral-checked--hover", "hover"],
        ["checked pressed", { defaultChecked: true }, "bc/checkbox-neutral-checked--pressed", "press"],
        ["checked focus", { defaultChecked: true }, "bc/checkbox-neutral-checked--focus", "focus"],
        ["mixed", { indeterminate: true }, "bc/checkbox-neutral-mixed--default", "rest"],
        ["disabled", { disabled: true }, "bc/checkbox-neutral-unchecked-disabled--default", "rest"],
        ["disabled checked", { disabled: true, defaultChecked: true }, "bc/checkbox-neutral-checked-disabled--default", "rest"],
    ] as const)("neutral %s matches %s", async (_name, props, capture, state) => {
        const figma = await checkboxFace(capture);
        const { container } = await renderFigma(neutral(props));
        const input = part(container, "input");
        await settle(input, state);
        expectMeasured(input, figmaSpec(figma, FACE));
    });

    it.each([
        ["unchecked", {}, "bc/checkbox-blue-unchecked--default", "rest"],
        ["checked", { defaultChecked: true }, "bc/checkbox-blue-checked--default", "rest"],
        ["checked hover", { defaultChecked: true }, "bc/checkbox-blue-checked--hover", "hover"],
        ["checked pressed", { defaultChecked: true }, "bc/checkbox-blue-checked--pressed", "press"],
        ["mixed", { indeterminate: true }, "bc/checkbox-blue-mixed--default", "rest"],
        ["disabled checked", { disabled: true, defaultChecked: true }, "bc/checkbox-blue-checked-disabled--default", "rest"],
        ["disabled mixed", { disabled: true, indeterminate: true }, "bc/checkbox-blue-mixed-disabled--default", "rest"],
    ] as const)("blue (default variant) %s matches %s", async (_name, props, capture, state) => {
        const figma = await checkboxFace(capture);
        const { container } = await renderFigma(<Checkbox aria-label="Export" {...props} />);
        const input = part(container, "input");
        await settle(input, state);
        expectMeasured(input, figmaSpec(figma, FACE));
    });

    it("dark neutral matches the dark Clip content checkbox, and its focus ring", async () => {
        const rest = await checkboxFace("dt/dark-checkbox-clip-content--default");
        const focus = await checkboxFace("dt/dark-checkbox-clip-content--focus");
        const { container } = await renderFigma(neutral(), { scheme: "dark" });
        const input = part(container, "input");
        expectMeasured(input, figmaSpec(rest, FACE));
        await drive(input, "focus");
        expectMeasured(input, figmaSpec(focus, FACE));
    });

    it("the label is 11/16 450, 8px after the box, in a 24 row", async () => {
        const figma = await figmaElement("bc/checkbox-show-in-exports--default", { index: 31 });
        const { container } = await renderFigma(<Checkbox variant="neutral" label="Show in exports" />);
        const label = part(container, "label");
        expectMeasured(label, figmaSpec(figma, [...TYPE, "color", "paddingLeft"]));
        const box = part(container, "input");
        expect(label.getBoundingClientRect().left - box.getBoundingClientRect().left).toBeCloseTo(16, 1);
        expectMeasured(part(container, ".cm-checkbox-body"), { height: 24 });
        expectMeasured(box, { y: 4 }, { origin: part(container, ".cm-checkbox-body") });
    });

    it("the neutral glyph is the ink colour, the blue glyph white", async () => {
        const { container } = await renderFigma(
            <>
                <Checkbox variant="neutral" defaultChecked aria-label="a" />
                <Checkbox defaultChecked aria-label="b" />
            </>,
        );
        const [neutralIcon, blueIcon] = container.querySelectorAll(".cm-checkbox-icon");
        expectMeasured(neutralIcon, { color: "#000000e5", opacity: "1" });
        expectMeasured(blueIcon, { color: "#ffffff", opacity: "1" });
    });

    it("the tick is Figma's path: box 6.5 x 6 at (5, 5) of the face (bc/checkbox-neutral-mixed--default)", async () => {
        const { container } = await renderFigma(neutral({ defaultChecked: true }));
        const glyph = part(container, ".cm-checkbox-glyph") as unknown as SVGPathElement;
        const b = glyph.getBBox();
        expect([b.x, b.y, b.width, b.height]).toEqual([5, 5, 6.5, 6]);
    });

    it.each([
        // Read off the 28px captures, whose face starts at (6, 6): the bar, and what borders it
        // (the face fill on the neutral box, the 4px halo #0c89e5 on the blue one).
        ["neutral", "neutral", [25, 25, 25], [245, 245, 245]],
        ["blue", "default", [255, 255, 255], [12, 137, 229]],
    ] as const)("%s mixed: the dash is a solid 7 x 2 bar on face rows 7-8, columns 4-10 (bc/checkbox-*-mixed--default.png)", async (_name, variant, ink, fill) => {
        const { container } = await renderFigma(
            <Checkbox variant={variant === "neutral" ? "neutral" : undefined} indeterminate aria-label="Mixed" />,
        );
        const face = part(container, "input");
        await settle(face, "rest");
        const rows = await pixels(face);
        expect([rows.length, rows[0].length]).toEqual([16, 16]);
        const near = (px: number[], want: readonly number[]): boolean => px.every((c, i) => Math.abs(c - want[i]) <= 3);
        for (const y of [7, 8]) {
            for (let x = 4; x <= 10; x++) {
                expect(near(rows[y][x], ink), `ink at ${String(x)},${String(y)}: ${rows[y][x].join(",")}`).toBe(true);
            }
            expect(near(rows[y][3], fill), `fill left of the bar, row ${String(y)}`).toBe(true);
            expect(near(rows[y][11], fill), `fill right of the bar, row ${String(y)}`).toBe(true);
        }
        for (let x = 4; x <= 10; x++) {
            expect(near(rows[6][x], fill), `fill above the bar at ${String(x)}`).toBe(true);
            expect(near(rows[9][x], fill), `fill below the bar at ${String(x)}`).toBe(true);
        }
    });

    it.each([
        ["hover", "#e6e6e6"],
        ["pressed", "#d9d9d9"],
    ] as const)("a forced %s state on a checked neutral box draws the real state's fill (the States story)", async (state, fill) => {
        const { container } = await renderFigma(neutral({ defaultChecked: true, "data-cm-state": state }));
        expectMeasured(part(container, "input"), { backgroundColor: fill });
    });

    it("the AA option raises the face edge to 3:1 (#00000073)", async () => {
        const { container } = await renderFigma(neutral(), { highContrast: true });
        expectMeasured(part(container, "input"), { borderTopColor: "#00000073" });
    });

    it("Space toggles it", async () => {
        const { container } = await renderFigma(neutral());
        const input = part(container, "input") as HTMLInputElement;
        await drive(input, "focus");
        await userEvent.keyboard(" ");
        expect(input.checked).toBe(true);
    });
});

describe.skipIf(!available)("Switch (5.5)", () => {
    const TRACK = { width: 32, height: 16, borderRadius: "9999px", borderTopWidth: "1px" };

    it("matches the capture's 32 x 24 hit area and 32 x 16 track", async () => {
        const hit = await figmaElement("bc/specimen-switch-off--default", { index: 59 });
        const track = await figmaElement("bc/specimen-switch-off--default", { index: 61 });
        const { container } = await renderFigma(<Switch aria-label="Show icon" />);
        expectMeasured(part(container, ".cm-switch-body"), { height: hit.box[3] });
        expectMeasured(part(container, ".cm-switch-track"), figmaSpec(track, ["width", "height", "borderRadius"]));
        expectMeasured(part(container, ".cm-switch-track"), { y: 4 }, { origin: part(container, ".cm-switch-body") });
    });

    it.each([
        ["off", {}, "rest", { backgroundColor: "#f5f5f5", borderTopColor: "#00000033" }, 4, "#00000033"],
        ["off hover", {}, "hover", { backgroundColor: "#e6e6e6" }, 4, "#00000033"],
        ["off pressed", {}, "press", { backgroundColor: "#d9d9d9" }, 4, "#00000033"],
        ["on", { defaultChecked: true }, "rest", { backgroundColor: "#0d99ff", borderTopColor: "#00000033" }, 16, "#0000001a"],
        ["on hover", { defaultChecked: true }, "hover", { backgroundColor: "#0d99ff" }, 16, "#0000001a"],
        ["on pressed", { defaultChecked: true }, "press", { backgroundColor: "#007be5" }, 16, "#0000001a"],
    ] as const)("%s: track and a 12 x 8 knob at x+%s", async (_name, props, state, track, knobX, outline) => {
        const { container } = await renderFigma(<Switch aria-label="Show icon" {...props} />);
        const trackEl = part(container, ".cm-switch-track");
        await settle(trackEl, state);
        expectMeasured(trackEl, { ...TRACK, ...track });
        expectMeasured(
            part(container, ".cm-switch-thumb"),
            { width: 12, height: 8, x: knobX, y: 4, backgroundColor: "#ffffff", boxShadow: `${outline} 0px 0px 0px 1px` },
            { origin: trackEl },
        );
    });

    it("mixed (data-indeterminate): brand track, a 10 x 2 bar centred at x+11", async () => {
        const { container } = await renderFigma(<Switch aria-label="Show icon" data-indeterminate />);
        const trackEl = part(container, ".cm-switch-track");
        expectMeasured(trackEl, { backgroundColor: "#0d99ff" });
        expectMeasured(part(container, ".cm-switch-thumb"), { width: 10, height: 2, x: 11, y: 7 }, { origin: trackEl });
    });

    it("disabled off and on", async () => {
        const { container } = await renderFigma(
            <>
                <Switch aria-label="a" disabled />
                <Switch aria-label="b" disabled defaultChecked />
            </>,
        );
        const [off, on] = container.querySelectorAll<HTMLElement>(".cm-switch-track");
        const [offKnob, onKnob] = container.querySelectorAll<HTMLElement>(".cm-switch-thumb");
        expectMeasured(off, { backgroundColor: "#00000000", borderTopColor: "#e6e6e6" });
        expectMeasured(offKnob, { backgroundColor: "#0000004d" });
        expectMeasured(on, { backgroundColor: "#d9d9d9" });
        expectMeasured(onKnob, { backgroundColor: "#ffffff" });
    });

    it("focus: the strong ring on the track, offset 1 (bc/specimen-switch-on--focus #27)", async () => {
        const figma = await figmaElement("bc/specimen-switch-on--focus", { index: 27 });
        const { container } = await renderFigma(<Switch aria-label="Show icon" defaultChecked />);
        await drive(part(container, "input"), "focus");
        expectMeasured(part(container, ".cm-switch-track"), figmaSpec(figma, ["outline", "outlineOffset"]));
    });

    it("dark: the neutral track and brand fill", async () => {
        const { container } = await renderFigma(
            <>
                <Switch aria-label="a" />
                <Switch aria-label="b" defaultChecked />
            </>,
            { scheme: "dark" },
        );
        const [off, on] = container.querySelectorAll<HTMLElement>(".cm-switch-track");
        expectMeasured(off, { backgroundColor: "#383838", borderTopColor: "#ffffff33" });
        expectMeasured(on, { backgroundColor: "#0c8ce9" });
    });
});

describe.skipIf(!available)("Radio (5.6)", () => {
    it("16 circle on the checkbox colours; checked brand with a 6px white dot", async () => {
        const { container } = await renderFigma(
            <>
                <Radio aria-label="a" />
                <Radio aria-label="b" defaultChecked />
            </>,
        );
        const [off, on] = container.querySelectorAll<HTMLElement>("input");
        expectMeasured(off, { width: 16, height: 16, backgroundColor: "#f5f5f5", borderTopColor: "#00000033" });
        expectMeasured(on, { backgroundColor: "#0d99ff", borderTopColor: "#0000001a" });
        expectMeasured(container.querySelectorAll<HTMLElement>(".cm-radio-icon")[1], { width: 6, height: 6, color: "#ffffff", opacity: "1" });
        await drive(off, "focus");
        expectMeasured(off, { outline: "#0d99ff solid 1px", outlineOffset: "1px" });
    });
});

describe.skipIf(!available)("SegmentedControl, panel (5.2)", () => {
    it("light: the 88 track, 29.3 options, the checked face and the unchecked ink", async () => {
        const track = await figmaElement("bc/segmented-text-align-group", { index: 53 });
        const face = await figmaElement("bc/segmented-text-align-group", { index: 56 });
        const inkOff = await figmaElement("bc/segmented-text-align-group", { index: 64 });
        const { container } = await renderFigma(<SegmentedControl w={88} data={ALIGN_OPTIONS} />);
        expectMeasured(part(container, ".cm-sc"), figmaSpec(track, ["width", "height", "backgroundColor", "borderRadius", "paddingTop", "paddingLeft"]));
        const [first, second] = container.querySelectorAll<HTMLElement>(".cm-sc-label");
        expectMeasured(first, figmaSpec(face, ["width", "height", "backgroundColor", "borderRadius", "boxShadow"]));
        expectMeasured(second, { color: inkOff.style.fill, backgroundColor: "#00000000", boxShadow: "none" });
    });

    it("184 wide with four options shares 46 each", async () => {
        const option = await figmaElement("bc/segmented-flow-group", { index: 38 });
        const { container } = await renderFigma(
            <SegmentedControl w={184} data={["a", "b", "c", "d"].map((v) => ({ value: v, label: <Glyph /> }))} />,
        );
        expectMeasured(part(container, ".cm-sc-label"), figmaSpec(option, ["width", "height"]));
    });

    it("no hover fill", async () => {
        const { container } = await renderFigma(<SegmentedControl w={88} data={ALIGN_OPTIONS} />);
        const second = container.querySelectorAll<HTMLElement>(".cm-sc-label")[1];
        await drive(second, "hover");
        expectMeasured(second, { backgroundColor: "#00000000" });
    });

    it("keyboard focus rings the checked face at +1 (bc/segmented-text-align-center--focus #35)", async () => {
        const figma = await figmaElement("bc/segmented-text-align-center--focus", { index: 35 });
        const { container } = await renderFigma(<SegmentedControl w={88} data={ALIGN_OPTIONS} defaultValue="center" />);
        await drive(part(container, "input:checked"), "focus");
        expectMeasured(container.querySelectorAll<HTMLElement>(".cm-sc-label")[1], figmaSpec(figma, ["outline", "outlineOffset", "borderRadius"]));
    });

    it("dark: the #383838 track and the #2c2c2c face with the #444 edge", async () => {
        const track = await figmaElement("dt/dark-segmented-text-align-center--default", { index: 28 });
        const face = await figmaElement("dt/dark-segmented-text-align-center--default", { index: 31 });
        const { container } = await renderFigma(<SegmentedControl w={88} data={ALIGN_OPTIONS} />, { scheme: "dark" });
        expectMeasured(part(container, ".cm-sc"), figmaSpec(track, ["backgroundColor", "borderRadius"]));
        expectMeasured(part(container, ".cm-sc-label"), figmaSpec(face, ["width", "height", "backgroundColor", "boxShadow", "color"]));
    });

    it("text options: 11/16 450, padding 0 8", async () => {
        const { container } = await renderFigma(<SegmentedControl data={["Basic", "Dynamic", "Brush"]} />);
        expectMeasured(part(container, ".cm-sc-label"), {
            fontSize: "11px",
            lineHeight: "16px",
            fontWeight: "450",
            paddingLeft: "8px",
            paddingRight: "8px",
            height: 24,
        });
    });

    it("the AA option gives the checked face a 3:1 edge", async () => {
        const { container } = await renderFigma(<SegmentedControl w={88} data={ALIGN_OPTIONS} />, { highContrast: true });
        expectMeasured(part(container, ".cm-sc-label"), { boxShadow: "#00000073 0px 0px 0px 1px inset" });
    });

    it("an option activates on mouse-down, and the click after it changes nothing more", async () => {
        const changes: string[] = [];
        const { container } = await renderFigma(
            <SegmentedControl w={88} data={ALIGN_OPTIONS} onChange={(v) => changes.push(v)} />,
        );
        const second = container.querySelectorAll<HTMLElement>(".cm-sc-label")[1];
        await drive(second, "press");
        expect(changes).toEqual(["center"]);
        expect(second.hasAttribute("data-active")).toBe(true);
        await commands.mouseUp();
        expect(changes).toEqual(["center"]);
    });
});

describe.skipIf(!available)("SegmentedControl variant=toolbar (5.3)", () => {
    const MODES = ["draw", "design", "motion", "dev"].map((v) => ({ value: v, label: <Glyph /> }));

    it("122 x 32 track, padding 2; the thumb 28 x 28 radius 3 on the selected option", async () => {
        const root = await figmaElement("bc/segmented-toolbelt-mode--default", { index: 26 });
        const thumb = await figmaElement("bc/segmented-toolbelt-mode--default", { index: 29 });
        const { container } = await renderFigma(<SegmentedControl variant="toolbar" data={MODES} defaultValue="design" />);
        expectMeasured(part(container, ".cm-sc"), figmaSpec(root, ["width", "height", "backgroundColor", "borderRadius", "paddingTop", "paddingLeft"]));
        const selected = container.querySelectorAll<HTMLElement>(".cm-sc-label")[1];
        expectMeasured(selected, figmaSpec(thumb, ["width", "height", "backgroundColor", "borderRadius", "boxShadow"]));
        expectMeasured(selected, { color: "#007be5" });
    });

    it("hover fills an unselected option #e6e6e6 (bc/segmented-toolbelt-option--hover #31)", async () => {
        const figma = await figmaElement("bc/segmented-toolbelt-option--hover", { index: 31 });
        const { container } = await renderFigma(<SegmentedControl variant="toolbar" data={MODES} defaultValue="design" />);
        const first = part(container, ".cm-sc-label");
        await drive(first, "hover");
        expectMeasured(first, figmaSpec(figma, ["width", "height", "backgroundColor", "borderRadius"]));
    });

    it("focus rings the option at -1 (bc/segmented-toolbelt-option-selected--focus #30)", async () => {
        const figma = await figmaElement("bc/segmented-toolbelt-option-selected--focus", { index: 30 });
        const { container } = await renderFigma(<SegmentedControl variant="toolbar" data={MODES} defaultValue="draw" />);
        await drive(part(container, "input"), "focus");
        expectMeasured(part(container, ".cm-sc-label"), figmaSpec(figma, ["outline", "outlineOffset", "borderRadius"]));
    });

    it("dark track is #444", async () => {
        const { container } = await renderFigma(<SegmentedControl variant="toolbar" data={MODES} />, { scheme: "dark" });
        expectMeasured(part(container, ".cm-sc"), { backgroundColor: "#444444" });
    });
});

describe.skipIf(!available)("SegmentedControl variant=loose (5.2)", () => {
    it("24 x 24 options 4 apart, the selected one #f5f5f5", async () => {
        const { container } = await renderFigma(
            <SegmentedControl variant="loose" data={["a", "b", "c"].map((v) => ({ value: v, label: <Glyph /> }))} />,
        );
        const [first, second] = container.querySelectorAll<HTMLElement>(".cm-sc-label");
        expectMeasured(first, { width: 24, height: 24, backgroundColor: "#f5f5f5", borderRadius: "5px" });
        expectMeasured(second, { backgroundColor: "#00000000", x: 28 }, { origin: first });
    });
});

describe.skipIf(!available)("Tabs, pills (5.1)", () => {
    const tabs = (
        <Tabs defaultValue="design">
            <Tabs.List>
                <Tabs.Tab value="design">Design</Tabs.Tab>
                <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
            </Tabs.List>
        </Tabs>
    );
    // Width is left out: the bundled Inter sets these words about 1px narrower than the Inter
    // the capture machine had; the padding, type and reservation below pin the geometry.
    const TAB = ["height", "backgroundColor", "color", "paddingLeft", "paddingRight", "borderRadius", ...TYPE];

    it("light: selected and unselected tabs, the reserved widths and the 4 gap", async () => {
        const list = await figmaElement("bc/tab-design--default", { index: 34 });
        const selected = await figmaElement("bc/tab-design--default", { index: 35 });
        const unselected = await figmaElement("bc/tab-design--default", { index: 38 });
        const { container } = await renderFigma(tabs);
        const [design, prototype] = container.querySelectorAll<HTMLElement>("[role=tab]");
        expectMeasured(part(container, "[role=tablist]"), figmaSpec(list, ["height", "gap"]));
        expectMeasured(prototype, { x: design.getBoundingClientRect().width + 4 }, { origin: design });
        expectMeasured(design, figmaSpec(selected, TAB));
        expectMeasured(prototype, figmaSpec(unselected, TAB));
    });

    it("hover on an unselected tab (bc/tab-prototype--hover #31)", async () => {
        const figma = await figmaElement("bc/tab-prototype--hover", { index: 31 });
        const { container } = await renderFigma(tabs);
        const prototype = container.querySelectorAll<HTMLElement>("[role=tab]")[1];
        await drive(prototype, "hover");
        expectMeasured(prototype, figmaSpec(figma, TAB));
    });

    it("focus (bc/tab-design--focus #35)", async () => {
        const figma = await figmaElement("bc/tab-design--focus", { index: 35 });
        const { container } = await renderFigma(tabs);
        const design = part(container, "[role=tab]");
        await drive(design, "focus");
        expectMeasured(design, figmaSpec(figma, [...TAB, "outline", "outlineOffset"]));
    });

    it("dark (dt/dark-prototype-tab-frame #73, #76)", async () => {
        const unselected = await figmaElement("dt/dark-prototype-tab-frame", { index: 73 });
        const selected = await figmaElement("dt/dark-prototype-tab-frame", { index: 76 });
        const { container } = await renderFigma(
            <Tabs defaultValue="prototype">
                <Tabs.List>
                    <Tabs.Tab value="design">Design</Tabs.Tab>
                    <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                </Tabs.List>
            </Tabs>,
            { scheme: "dark" },
        );
        const [design, prototype] = container.querySelectorAll<HTMLElement>("[role=tab]");
        expectMeasured(design, figmaSpec(unselected, TAB));
        expectMeasured(prototype, figmaSpec(selected, TAB));
    });

    it("selecting never changes a tab's width", async () => {
        const { container } = await renderFigma(tabs);
        const prototype = container.querySelectorAll<HTMLElement>("[role=tab]")[1];
        const before = prototype.getBoundingClientRect().width;
        await userEvent.click(prototype);
        expect(prototype.getAttribute("aria-selected")).toBe("true");
        expect(prototype.getBoundingClientRect().width).toBeCloseTo(before, 3);
    });

    it("activates on mouse-down, reports once, and the arrows select", async () => {
        const changes: (string | null)[] = [];
        const { container } = await renderFigma(
            <Tabs defaultValue="design" onChange={(v) => changes.push(v)}>
                <Tabs.List>
                    <Tabs.Tab value="design">Design</Tabs.Tab>
                    <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                </Tabs.List>
            </Tabs>,
        );
        const [design, prototype] = container.querySelectorAll<HTMLElement>("[role=tab]");
        await drive(prototype, "press");
        expect(prototype.getAttribute("aria-selected")).toBe("true");
        await commands.mouseUp();
        expect(changes).toEqual(["prototype"]);
        design.focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(prototype);
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(design);
        expect(design.getAttribute("aria-selected")).toBe("true");
    });
});

describe.skipIf(!available)("AlignmentMatrix (5.7)", () => {
    it("light: the 88 x 56 box, idle dots and the brand bars of the chosen cell", async () => {
        const box = await figmaElement("bc/alignment-grid-9", { index: 25 });
        const dot = await figmaElement("bc/alignment-grid-9", { index: 30 });
        const bars = [52, 53, 54].map((index) => figmaElement("bc/alignment-grid-9", { index }));
        const { container } = await renderFigma(<AlignmentMatrix defaultValue="top-left" />);
        const root = part(container, ".cm-align");
        expectMeasured(root, figmaSpec(box, ["width", "height", "backgroundColor", "borderRadius", "borderTopWidth", "borderTopColor"]));
        const dots = container.querySelectorAll<HTMLElement>(".cm-align-dot");
        expectMeasured(dots[1], figmaSpec(dot, ["width", "height", "backgroundColor", "borderRadius"]));
        expectMeasured(dots[1], { x: dot.box[0] - box.box[0], y: dot.box[1] - box.box[1] }, { origin: root });
        const drawn = container.querySelectorAll<HTMLElement>("[data-checked] .cm-align-bar");
        for (const [i, figma] of (await Promise.all(bars)).entries()) {
            expectMeasured(drawn[i], figmaSpec(figma, ["width", "height", "backgroundColor", "borderRadius"]));
            expectMeasured(drawn[i], { x: figma.box[0] - box.box[0], y: figma.box[1] - box.box[1] }, { origin: root });
        }
    });

    it("hover previews the bars in the secondary ink (bc/alignment-grid-cell--hover #39)", async () => {
        const figma = await figmaElement("bc/alignment-grid-cell--hover", { index: 39 });
        const { container } = await renderFigma(<AlignmentMatrix defaultValue="top-left" />);
        const center = part(container, '[data-value="middle-center"]');
        await drive(center, "hover");
        expectMeasured(center.querySelector(".cm-align-bar") as Element, figmaSpec(figma, ["width", "height", "backgroundColor"]));
    });

    it("dark, direction horizontal: vertical bars (dt/dark-alignment-grid-cell--hover #45-#47)", async () => {
        const box = await figmaElement("dt/dark-alignment-grid-cell--hover", { index: 24 });
        const bar = await figmaElement("dt/dark-alignment-grid-cell--hover", { index: 46 });
        const { container } = await renderFigma(<AlignmentMatrix direction="horizontal" />, { scheme: "dark" });
        expectMeasured(part(container, ".cm-align"), figmaSpec(box, ["backgroundColor"]));
        const drawn = container.querySelectorAll<HTMLElement>("[data-checked] .cm-align-bar")[1];
        expectMeasured(drawn, figmaSpec(bar, ["width", "height", "backgroundColor"]));
        expectMeasured(drawn, { x: bar.box[0] - box.box[0], y: bar.box[1] - box.box[1] }, { origin: part(container, ".cm-align") });
    });

    it("focus outlines the box (bc/alignment-grid-cell--focus #24); the arrows move in two dimensions", async () => {
        const figma = await figmaElement("bc/alignment-grid-cell--focus", { index: 24 });
        const values: string[] = [];
        const { container } = await renderFigma(<AlignmentMatrix onChange={(v) => values.push(v)} />);
        await drive(part(container, "input"), "focus");
        expectMeasured(part(container, ".cm-align"), figmaSpec(figma, ["outline", "outlineOffset"]));
        await userEvent.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowUp}");
        expect(values).toEqual(["middle-left", "middle-center", "middle-right", "top-right"]);
        expect((document.activeElement as HTMLInputElement).value).toBe("top-right");
    });

    it("tooltips sit on the radios: aria-describedby on the focused radio, one tooltip at a time, instant hand-off", async () => {
        // The shell wraps one Tooltip.Group around the whole app (src/theme/components/overlays.ts).
        const { container } = await renderFigma(
            <Tooltip.Group>
                <div style={{ padding: 40 }}>
                    <AlignmentMatrix defaultValue="middle-center" />
                </div>
            </Tooltip.Group>,
        );
        const tips = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".mantine-Tooltip-tooltip")];
        const until = async (ok: () => boolean, timeout: number): Promise<void> => {
            const start = performance.now();
            while (!ok()) {
                if (performance.now() - start > timeout) {
                    throw new Error("timed out");
                }
                await new Promise((r) => setTimeout(r, 10));
            }
        };
        const center = part(container, 'input[value="middle-center"]');
        await drive(center, "focus");
        await until(() => tips().length === 1, 2000);
        expect(tips()[0].textContent).toBe("Align center");
        expect(document.activeElement).toBe(center);
        expect(center.getAttribute("aria-describedby")).toBe(tips()[0].id);

        const t0 = performance.now();
        await userEvent.hover(part(container, 'input[value="top-left"]'));
        await until(() => tips().length === 1 && tips()[0].textContent === "Align top left", 1000);
        expect(performance.now() - t0).toBeLessThan(250);
        expect(document.activeElement).toBe(center);
    });
});

describe.skipIf(!available)("Anchor (4.2)", () => {
    const LINK = ["color", "borderRadius", "cursor", ...TYPE];

    it("the inline link (bc/link-learn-more--default #27), hover unchanged, focus ring", async () => {
        const rest = await figmaElement("bc/link-learn-more--default", { index: 27 });
        const hover = await figmaElement("bc/link-learn-more--hover", { index: 27 });
        const focus = await figmaElement("bc/link-learn-more--focus", { index: 27 });
        const { container } = await renderFigma(<Anchor href="#more">{`Learn more ${String.fromCharCode(0x2192)}`}</Anchor>);
        const link = part(container, "a");
        expectMeasured(link, figmaSpec(rest, LINK));
        await drive(link, "hover");
        expectMeasured(link, { ...figmaSpec(hover, LINK), textDecorationLine: "none" });
        await drive(link, "focus");
        expectMeasured(link, figmaSpec(focus, [...LINK, "outline", "outlineOffset"]));
    });

    it("pressed draws the #e5f4ff pill 4 above and below, 8 each side", async () => {
        const { container } = await renderFigma(<Anchor href="#b">Button</Anchor>);
        const link = part(container, "a");
        await drive(link, "press");
        expectMeasured(link, { backgroundColor: "#e5f4ff", borderRadius: "5px", top: "-4px", left: "-8px" }, { pseudo: "::before" });
    });

    it("the secondary link: hover (ls/header-drafts-hover #27) and focus (ls/header-focus-drafts #60)", async () => {
        const hover = await figmaElement("ls/header-drafts-hover", { index: 27 });
        const focus = await figmaElement("ls/header-focus-drafts", { index: 60 });
        const { container } = await renderFigma(<Anchor variant="secondary" href="#drafts">Drafts</Anchor>);
        const link = part(container, "a");
        expectMeasured(link, figmaSpec(focus, ["height", "color", "paddingLeft", "paddingRight", "borderRadius", ...TYPE]));
        await drive(link, "hover");
        expectMeasured(link, figmaSpec(hover, ["backgroundColor", "color"]));
        await resetHarness();
        const again = await renderFigma(<Anchor variant="secondary" href="#drafts">Drafts</Anchor>);
        const link2 = part(again.container, "a");
        await drive(link2, "focus");
        expectMeasured(link2, figmaSpec(focus, ["outline", "outlineOffset", "color"]));
    });

    it("dark link colour is #7cc4f8", async () => {
        const { container } = await renderFigma(<Anchor href="#x">Link</Anchor>, { scheme: "dark" });
        expectMeasured(part(container, "a"), { color: "#7cc4f8" });
    });
});

describe.skipIf(!available)("Slider (5.8)", () => {
    it("8px track on the secondary fill with a 1px inset edge, brand bar, 12 white thumb", async () => {
        const { container } = await renderFigma(<Slider defaultValue={40} w={160} />);
        expectMeasured(part(container, ".cm-slider-track"), { height: 8 });
        expectMeasured(part(container, ".cm-slider-track"), { backgroundColor: "#f5f5f5", boxShadow: "#00000033 0px 0px 0px 1px inset" }, { pseudo: "::before" });
        expectMeasured(part(container, ".cm-slider-bar"), { backgroundColor: "#0d99ff" });
        const thumb = part(container, ".cm-slider-thumb");
        expectMeasured(thumb, { width: 12, height: 12, borderTopWidth: "2px", borderTopColor: "#ffffff", backgroundColor: "#ffffff" });
        await drive(thumb, "focus");
        expectMeasured(thumb, { outline: "#0d99ff solid 1px", outlineOffset: "-2px" });
    });

    it("disabled keeps the thumb, on the disabled colours", async () => {
        const { container } = await renderFigma(<Slider defaultValue={40} w={160} disabled />);
        expectMeasured(part(container, ".cm-slider-track"), { backgroundColor: "#ffffff", boxShadow: "#e6e6e6 0px 0px 0px 1px inset" }, { pseudo: "::before" });
        expectMeasured(part(container, ".cm-slider-thumb"), { display: "flex", backgroundColor: "#ffffff" });
    });
});

describe.skipIf(!available)("NavLink, Pagination, Stepper, Burger (5.9)", () => {
    const pill = (el: Element, spec: MeasureSpec): void => expectMeasured(el, spec, { pseudo: "::before" });

    it("NavLink: a 32 row with a 24 pill; hover and active fills; active 550", async () => {
        const { container } = await renderFigma(
            <>
                <NavLink href="#a" label="Page 1" />
                <NavLink href="#b" label="Page 2" active />
            </>,
        );
        const [row, active] = container.querySelectorAll<HTMLElement>(".cm-navlink");
        expectMeasured(row, { height: 32, backgroundColor: "#00000000" });
        pill(active, { backgroundColor: "#f5f5f5", borderRadius: "5px", top: "4px", left: "8px" });
        expectMeasured(part(active, ".cm-navlink-label"), { fontWeight: "550", fontSize: "11px", lineHeight: "16px" });
        await drive(row, "hover");
        pill(row, { backgroundColor: "#f5f5f5" });
        await drive(row, "focus");
        expectMeasured(row, { outline: "#0d99ff solid 1px" });
    });

    it("Pagination: 24 ghost controls, the active one #f5f5f5 550", async () => {
        const { container } = await renderFigma(<Pagination total={3} />);
        const active = part(container, ".cm-pagination-control[data-active]");
        expectMeasured(active, { width: 24, height: 24, backgroundColor: "#f5f5f5", fontWeight: "550", borderRadius: "5px" });
        const next = container.querySelectorAll<HTMLElement>(".cm-pagination-control:not([data-active])")[2];
        await drive(next, "hover");
        expectMeasured(next, { backgroundColor: "#0000000d" });
    });

    it("Stepper: 24 icons, pending #f5f5f5, active brand, 11/16 labels", async () => {
        const { container } = await renderFigma(
            <Stepper active={1}>
                <Stepper.Step label="One" />
                <Stepper.Step label="Two" />
                <Stepper.Step label="Three" />
            </Stepper>,
        );
        const icons = container.querySelectorAll<HTMLElement>(".cm-stepper-icon");
        expectMeasured(icons[0], { width: 24, height: 24, backgroundColor: "#0d99ff" });
        expectMeasured(icons[1], { backgroundColor: "#0d99ff" });
        expectMeasured(icons[2], { backgroundColor: "#f5f5f5" });
        expectMeasured(part(container, ".cm-stepper-label"), { fontSize: "11px", lineHeight: "16px" });
    });

    it("Burger: 18 box, 1.5px lines in the icon ink, the ring outside", async () => {
        const { container } = await renderFigma(<Burger aria-label="Menu" />);
        const lines = part(container, ".cm-burger-lines");
        expectMeasured(lines, { width: 18, height: 1.5, backgroundColor: "#000000e5" });
        const root = part(container, "button");
        await drive(root, "focus");
        expectMeasured(root, { outline: "#0d99ff solid 1px", outlineOffset: "1px" });
    });
});
