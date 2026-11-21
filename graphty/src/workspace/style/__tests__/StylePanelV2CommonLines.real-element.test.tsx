/**
 * Every line under a v2 Style row uses the one common pattern (owner, 2026-11-20, E674: "no other row has an icon
 * next to it like that -- we should have common interaction patterns and eschew special cases"), on the REAL
 * graphty-element and real clicks: a line is its name, one value control and its "-". Among lines whose values are
 * of one kind (numbers, colors, choices, words, switches), none carries a glyph, toggle or widget the others of
 * that kind lack; and a number's scrub slot is one letter, never an icon.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelDescriptor, LABEL_STYLE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle } from "./v2Harness";

/** What a value control is made of, beyond its scrub slot: each widget one word. */
const WIDGETS = 'svg, button, [role="switch"], [role="radio"], [role="combobox"], input[type="checkbox"]';

/**
 * A line's widgets, as words: everything on the line but its name, its number's scrub slot, its "-", a row's
 * settings "..." (the parts every line shares), a value list's picture of its value and a pictured segment's
 * option icon, so a glyph beside the name or after the control counts too.
 * @param line - the line.
 * @returns the sorted words.
 */
function widgetsOf(line: Element): string[] {
    return [...line.querySelectorAll(WIDGETS)]
        .filter(
            (each) =>
                each.closest(".cm-scrub-slot") === null &&
                // a value list shows its value's own picture (a shape, an arrowhead, a route) with its name, on
                // every list alike: that is the value, not a glyph beside the line
                !(each.tagName.toLowerCase() === "svg" && each.closest("[data-value-listbox]") !== null) &&
                // and a pictured option set shows each option's own icon in its segment (design 6, "Pictured"): the
                // option, not a glyph beside the line; whether a set is pictured is the widths test's
                !(
                    each.tagName.toLowerCase() === "svg" && each.closest('[class*="SegmentedControl-control"]') !== null
                ) &&
                each.closest('button[aria-label^="Remove "]') === null &&
                each.closest('button[aria-label$=" settings"]') === null,
        )
        .map((each) => each.getAttribute("role") ?? each.tagName.toLowerCase())
        .sort();
}

/**
 * The kind of value a line edits: its channel's, or for a label field (`node.labelStyle.weight`) the field's, as
 * graphty-element's label style catalog says.
 * @param line - the line's channel or field address.
 * @returns the kind.
 */
function kindOf(line: string): string {
    // A padding's Separate sides line is a checkbox of its own (design 2.6).
    if (line.endsWith(":sides")) {
        return "boolean";
    }
    const channel = channelDescriptor(line);
    if (channel !== undefined) {
        return channel.accepts;
    }
    const field = line.split(".").at(-1);
    const descriptor = LABEL_STYLE_DESCRIPTORS.find((each) => each.field === field);
    return descriptor === undefined ? "label unit" : `label ${descriptor.accepts}`;
}

/** One line read: its control kind and its widgets. */
interface Line {
    readonly kind: string;
    readonly widgets: readonly string[];
}

/**
 * Every line shown: the sidebar's, and each row's settings pop-over's, opened by a real click one at a time.
 * @param tab - the Style tab.
 * @param seen - the lines read so far, by address, with their kind and widgets.
 */
async function readLines(tab: HTMLElement, seen: Map<string, Line>): Promise<void> {
    const take = (root: ParentNode): void => {
        for (const line of root.querySelectorAll<HTMLElement>(".ws-row[data-line]")) {
            // A Unit line shares its channel's address with the number line it picks the unit of.
            const address = `${line.dataset.line ?? ""}${/^R8/.test(line.dataset.rule ?? "") ? " (strip)" : ""}`;
            // A line's control kind is its value's kind and its rubric rule (a choice drawn as a strip or a list).
            seen.set(address, {
                kind: `${kindOf(line.dataset.line ?? "")} ${line.dataset.rule ?? ""}`.trim(),
                widgets: widgetsOf(line),
            });
            const slot = line.querySelector(".cm-scrub-slot");
            // A number's field has its scrub slot; a Unit line (R8) picks a unit, it is no number field.
            if (/number$/.test(kindOf(line.dataset.line ?? "")) && !/^R8/.test(line.dataset.rule ?? "")) {
                assert.isNotNull(slot, `${String(line.dataset.line)}: a number field has its scrub slot`);
            }
            if (slot !== null) {
                assert.isNull(slot.querySelector("svg"), `${String(line.dataset.line)}: the scrub slot is no icon`);
                assert.match(slot.textContent.trim(), /^[A-Z]$/i, `${String(line.dataset.line)}: one letter`);
            }
        }
    };
    take(tab);
    const buttons = [...tab.querySelectorAll<HTMLElement>("[data-style-panel-v2] button")].filter((button) =>
        / settings$/.test(button.getAttribute("aria-label") ?? ""),
    );
    for (const button of buttons) {
        await userEvent.click(button);
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        take(pop);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-thing-popover]"));
        });
    }
}

