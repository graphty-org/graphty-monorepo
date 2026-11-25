/**
 * The owner's input rules (design/ui/style-panel-v2/design.md, "Input rules (owner, 2026-11-23)") that a test can
 * see, on the REAL graphty-element and real clicks. Every thing of v2's own section table (things.ts) is added to a
 * layer from its section's "+", its row's settings pop-over is opened, every group of its "..." menu is opened
 * beside it, and every tab of every tab strip is picked, and then:
 *
 * - the pop-over, each of its tabs and each group pop-over is at most 6 lines tall, two inputs on one line counting
 *   once;
 * - a pop-over has at most one tab strip, of at most five tabs, and no two of its tabs show the same settings
 *   (owner, 2026-11-24: one-of choices are tabs only where each shows different settings);
 * - a "..." menu has at most 16 entries, under headings of at most 6 each; a set group has its mark in the menu;
 *   one group pop-over is open at a time; no "+" reveals a group of settings (a "+" adds copies to a list);
 * - the panel's own pop-overs nest at most two deep (a row's pop-over is 1, a group pop-over its header's "..." opens
 *   is 2); a dedicated component (a color picker, a drop-down's list, the Picture picker, a pictured list, the
 *   data field picker, the link dialog) may open from either as the third level, and nothing goes to a fourth;
 * - nothing replaces a pop-over's content in place: no back button anywhere, and a pop-over keeps its title and
 *   content while what it opens is open (owner, 2026-11-24: "do not use in-place pop-overs");
 * - the "..." is an icon button named "More settings" in the pop-over's header, and the group pop-over it opens
 *   leaves its pop-over open and uncovered (owner, 2026-11-24; and at 768 x 1024, an iPad held upright);
 * - the link dialog is at most 6 components tall, with no Advanced of its own;
 * - on every line, the minus is the right-most button;
 * - the link or settings button sits on its control's line, right after the control;
 * - the link and settings buttons are hidden at rest, shown on hover;
 * - no input is empty: no blank number or text field, no segment line with nothing picked, and a default shows in the
 *   normal text, never in a placeholder's italics;
 * - a 3 x 3 grid under a line's other control counts as a row of its own;
 * - no value is edited twice in one pop-over (a list and a line of the whole list), or shown as raw data;
 * - no drop-down has fewer than six options (fewer are grouped buttons), and grouped buttons carry a name above them
 *   unless they are a pop-over's tab strip;
 * - no "..." group is one line tall, but for those `GROWING_GROUPS` names, each checked to grow in another state;
 * - a "..." menu opens fully visible: inside the window, unscrolled;
 * - beyond each thing as "+" adds it, the states `STATES` names are walked (a shader or a model as the Shape, two
 *   strands, a wavy border); and a strip's tab picked from the keyboard keeps focus, and Linear from Solid is one
 *   undo step;
 * - no button group opens anything (owner, 2026-11-24: "no button group should open menus"): every grouped button
 *   in the row, its pop-over and each group pop-over is clicked, and every tab of a strip picked, and none opens a
 *   menu, a list, a picker or a pop-over;
 * - one path to any control (owner, 2026-11-24: "there should only be one path to any control"): no value of a thing
 *   is edited by two different controls across its row, its pop-over and its group pop-overs (a line under a row
 *   repeating its pop-over's line in the same control is one control drawn twice); and the Shape's drop-down is its
 *   one control for a basic shape, a model or a shader, in every state;
 * - names go above inputs, never beside them: every visible name on a line is compact-mantine's own (a field's
 *   built-in label above it, a FieldRow caption, a ControlGroup legend), never text the app draws, and none sits
 *   to the left of an input on its line (owner, 2026-11-24). Checked in rows, pop-overs, group pop-overs, the link
 *   dialog and Graph settings.
 *
 * The hover rule must also show the buttons on focus within the line and under (hover: none) (the owner uses an
 * iPad): the stylesheet check reads the rule that hides them.
 *
 * Each check compares what it finds with its committed known-violations list, exactly: a fixed thing must leave
 * its list, and nothing may join one. The lists only shrink, and are meant to be empty.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel, ChannelValue, DataChannel } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { TEXT_THINGS } from "../v2/labelRubric";
import { SECTIONS, type ThingSpec } from "../v2/things";
import { showKind } from "./kindTab";
import { entryName, moreButton, openGraph, openGroup, openStyle, sectionOf } from "./v2Harness";

type Side = "node" | "edge";

// ------------------------------------------------------------------------------------------------
// Known violations, by `<side>.<thing id>`. A list may only shrink.
// ------------------------------------------------------------------------------------------------

/** Pop-overs more than 6 lines tall with every sub-group shown. */
const KNOWN_TALL: readonly string[] = [];

/** Pop-overs with a pop-out at a fourth level (see the file header for how levels count). */
const KNOWN_FOURTH_LEVEL: readonly string[] = [];

/** Pop-overs whose content is replaced in place by what they open, or that draw a back button. */
const KNOWN_IN_PLACE: readonly string[] = [];

/** Link dialogs more than 6 components tall. */
const KNOWN_LINK_TALL: readonly string[] = [];

/** Pop-overs whose "..." is not the icon button named "More settings" in their header. */
const KNOWN_MORE_NOT_ICON: readonly string[] = [];

/** Pop-overs whose group pop-over closes or covers the pop-over it opened from. */
const KNOWN_GROUP_COVERS: readonly string[] = [];

/** Pop-overs with more than one tab strip, a strip of more than five tabs, or two tabs showing the same settings. */
const KNOWN_STRIPS: readonly string[] = [];

/** Pop-overs one of whose tabs is more than 6 lines tall. */
const KNOWN_TAB_TALL: readonly string[] = [];

/** "..." menus of more than 16 entries, with a heading over more than 6, or not fully visible. */
const KNOWN_MENU_LONG: readonly string[] = [];

/** Group pop-overs more than 6 lines tall. */
const KNOWN_GROUP_TALL: readonly string[] = [];

/** Pop-overs with a "+" that reveals a group of settings instead of adding a copy to a list. */
const KNOWN_PLUS_REVEALS: readonly string[] = [];

/** "..." menus where a set group has no mark. */
const KNOWN_SET_UNMARKED: readonly string[] = [];

/** Pop-overs that let two group pop-overs be open at once. */
const KNOWN_TWO_GROUPS_OPEN: readonly string[] = [];

/**
 * A compact-mantine component's own inner pop-out, not counted as a fourth level: the app cannot change it
 * (compact-mantine is locked to Figma). `CompactColorInput`'s picker holds a Color format select; reported to the
 * owner as a question for compact-mantine, not an app defect.
 */
const COMPONENT_OWN: readonly string[] = ["Color format"];

/** Rows and pop-overs with a line whose minus is not its right-most button. */
const KNOWN_MINUS_NOT_LAST: readonly string[] = [];

/** Rows and pop-overs with a link or settings button not on its control's line, right after it. */
const KNOWN_SLOT_NOT_AFTER_CONTROL: readonly string[] = [];

/** Rows and pop-overs with a link or settings button shown with the pointer elsewhere and no focus in its line. */
const KNOWN_SHOWN_AT_REST: readonly string[] = [];

/** Rows and pop-overs with an empty input. */
const KNOWN_EMPTY: readonly string[] = [];

/** Rows, pop-overs, link dialogs and Graph settings with a name the app draws, or a name beside its input. */
const KNOWN_NAMES_NOT_BUILT_IN: readonly string[] = [];

/** Pop-overs editing one value twice (a list and a line of the whole list), or showing a value as raw data. */
const KNOWN_EDITED_TWICE: readonly string[] = [];

/**
 * Pop-overs with a drop-down of fewer than six options, each kept with its reason recorded in design.md ("Drop-downs
 * of fewer than six"): a text's Look (five looks whose words do not fit grouped buttons on a 200 px line, and no
 * common-knowledge icon for a card, a pill or a callout); an arrow's End (four ends, "Middle to target" too long, no
 * common-knowledge icon for a middle end); an edge's Force curves (Barnes-Hut and ForceAtlas2, names of methods too
 * long for buttons on the 176 px row, with no icon).
 */
const KNOWN_FEW_OPTIONS: readonly string[] = [
    "edge.arrow",
    "edge.bundling",
    "edge.endCaption",
    "edge.label",
    "edge.tooltip",
    "edge.xlabel",
    "node.label",
    "node.tooltip",
    "node.xlabel",
];

/** "..." menus with a group of one line, which joins the main pop-over instead. */
const KNOWN_ONE_LINE_GROUP: readonly string[] = [];

/** Rows and pop-overs with a grouped button or a tab that opens a menu, list, picker or pop-over. */
const KNOWN_GROUP_OPENS: readonly string[] = [];

/** Things with a value edited by two different controls across the row and its pop-overs. */
const KNOWN_TWO_PATHS: readonly string[] = [];

/**
 * Groups one line tall as a thing starts, which grow in another state, so stay groups (owner, 2026-11-24: a group of
 * one line in every state joins the main pop-over): `<walk key> > <group>`, and what makes it grow. A test below
 * checks each grows.
 */
const GROWING_GROUPS: Readonly<Record<string, Readonly<Partial<Record<Channel, ChannelValue>>>>> = {
    // Its width once a border color is set.
    "node.chart > Border": { "node.chartBorderColor": "#111111" },
    // Its opacity once a background color is set.
    "node.chart > Background": { "node.chartBackgroundColor": "#eeeeee" },
    // Width, pixel size and auto size once the picture is drawn at a size of its own.
    "node.image > Picture size": { "node.imageFit": "none" },
    // Its break and ellipsis lines once the words wrap.
    "node.label > Wrap": { [TEXT_THINGS.node.label.style]: { wrapWidth: 80 } },
    // Its spacing lines once the words wrap.
    "node.label > Wrap spacing": { [TEXT_THINGS.node.label.style]: { wrapWidth: 80 } },
    // Its width and opacity once the letters have an outline color.
    "node.label > Letter outline": { [TEXT_THINGS.node.label.style]: { outline: "#000000" } },
    // Its color, blur and offset once the shadow is on.
    "node.label > Text shadow": { [TEXT_THINGS.node.label.style]: { shadow: true } },
    "node.label > Box shadow": { [TEXT_THINGS.node.label.style]: { panelShadow: true } },
    // Its direction, size, offset and curve once the pointer is on.
    "node.label > Callout": { [TEXT_THINGS.node.label.style]: { pointer: true } },
    // Its curve once the edge is curved (graphty-element draws `edge.bendCurve` only then).
    "edge.route > Bends": { "edge.curvature": true },
};

/** The text things (labels, tooltips, captions) share the label's groups, so grow as the node label's do. */
const TEXT_WALKS = new Set([
    "node.label",
    "node.tooltip",
    "node.xlabel",
    "edge.label",
    "edge.tooltip",
    "edge.xlabel",
    "edge.endCaption",
]);

/**
 * Whether a group one line tall grows in another state (GROWING_GROUPS).
 * @param key - the walk's key.
 * @param group - the group.
 * @returns whether it does.
 */
function grows(key: string, group: string): boolean {
    return `${key} > ${group}` in GROWING_GROUPS || (TEXT_WALKS.has(key) && `node.label > ${group}` in GROWING_GROUPS);
}

