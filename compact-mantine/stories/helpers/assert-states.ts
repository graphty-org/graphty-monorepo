/**
 * The play-function check every States story runs: each state the story shows must actually be
 * drawn. A States story forces its states with a hook (`data-cm-state`, `data-state`,
 * `data-cm-force`) or sets them with props (`disabled`, `aria-selected`, `data-checked`, ...);
 * nothing else notices when a hook stops matching its CSS, or a prop stops reaching the element,
 * and the cell quietly draws the rest look under a "hover" caption.
 *
 * For every control in a state, the check takes that state away for a moment and compares the
 * drawing before and after: colors, edges, rings, shadows, opacity and weight of the control,
 * everything inside it, their `::before` and `::after`, and three ancestors (a state drawn on a
 * wrapper through `:has()`). The state must change at least one of them.
 *
 * A state is usually written more than once -- Mantine puts `disabled` and `data-disabled` on the
 * input and `data-disabled` on its wrapper -- so the check takes away every attribute of the same
 * kind on the control, its descendants and its ancestors together, and a checked box's `checked`
 * property with them. Real keyboard focus is taken away by blurring.
 */
import { expect } from "@storybook/test";

type Marker = readonly [attribute: string, values: readonly string[] | null];

/** Kinds of state, each the attributes (and the values meaning "on") that write it. */
const KINDS: Readonly<Record<string, readonly Marker[]>> = {
    forced: [["data-cm-state", null], ["data-cm-force", null]],
    forcedState: [["data-state", ["hover", "focus", "pressed", "open", "active"]]],
    disabled: [
        ["disabled", null],
        ["data-disabled", null],
        ["aria-disabled", ["true"]],
    ],
    // Selected, current and checked are one kind: a listbox option or a menu row writes the same
    // "on" as aria-selected and data-checked together.
    on: [
        ["aria-selected", ["true"]],
        ["aria-current", null],
        ["data-selected", null],
        ["data-active", null],
        ["data-highlighted", null],
        ["data-hovered", null],
        ["data-combobox-selected", null],
        ["aria-checked", ["true", "mixed"]],
        ["data-checked", ["true", ""]],
        ["data-indeterminate", null],
    ],
    expanded: [["aria-expanded", ["true"]]],
    pressed: [["aria-pressed", ["true"]]],
    invalid: [
        ["aria-invalid", ["true"]],
        ["data-error", null],
    ],
    changed: [["data-changed", ["true"]]],
    mixed: [["data-mixed", ["true"]]],
};

/** What a state may change. Geometry is left out: a state that only moves a box is not drawn. */
const PROPERTIES = [
    "color",
    "background-color",
    "background-image",
    "border-top-color",
    "border-bottom-color",
    "border-top-width",
    "outline-color",
    "outline-style",
    "outline-width",
    "outline-offset",
    "box-shadow",
    "opacity",
    "font-weight",
    "text-decoration-line",
    "visibility",
    "display",
    "fill",
    "stroke",
    "transform",
    "font-style",
];

/** How far up a control's own markup reaches (Mantine: input, wrapper, root). */
const REACH = 3;

/**
 * The ancestors of an element, nearest first.
 * @param element - where to start
 * @param count - how many
 * @returns up to `count` ancestors
 */
function ancestorsOf(element: Element, count: number): Element[] {
    const found: Element[] = [];
    for (let node = element.parentElement; node !== null && found.length < count; node = node.parentElement) {
        found.push(node);
    }
    return found;
}

/**
 * The drawing around an element: the computed look of everything under its third ancestor (the
 * control's own markup, and a sibling it styles with `+`), with pseudo-elements.
 * @param element - the control whose state is checked
 * @returns a string that changes when anything drawn changes
 */
function drawing(element: Element): string {
    const root = ancestorsOf(element, REACH).at(-1) ?? element;
    return [root, ...root.querySelectorAll("*")]
        .map((node) =>
            [null, "::before", "::after"]
                .map((pseudo) => {
                    const style = getComputedStyle(node, pseudo);
                    return PROPERTIES.map((property) => style.getPropertyValue(property)).join("|");
                })
                .join("/"),
        )
        .join("\n");
}

/**
 * Whether an element carries a state of this kind.
 * @param element - the element
 * @param markers - the kind's attributes
 * @returns whether any of them is on
 */
