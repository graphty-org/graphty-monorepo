/**
 * Style panel v2 treats a custom shader exactly like a built-in one (owner, 2026-11-18), on the REAL
 * graphty-element and real input: a pasted shader whose header declares the parameters of the built-in Glass
 * marble -- colors, numbers with a range, a whole number and one that varies by data -- gets, line by line, the same controls, the
 * same ranges and the same by-data link in its row's pop-over, and typing into one writes its value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

/** The built-in shader the custom one copies the parameters of. */
const BUILT_IN = "glass-marble";

/**
 * What a pop-over's parameter lines offer, line by line: the name, each field's role and range, whether it
 * is a color, and whether it varies by data.
 * @param pop - the pop-over.
 * @returns one signature a line.
 */
function signatures(pop: HTMLElement): string[] {
    return [...pop.querySelectorAll<HTMLElement>(".ws-field")].flatMap((line) => {
        const name = line.querySelector(".ws-field-name")?.getAttribute("title");
        if (name === null || name === undefined || name === "Place") {
            return [];
        }
        const fields = [...line.querySelectorAll("input")].map((input) =>
            [
                input.getAttribute("role") ?? input.type,
                input.getAttribute("aria-valuemin") ?? "",
                input.getAttribute("aria-valuemax") ?? "",
            ].join(":"),
        );
        const color = line.querySelector(".cm-paint") === null ? "" : "color";
        const varies = line.querySelector('[aria-label$="by attribute"]') === null ? "" : "by-data";
        return [[name, ...fields, color, varies].join("|")];
    });
}

/**
 * Opens a shader row's settings pop-over and reads its parameter lines.
 * @param section - the Shaders section.
 * @param shader - the use's shader id.
 * @returns the pop-over and its lines' signatures.
 */
async function openUse(section: HTMLElement, shader: string): Promise<{ pop: HTMLElement; lines: string[] }> {
    const row = await waitFor(() => {
        const found = section.querySelector<HTMLElement>(`[data-shader="${shader}"]`);
        assert.isNotNull(found, shader);
        return found;
    });
    await userEvent.click(within(row).getByRole("button", { name: / settings/ }));
    const pop = await waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        assert.isAbove(signatures(found).length, 0);
        return found;
    });
    return { pop, lines: signatures(pop) };
}

describe("Style panel v2's custom shader parameters", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a custom shader's parameters get the built-in's controls, ranges and by-data link, and write", async () => {
        const { session, nodes } = await openGraph();
        const builtIn = session.catalog.shaders().find((shader) => shader.id === BUILT_IN);
        assert.isDefined(builtIn);
        const header = { id: "user/marble", name: "My marble", place: "paint", params: builtIn?.params ?? [] };
        const added = await session.shaders.add(
            `/* graphty-shader 1\n${JSON.stringify(header)}\n*/\nvec4 shade(NodeInput n) { return n.color; }\n`,
        );
        assert.isTrue(added.ok, JSON.stringify(added));
        await session.styles.update(nodes, {
            set: { "node.color": "#E8590C", "node.shaders": [{ shader: BUILT_IN }, { shader: "user/marble" }] },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const section = sectionOf(tab, "node-effects");

        const ours = await openUse(section, BUILT_IN);
        await userEvent.keyboard("{Escape}");
        const theirs = await openUse(section, "user/marble");
        assert.deepEqual(theirs.lines, ours.lines, "line for line the same controls");
        assert.isTrue(
            theirs.lines.some((line) => line.includes("color")),
            "the color parameter is a color control",
        );
        assert.isTrue(
            theirs.lines.some((line) => line.includes("by-data")),
            "a parameter that varies has its by-data link",
        );
        assert.isTrue(
            theirs.lines.some((line) => line.includes(":0.02:0.4")),
            "Thickness keeps its 0.02 to 0.4 range",
        );

        // Thickness: the one number from 0.02 to 0.4.
        const input = theirs.pop.querySelector<HTMLInputElement>('.ws-field input[aria-valuemin="0.02"]');
        assert.isDefined(input ?? undefined, "Thickness has a field");
        if (input !== null && input !== undefined) {
            await userEvent.click(input);
            await userEvent.keyboard("{Control>}a{/Control}0.3{Enter}");
        }
        await waitFor(() => {
            const uses = session.styles.get(nodes)?.set?.["node.shaders"];
            const use = Array.isArray(uses) ? uses.find((each) => each.shader === "user/marble") : undefined;
            assert.equal(use?.params?.thickness, 0.3, "typing writes the custom shader's parameter");
        });
    });
});