/** The stylesheet rule hiding the link and settings buttons is missing or not limited to hover devices and no focus. */
const KNOWN_HOVER_RULE_MISSING = false;

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

/**
 * States walked beyond each thing's start (`<side>.<thing>:<state>`), each written through the session before its row
 * is opened: the shapes in a shader's place and as a model, two strands, a wavy border.
 */
const STATES: readonly {
    readonly side: Side;
    readonly thing: string;
    readonly state: string;
    readonly set: Readonly<Partial<Record<Channel, ChannelValue>>>;
}[] = [
    { side: "node", thing: "shape", state: "sticker", set: { "node.shaders": [{ shader: "icon-sticker" }] } },
    { side: "node", thing: "shape", state: "model", set: { "node.model": "asset:sample/person" } },
    {
        side: "node",
        thing: "border",
        state: "wavy",
        set: { "node.borderColor": "#111111", "node.borderWidth": 0.1, "node.borderStyle": "sinewave" },
    },
    { side: "edge", thing: "line", state: "strands", set: { "edge.strandColors": "#6366F1 #000000" } },
    // A list of seven: it is one line of its pop-over, and the list opens beside (design "Lists in pop-overs").
    {
        side: "node",
        thing: "pie",
        state: "seven",
        set: { "node.pieColors": "#e41a1c #377eb8 #4daf4a #984ea3 #ff7f00 #ffff33 #a65628" },
    },
    {
        side: "node",
        thing: "stripes",
        state: "seven",
        set: { "node.stripeColors": "#e41a1c #377eb8 #4daf4a #984ea3 #ff7f00 #ffff33 #a65628" },
    },
    {
        side: "edge",
        thing: "line",
        state: "seven strands",
        set: { "edge.strandColors": "#e41a1c #377eb8 #4daf4a #984ea3 #ff7f00 #ffff33 #a65628" },
    },
];