function carries(element: Element, markers: readonly Marker[]): boolean {
    return markers.some(([attribute, values]) => {
        const value = element.getAttribute(attribute);
        return value !== null && (values === null || values.includes(value));
    });
}

/**
 * A short name for an element, for the failure message.
 * @param element - the element
 * @returns tag, classes and label
 */
function describe(element: Element): string {
    const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24) ?? "";
    return `<${element.tagName.toLowerCase()} class="${String(element.getAttribute("class") ?? "").slice(0, 60)}"> "${label}"`;
}

/**
 * Take a state away from a control and its own markup, and give back a function that restores it.
 * @param top - the outermost element of the control that carries the state
 * @param markers - the kind's attributes
 * @returns the restore function
 */
function takeAway(top: Element, markers: readonly Marker[]): () => void {
    const undo: (() => void)[] = [];
    for (const node of [...ancestorsOf(top, REACH), top, ...top.querySelectorAll("*")]) {
        for (const [attribute, values] of markers) {
            const value = node.getAttribute(attribute);
            if (value !== null && (values === null || values.includes(value))) {
                node.removeAttribute(attribute);
                undo.push(() => node.setAttribute(attribute, value));
            }
        }
        if (node instanceof HTMLInputElement && node.checked && markers.some(([a]) => a === "data-checked")) {
            node.checked = false;
            undo.push(() => {
                node.checked = true;
            });
        }
    }
    return () => undo.forEach((restore) => restore());
}

/** Options for {@link expectStatesApply}. */
export interface StatesApplyOptions {
    /**
     * Selectors for controls whose state is drawn exactly like rest, on purpose (Figma draws no
     * hover on some controls). Each needs a reason at the call site.
     */
    unchanged?: readonly string[];
    /** Kinds of state the story does not mean to show (see KINDS). */
    ignore?: readonly string[];
}

/**
 * Assert that every state the story sets is drawn.
 * @param canvasElement - the story's root
 * @param options - states that are drawn like rest on purpose
 */
export async function expectStatesApply(canvasElement: HTMLElement, options: StatesApplyOptions = {}): Promise<void> {
    const { unchanged = [], ignore = [] } = options;
    const exempt = (element: Element): boolean => unchanged.some((selector) => element.matches(selector));
    const doc = canvasElement.ownerDocument;
    // Overlays a States story holds open render in place or in a portal; look in both.
    const scopes = [canvasElement, ...doc.querySelectorAll("[data-portal]")];
    const failures: string[] = [];
    let checked = 0;
    // A transition would report the old value for the first frame after a change: switch them off
    // while the check reads the drawing.
    const still = doc.createElement("style");
    still.textContent = "*, *::before, *::after { transition: none !important; }";
    doc.head.append(still);

    for (const [kind, markers] of Object.entries(KINDS)) {
        if (ignore.includes(kind)) {
            continue;
        }
        const selector = markers.map(([attribute]) => `[${attribute}]`).join(",");
        const marked = scopes.flatMap((scope) => [...scope.querySelectorAll(selector)]).filter((e) => carries(e, markers));
        // One check per control: the outermost element that carries the state.
        const tops = marked.filter((e) => !ancestorsOf(e, REACH).some((a) => carries(a, markers)));
        for (const top of tops) {
            if (exempt(top) || [...top.querySelectorAll("*")].some((e) => carries(e, markers) && exempt(e))) {
                continue;
            }
            const on = drawing(top);
            const restore = takeAway(top, markers);
            const off = drawing(top);
            restore();
            checked++;
            if (on === off) {
                failures.push(`${kind} draws nothing on ${describe(top)}`);
            }
        }
    }

    // Real keyboard focus (a story that tabs to a control): blur it and compare.
    const active = doc.activeElement;
    // A menu's focus trap parks focus on an empty sentinel; that is not a control the story shows.
    const sentinel = active instanceof HTMLElement && (active.hasAttribute("data-autofocus") || active.getClientRects().length === 0);
    if (active instanceof HTMLElement && active !== doc.body && !sentinel && active.matches(":focus-visible") && !exempt(active)) {
        const on = drawing(active);
        active.blur();
        const off = drawing(active);
        active.focus();
        checked++;
        if (on === off) {
            failures.push(`keyboard focus draws nothing on ${describe(active)}`);
        }
    }

    still.remove();
    await expect(failures, failures.join("; ")).toEqual([]);
    await expect(checked, "the story sets no state this check knows").toBeGreaterThan(0);
}