describe("Style panel v2's lines are one common pattern (E674)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("no line carries a widget its kind's other lines lack, and every scrub slot is a letter", async () => {
        const { session, nodes, edges } = await openGraph();
        await session.styles.update(nodes, {
            set: {
                "node.color": "#E8590C",
                "node.shape": "rectangle",
                "node.borderColor": "#111111",
                "node.borderWidth": 0.1,
                "node.label": "{id}",
                // a label field of every kind: a choice, a switch, a number, a color, words
                "node.labelStyle": {
                    weight: "bold",
                    italic: true,
                    size: 1,
                    color: "#ff0000",
                    font: "serif",
                    marginTop: 2,
                    marginRight: 2,
                    marginBottom: 2,
                    marginLeft: 2,
                },
                "node.glow": "#FFC800",
                "node.outerBorderColor": "#2266ff",
                "node.shadowColor": "#000000",
                // the lines that once carried a toggle the others lack: a padding's sides, an image's ratio lock
                "node.size": 1,
                "node.labelFit": "inside",
                "node.labelPaddingX": 0.2,
                "node.labelPaddingY": 0.2,
                "node.image": "data:image/png;base64,AAAA",
                "node.imageFit": "none",
                "node.imageWidth": 0.5,
                "node.imageHeight": 0.5,
                "node.imageAspect": true,
            },
        });
        await session.styles.update(edges, {
            set: { "edge.color": "#336699", "edge.width": 2, "edge.arrowHead": "vee", "edge.route": "arc" },
        });
        await session.styles.settled();
        const seen = new Map<string, Line>();
        const tab = await openStyle("Key people");
        await readLines(tab, seen);
        await openStyle("Links");
        await showKind("edge");
        await readLines(await screen.findByTestId("style-tab"), seen);
        assert.isAbove(seen.size, 20, "the walk reached the lines");
        // Every kind of line is walked, a channel's and a label field's.
        const kinds = new Set([...seen.keys()].map((line) => kindOf(line.replace(/ \(strip\)$/, ""))));
        for (const kind of ["color", "number", "enum", "label color", "label number", "label enum", "label boolean"]) {
            assert.isTrue(kinds.has(kind), `the walk met a ${kind} line (met: ${[...kinds].join(", ")})`);
        }

        // The widgets the most lines of a kind have are that kind's pattern; any other word on a line is a special case.
        const byKind = new Map<string, Map<string, number>>();
        for (const { kind, widgets } of seen.values()) {
            const counts = byKind.get(kind) ?? new Map<string, number>();
            const key = widgets.join(",");
            counts.set(key, (counts.get(key) ?? 0) + 1);
            byKind.set(kind, counts);
        }
        const special: string[] = [];
        for (const [line, { kind, widgets }] of seen) {
            const counts = [...(byKind.get(kind) ?? new Map<string, number>())];
            const common = new Set(
                counts
                    .sort((a, b) => b[1] - a[1])[0]?.[0]
                    .split(",")
                    .filter(Boolean) ?? [],
            );
            const extra = widgets.filter((widget) => !common.has(widget));
            if (extra.length > 0) {
                special.push(`${line} (${kind}): ${extra.join(", ")}`);
            }
        }
        assert.deepEqual(special, [], "lines with a widget their kind's other lines lack");
        // The lines that once carried a toggle are walked, and their modifiers are lines of their own (design 2.6).
        for (const line of ["node.labelPaddingX", "node.imageWidth", "node.imageAspect", "node.labelPaddingX:sides"]) {
            assert.isTrue(seen.has(line), `the walk reached ${line}`);
        }
        assert.isTrue(
            [...seen.keys()].some((line) => line.endsWith("labelStyle.marginTop")),
            "the walk reached a label's Margin",
        );
    });
});