const WALKED = (["node", "edge"] as const).flatMap((side) =>
    SECTIONS[side].flatMap((section) =>
        section.groups
            .flat()
            .filter((thing) => thing.shader !== true)
            .flatMap((thing) => {
                const part = section.id ?? section.part;
                const states = STATES.filter((each) => each.side === side && each.thing === thing.id);
                return [
                    { side, part, thing, key: `${side}.${thing.id}`, set: undefined },
                    ...states.map((each) => ({
                        side,
                        part,
                        thing,
                        key: `${side}.${thing.id}:${each.state}`,
                        set: each.set,
                    })),
                ];
            }),
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
 * The lines of a surface: each `.ws-row` (and a pop-over's Kind line, and a sub-group's legend holding its "+",
 * which takes a line of its own) holding a control, outside any other line.
 * @param root - the surface.
 * @returns the lines.
 */
function linesIn(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(".ws-row, .ws-member, .cm-legend, [data-strip]")].filter(
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
    const lines = linesIn(root);
    const boxes = lines.map((line) => line.getBoundingClientRect()).sort((a, b) => a.top - b.top);
    let bottom = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (const box of boxes) {
        if (box.top >= bottom - 1) {
            count += 1;
        }
        bottom = Math.max(bottom, box.bottom);
    }
    return count + lines.reduce((sum, line) => sum + gridsUnder(line), 0);
}

/**
 * A line's 3 x 3 grids (a label's Location cells) drawn under its other controls: each a row of its own, as the
 * design counts components (design "Input rules", "Height").
 * @param line - the line.
 * @returns how many.
 */
function gridsUnder(line: HTMLElement): number {
    const grids = [...line.querySelectorAll<HTMLElement>('[data-testid="alignment-matrix"]')].filter(laidOut);
    const others = [...line.querySelectorAll<HTMLElement>(CONTROLS)].filter(
        (each) => laidOut(each) && each.closest('[data-testid="alignment-matrix"]') === null,
    );
    return grids.filter((grid) => {
        const { top } = grid.getBoundingClientRect();
        return others.some((each) => each.getBoundingClientRect().bottom <= top + 1);
    }).length;
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
        const box = minus.getBoundingClientRect();
        const edge = box.right - 1;
        // Right of the minus on its own line (a two-line row's name line above holds no buttons).
        const beyond = buttons.filter((each) => {
            const at = each.getBoundingClientRect();
            return each !== minus && at.left >= edge && at.top < box.bottom && at.bottom > box.top;
        });
        return beyond.length === 0
            ? []
            : [
                  `${nameOf(line)} (${String(minus.getAttribute("aria-label"))} at ${String(Math.round(edge))}: ${beyond
                      .map(
                          (each) =>
                              `${each.getAttribute("aria-label") ?? ""} at ${String(Math.round(each.getBoundingClientRect().left))}`,
                      )
                      .join("; ")})`,
              ];
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
        // A list's "+" in the slot is not a link or settings button: it stays shown.
        const shown = own(line, ".ws-vary button:not([aria-label^='Add '])").filter((button) => {
            const style = getComputedStyle(button);
            // The rule makes the slot's child transparent: opacity is not inherited, so read it there too.
            const slotChild = button.closest(".ws-vary > *");
            return (
                button.getAttribute("aria-expanded") !== "true" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) > 0 &&
                (slotChild === null || Number(getComputedStyle(slotChild).opacity) > 0)
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
        // A default shows as a value, in the normal text: never a placeholder's italics (design "Input rules").
        const italic = [...line.querySelectorAll<HTMLElement>(`${IN_CONTROL}, [data-unset]`)].some(
            (each) => laidOut(each) && getComputedStyle(each).fontStyle === "italic",
        );
        const wrong = [...(blank || unpicked ? ["empty"] : []), ...(italic ? ["a default in italics"] : [])];
        return wrong.length === 0 ? [] : [`${nameOf(line)}: ${wrong.join(", ")}`];
    });
}

/**
 * A value edited twice in one surface (a list's items and a line of the whole list beside them), or shown as raw data
 * (a list's JSON in a text field): the list is its one editor (owner, 2026-11-24).
 * @param lines - the surface's lines.
 * @returns what is wrong.
 */
function editedTwice(lines: readonly HTMLElement[]): string[] {
    const addresses = new Set(lines.map((line) => line.dataset.line ?? "").filter((each) => each !== ""));
    // A list's item lines are `<channel>:<n>` (and `<channel>:<n>:<part>`): the line `<channel>` beside them edits
    // the whole list again.
    const twice = [...addresses].filter((address) =>
        [...addresses].some(
            (other) => other.startsWith(`${address}:`) && /^\d+(:|$)/.test(other.slice(address.length + 1)),
        ),
    );
    const raw = lines.filter((line) =>
        [...line.querySelectorAll<HTMLInputElement>("input, textarea")].some((field) =>
            /^\s*(\[\s*[[{"]|\{\s*")/.test(field.value),
        ),
    );
    return [...twice.map((each) => `${each} and its list`), ...raw.map((line) => `${nameOf(line)} shows raw data`)];
}

/** What opens over a surface: a pop-out, a menu, a list. */
const OPENED = '[data-popout-id], [role="menu"], [role="listbox"]';

/**
 * How many pop-outs, menus and lists are open and drawn.
 * @returns the count.
 */
function openCount(): number {
    return [...document.querySelectorAll(OPENED)].filter(laidOut).length;
}

/**
 * Clicks every grouped button of a surface that is not a tab strip (walkTabs picks a strip's tabs), as a reader does,
 * and names each that opens a menu, a list, a picker or a pop-over (owner, 2026-11-24: "no button group should open
 * menus"). What it opened is closed again; a surface drawn anew is found again.
 * @param root - the row or pop-over.
 * @param reopen - finds or opens it again.
 * @returns `<group> > <button>` for each that opened something.
 */
async function groupsOpen(root: HTMLElement, reopen: () => Promise<HTMLElement>): Promise<string[]> {
    const groupsIn = (surface: HTMLElement): HTMLElement[] =>
        [...surface.querySelectorAll<HTMLElement>('[role="radiogroup"]')].filter(
            (group) => laidOut(group) && group.closest("[data-strip]") === null,
        );
    const keyOf = (radio: HTMLInputElement): string =>
        `${radio.closest('[role="radiogroup"]')?.getAttribute("aria-label") ?? ""}|${radio.value}`;
    const keys = groupsIn(root).flatMap((group) =>
        [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map(keyOf),
    );
    const found: string[] = [];
    let surface = root;
    for (const key of keys) {
        if (!surface.isConnected) {
            surface = await reopen();
        }
        const radio = groupsIn(surface)
            .flatMap((group) => [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')])
            .find((each) => keyOf(each) === key);
        if (radio === undefined || radio.disabled || radio.checked) {
            continue;
        }
        const label = surface.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        const before = openCount();
        await userEvent.click(label ?? radio);
        const opened = await waitFor(() => {
            const more = openCount() > before;
            assert.isTrue(radio.checked || more || !radio.isConnected, `${key} is picked`);
            return more;
        });
        if (opened) {
            found.push(key.replace("|", " > "));
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isAtMost(openCount(), before, `what ${key} opened closed`);
            });
        }
    }
    return found;
}

/** The attributes naming what a one-of line chooses (a family's members, a kind group's kinds, a text's looks). */
const CHOOSES = ["data-member-menu", "data-kind-menu", "data-look-menu"];

/**
 * Each value's controls in a surface's lines, by address: a line's `data-line`; a data or text source's line (rubric
 * R12) is its value's source, not the value; a one-of line is what it chooses (a family, a kind group, a look). A
 * control is named by its kind: grouped buttons, a value list, a select, else its element and role.
 * @param lines - the lines.
 * @returns the kinds of control, by address.
 */
function controlsOf(lines: readonly HTMLElement[]): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const line of lines) {
        const chooser = CHOOSES.flatMap((name) => {
            const value = line.closest(`[${name}]`)?.getAttribute(name);
            return value === null || value === undefined ? [] : [`${name.slice(5)} ${value}`];
        })[0];
        const source = line.dataset.rule === "R12" ? " source" : "";
        const address = line.dataset.line === undefined ? chooser : `${line.dataset.line}${source}`;
        const first = own(line, CONTROLS).find(
            (each) => each.closest(".ws-vary") === null && !/^Remove /.test(each.getAttribute("aria-label") ?? ""),
        );
        if (address === undefined || first === undefined) {
            continue;
        }
        let kind = `${first.tagName.toLowerCase()}:${first.getAttribute("role") ?? first.getAttribute("type") ?? ""}`;
        if (first.closest('[role="radiogroup"]') !== null) {
            kind = "grouped buttons";
        } else if (first.hasAttribute("data-value-listbox")) {
            kind = "value list";
        } else if (first.matches("input.mantine-Select-input")) {
            kind = "select";
        }
        out[address] = [...new Set([...(out[address] ?? []), kind])];
    }
    return out;
}

/**
 * Merges each value's controls from another surface into a thing's.
 * @param into - the thing's so far.
 * @param more - another surface's.
 * @returns the merged.
 */
function mergePaths(
    into: Readonly<Record<string, string[]>> | undefined,
    more: Readonly<Record<string, string[]>>,
): Record<string, string[]> {
    const out: Record<string, string[]> = { ...into };
    for (const [address, kinds] of Object.entries(more)) {
        out[address] = [...new Set([...(out[address] ?? []), ...kinds])];
    }
    return out;
}

/**
 * Values edited by two different controls (owner, 2026-11-24: "there should only be one path to any control").
 * @param paths - each value's controls.
 * @returns what is wrong.
 */
function twoPaths(paths: Readonly<Record<string, string[]>> | undefined): string[] {
    return Object.entries(paths ?? {})
        .filter(([, kinds]) => kinds.length > 1)
        .map(([address, kinds]) => `${address} by ${kinds.join(" and ")}`);
}

/**
 * Closes every open pop-out from its close button, the last opened first.
 */
async function closeAll(): Promise<void> {
    for (const panel of [...document.querySelectorAll<HTMLElement>("[data-popout-id]")].reverse()) {
        // The header's right-most button: its close.
        const close = [...panel.querySelectorAll<HTMLElement>('[data-testid="popout-header"] button')].at(-1);
        if (panel.isConnected && close !== undefined) {
            await userEvent.click(close);
        }
    }
    await waitFor(() => {
        assert.isNull(document.querySelector("[data-popout-id]"), "every pop-out closed");
    });
}

/**
 * Drop-downs of fewer than six options, opened as a reader does to count them: fewer than six exclusive options are
 * grouped buttons (owner's input rules). A Kind or Look drop-down too.
 * @param root - the surface.
 * @param reopen - opens it again, fresh, for each drop-down.
 * @returns their names, with their options.
 */
async function fewOptions(root: HTMLElement, reopen: () => Promise<HTMLElement>): Promise<string[]> {
    const found: string[] = [];
    // Mantine's Select, which a drop-down of words is (PanelField kind="select"); a pictured list is a button.
    const selectsIn = (surface: HTMLElement): HTMLInputElement[] =>
        [...surface.querySelectorAll<HTMLInputElement>('input.mantine-Select-input[aria-haspopup="listbox"]')].filter(
            (each) => laidOut(each) && !each.disabled && each.readOnly,
        );
    const count = selectsIn(root).length;
    for (let at = 0; at < count; at++) {
        // Each from a fresh pop-over, nothing else open over it: every pop-out closed from its close button, then it
        // opens again.
        await closeAll();
        const surface = await reopen();
        const select = selectsIn(surface)[at];
        if (select === undefined) {
            break;
        }
        await userEvent.click(select);
        const list = await waitFor(() => {
            const id = select.getAttribute("aria-controls");
            const opened = id === null ? null : document.getElementById(id);
            assert.isNotNull(opened, `${select.getAttribute("aria-label") ?? ""}'s list`);
            return opened;
        });
        const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')].map((each) =>
            each.textContent.trim(),
        );
        if (options.length < 6) {
            found.push(`${select.getAttribute("aria-label") ?? ""} (${options.join(" / ")})`);
        }
        // Escape closes only the list, leaving the pop-over open; the next drop-down still starts from a fresh
        // pop-over. (The list covers its field, and Tab leaves it open.)
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isTrue(!select.isConnected || select.getAttribute("aria-expanded") !== "true", "its list closed");
        });
    }
    // Left with nothing open, so whatever opens it next starts from closed (an earlier count may have drawn the pop-over
    // anew, which a reader's settings button would close).
    await closeAll();
    return found;
}

/** compact-mantine's own name text: a field's built-in label above it, a FieldRow caption, a group legend. */
const BUILT_IN_NAMES = ".cm-field-label, .cm-caption, .cm-legend-text, .cm-paint-label";

/** Where words belong to a control itself: its value, its options, a checkbox's own label. */
const IN_CONTROL =
    'button, input, textarea, select, label, [role="combobox"], [role="radiogroup"], [role="slider"], [role="listbox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]';

/**
 * Whether an element is drawn big enough to read (a visually hidden name is 1 px).
 * @param element - the element.
 * @returns whether it is.
 */
function readable(element: Element): boolean {
    const box = element.getBoundingClientRect();
    return box.width > 1 && box.height > 1 && getComputedStyle(element).visibility !== "hidden";
}

/**
 * Whether an element is inside one of compact-mantine's components (a `cm-` class), up to a line.
 * @param element - the element.
 * @param line - where to stop.
 * @returns whether it is.
 */
function compactMantine(element: Element, line: Element): boolean {
    for (let at: Element | null = element; at !== null && at !== line.parentElement; at = at.parentElement) {
        if ([...at.classList].some((name) => name.startsWith("cm-"))) {
            return true;
        }
    }
    return false;
}

/**
 * Lines with a name the app draws (words outside every control and every compact-mantine component), or a
 * compact-mantine name to the left of an input on its own line (owner, 2026-11-24: "Labels for an input must never go
 * to the left of the input").
 * @param lines - the lines.
 * @returns their names, with what is wrong.
 */
function namesNotBuiltIn(lines: readonly HTMLElement[]): string[] {
    return lines.flatMap((line) => {
        const wrong: string[] = [];
        const inputs = [...line.querySelectorAll<HTMLElement>(CONTROLS)].filter(
            (each) => laidOut(each) && each.closest(".cm-legend") === null,
        );
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
            const at = node.parentElement;
            const words = node.textContent?.trim() ?? "";
            // A drawing's words (an SVG title, the ramp editor's bars) are its tooltips, not a name; the ramp editor
            // is compact-mantine's own.
            if (
                at === null ||
                words === "" ||
                !readable(at) ||
                at.closest('svg, [data-testid="ramp-editor"]') !== null
            ) {
                continue;
            }
            const name = at.closest(BUILT_IN_NAMES);
            if (name !== null) {
                const box = name.getBoundingClientRect();
                const beside = inputs.some((input) => {
                    const b = input.getBoundingClientRect();
                    return b.top < box.bottom - 1 && b.bottom > box.top + 1 && b.left >= box.right - 1;
                });
                if (beside) {
                    wrong.push(`"${words}" beside its input`);
                }
            } else if (at.closest(IN_CONTROL) === null && !compactMantine(at, line)) {
                wrong.push(`"${words}" drawn by the app`);
            }
        }
        // Grouped buttons carry their name above them; only a pop-over's tab strip, its defining choice, has none.
        const groups = [...line.querySelectorAll<HTMLElement>('[role="radiogroup"]')].filter(
            (each) =>
                laidOut(each) &&
                each.closest('[data-strip], [data-testid="alignment-matrix"]') === null &&
                each.querySelector('[data-testid="alignment-matrix"]') === null,
        );
        const named = [...line.querySelectorAll<HTMLElement>(BUILT_IN_NAMES)].some(
            (each) => readable(each) && each.textContent.trim() !== "",
        );
        if (groups.length > 0 && !named) {
            wrong.push("grouped buttons with no name above");
        }
        return wrong.length === 0 ? [] : [`${nameOf(line)}: ${wrong.join("; ")}`];
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
    tall?: string;
    /** Pop-outs at a fourth level. */
    fourth: string[];
    /** Pop-overs replaced in place, or back buttons. */
    inPlace: string[];
    /** The link dialog's height, when over 6 components. */
    linkTall?: string;
    /** A "..." that is not the icon button named "More settings" in the header. */
    notIcon: string[];
    /** Group pop-overs that closed or covered the pop-over they opened from. */
    covers: string[];
    /** Tab strips: more than one, more than five tabs, or two tabs showing the same settings. */
    strips?: string[];
    /** Tabs more than 6 lines tall. */
    tabTall?: string[];
    /** A "..." menu over 16 entries, or a heading over 6. */
    menu?: string[];
    /** Group pop-overs more than 6 lines tall. */
    groupTall?: string[];
    /** A "+" revealing a group of settings. */
    plus?: string[];
    /** Set groups without their mark in the menu. */
    unmarked?: string[];
    /** Two group pop-overs open at once. */
    twoOpen?: string[];
    /** Lines with a name the app draws, or a name beside its input. */
    names: string[];
    /** A value edited twice, or shown as raw data. */
    twice?: string[];
    /** Inputs that do not describe themselves (notDescribed). */
    described?: string[];
    /** Drop-downs of fewer than six options. */
    few?: string[];
    /** Groups of one line. */
    oneLine?: string[];
    /** Grouped buttons or tabs that opened something. */
    opens?: string[];
    /** Each value's controls, by address: the kinds of control editing it. */
    paths?: Record<string, string[]>;
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
    const values = walk.set ?? written(side, thing);
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
 * Buttons that reveal a group of settings with "+" (a pop-over's "Add to ... settings"): a "+" only adds copies to a
 * list (owner, 2026-11-24).
 * @param root - the pop-over.
 * @returns their names.
 */
function plusReveals(root: HTMLElement): string[] {
    return [...root.querySelectorAll<HTMLElement>("button[aria-label]")]
        .map((button) => button.getAttribute("aria-label") ?? "")
        .filter((label) => /^Add to .* settings$/.test(label));
}

/** One entry of a "..." menu: its group, its heading, and whether it bears the set mark. */
interface MenuEntry {
    readonly name: string;
    readonly heading: string;
    readonly marked: boolean;
}

/**
 * A pop-over's "..." menu as a reader sees it, opened and closed again: its entries in order under their headings. A
 * "..." that opens its one group directly is that group's entry.
 * @param pop - the pop-over.
 * @returns the entries; none without a "...".
 */
async function menuOf(pop: HTMLElement): Promise<MenuEntry[]> {
    const button = moreButton(pop);
    if (button === null) {
        return [];
    }
    if (button.getAttribute("aria-haspopup") === "dialog") {
        const group = await openGroup(pop);
        const entry = { name: group.dataset.groupPop ?? "", heading: "", marked: button.hasAttribute("data-set") };
        await userEvent.click(button);
        await waitFor(() => {
            assert.isFalse(group.isConnected, "its group pop-over closed");
        });
        return [entry];
    }
    await userEvent.click(button);
    const menu = await screen.findByRole("menu");
    const entries: MenuEntry[] = [];
    const clipped = menuClipped(menu);
    if (clipped !== undefined) {
        entries.push({ name: "", heading: clipped, marked: true });
    }
    let heading = "";
    for (const each of menu.querySelectorAll<HTMLElement>('.mantine-Menu-label, [role="menuitem"]')) {
        if (each.getAttribute("role") === "menuitem") {
            entries.push({ name: entryName(each), heading, marked: each.hasAttribute("data-set") });
        } else {
            heading = each.textContent.trim();
        }
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isFalse(menu.isConnected, "the menu closed");
    });
    return entries;
}

/**
 * How an open menu is not fully visible: outside the window, or scrolling its entries (owner, 2026-11-24: the "..."
 * menu opens whole).
 * @param menu - the menu.
 * @returns what is wrong, or undefined.
 */
function menuClipped(menu: HTMLElement): string | undefined {
    const box = menu.getBoundingClientRect();
    const outside = box.top < -0.5 || box.bottom > window.innerHeight + 0.5;
    const scrolls = [menu, ...menu.querySelectorAll<HTMLElement>("*")].some(
        (each) => each.scrollHeight > each.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(each).overflowY),
    );
    if (!outside && !scrolls) {
        return undefined;
    }
    return `menu not fully visible (${[outside ? "outside the window" : "", scrolls ? "scrolls" : ""].filter(Boolean).join(", ")})`;
}

/**
 * What a menu breaks: more than 16 entries, or a heading over more than 6 (owner, 2026-11-24).
 * @param entries - the menu's entries.
 * @returns what is wrong.
 */
function menuLong(all: readonly MenuEntry[]): string[] {
    const headings = new Map<string, number>();
    // A clipped menu is the entry with no name, its heading saying how (menuOf).
    const clipped = all.filter((entry) => entry.name === "").map((entry) => entry.heading);
    const entries = all.filter((entry) => entry.name !== "");
    for (const entry of entries) {
        headings.set(entry.heading, (headings.get(entry.heading) ?? 0) + 1);
    }
    return [
        ...clipped,
        ...(entries.length > 16 ? [`${String(entries.length)} entries`] : []),
        ...[...headings]
            .filter(([, count]) => count > 6)
            .map(([heading, count]) => `${heading || "(no heading)"}: ${String(count)}`),
    ];
}

/**
 * The settings a surface shows, as the set of its lines' addresses, for telling two tabs apart.
 * @param root - the surface.
 * @returns the addresses, sorted and joined.
 */
function settingsShown(root: HTMLElement): string {
    return [...root.querySelectorAll<HTMLElement>(".ws-row[data-line]")]
        .filter((line) => laidOut(line) && line.closest("[data-strip]") === null)
        .map((line) => line.dataset.line ?? "")
        .sort()
        .join(" ");
}

/**
 * Picks every tab of a surface's tab strip, as a reader does, and names what breaks the tab rules (owner,
 * 2026-11-24): more than one strip, more than five tabs, two tabs showing the same settings, a tab over 6 lines, a tab
 * that opens a picker (closed again with nothing picked: no button group opens menus). A tab that takes the pop-over
 * away ends the walk.
 * @param surface - the pop-over or group pop-over.
 * @returns the strips' and the tall tabs' findings.
 */
async function walkTabs(surface: HTMLElement): Promise<{ strips: string[]; tall: string[]; opens: string[] }> {
    const strips = [...surface.querySelectorAll<HTMLElement>("[data-strip]")].filter(
        (strip) => laidOut(strip) && strip.parentElement?.closest("[data-strip]") === null,
    );
    const found = {
        strips: strips.length > 1 ? [`${String(strips.length)} strips`] : [],
        tall: [] as string[],
        opens: [] as string[],
    };
    const [strip] = strips;
    if (strip === undefined) {
        return found;
    }
    const radios = [...strip.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    if (radios.length > 5) {
        found.strips.push(`${String(radios.length)} tabs`);
    }
    const seen = new Map<string, string>();
    const panels = (): number => document.querySelectorAll("[data-popout-id]").length;
    for (const radio of radios) {
        if (!surface.isConnected || radio.disabled) {
            break;
        }
        const label = surface.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        const name = label?.textContent.trim() || radio.value;
        const before = panels();
        await userEvent.click(label ?? radio);
        // Picked, or a picker opened beside it first, or the pop-over went with the kind.
        const picker = await waitFor(() => {
            const opened = panels() > before;
            assert.isTrue(radio.checked || opened || !surface.isConnected, `${name} is picked`);
            return opened && !radio.checked;
        });
        if (picker) {
            // A tab is a grouped button: it never opens a picker (owner, 2026-11-24).
            found.opens.push(`tab ${name}`);
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.strictEqual(panels(), before, `${name}'s picker closed`);
            });
            continue;
        }
        if (!surface.isConnected) {
            break;
        }
        await session().styles.settled();
        const tall = linesTall(surface);
        if (tall > 6) {
            found.tall.push(`${name}: ${String(tall)}`);
        }
        const shown = settingsShown(surface);
        const same = seen.get(shown);
        if (same !== undefined) {
            found.strips.push(`${same} and ${name} show the same settings`);
        }
        seen.set(shown, name);
    }
    return found;
}

/**
 * The open graph's session, for waiting on a write a tab made.
 * @returns the session.
 */
function session(): GraphSession {
    const element = document.querySelector("graphty-element");
    assert.isDefined(element?.session, "the graph");
    return element.session;
}

/**
 * Whether two boxes overlap.
 * @param a - one box.
 * @param b - the other.
 * @returns whether they share any area.
 */
function overlap(a: DOMRect, b: DOMRect): boolean {
    return a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
}

/**
 * Whether the pop-over a group pop-over opened from is still open and visible beside it.
 * @param parent - the pop-over's panel.
 * @param advanced - the group pop-over's panel.
 * @returns why not, or undefined.
 */
function coveredBy(parent: HTMLElement, advanced: HTMLElement): string | undefined {
    if (!parent.isConnected || !laidOut(parent)) {
        return "its pop-over closed";
    }
    const a = parent.getBoundingClientRect();
    const b = advanced.getBoundingClientRect();
    return overlap(a, b)
        ? `covers it (${[a, b].map((box) => [box.left, box.top, box.right, box.bottom].map(Math.round).join(",")).join(" over ")})`
        : undefined;
}

/** What a walk of a pop-over's pop-outs finds, beyond the levels. */
interface Walked {
    readonly covers: string[];
    readonly inPlace: string[];
    readonly names: string[];
}

/**
 * Whether a pop-out is the panel's own pop-over (a group pop-over) rather than a dedicated component.
 * @param opened - what a trigger opened.
 * @returns whether it is a pop-over level of the panel.
 */
function panelPopover(opened: HTMLElement): boolean {
    return opened.querySelector("[data-group-pop]") !== null || opened.hasAttribute("data-group-pop");
}

/**
 * Opens every pop-out a pop-out's controls and header open, and names those at a fourth level. The panel's own
 * pop-overs are levels 1 and 2 (a row's pop-over, its Advanced pop-over, closed by its "..." again, which must leave
 * its pop-over open and uncovered); a dedicated component may open from either as the next level, and a pop-out
 * inside a third level is a fourth. A drop-down's list inside a component (a pictured list's section drop-down) and
 * a compact-mantine component's own (`COMPONENT_OWN`) are that component's, not a level. While anything is open,
 * the pop-out it opened from keeps its title and stays shown, and no back button is drawn: nothing opens in place.
 * @param pop - the pop-out's panel.
 * @param reopen - opens it again, when Escape closed it with what it opened.
 * @param walked - where in-place and covering findings are named.
 * @param depth - its level: 1 for a row's pop-over.
 * @returns `<trigger> > <control>` for each pop-out at a fourth level.
 */
async function deepLevels(
    pop: HTMLElement,
    reopen: () => Promise<HTMLElement>,
    walked: Walked,
    depth = 1,
): Promise<string[]> {
    const found: string[] = [];
    let surface = pop;
    const triggers = (root: HTMLElement): HTMLElement[] =>
        [...root.querySelectorAll<HTMLElement>('button[aria-haspopup="dialog"]')].filter(
            // The header's "..." and its groups are walked by `walkGroups`.
            (each) => laidOut(each) && each !== moreButton(root),
        );
    const titleOf = (root: HTMLElement): string => root.querySelector("h2")?.textContent ?? "";
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
        const title = titleOf(surface);
        await userEvent.click(trigger);
        const opened = await openedBy(trigger);
        const name = trigger.getAttribute("aria-label") ?? nameOf(line ?? trigger);
        const level = depth + 1;
        // Nothing in place: the pop-out stays shown under its own title, and there is no back button.
        if (!laidOut(surface) || titleOf(surface) !== title || surface.contains(opened)) {
            walked.inPlace.push(`${name} replaced ${title}`);
        }
        const back = screen.queryAllByRole("button", { name: /^Back to / });
        if (back.length > 0) {
            walked.inPlace.push(`${name}: ${back.map((each) => each.getAttribute("aria-label")).join(", ")}`);
        }
        const own = opened.closest<HTMLElement>("[data-popout-id]") ?? opened;
        if (level > 3 || (level > 2 && panelPopover(opened))) {
            found.push(`${name} (level ${String(level)})`);
        } else if (panelPopover(opened)) {
            // A group pop-over is opened from the "..." alone, walked by `walkGroups`.
            walked.inPlace.push(`${name} opened a group pop-over`);
        } else if (level === 3) {
            // A third level is a dedicated component: anything it opens is a fourth, but for its own parts.
            for (const inner of own.querySelectorAll<HTMLElement>("[aria-haspopup]")) {
                const label = inner.getAttribute("aria-label") ?? "";
                if (
                    laidOut(inner) &&
                    !COMPONENT_OWN.includes(label) &&
                    inner.getAttribute("aria-haspopup") !== "listbox"
                ) {
                    found.push(`${name} > ${label || inner.textContent || inner.tagName} (level 4)`);
                }
            }
            await userEvent.keyboard("{Escape}");
        } else {
            // A component at level 2: what it opens is the third level.
            const reopenComponent = async (): Promise<HTMLElement> => {
                const back = await reopen();
                const again = [...back.querySelectorAll<HTMLElement>("button")].find(
                    (each) => each.getAttribute("aria-label") === trigger.getAttribute("aria-label"),
                );
                assert.isDefined(again, `${name} again`);
                await userEvent.click(again);
                const content = await openedBy(again);
                return content.closest<HTMLElement>("[data-popout-id]") ?? content;
            };
            found.push(...(await deepLevels(own, reopenComponent, walked, level)).map((each) => `${name} > ${each}`));
            if (opened.isConnected) {
                await userEvent.keyboard("{Escape}");
            }
        }
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
 * A link dialog's parts from top to bottom: the binding group's children, a plain stack's by its own parts.
 * @param dialog - the link dialog.
 * @returns the parts holding a control.
 */
function dialogParts(dialog: HTMLElement): HTMLElement[] {
    const parts = (root: Element): HTMLElement[] =>
        [...root.children].flatMap((child) => {
            if (!(child instanceof HTMLElement)) {
                return [];
            }
            if (child.classList.contains("mantine-Stack-root") && !child.hasAttribute("role")) {
                return parts(child);
            }
            return laidOut(child) && child.querySelector(CONTROLS) !== null ? [child] : [];
        });
    const binding = dialog.querySelector('[role="group"][aria-label$=" binding"]');
    return binding === null ? [] : parts(binding);
}

/**
 * How many lines of controls a part takes from top to bottom: controls side by side count once, a choice that
 * grows a second line under itself (a clamp's percentiles) counts twice. The ramp editor, its histogram with its
 * value range, is one component (design "Input rules", "Link dialog").
 * @param part - the part.
 * @returns its lines.
 */
function partLines(part: HTMLElement): number {
    if (part.matches('[data-testid="ramp-editor"]') || part.querySelector('[data-testid="ramp-editor"]') !== null) {
        return 1;
    }
    const boxes = [...part.querySelectorAll(CONTROLS)]
        .filter(readable)
        .map((each) => each.getBoundingClientRect())
        .sort((x, y) => x.top - y.top);
    let bottom = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (const box of boxes) {
        if (box.top >= bottom - 1) {
            count += 1;
        }
        bottom = Math.max(bottom, box.bottom);
    }
    return Math.max(count, 1);
}

/**
 * How many components tall a link dialog is: each part's lines from top to bottom, two choices on one line
 * counting once.
 * @param dialog - the link dialog.
 * @returns the count.
 */
function componentsTall(dialog: HTMLElement): number {
    return dialogParts(dialog).reduce((sum, part) => sum + partLines(part), 0);
}

/**
 * What is wrong with a pop-over's "...": any button naming Advanced, or a "..." with words, without its glyph, or
 * outside the header (owner, 2026-11-24: the "..." is always an icon).
 * @param pop - the pop-over's panel.
 * @returns what is wrong.
 */
function moreNotIcon(pop: HTMLElement): string[] {
    const panel = pop.closest<HTMLElement>("[data-popout-id]") ?? pop;
    const wrong = [...panel.querySelectorAll<HTMLElement>("button")]
        .filter((each) => /advanced/i.test(`${each.getAttribute("aria-label") ?? ""} ${each.textContent}`))
        .map((each) => `a button "${each.getAttribute("aria-label") ?? each.textContent}"`);
    const button = [...panel.querySelectorAll<HTMLElement>('button[aria-label="More settings"]')];
    return [
        ...wrong,
        ...button.flatMap((each) => [
            ...(each.textContent.trim() === "" ? [] : [`"${each.textContent}" in it`]),
            ...(each.querySelector("svg") === null ? ["no glyph"] : []),
            ...(each.closest('[data-testid="popout-header"]') === null ? ["not in the header"] : []),
        ]),
    ];
}

/**
 * Opens every group of a pop-over's "..." menu beside it, as a reader does, each in turn, the one before still open,
 * and checks each: one group pop-over open at a time, its mark in the menu when set, at most 6 lines tall, beside its
 * pop-over and not over it, its lines' names, minus, link slot, hover and values, its tabs, and what it opens.
 * @param key - the walk's key.
 * @param pop - the pop-over's content.
 * @param reopen - opens the pop-over again, when Escape closed it with what it opened.
 * @param found - where findings go.
 */
async function walkGroups(
    key: string,
    pop: HTMLElement,
    reopen: () => Promise<HTMLElement>,
    found: Found,
): Promise<void> {
    const all = await menuOf(pop);
    found.menu = menuLong(all);
    const entries = all.filter((entry) => entry.name !== "");
    found.oneLine = [];
    found.groupTall = [];
    found.unmarked = [];
    found.twoOpen = [];
    for (const entry of entries) {
        let surface = pop.isConnected ? pop : await reopen();
        const group = await openGroup(surface, entry.name);
        const panel = group.closest<HTMLElement>("[data-popout-id]");
        assert.isNotNull(panel, `${entry.name}'s pop-over`);
        const open = document.querySelectorAll("[data-group-pop]").length;
        if (open > 1) {
            found.twoOpen.push(`${entry.name}: ${String(open)} open`);
        }
        const tall = linesTall(panel);
        if (tall > 6) {
            found.groupTall.push(`${entry.name}: ${String(tall)}`);
        }
        // A list grows with its "+"; a group GROWING_GROUPS names grows in another state.
        const list = panel.querySelector('button[aria-label^="Add "]') !== null;
        if (tall === 1 && !list && !grows(key, entry.name)) {
            found.oneLine.push(entry.name);
        }
        if (group.querySelector("[data-set]") !== null && !entry.marked) {
            found.unmarked.push(entry.name);
        }
        const parent = surface.closest<HTMLElement>("[data-popout-id]");
        assert.isNotNull(parent, "the pop-over's panel");
        const why = coveredBy(parent, panel);
        if (why !== undefined) {
            found.covers.push(`${entry.name}: ${why}`);
        }
        found.plus = [...(found.plus ?? []), ...plusReveals(panel).map((each) => `${entry.name} > ${each}`)];
        // At rest: the pointer on the Style tab's own tab, outside the group pop-over.
        await userEvent.hover(screen.getByRole("tab", { name: "Style" }));
        const lines = linesIn(panel);
        const at = (list: string[]): string[] => list.map((each) => `${entry.name} > ${each}`);
        found.names.push(...at(namesNotBuiltIn(lines)));
        found.minus.push(...at(minusNotLast(lines)));
        found.slot.push(...at(slotNotAfterControl(lines)));
        found.rest.push(...at(shownAtRest(lines)));
        found.empty.push(...at(emptyInputs(lines)));
        found.twice = [...(found.twice ?? []), ...at(editedTwice(lines))];
        found.described = [...(found.described ?? []), ...at(notDescribed(lines))];
        found.paths = mergePaths(found.paths, controlsOf(lines));
        const reopenGroup = async (): Promise<HTMLElement> => {
            surface = await reopen();
            const again = await openGroup(surface, entry.name);
            return again.closest<HTMLElement>("[data-popout-id]") ?? again;
        };
        found.fourth.push(...at(await deepLevels(panel, reopenGroup, found, 2)));
        const live = document.querySelector<HTMLElement>(`[data-group-pop="${entry.name}"]`) ?? (await reopenGroup());
        const tabs = await walkTabs(live.closest<HTMLElement>("[data-popout-id]") ?? live);
        found.strips = [...(found.strips ?? []), ...at(tabs.strips)];
        found.tabTall = [...(found.tabTall ?? []), ...at(tabs.tall)];
        found.opens = [...(found.opens ?? []), ...at(tabs.opens)];
        // Last: counting a drop-down's options closes the pop-overs (Escape), so each opens again.
        const now = document.querySelector<HTMLElement>(`[data-group-pop="${entry.name}"]`) ?? (await reopenGroup());
        found.few = [
            ...(found.few ?? []),
            ...at(await fewOptions(now.closest<HTMLElement>("[data-popout-id]") ?? now, reopenGroup)),
        ];
        // Its grouped buttons, each clicked: they write the layer, so after every other check.
        // The group pop-over as drawn now: a click that writes the layer may draw it anew, still open.
        const groupNow = async (): Promise<HTMLElement> => {
            const live = document.querySelector<HTMLElement>(`[data-group-pop="${entry.name}"]`);
            return live === null ? reopenGroup() : (live.closest<HTMLElement>("[data-popout-id]") ?? live);
        };
        found.opens = [...(found.opens ?? []), ...at(await groupsOpen(await groupNow(), groupNow))];
    }
}

/**
 * Compares a rule's findings with its known list, exactly.
 * @param rule - the rule's name.
 * @param found - the things that break it, with details.
 * @param known - its known-violations list.
 */
function compare(
    rule: string,
    found: ReadonlyMap<string, string>,
    known: readonly string[],
): { rule: string; fixed: string[]; added: string[] } {
    const now = [...found.keys()].sort();
    const fixed = known.filter((key) => !found.has(key));
    const added = now.filter((key) => !known.includes(key)).map((key) => `${key}: ${found.get(key) ?? ""}`);
    return { rule, fixed, added };
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

            // Found by label: a settings button hidden until hover has no accessible name.
            // The row as drawn now: a pop-over closing may draw it anew.
            const rowNow = (): HTMLElement =>
                row.isConnected ? row : (tab.querySelector<HTMLElement>(`[data-thing="${walk.thing.id}"]`) ?? row);
            const settingsButtons = (): HTMLElement[] =>
                [...rowNow().querySelectorAll<HTMLElement>("button[aria-label]")].filter((each) =>
                    / settings( has configured values)?$/.test(each.getAttribute("aria-label") ?? ""),
                );
            const openSettings = async (): Promise<HTMLElement> => {
                const button = settingsButtons()[0];
                assert.isDefined(button, `${walk.key} has a settings button`);
                // Still open (Escape closed only what it opened): clicking would close it.
                if (button.getAttribute("aria-expanded") !== "true") {
                    // Shown on hover of its line, as a reader meets it.
                    await userEvent.hover(button.closest<HTMLElement>(".ws-row, .ws-member") ?? rowNow());
                    await userEvent.click(button);
                }
                return openedBy(button);
            };
            // A row with no settings (a basic Shape: its drop-down is its settings) is checked alone.
            const settings = settingsButtons();
            const pop = settings.length === 0 ? null : await openSettings();
            const tall = pop === null ? 0 : linesTall(pop);

            // At rest: the pointer on the Style tab's own tab, outside the row and the pop-over.
            const away = screen.getByRole("tab", { name: "Style" });
            await userEvent.hover(away);
            const lines = [...linesIn(row), ...(pop === null ? [] : linesIn(pop))];
            const found: Found = {
                tall:
                    tall > 6
                        ? `${String(tall)}: ${linesIn(pop ?? row)
                              .map(nameOf)
                              .join(", ")}`
                        : undefined,
                minus: minusNotLast(lines),
                slot: slotNotAfterControl(lines),
                rest: shownAtRest(lines),
                empty: emptyInputs(lines),
                fourth: [],
                inPlace: [],
                notIcon: pop === null ? [] : moreNotIcon(pop),
                covers: [],
                names: namesNotBuiltIn(lines),
                plus: pop === null ? [] : plusReveals(pop),
                // In the pop-over: the row's own line is the list's main value, its pop-over the list.
                twice: pop === null ? [] : editedTwice(linesIn(pop)),
                paths: controlsOf(lines),
            };
            // Hovering a line shows its buttons.
            const shownNow = (button: HTMLElement): boolean => {
                const style = getComputedStyle(button);
                // The rule hides a slot's child, so a button reads its opacity from there.
                const slotChild = button.closest(".ws-vary > *");
                return (
                    style.visibility !== "hidden" &&
                    Number(style.opacity) > 0 &&
                    (slotChild === null || Number(getComputedStyle(slotChild).opacity) > 0)
                );
            };
            const hidden = lines.find((line) => own(line, ".ws-vary button").some((button) => !shownNow(button)));
            if (hidden !== undefined) {
                await userEvent.hover(hidden);
                for (const button of own(hidden, ".ws-vary button")) {
                    assert.isTrue(shownNow(button), `${nameOf(hidden)} on hover`);
                }
            }
            found.fourth = pop === null ? [] : await deepLevels(pop, openSettings, found);
            if (pop === null) {
                found.few = await fewOptions(row, () => Promise.resolve(row));
            }
            if (pop !== null) {
                // Its groups, each beside it from the "...", then its tabs, which write the layer, last.
                await walkGroups(walk.key, pop.isConnected ? pop : await openSettings(), openSettings, found);
                const open = pop.isConnected ? pop : await openSettings();
                found.few = [...(found.few ?? []), ...(await fewOptions(open, openSettings))];
                const live = open.isConnected ? open : await openSettings();
                const tabs = await walkTabs(live);
                found.strips = [...(found.strips ?? []), ...tabs.strips];
                found.tabTall = [...(found.tabTall ?? []), ...tabs.tall];
                found.opens = [...(found.opens ?? []), ...tabs.opens];
            }
            // The pop-over as drawn now: a click that writes the layer may draw it anew, still open.
            const popNow = async (): Promise<HTMLElement> =>
                document.querySelector<HTMLElement>("[data-thing-popover]") ?? openSettings();
            // Last, as they write the layer: every grouped button of the row, then of its pop-over, clicked.
            await closeAll();
            found.opens = [
                ...(found.opens ?? []),
                ...(await groupsOpen(rowNow(), () => Promise.resolve(rowNow()))),
                ...(settingsButtons().length === 0 ? [] : await groupsOpen(await openSettings(), popNow)),
            ];
            FOUND.set(walk.key, found);
        });
    }

    it("node.fill bound: the link dialog a bound line opens is 6 components tall at most, and opens no fourth level", async () => {
        const { session, nodes } = await openGraph();
        await session.runs.start("degree");
        const tab = await openStyle("Key people");
        const openSettings = async (): Promise<HTMLElement> => {
            const row = tab.querySelector<HTMLElement>('[data-thing="fill"]');
            assert.isNotNull(row, "the fill row");
            // Its settings button shows on hover, as a reader meets it.
            await userEvent.hover(row);
            const button = within(row).getByRole("button", { name: /^Node fill settings/ });
            await userEvent.click(button);
            return openedBy(button);
        };
        const pop = await openSettings();
        // The link button shows when its line is hovered.
        // (A hidden button has no accessible name, so it is found by its label.)
        const line = pop.querySelector<HTMLElement>('.ws-row:has([aria-label="Node color by attribute"])');
        assert.isNotNull(line, "the color line");
        await userEvent.hover(line);
        await userEvent.click(within(line).getByRole("button", { name: "Node color by attribute" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^Degree(,|$)/ }));
        await waitFor(() => {
            const bound = session.styles.get(nodes)?.encode?.["node.color"];
            assert.isTrue(bound !== undefined && "by" in bound, "the fill color is bound");
        });
        const open = document.querySelector<HTMLElement>("[data-thing-popover]") ?? (await openSettings());
        const panel = open.closest<HTMLElement>('[id^="popout-panel"]') ?? open;
        // The bound line's link dialog: its pill opens it, beside the pop-over.
        const pill = panel.querySelector<HTMLElement>(".ws-varied button");
        assert.isNotNull(pill, "the bound line's pill");
        await userEvent.click(pill);
        const dialog = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[role="group"][aria-label$=" binding"]');
            assert.isNotNull(found, "the link dialog is open");
            return found.closest<HTMLElement>("[data-popout-id]") ?? found;
        });
        const tall = componentsTall(dialog);
        assert.isAbove(tall, 2, "the link dialog's parts are counted");
        const names = namesNotBuiltIn(dialogParts(dialog));
        assert.isNull(moreButton(dialog), 'the link dialog has no "..."');
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(dialog.isConnected, "the link dialog closed");
        });
        const walked: Found = {
            fourth: [],
            inPlace: [],
            linkTall: tall > 6 ? String(tall) : undefined,
            notIcon: [],
            covers: [],
            names,
            minus: [],
            slot: [],
            rest: [],
            empty: [],
        };
        walked.fourth = await deepLevels(
            document.querySelector<HTMLElement>("[data-thing-popover]")?.closest<HTMLElement>('[id^="popout-panel"]') ??
                (await openSettings()),
            openSettings,
            walked,
        );
        FOUND.set("node.fill:bound", walked);
    });

    it("node.borderWidth bound: its link dialog stays 6 components tall with Clamp outliers on, One value and Fit to the data", async () => {
        const { session, nodes } = await openGraph();
        // A number of the data that two nodes carry and three lack, so No value has something to do. (A run's
        // result is not used: graphty-element refuses One value on it, "the result covers only part of the graph".)
        await session.data.addNodes([
            { id: "d", weight: 1 },
            { id: "e", weight: 5 },
        ]);
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, "node.borderColor": "#111111", "node.borderWidth": 0.1 },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        // The width line under the border's row, linked to Degree from its link button, as a reader does.
        const line = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row:has([aria-label="Node border width by attribute"])');
            assert.isNotNull(found, "the width line");
            return found;
        });
        await userEvent.hover(line);
        await userEvent.click(within(line).getByRole("button", { name: "Node border width by attribute" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^weight(,|$)/i }));
        // The bound line's pill opens its link dialog.
        const pill = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-line="node.borderWidth"] .ws-varied button');
            assert.isNotNull(found, "the bound width line's pill");
            return found;
        });
        await userEvent.click(pill);
        const dialog = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[role="group"][aria-label$=" binding"]');
            assert.isNotNull(found, "the link dialog is open");
            return found.closest<HTMLElement>("[data-popout-id]") ?? found;
        });
        const states: string[] = [];
        const names: string[] = [];
        const measure = (state: string): void => {
            const tall = componentsTall(dialog);
            if (tall > 6) {
                states.push(`${state}: ${String(tall)}`);
            }
            names.push(...namesNotBuiltIn(dialogParts(dialog)).map((each) => `${state} > ${each}`));
        };
        measure("plain");
        // Clamp outliers on: its percentiles.
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Clamp outliers" }));
        await within(dialog).findByRole("spinbutton", { name: "Lowest percentile" });
        measure("Clamp outliers");
        // One value: its value.
        const one = within(dialog).getByRole("radio", { name: "One value" });
        const oneLabel = document.querySelector<HTMLElement>(`label[for="${one.id}"]`);
        assert.isNotNull(oneLabel, "One value's label");
        await userEvent.click(oneLabel);
        await waitFor(() => {
            assert.isTrue(one.matches(":checked"), "One value is picked");
            assert.isNotNull(dialog.querySelector('[data-pair] [aria-label="Value"], [data-pair] input'), "its value");
        });
        measure("One value");
        // An extent typed on the ramp: Fit to the data (a hand-set extent takes the clamp off).
        const from = within(dialog).getByRole("textbox", { name: /^Values from/ });
        await userEvent.click(from);
        await userEvent.keyboard("{Control>}a{/Control}2{Enter}");
        await within(dialog).findByRole("button", { name: "Fit to the data" });
        measure("Fit to the data");
        FOUND.set("node.borderWidth:bound", {
            fourth: [],
            inPlace: [],
            linkTall: states.length === 0 ? undefined : states.join(", "),
            notIcon: [],
            covers: [],
            names,
            minus: [],
            slot: [],
            rest: [],
            empty: [],
        });
    });

    it("Graph settings: every name is compact-mantine's, above its input", async () => {
        const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
        render(<Workspace store={store} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        await element?.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        const panel = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-graph-settings-v2]");
            assert.isNotNull(found);
            return found;
        });
        const lines = linesIn(panel);
        assert.isAbove(lines.length, 4, "Graph settings' lines are read");
        FOUND.set("graph.settings", {
            fourth: [],
            inPlace: [],
            notIcon: [],
            covers: [],
            names: namesNotBuiltIn(lines),
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
        assert.lengthOf([...FOUND.keys()], WALKED.length + 3, "every thing was walked");
        const by = (pick: (found: Found) => string[] | string | undefined): Map<string, string> =>
            new Map(
                [...FOUND].flatMap(([key, found]) => {
                    const value = pick(found);
                    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
                        return [];
                    }
                    return [[key, Array.isArray(value) ? value.join(", ") : `${value} lines`]];
                }),
            );
        // Every rule at once: take "fixed" off its known list; fix "added".
        const results = [
            compare(
                "Pop-overs over 6 lines tall",
                by((found) => found.tall),
                KNOWN_TALL,
            ),
            compare(
                "Pop-outs at a fourth level",
                by((found) => found.fourth),
                KNOWN_FOURTH_LEVEL,
            ),
            compare(
                "Pop-overs replaced in place, or back buttons",
                by((found) => found.inPlace),
                KNOWN_IN_PLACE,
            ),
            compare(
                "Link dialogs over 6 components tall",
                by((found) => found.linkTall),
                KNOWN_LINK_TALL,
            ),
            compare(
                '"..." not the icon button in the header',
                by((found) => found.notIcon),
                KNOWN_MORE_NOT_ICON,
            ),
            compare(
                "Group pop-over closes or covers its pop-over",
                by((found) => found.covers),
                KNOWN_GROUP_COVERS,
            ),
            compare(
                "Tab strips: more than one, more than five tabs, or two tabs alike",
                by((found) => found.strips),
                KNOWN_STRIPS,
            ),
            compare(
                "Tabs over 6 lines tall",
                by((found) => found.tabTall),
                KNOWN_TAB_TALL,
            ),
            compare(
                '"..." menus over 16 entries or 6 under a heading',
                by((found) => found.menu),
                KNOWN_MENU_LONG,
            ),
            compare(
                "Group pop-overs over 6 lines tall",
                by((found) => found.groupTall),
                KNOWN_GROUP_TALL,
            ),
            compare(
                'A "+" revealing a group of settings',
                by((found) => found.plus),
                KNOWN_PLUS_REVEALS,
            ),
            compare(
                "Set groups without their mark",
                by((found) => found.unmarked),
                KNOWN_SET_UNMARKED,
            ),
            compare(
                "Two group pop-overs open at once",
                by((found) => found.twoOpen),
                KNOWN_TWO_GROUPS_OPEN,
            ),
            compare(
                "Minus not the right-most button",
                by((found) => found.minus),
                KNOWN_MINUS_NOT_LAST,
            ),
            compare(
                "Link or settings not right after its control",
                by((found) => found.slot),
                KNOWN_SLOT_NOT_AFTER_CONTROL,
            ),
            compare(
                "Link or settings shown at rest",
                by((found) => found.rest),
                KNOWN_SHOWN_AT_REST,
            ),
            compare(
                "Empty inputs",
                by((found) => found.empty),
                KNOWN_EMPTY,
            ),
            compare(
                "Names not compact-mantine's, or beside their input",
                by((found) => found.names),
                KNOWN_NAMES_NOT_BUILT_IN,
            ),
            compare(
                "A value edited twice, or shown as raw data",
                by((found) => found.twice),
                KNOWN_EDITED_TWICE,
            ),
            compare(
                "Drop-downs of fewer than six options",
                by((found) => found.few),
                KNOWN_FEW_OPTIONS,
            ),
            compare(
                "Groups of one line",
                by((found) => found.oneLine),
                KNOWN_ONE_LINE_GROUP,
            ),
            compare(
                "Grouped buttons or tabs that open a menu, list, picker or pop-over",
                by((found) => found.opens),
                KNOWN_GROUP_OPENS,
            ),
            compare(
                "A value edited by two different controls",
                by((found) => twoPaths(found.paths)),
                KNOWN_TWO_PATHS,
            ),
        ].filter((each) => each.fixed.length > 0 || each.added.length > 0);
        assert.deepEqual(results, []);
    });
});

