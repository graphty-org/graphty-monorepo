/**
 * The owner's input rules (design/ui/style-panel-v2/design.md, "Input rules (owner, 2026-11-23)") that a test can
 * see, on the REAL graphty-element and real clicks. Every thing of v2's own section table (things.ts) is added to a
 * layer from its section's "+", its row's settings pop-over is opened and every sub-group is added from the
 * pop-over's "+", and then:
 *
 * - the pop-over is at most 6 lines tall, two inputs on one line counting once;
 * - no pop-out a pop-over line opens (level 2) holds a control that opens another (level 3);
 * - on every line, the minus is the right-most button;
 * - the link or settings button sits on its control's line, right after the control;
 * - the link and settings buttons are hidden at rest, shown on hover;
 * - no input is empty: no blank number or text field, no segment line with nothing picked.
 *
 * The hover rule must also show the buttons on focus within the line and under (hover: none) (the owner uses an
 * iPad): the stylesheet check reads the rule that hides them.
 *
 * Each check compares what it finds with its committed known-violations list, exactly: a fixed thing must leave
 * its list, and nothing may join one. The lists only shrink, and are meant to be empty.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel, ChannelValue } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { TEXT_THINGS } from "../v2/labelRubric";
import { SECTIONS, type ThingSpec } from "../v2/things";
import { showKind } from "./kindTab";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

type Side = "node" | "edge";

// ------------------------------------------------------------------------------------------------
// Known violations, by `<side>.<thing id>`. A list may only shrink.
// ------------------------------------------------------------------------------------------------

/** Pop-overs more than 6 lines tall with every sub-group shown. */
const KNOWN_TALL: readonly string[] = [
    "edge.arrow",
    "edge.endCaption",
    "edge.label",
    "edge.line",
    "edge.route",
    "edge.tooltip",
    "edge.xlabel",
    "node.border",
    "node.chart",
    "node.image",
    "node.label",
    "node.pie",
    "node.size",
    "node.stripes",
    "node.tooltip",
    "node.xlabel",
];

/** Pop-overs with a level-2 pop-out that holds a control opening a third level. */
const KNOWN_THIRD_LEVEL: readonly string[] = ["edge.arrow", "edge.pattern", "node.plate"];

/**
 * A compact-mantine component's own inner pop-out, not counted as a third level: the app cannot change it
 * (compact-mantine is locked to Figma). `CompactColorInput`'s picker holds a Color format select; reported to the
 * owner as a question for compact-mantine, not an app defect.
 */
const COMPONENT_OWN: readonly string[] = ["Color format"];

/** Rows and pop-overs with a line whose minus is not its right-most button. */
const KNOWN_MINUS_NOT_LAST: readonly string[] = [
    "edge.animation",
    "edge.arrow",
    "edge.bundling",
    "edge.endCaption",
    "edge.label",
    "edge.line",
    "edge.outline",
    "edge.pattern",
    "edge.record",
    "edge.route",
    "edge.tooltip",
    "edge.visibility",
    "edge.xlabel",
    "node.border",
    "node.chart",
    "node.fill",
    "node.finish",
    "node.glow",
    "node.image",
    "node.label",
    "node.pie",
    "node.plate",
    "node.raised",
    "node.record",
    "node.rings",
    "node.shadow",
    "node.size",
    "node.stripes",
    "node.tooltip",
    "node.visibility",
    "node.wireframe",
    "node.xlabel",
];

/** Rows and pop-overs with a link or settings button not on its control's line, right after it. */
const KNOWN_SLOT_NOT_AFTER_CONTROL: readonly string[] = [
    "edge.animation",
    "edge.arrow",
    "edge.bundling",
    "edge.endCaption",
    "edge.label",
    "edge.outline",
    "edge.pattern",
    "edge.record",
    "edge.route",
    "edge.tooltip",
    "edge.visibility",
    "edge.xlabel",
    "node.border",
    "node.chart",
    "node.finish",
    "node.image",
    "node.label",
    "node.pie",
    "node.plate",
    "node.raised",
    "node.record",
    "node.rings",
    "node.shadow",
    "node.size",
    "node.stripes",
    "node.tooltip",
    "node.visibility",
    "node.wireframe",
    "node.xlabel",
];

