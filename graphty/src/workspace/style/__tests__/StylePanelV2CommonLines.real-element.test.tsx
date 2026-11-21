/**
 * Every line under a v2 Style row uses the one common pattern (owner, 2026-11-20, E674: "no other row has an icon
 * next to it like that -- we should have common interaction patterns and eschew special cases"), on the REAL
 * graphty-element and real clicks: a line is its name, one value control and its "-". Among lines whose values are
 * of one kind (numbers, colors, choices, words, switches), none carries a glyph, toggle or widget the others of
 * that kind lack; and a number's scrub slot is one letter, never an icon.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle } from "./v2Harness";

/** What a value control is made of, beyond its scrub slot: each widget one word. */
const WIDGETS = 'svg, button, [role="switch"], [role="radio"], [role="combobox"], input[type="checkbox"]';

/**
 * A line's widgets, as words, its scrub slot left out.
 * @param line - the line.
 * @returns the sorted words.
 */
function widgetsOf(line: Element): string[] {
    const control = line.querySelector(".ws-field-control");
    return [...(control?.querySelectorAll(WIDGETS) ?? [])]
        .filter((each) => each.closest(".cm-scrub-slot") === null)
        .map((each) => each.getAttribute("role") ?? each.tagName.toLowerCase())
        .sort();
}

/**
 * The kind of value a line edits: its channel's, or for a label field a field's.
 * @param line - the line's channel or field address.
 * @returns the kind.
 */
function kindOf(line: string): string {
    return channelDescriptor(line)?.accepts ?? "field";
}

/**
 * Every line shown: the sidebar's, and each row's settings pop-over's, opened by a real click one at a time.
 * @param tab - the Style tab.
 * @param seen - the lines read so far, by address, with their widgets.
 */
async function readLines(tab: HTMLElement, seen: Map<string, string[]>): Promise<void> {
    const take = (root: ParentNode): void => {
        for (const line of root.querySelectorAll<HTMLElement>(".ws-row[data-line]")) {
            seen.set(line.dataset.line ?? "", widgetsOf(line));
            const slot = line.querySelector(".cm-scrub-slot");
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
                "node.labelStyle": { weight: "bold", italic: true, size: 1 },
                "node.glow": "#FFC800",
                "node.outerBorderColor": "#2266ff",
                "node.shadowColor": "#000000",
            },
        });
        await session.styles.update(edges, {
            set: { "edge.color": "#336699", "edge.width": 2, "edge.arrowHead": "vee", "edge.route": "arc" },
        });
        await session.styles.settled();
        const seen = new Map<string, string[]>();
        const tab = await openStyle("Key people");
        await readLines(tab, seen);
        await openStyle("Links");
        await showKind("edge");
        await readLines(await screen.findByTestId("style-tab"), seen);
        assert.isAbove(seen.size, 20, "the walk reached the lines");

        // The widgets the most lines of a kind have are that kind's pattern; any other word on a line is a special case.
        const byKind = new Map<string, Map<string, number>>();
        for (const [line, widgets] of seen) {
            const counts = byKind.get(kindOf(line)) ?? new Map<string, number>();
            const key = widgets.join(",");
            counts.set(key, (counts.get(key) ?? 0) + 1);
            byKind.set(kindOf(line), counts);
        }
        const special: string[] = [];
        for (const [line, widgets] of seen) {
            const counts = [...(byKind.get(kindOf(line)) ?? new Map<string, number>())];
            const common = new Set(
                counts
                    .sort((a, b) => b[1] - a[1])[0]?.[0]
                    .split(",")
                    .filter(Boolean) ?? [],
            );
            const extra = widgets.filter((widget) => !common.has(widget));
            if (extra.length > 0) {
                special.push(`${line} (${kindOf(line)}): ${extra.join(", ")}`);
            }
        }
        assert.deepEqual(special, [], "lines with a widget their kind's other lines lack");
    });
});