describe("Style panel v2's group pop-over on an iPad held upright (owner, 2026-11-24)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);
    beforeAll(async () => {
        await page.viewport(768, 1024);
    });
    afterAll(async () => {
        await page.viewport(1200, 900);
    });

    it("node.label: at 768 x 1024 each group pop-over leaves the label pop-over open and uncovered", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, [TEXT_THINGS.node.label.words]: "Hello" },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await showKind("node");
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found, "the label row");
            return found;
        });
        await userEvent.hover(row);
        const settings = within(row).getByRole("button", { name: /^Node label settings/ });
        await userEvent.click(settings);
        const pop = await openedBy(settings);
        const panel = pop.closest<HTMLElement>("[data-popout-id]") ?? pop;
        // A short group and the tallest, each beside the pop-over, above or below it here.
        for (const name of ["Position", "Letters"]) {
            const group = await openGroup(pop, name);
            const own = group.closest<HTMLElement>("[data-popout-id]");
            assert.isNotNull(own);
            assert.isUndefined(coveredBy(panel, own), name);
        }
    });
});

/**
 * A row's settings pop-over, opened from its settings button as a reader does: hovered, then clicked.
 * @param row - the row.
 * @returns the pop-over's content.
 */
async function openRowSettings(row: HTMLElement): Promise<HTMLElement> {
    const button = [...row.querySelectorAll<HTMLElement>("button[aria-label]")].find((each) =>
        / settings( has configured values)?$/.test(each.getAttribute("aria-label") ?? ""),
    );
    assert.isDefined(button, "the row's settings button");
    await userEvent.hover(button.closest<HTMLElement>(".ws-row, .ws-member") ?? row);
    await userEvent.click(button);
    return openedBy(button);
}