/** Rows and pop-overs with a link or settings button shown with the pointer elsewhere and no focus in its line. */
const KNOWN_SHOWN_AT_REST: readonly string[] = [
    "edge.arrow",
    "edge.bundling",
    "edge.endCaption",
    "edge.label",
    "edge.line",
    "edge.outline",
    "edge.pattern",
    "edge.record",
    "edge.route",
    "edge.tooltip",
    "edge.visibility",
    "edge.xlabel",
    "node.border",
    "node.chart",
    "node.fill",
    "node.glow",
    "node.image",
    "node.label",
    "node.pie",
    "node.plate",
    "node.raised",
    "node.record",
    "node.rings",
    "node.shadow",
    "node.size",
    "node.stripes",
    "node.tooltip",
    "node.visibility",
    "node.wireframe",
    "node.xlabel",
];

/** Rows and pop-overs with an empty input. */
const KNOWN_EMPTY: readonly string[] = [
    "edge.arrow",
    "edge.bundling",
    "edge.endCaption",
    "edge.label",
    "edge.line",
    "edge.outline",
    "edge.pattern",
    "edge.record",
    "edge.route",
    "edge.tooltip",
    "edge.xlabel",
    "node.border",
    "node.chart",
    "node.glow",
    "node.image",
    "node.label",
    "node.pie",
    "node.plate",
    "node.raised",
    "node.record",
    "node.rings",
    "node.shadow",
    "node.size",
    "node.stripes",
    "node.tooltip",
    "node.xlabel",
];

/** The stylesheet rule hiding the link and settings buttons is missing or not limited to hover devices and no focus. */
const KNOWN_HOVER_RULE_MISSING = true;

// ------------------------------------------------------------------------------------------------
// The things walked: every thing of the section table but the shader gallery.
// ------------------------------------------------------------------------------------------------