/**
 * A tab of the open pop-over's tab strip, by its words.
 * @param name - its words.
 * @returns its radio, if it is drawn.
 */
function stripTab(name: string): HTMLInputElement | null {
    const label = [...document.querySelectorAll<HTMLLabelElement>("[data-thing-popover] [data-strip] label")].find(
        (each) => laidOut(each) && each.textContent.trim() === name,
    );
    return label === undefined ? null : (document.getElementById(label.htmlFor) as HTMLInputElement | null);
}

/**
 * A walked thing added to a fresh graph's layer, its row returned.
 * @param key - the walk's key.
 * @returns the session, the layer and the row.
 */
async function rowOf(key: string): Promise<{ session: GraphSession; layer: string; row: HTMLElement }> {
    const walk = WALKED.find((each) => each.key === key);
    assert.isDefined(walk, key);
    const { session, nodes, edges } = await openGraph();
    const layer = walk.side === "node" ? nodes : edges;
    const tab = await openStyle(walk.side === "node" ? "Key people" : "Links");
    await showKind(walk.side);
    const row = await addThing(session, layer, tab, walk);
    await userEvent.keyboard("{Escape}");
    return { session, layer, row };
}

describe("Style panel v2's tab strips, as a reader uses them (owner, 2026-11-24)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const [at, grows] of Object.entries(GROWING_GROUPS)) {
        it(`${at}: one line as it starts, it grows past one line in another state, so it stays a group`, async () => {
            const [key = "", group = ""] = at.split(" > ");
            const { session, layer, row } = await rowOf(key);
            await session.styles.update(layer, { set: { ...session.styles.get(layer)?.set, ...grows } });
            await session.styles.settled();
            const live = row.isConnected
                ? row
                : document.querySelector<HTMLElement>(`[data-thing="${key.split(".")[1] ?? ""}"]`);
            assert.isNotNull(live, "the row");
            const pop = await openRowSettings(live);
            const opened = await openGroup(pop, group);
            const panel = opened.closest<HTMLElement>("[data-popout-id]") ?? opened;
            assert.isAbove(linesTall(panel), 1, `${group} grows`);
        });
    }

    for (const [key, from, to] of [
        ["node.label", "Text", "Glyph"],
        ["edge.outline", "Under line", "Over line"],
    ] as const) {
        it(`${key}: an arrow key picking ${to} keeps focus on its tab, and the arrows go on working`, async () => {
            const { row } = await rowOf(key);
            await openRowSettings(row);
            const first = stripTab(from);
            assert.isNotNull(first, `the ${from} tab`);
            assert.isTrue(first.checked, `${from} is picked`);
            first.focus();
            await userEvent.keyboard("{ArrowRight}");
            await waitFor(() => {
                const next = stripTab(to);
                assert.isTrue(next?.checked, `${to} is picked`);
                assert.strictEqual(document.activeElement, next, `focus is on the ${to} tab`);
            });
            await userEvent.keyboard("{ArrowLeft}");
            await waitFor(() => {
                const back = stripTab(from);
                assert.isTrue(back?.checked, `${from} is picked again`);
                assert.strictEqual(document.activeElement, back, `focus is on the ${from} tab`);
            });
        });
    }

    it("node.fill: Linear from Solid is one undo step", async () => {
        const { session, layer, row } = await rowOf("node.fill");
        await openRowSettings(row);
        const linear = stripTab("Linear");
        assert.isNotNull(linear, "the Linear tab");
        const steps = session.history.position;
        const label = document.querySelector<HTMLElement>(`label[for="${linear.id}"]`);
        assert.isNotNull(label);
        await userEvent.click(label);
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer)?.set?.["node.gradientKind"], "linear", "a linear gradient");
        });
        await session.styles.settled();
        assert.strictEqual(session.history.position, steps + 1, "one step");
    });

    it("node.shape: its drop-down is its one control for a basic shape, a model or a shader, in every state", async () => {
        const { session, layer, row } = await rowOf("node.shape");
        const states: readonly (readonly [string, Readonly<Partial<Record<Channel, ChannelValue>>>, string])[] = [
            ["a basic shape", {}, ""],
            ["a model", { "node.model": "asset:sample/person" }, "Person"],
            ["a shader", { "node.shaders": [{ shader: "icon-sticker" }] }, "Sticker"],
        ];
        for (const [state, set, named] of states) {
            // Each state alone: the model goes before the shader comes.
            const { "node.model": _model, ...rest } = session.styles.get(layer)?.set ?? {};
            await session.styles.update(layer, { set: { ...rest, ...set } });
            await session.styles.settled();
            const live = await waitFor(() => {
                const found = row.isConnected ? row : document.querySelector<HTMLElement>('[data-thing="shape"]');
                assert.isNotNull(found, "the Shape row");
                const list = found.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
                assert.isNotNull(list, `${state}: the Shape list on its row`);
                assert.include(list.getAttribute("aria-label") ?? "", named, `${state}: the list names it`);
                return found;
            });
            // No Kind buttons under the row, and no Basic / Model / Shader tabs in its pop-over.
            assert.isNull(live.querySelector('[data-member-menu="node.shape"]'), `${state}: no Kind buttons`);
            const settings = [...live.querySelectorAll<HTMLElement>("button[aria-label]")].some((each) =>
                / settings( has configured values)?$/.test(each.getAttribute("aria-label") ?? ""),
            );
            if (settings) {
                const pop = await openRowSettings(live);
                assert.isNull(
                    pop.querySelector("[data-member-menu], [data-strip]"),
                    `${state}: no tabs in its pop-over`,
                );
                assert.isNull(pop.querySelector('[data-line="node.model"]'), `${state}: no Model line`);
                await closeAll();
            }
            // Its list holds every way: the shapes, then Models and Shaders.
            const list = live.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(list);
            await userEvent.click(list);
            const sections = await screen.findByRole("combobox", { name: "Node shape section" });
            await userEvent.click(sections);
            const names = (await screen.findAllByRole("option")).map((each) => each.textContent.trim());
            assert.includeMembers(names, ["Basic", "Models", "Shaders"], `${state}: every section`);
            await userEvent.keyboard("{Escape}");
            await closeAll();
        }
    });

    it("node.shape: a sticker, a model and a basic shape again are picked from the one drop-down", async () => {
        const { session, layer, row } = await rowOf("node.shape");
        const live = (): HTMLElement => {
            const found = row.isConnected ? row : document.querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        };
        const pickFrom = async (section: string, option: string): Promise<void> => {
            const list = await waitFor(() => {
                const found = live().querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
                assert.isNotNull(found);
                return found;
            });
            await userEvent.click(list);
            await userEvent.click(await screen.findByRole("combobox", { name: "Node shape section" }));
            await userEvent.click(await screen.findByRole("option", { name: section }));
            const values = await screen.findByRole("group", { name: "Node shape values" });
            await userEvent.click(within(values).getByRole("option", { name: option }));
        };
        const set = (channel: Channel): unknown => session.styles.get(layer)?.set?.[channel];
        await pickFrom("Shaders", "Sticker");
        await waitFor(() => {
            assert.deepInclude(set("node.shaders") as unknown[], { shader: "icon-sticker" }, "the sticker draws");
        });
        // Model... opens the Models gallery beside the list, and its pick switches the Shape to the model.
        await pickFrom("Models", "Model...");
        const models = await screen.findByRole("dialog", { name: "Models" });
        await userEvent.click(within(models).getByRole("button", { name: "Person" }));
        await waitFor(() => {
            assert.isString(set("node.model"), "the model draws");
            const uses = set("node.shaders");
            assert.isFalse(
                Array.isArray(uses) && uses.some((use: { shader?: string }) => use.shader === "icon-sticker"),
                "the sticker goes",
            );
        });
        await pickFrom("Basic", "Box");
        await waitFor(() => {
            assert.strictEqual(set("node.shape"), "box", "the basic shape draws");
            assert.isUndefined(set("node.model"), "the model goes");
        });
    });
});

/** A pie, chart and record from data, each with a list field, a Graph value and a plain value (spec 2.5). */
const DATA_WALKS = [
    {
        key: "node.pieData",
        thing: "pie",
        title: "Node pie",
        spec: {
            entries: [
                { field: "data.animals" },
                { graph: { over: "neighbors", measure: "count", groupBy: { by: "value", path: "data.kind" } } },
                // A plain entry: its color and name are its Entry pop-over's alone, never Colors' too.
                { field: "data.amount" },
            ],
            keep: 2,
            whole: { max: 10 },
        },
    },
    {
        key: "node.chartData",
        thing: "chart",
        title: "Node chart",
        spec: { entries: [{ field: "data.amount" }, { graph: { over: "edges", measure: "count" } }] },
    },
    {
        key: "node.recordData",
        thing: "record",
        title: "Node record",
        spec: { entries: [{ field: "data.amount" }, { graph: { over: "edges", measure: "count" } }] },
    },
] as const;

/**
 * Inputs that do not describe themselves (design "Input rules": every input must be self describing, and shows the
 * value drawn when unset): a field showing graphty-element's internal key ("data.x1") for a name; a slider with an
 * unnamed thumb, or without a number field for each thumb beside it; more than one unnamed color chip in a surface,
 * so a chip does not say which color it sets; a name "A / B" over a line drawing fewer inputs than it names.
 * @param lines - the surface's lines.
 * @returns what is wrong.
 */