/** Values written through the session, for things whose "+" opens a picker first (a source, a picture). */
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#00f"/></svg>',
)}`;

/**
 * What the layer must hold for a thing whose "+" waits on a picker, or undefined to add it from "+".
 * @param side - nodes or edges.
 * @param thing - the thing.
 * @returns the values to write.
 */
function written(side: Side, thing: ThingSpec): Readonly<Partial<Record<Channel, ChannelValue>>> | undefined {
    if (thing.id === "image") {
        return { "node.image": PICTURE };
    }
    const text = TEXT_THINGS[side][thing.id];
    if (text !== undefined) {
        return side === "edge" && thing.id === "endCaption"
            ? { "edge.arrowHead": "normal", "edge.arrowHeadText": "Hello" }
            : { [text.words]: "Hello" };
    }
    return undefined;
}

const WALKED = (["node", "edge"] as const).flatMap((side) =>
    SECTIONS[side].flatMap((section) =>
        section.groups
            .flat()
            .filter((thing) => thing.shader !== true)
            .map((thing) => ({ side, part: section.id ?? section.part, thing, key: `${side}.${thing.id}` })),
    ),
);

// ------------------------------------------------------------------------------------------------
// Reading the DOM.
// ------------------------------------------------------------------------------------------------

const CONTROLS =
    'input:not([type="hidden"]), button, select, textarea, [role="combobox"], [role="radio"], [role="slider"], [role="checkbox"]';

/**
 * Whether an element takes room on the page.
 * @param element - the element.
 * @returns whether it has a size.
 */
function laidOut(element: Element): boolean {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
}

/**
 * The lines of a surface: each `.ws-row` (and a pop-over's Kind line) holding a control, outside any other line.
 * @param root - the surface.
 * @returns the lines.
 */
function linesIn(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(".ws-row, .ws-member")].filter(
        (line) =>
            line.parentElement?.closest(".ws-row") === null && laidOut(line) && line.querySelector(CONTROLS) !== null,
    );
}

/**
 * A line's own elements matching a selector: not those of a line inside it.
 * @param line - the line.
 * @param selector - the selector.
 * @returns the elements.
 */
function own(line: HTMLElement, selector: string): HTMLElement[] {
    return [...line.querySelectorAll<HTMLElement>(selector)].filter(
        (each) => (each.closest(".ws-row, .ws-member") ?? line) === line && laidOut(each),
    );
}

/**
 * How many lines tall a surface is: lines that overlap vertically (a pair drawn as two lines) count once.
 * @param root - the surface.
 * @returns the count.
 */
function linesTall(root: HTMLElement): number {
    const boxes = linesIn(root)
        .map((line) => line.getBoundingClientRect())
        .sort((a, b) => a.top - b.top);
    let bottom = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (const box of boxes) {
        if (box.top >= bottom - 1) {
            count += 1;
        }
        bottom = Math.max(bottom, box.bottom);
    }
    return count;
}

/**
 * A line's name for messages.
 * @param line - the line.
 * @returns its data-line, or its first control's name.
 */
function nameOf(line: HTMLElement): string {
    return line.dataset.line ?? line.querySelector(CONTROLS)?.getAttribute("aria-label") ?? line.className;
}

/**
 * Lines whose minus is not their right-most button.
 * @param lines - the lines.
 * @returns their names.
 */
function minusNotLast(lines: readonly HTMLElement[]): string[] {
    return lines.flatMap((line) => {
        const buttons = own(line, "button");
        const minus = buttons.find((each) => /^Remove /.test(each.getAttribute("aria-label") ?? ""));
        if (minus === undefined) {
            return [];
        }
        const edge = minus.getBoundingClientRect().right - 1;
        const beyond = buttons.filter((each) => each !== minus && each.getBoundingClientRect().left >= edge);
        return beyond.length === 0 ? [] : [nameOf(line)];
    });
}

/**
 * Lines whose link or settings button is not on its control's line, right after the control.
 * @param lines - the lines.
 * @returns their names.
 */
function slotNotAfterControl(lines: readonly HTMLElement[]): string[] {
    return lines.flatMap((line) => {
        const control = own(line, ".ws-field-control")[0];
        const slot = own(line, ".ws-vary").find((each) => each.querySelector("button") !== null);
        if (control === undefined || slot === undefined) {
            return [];
        }
        const c = control.getBoundingClientRect();
        const s = slot.getBoundingClientRect();
        const sameLine = s.top < c.bottom && s.bottom > c.top;
        // Right after: nothing but empty space between the control and the slot (no minus in between).
        const between = own(line, "button").filter((each) => {
            const b = each.getBoundingClientRect();
            return !slot.contains(each) && b.left >= c.right - 1 && b.right <= s.left + 1;
        });
        return sameLine && s.left >= c.right - 1 && between.length === 0 ? [] : [nameOf(line)];
    });
}

/**
 * Lines that show a link or settings button with the pointer elsewhere and no focus within them.
 * @param lines - the lines.
 * @returns their names.
 */
function shownAtRest(lines: readonly HTMLElement[]): string[] {
    return lines.flatMap((line) => {
        if (line.contains(document.activeElement)) {
            return [];
        }
        const shown = own(line, ".ws-vary button").filter((button) => {
            const style = getComputedStyle(button);
            return (
                button.getAttribute("aria-expanded") !== "true" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) > 0
            );
        });
        return shown.length === 0 ? [] : [nameOf(line)];
    });
}

/**
 * Lines with an empty input: a blank number or text field, or a segment line with nothing picked.
 * @param lines - the lines.
 * @returns their names.
 */
function emptyInputs(lines: readonly HTMLElement[]): string[] {
    return lines.flatMap((line) => {
        const fields = [...line.querySelectorAll<HTMLInputElement>("input, textarea")].filter(laidOut);
        const blank = fields.some(
            (field) => !["checkbox", "radio", "hidden", "file", "range"].includes(field.type) && field.value === "",
        );
        const radios = [...line.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
        const groups = new Set(radios.map((radio) => radio.name));
        const unpicked = [...groups].some((name) => !radios.some((radio) => radio.name === name && radio.checked));
        return blank || unpicked ? [nameOf(line)] : [];
    });
}

/**
 * The pop-out a trigger opens.
 * @param trigger - the trigger.
 * @returns the pop-out, once open.
 */
async function openedBy(trigger: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
        assert.strictEqual(trigger.getAttribute("aria-expanded"), "true");
        const id = trigger.getAttribute("aria-controls");
        const found = id === null ? null : document.getElementById(id);
        assert.isNotNull(found, `${trigger.getAttribute("aria-label") ?? ""} names the pop-out it opens`);
        return found;
    });
}

// ------------------------------------------------------------------------------------------------
// The walk.
// ------------------------------------------------------------------------------------------------

/** What one thing's walk finds, by rule. */
interface Found {
    tall?: number;
    third: string[];
    minus: string[];
    slot: string[];
    rest: string[];
    empty: string[];
}

/** Every walk's findings, by thing, read by the comparisons at the end. */
const FOUND = new Map<string, Found>();

/**
 * Adds a thing to the layer: written through the session where its "+" waits on a picker, else from "+".
 * @param session - the session.
 * @param layer - the layer.
 * @param tab - the Style tab.
 * @param walk - the thing.
 * @returns its row.
 */
async function addThing(
    session: GraphSession,
    layer: string,
    tab: HTMLElement,
    walk: (typeof WALKED)[number],
): Promise<HTMLElement> {
    const { side, part, thing } = walk;
    const section = sectionOf(tab, `${side}-${part}`);
    const rowOf = (): HTMLElement | null => section.querySelector<HTMLElement>(`[data-thing="${thing.id}"]`);
    const values = written(side, thing);
    if (values !== undefined) {
        await session.styles.update(layer, { set: { ...session.styles.get(layer)?.set, ...values } });
        await session.styles.settled();
    } else if (rowOf()?.querySelector(".ws-row[data-set]") === null || rowOf() === null) {
        const plus = section.querySelector<HTMLElement>("[data-plus]");
        assert.isNotNull(plus, `${part}'s "+"`);
        await userEvent.click(plus);
        const item = screen.queryByRole("menuitem", { name: thing.name });
        if (item !== null) {
            await userEvent.click(item);
        }
    }
    return waitFor(() => {
        const row = rowOf();
        assert.isNotNull(row, `${walk.key} has a row`);
        return row;
    });
}