function notDescribed(lines: readonly HTMLElement[]): string[] {
    const out: string[] = [];
    let unnamedChips = 0;
    for (const line of lines) {
        const fields = own(line, "input, textarea") as HTMLInputElement[];
        if (fields.some((field) => /^(data|graph|value)\.[\w.]+$/.test(field.value))) {
            out.push(`${nameOf(line)}: shows an internal key`);
        }
        const thumbs = own(line, '[role="slider"]');
        const numbers = fields.filter(
            (field) =>
                !["checkbox", "radio", "hidden", "range"].includes(field.type) &&
                field.closest('[role="slider"]') === null,
        );
        if (thumbs.some((thumb) => (thumb.getAttribute("aria-label") ?? "") === "")) {
            out.push(`${nameOf(line)}: a slider thumb has no name`);
        }
        if (thumbs.length > numbers.length) {
            out.push(
                `${nameOf(line)}: ${String(thumbs.length)} slider thumbs, ${String(numbers.length)} number fields`,
            );
        }
        const legend = line.querySelector(".cm-legend-text, .cm-field-label, .cm-caption")?.textContent.trim() ?? "";
        const chip = own(line, "button[aria-label]").some((button) =>
            /, #[\dA-F]{6}$/i.test(button.getAttribute("aria-label") ?? ""),
        );
        if (chip && legend === "") {
            unnamedChips += 1;
        }
        const names = legend.split(" / ").length;
        const inputs =
            own(line, CONTROLS).filter(
                (each) =>
                    each.closest(".ws-vary") === null &&
                    !/^Remove /.test(each.getAttribute("aria-label") ?? "") &&
                    each.closest('[role="radiogroup"]') === null,
            ).length + new Set(own(line, '[role="radiogroup"]')).size;
        if (legend.includes(" / ") && inputs < names) {
            out.push(`${nameOf(line)}: named "${legend}" over ${String(inputs)} input`);
        }
    }
    if (unnamedChips > 1) {
        out.push(`${String(unnamedChips)} color chips with no name`);
    }
    return out;
}

/**
 * Lines with two ways to open one pop-over (owner, 2026-11-24: "there should only be one path to any control"): a
 * control of the line that opens the pop-over its "..." opens. Each control is clicked as a reader does, and what it
 * opened is closed again.
 * @param lines - the lines.
 * @returns what is wrong.
 */
async function twoOpeners(lines: readonly HTMLElement[]): Promise<string[]> {
    const out: string[] = [];
    for (const line of lines) {
        const more = own(line, ".ws-vary button[aria-label]").find((each) =>
            / settings( has configured values)?$/.test(each.getAttribute("aria-label") ?? ""),
        );
        if (more === undefined) {
            continue;
        }
        const title = (more.getAttribute("aria-label") ?? "").replace(/ settings( has configured values)?$/, "");
        const buttons = own(line, "button[aria-label]").filter(
            (each) => each.closest(".ws-vary") === null && !/^Remove /.test(each.getAttribute("aria-label") ?? ""),
        );
        for (const button of buttons) {
            const before = openCount();
            await userEvent.click(button);
            const titles = [...document.querySelectorAll<HTMLElement>('[data-popout-id] [data-testid="popout-header"]')]
                .filter(laidOut)
                .map((each) => each.textContent.trim());
            if (titles.includes(title)) {
                out.push(`${nameOf(line)}: ${button.getAttribute("aria-label") ?? ""} opens what its "..." opens`);
            }
            if (openCount() > before) {
                await closeAll();
            }
        }
    }
    return out;
}

/**
 * A pop-over's lines checked as every pop-over's are: at most six lines tall, the minus last, a slot after its control,
 * buttons hidden at rest, every input showing a value, compact-mantine's names, nothing edited twice.
 * @param what - the pop-over's name in the findings.
 * @param pop - the pop-over.
 * @returns what breaks a rule.
 */
async function checkedLines(what: string, pop: HTMLElement): Promise<string[]> {
    await userEvent.hover(screen.getByRole("tab", { name: "Style" }));
    const lines = linesIn(pop);
    const tall = linesTall(pop);
    return [
        ...(tall > 6 ? [`${String(tall)} lines: ${lines.map(nameOf).join(", ")}`] : []),
        ...minusNotLast(lines),
        ...slotNotAfterControl(lines),
        ...shownAtRest(lines),
        ...emptyInputs(lines),
        ...namesNotBuiltIn(lines),
        ...editedTwice(lines),
        ...notDescribed(lines),
    ].map((each) => `${what}: ${each}`);
}

/**
 * The pop-over a beside pop-over's title names, once open.
 * @param title - its title.
 * @returns its panel.
 */
async function besideNamed(title: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-beside-pop="${title}"]`);
        assert.isNotNull(found, `${title} is open`);
        return found.closest<HTMLElement>("[data-popout-id]") ?? found;
    });
}

/**
 * The categories of a data pop-over's Colors group that are a plain entry's (one part, no list, pattern or group),
 * whose color and name its Entry pop-over already sets (owner, 2026-11-24: one path to any control).
 * @param session - the session.
 * @param layer - the layer.
 * @param key - the data channel.
 * @param openData - opens the data pop-over.
 * @returns each such category's name.
 */
async function plainInColors(
    session: GraphSession,
    layer: string,
    key: DataChannel,
    openData: () => Promise<HTMLElement>,
): Promise<string[]> {
    const node = session.styles.dataSample(layer, key, "first");
    if (node === null) {
        return [];
    }
    const facts = session.styles.dataFacts(layer, key, node);
    const { entries } = (session.styles.get(layer)?.set?.[key] ?? { entries: [] }) as {
        entries: Record<string, unknown>[];
    };
    // graphty-element's key for a plain entry's one part: its field, else its kind and place.
    const plain = new Set(
        entries.flatMap((entry, at) => {
            if ((facts.entries[at]?.parts?.length ?? 0) > 0 || "pattern" in entry) {
                return [];
            }
            if (typeof entry.field === "string") {
                return [entry.field];
            }
            return ["graph" in entry ? `graph.${String(at)}` : `value.${String(at)}`];
        }),
    );
    const names = facts.categories.filter((each) => plain.has(each.key)).map((each) => each.name);
    const data = await openData();
    if (names.length === 0 || !(await menuOf(data)).some((entry) => entry.name === "Colors")) {
        return [];
    }
    const colors = await openGroup(data.isConnected ? data : await openData(), "Colors");
    const category = within(colors).queryByRole("combobox", { name: "Category" });
    if (category === null) {
        return [];
    }
    await userEvent.click(category);
    const listed = (await screen.findAllByRole("option")).map((each) => each.textContent.trim());
    await userEvent.keyboard("{Escape}");
    return names.filter((name) => listed.includes(name)).map((name) => `${name} is listed`);
}

describe("Style panel v2's input rules on data pop-overs (spec 2.5)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const walk of DATA_WALKS) {
        it(`${walk.key}: the data pop-over, an entry's, its Format and Calculate, and the groups`, async () => {
            const { session, nodes } = await openGraph();
            await session.data.updateNodes([
                { id: "a", values: { animals: ["dog", "dog", "cat"], amount: 4, kind: "farm" } },
                { id: "b", values: { animals: ["cat"], amount: 2, kind: "shop" } },
                { id: "c", values: { amount: 1, kind: "farm" } },
            ]);
            await session.styles.update(nodes, {
                set: { ...session.styles.get(nodes)?.set, [walk.key]: walk.spec },
            });
            await session.styles.settled();
            const tab = await openStyle("Key people");
            await showKind("node");
            const row = await waitFor(() => {
                const found = tab.querySelector<HTMLElement>(`[data-thing="${walk.thing}"]`);
                assert.isNotNull(found, `the ${walk.thing} row`);
                return found;
            });
            const openData = async (): Promise<HTMLElement> => {
                const button = [
                    ...row.querySelectorAll<HTMLElement>(`[data-line="${walk.key}"] button[aria-label]`),
                ].find((each) => (each.getAttribute("aria-label") ?? "").startsWith(`${walk.title} settings`));
                assert.isDefined(button, "the data pop-over's button");
                if (button.getAttribute("aria-expanded") !== "true") {
                    await userEvent.hover(button.closest<HTMLElement>(".ws-row") ?? row);
                    await userEvent.click(button);
                }
                return openedBy(button);
            };
            const found: string[] = [];
            const pop = await openData();
            found.push(...(await checkedLines("data", pop)));
            const groups: Found = {
                names: [],
                fourth: [],
                inPlace: [],
                notIcon: [],
                covers: [],
                minus: [],
                slot: [],
                rest: [],
                empty: [],
            };
            await walkGroups(walk.key, pop, openData, groups);
            for (const [rule, list] of Object.entries(groups)) {
                if (Array.isArray(list) && list.length > 0 && rule !== "few") {
                    found.push(`groups ${rule}: ${list.join(", ")}`);
                }
            }
            // One path to any control, across the data pop-over and its groups; and its grouped buttons open nothing.
            await closeAll();
            const data = await openData();
            found.push(
                ...twoPaths(mergePaths(groups.paths, controlsOf(linesIn(data)))).map((each) => `data: ${each}`),
                ...(await groupsOpen(data, openData)).map((each) => `data: ${each} opens`),
            );
            await closeAll();

            // One path to an entry's pop-over: its line's own controls never open what its "..." opens.
            found.push(
                ...(await twoOpeners(linesIn(row).filter((line) => line.closest("[data-entry]") !== null))).map(
                    (each) => `row: ${each}`,
                ),
            );
            // A plain entry's color and name are set in its Entry pop-over: its category is not in Colors' list too.
            found.push(...(await plainInColors(session, nodes, walk.key, openData)).map((each) => `Colors: ${each}`));
            await closeAll();

            // The Graph value's entry: its pop-over, Format beside it, then Calculate beside it.
            const entryButton = (): HTMLElement => {
                const line = row.querySelector<HTMLElement>('[data-entry="1"]');
                assert.isNotNull(line, "the Graph value's line");
                const button = [...line.querySelectorAll<HTMLElement>("button[aria-label]")].find((each) =>
                    / settings( has configured values)?$/.test(each.getAttribute("aria-label") ?? ""),
                );
                assert.isDefined(button);
                return button;
            };
            await userEvent.hover(entryButton().closest<HTMLElement>(".ws-row") ?? row);
            await userEvent.click(entryButton());
            const entry = await openedBy(entryButton());
            found.push(...(await checkedLines("entry", entry)));
            // The Format pop-over is the one place a format is set: no drop-down of presets beside it.
            if (within(entry).queryByRole("combobox", { name: "Format" }) !== null) {
                found.push("entry: a format is set from the Format drop-down and from the Format pop-over");
            }
            const formatOpener = within(entry).getByRole("button", { name: / format(, .*| settings)$/ });
            // Shown on hover of its line, as a reader meets it.
            await userEvent.hover(formatOpener.closest<HTMLElement>(".ws-row") ?? formatOpener);
            await userEvent.click(formatOpener);
            const format = await besideNamed("Format");
            found.push(...(await checkedLines("format", format)));
            await userEvent.click(within(format).getByRole("button", { name: "Close Format" }));
            await waitFor(() => {
                assert.isNull(document.querySelector('[data-beside-pop="Format"]'), "Format closed");
            });
            await userEvent.click(within(entry).getByRole("button", { name: /^Graph value/ }));
            const calculate = await besideNamed("Calculate");
            found.push(...(await checkedLines("calculate", calculate)));
            // Its drop-downs and pickers are the third level: none opens a fourth.
            for (const picker of within(calculate).queryAllByRole("combobox")) {
                // Escape may close Calculate with the picker: a picker no longer drawn is not counted again.
                if (picker.isConnected && picker.getAttribute("aria-haspopup") === "dialog") {
                    await userEvent.click(picker);
                    const opened = await openedBy(picker);
                    if (opened.querySelector('button[aria-haspopup="dialog"]') !== null) {
                        found.push(`calculate: ${picker.getAttribute("aria-label") ?? ""} opens a fourth level`);
                    }
                    await userEvent.keyboard("{Escape}");
                }
            }
            await closeAll();
            assert.deepEqual(found, [], `\n${found.join("\n")}`);
        });
    }
});