/**
 * Adds every sub-group a pop-over's "+" offers, as a reader does.
 * @param pop - the pop-over.
 */
async function addEveryGroup(pop: HTMLElement): Promise<void> {
    for (;;) {
        const plus = within(pop).queryByRole("button", { name: /^Add to .* settings$/ });
        if (plus === null) {
            return;
        }
        await userEvent.click(plus);
        const items = await screen.findAllByRole("menuitem");
        const item = items.find(
            (each) => each.getAttribute("aria-disabled") !== "true" && !each.hasAttribute("disabled"),
        );
        if (item === undefined) {
            await userEvent.keyboard("{Escape}");
            return;
        }
        const before = linesIn(pop).length;
        await userEvent.click(item);
        await waitFor(() => {
            assert.isAbove(linesIn(pop).length, before, `${item.textContent ?? ""} adds lines`);
        });
    }
}

/**
 * Opens every level-2 pop-out a pop-over's lines open, and names the controls in each that would open a third.
 * @param pop - the pop-over (level 1).
 * @param reopen - opens the pop-over again, when Escape closed it with the pop-out.
 * @returns `<trigger> > <control>` for each.
 */
async function thirdLevels(pop: HTMLElement, reopen: () => Promise<HTMLElement>): Promise<string[]> {
    const found: string[] = [];
    let surface = pop;
    const triggers = (root: HTMLElement): HTMLElement[] =>
        [...root.querySelectorAll<HTMLElement>('button[aria-haspopup="dialog"]')].filter(laidOut);
    const count = triggers(surface).length;
    for (let at = 0; at < count; at++) {
        const trigger = triggers(surface)[at];
        if (trigger === undefined) {
            break;
        }
        const line = trigger.closest<HTMLElement>(".ws-row, .ws-member");
        if (line !== null) {
            await userEvent.hover(line);
        }
        await userEvent.click(trigger);
        const level2 = await openedBy(trigger);
        const name = trigger.getAttribute("aria-label") ?? nameOf(line ?? trigger);
        for (const inner of level2.querySelectorAll<HTMLElement>("[aria-haspopup]")) {
            if (laidOut(inner) && !COMPONENT_OWN.includes(inner.getAttribute("aria-label") ?? "")) {
                found.push(`${name} > ${inner.getAttribute("aria-label") ?? inner.textContent ?? inner.tagName}`);
            }
        }
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.notStrictEqual(trigger.getAttribute("aria-expanded"), "true");
        });
        if (!surface.isConnected) {
            surface = await reopen();
        }
    }
    return found;
}

/**
 * Compares a rule's findings with its known list, exactly.
 * @param rule - the rule's name.
 * @param found - the things that break it, with details.
 * @param known - its known-violations list.
 */
function compare(rule: string, found: ReadonlyMap<string, string>, known: readonly string[]): void {
    const now = [...found.keys()].sort();
    const fixed = known.filter((key) => !found.has(key));
    const added = now.filter((key) => !known.includes(key));
    assert.deepEqual(
        { fixed, added: added.map((key) => `${key}: ${found.get(key) ?? ""}`) },
        { fixed: [], added: [] },
        `${rule}: take "fixed" off its known list; fix "added"`,
    );
}

describe("Style panel v2's input rules (owner, 2026-11-23)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const walk of WALKED) {
        it(`${walk.key}: its row and its pop-over with every sub-group shown`, async () => {
            const { session, nodes, edges } = await openGraph();
            const layer = walk.side === "node" ? nodes : edges;
            const tab = await openStyle(walk.side === "node" ? "Key people" : "Links");
            await showKind(walk.side);
            const row = await addThing(session, layer, tab, walk);
            await userEvent.keyboard("{Escape}");

            const openSettings = async (): Promise<HTMLElement> => {
                const button = within(row).getAllByRole("button", { name: / settings( has configured values)?$/ })[0];
                assert.isDefined(button, `${walk.key} has a settings button`);
                await userEvent.hover(row);
                await userEvent.click(button);
                return openedBy(button);
            };
            // A row with no settings (a basic Shape: its drop-down is its settings) is checked alone.
            const settings = within(row).queryAllByRole("button", { name: / settings( has configured values)?$/ });
            const pop = settings.length === 0 ? null : await openSettings();
            if (pop !== null) {
                await addEveryGroup(pop);
            }
            const tall = pop === null ? 0 : linesTall(pop);

            // At rest: the pointer on the Style tab's own tab, outside the row and the pop-over.
            const away = screen.getByRole("tab", { name: "Style" });
            await userEvent.hover(away);
            const lines = [...linesIn(row), ...(pop === null ? [] : linesIn(pop))];
            const found: Found = {
                tall: tall > 6 ? tall : undefined,
                minus: minusNotLast(lines),
                slot: slotNotAfterControl(lines),
                rest: shownAtRest(lines),
                empty: emptyInputs(lines),
                third: [],
            };
            // Hovering a line shows its buttons.
            const hidden = lines.find((line) =>
                own(line, ".ws-vary button").some((button) => getComputedStyle(button).visibility === "hidden"),
            );
            if (hidden !== undefined) {
                await userEvent.hover(hidden);
                for (const button of own(hidden, ".ws-vary button")) {
                    assert.notStrictEqual(getComputedStyle(button).visibility, "hidden", `${nameOf(hidden)} on hover`);
                }
            }
            found.third = pop === null ? [] : await thirdLevels(pop, openSettings);
            FOUND.set(walk.key, found);
        });
    }

    it("node.fill bound: the link dialog a bound line opens from its pop-over opens no third level", async () => {
        const { session, nodes } = await openGraph();
        await session.runs.start("degree");
        const tab = await openStyle("Key people");
        const openSettings = async (): Promise<HTMLElement> => {
            const button = within(tab).getByRole("button", { name: /^Node fill settings/ });
            await userEvent.click(button);
            return openedBy(button);
        };
        const pop = await openSettings();
        await userEvent.click(within(pop).getByRole("button", { name: "Node color by attribute" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^Degree(,|$)/ }));
        await waitFor(() => {
            const bound = session.styles.get(nodes)?.encode?.["node.color"];
            assert.isTrue(bound !== undefined && "by" in bound, "the fill color is bound");
        });
        const open = document.querySelector<HTMLElement>("[data-thing-popover]") ?? (await openSettings());
        FOUND.set("node.fill:bound", {
            third: await thirdLevels(open.closest<HTMLElement>('[id^="popout-panel"]') ?? open, openSettings),
            minus: [],
            slot: [],
            rest: [],
            empty: [],
        });
    });

    it("the rule hiding link and settings buttons applies only on hover devices, outside hover and focus", () => {
        assert.isTrue(matchMedia("(hover: hover)").matches, "the test browser has hover");
        const hiding: { selector: string; guarded: boolean }[] = [];
        const walkRules = (rules: CSSRuleList, media: string): void => {
            for (const rule of rules) {
                if (rule instanceof CSSMediaRule) {
                    walkRules(rule.cssRules, `${media} ${rule.conditionText}`);
                } else if (
                    rule instanceof CSSStyleRule &&
                    rule.selectorText.includes("ws-vary") &&
                    (rule.style.visibility === "hidden" || rule.style.opacity === "0")
                ) {
                    hiding.push({
                        selector: rule.selectorText,
                        guarded: media.includes("hover: hover") && rule.selectorText.includes(":focus-within"),
                    });
                }
            }
        };
        for (const sheet of document.styleSheets) {
            walkRules(sheet.cssRules, "");
        }
        const missing = hiding.length === 0 || hiding.some((each) => !each.guarded);
        assert.strictEqual(missing, KNOWN_HOVER_RULE_MISSING, JSON.stringify(hiding));
    });

    it("every rule's findings match its known-violations list", () => {
        assert.lengthOf([...FOUND.keys()], WALKED.length + 1, "every thing was walked");
        const by = (pick: (found: Found) => string[] | number | undefined): Map<string, string> =>
            new Map(
                [...FOUND].flatMap(([key, found]) => {
                    const value = pick(found);
                    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
                        return [];
                    }
                    return [[key, Array.isArray(value) ? value.join(", ") : `${String(value)} lines`]];
                }),
            );
        compare(
            "Pop-overs over 6 lines tall",
            by((found) => found.tall),
            KNOWN_TALL,
        );
        compare(
            "Pop-outs nested three deep",
            by((found) => found.third),
            KNOWN_THIRD_LEVEL,
        );
        compare(
            "Minus not the right-most button",
            by((found) => found.minus),
            KNOWN_MINUS_NOT_LAST,
        );
        compare(
            "Link or settings not right after its control",
            by((found) => found.slot),
            KNOWN_SLOT_NOT_AFTER_CONTROL,
        );
        compare(
            "Link or settings shown at rest",
            by((found) => found.rest),
            KNOWN_SHOWN_AT_REST,
        );
        compare(
            "Empty inputs",
            by((found) => found.empty),
            KNOWN_EMPTY,
        );
    });
});
