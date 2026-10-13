/**
 * The Effects lists and the edges' Head | Tail row on the REAL graphty-element, driven by real
 * input: "+" then Glow opens the color field with focus in its hex box, Escape writes nothing,
 * typing a hex writes the glow, the menu then refuses a second glow and says why, the entry's eye
 * covers the glow, a glow a layer beneath writes shows as a gray line, None for Head writes
 * `none`, and an end color left empty reads "Line color". Every assertion reads what the element
 * reports: the layer stack and what `styles.explain` says each element is painted.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { PopoutManager } from "@graphty/compact-mantine";
import type { Channel, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { StylePanel } from "../StylePanel";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [{ id: "1" }, { id: "2" }, { id: "3" }];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
];

let host: HTMLElement | null = null;

afterEach(() => {
    host?.remove();
    host = null;
});

/**
 * Puts a real element on the page (inside the test frame, so clicks land on it), waits for its
 * session and loads a small graph.
 * @returns the element and its session.
 */
async function mountElement(): Promise<{ element: HTMLElementTagNameMap["graphty-element"]; session: GraphSession }> {
    host = document.createElement("div");
    host.style.width = "360px";
    host.style.height = "240px";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    host.appendChild(element);
    document.body.appendChild(host);
    await waitFor(
        () => {
            assert.isDefined(element.session);
        },
        { timeout: TIMEOUT_MS },
    );
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { element, session: element.session };
}

/**
 * Adds a reader's layer pair (nodes and edges) on top and renders its Style tab.
 * @param session - the element's session.
 * @param element - the element.
 * @returns the row's layer ids.
 */
async function renderRow(session: GraphSession, element: HTMLElementTagNameMap["graphty-element"]): Promise<LayerId[]> {
    const nodes = await session.styles.add({
        name: "Top",
        target: "node",
        selector: { match: "everything" },
        set: { "node.opacity": 1 },
    });
    const edges = await session.styles.add({
        name: "Top edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.opacity": 1 },
    });
    const row = [nodes.id, edges.id];
    const value = makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), session, element);
    render(
        <WorkspaceContext.Provider value={value}>
            <PopoutManager>
                <div style={{ width: 280 }}>
                    <StylePanel layers={row} />
                </div>
            </PopoutManager>
        </WorkspaceContext.Provider>,
    );
    return row;
}

/**
 * What a layer writes for a channel.
 * @param session - the element's session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value, if any.
 */
function written(session: GraphSession, id: LayerId, channel: Channel): unknown {
    return session.styles.get(id)?.set?.[channel];
}

/**
 * The glow the element draws on node 1, as `styles.explain` reports it.
 * @param session - the element's session.
 * @returns its hex, `"none"` when written off, or undefined when no layer writes one.
 */
function glowOf(session: GraphSession): string | undefined {
    return session.styles.explain({ node: "1" }).merged["node.glow"]?.hex.slice(0, 7).toLowerCase();
}

/**
 * The node Effects list.
 * @returns the list.
 */
function nodeEffects(): HTMLElement {
    return screen.getByRole("group", { name: "Node effects" });
}

describe("effects and arrow ends on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("'+' then Glow opens its settings with focus in its hex box; Escape writes nothing and returns to '+'; a typed hex writes the glow; the eye covers it", async () => {
        const { session, element } = await mountElement();
        const [nodeLayer] = await renderRow(session, element);

        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Add to node effects" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Glow/ }));
        const settings = await screen.findByRole("dialog", { name: "Glow settings" });
        const hex = await within(settings).findByRole("textbox", { name: /^Node glow/ });
        await waitFor(() => {
            assert.equal(document.activeElement, hex, "focus lands in the glow's hex box");
        });
        // A new entry can vary by a value at once.
        assert.isNotNull(within(settings).getByRole("button", { name: "Node glow by attribute" }));
        // It draws nothing yet, so its line shows no color, only the glow's glyph.
        assert.isNull(
            nodeEffects().querySelector('[data-effect="Glow"] [data-testid="compact-color-input-chip"]'),
            "a pending entry shows no color chip",
        );
        assert.isUndefined(written(session, nodeLayer, "node.glow"), "picking writes nothing");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Glow settings" }), "Escape closes the settings");
            assert.isNull(nodeEffects().querySelector('[data-effect="Glow"]'), "Escape drops the entry");
            assert.equal(
                document.activeElement?.getAttribute("aria-label"),
                "Add to node effects",
                "focus goes back to '+'",
            );
        });
        assert.isUndefined(written(session, nodeLayer, "node.glow"), "Escape writes nothing");

        // The empty list's title opens the same menu, for a pointer.
        await userEvent.click(within(nodeEffects()).getByText("Effects"));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Glow/ }));
        const again = await screen.findByRole("dialog", { name: "Glow settings" });
        const box = await within(again).findByRole("textbox", { name: /^Node glow/ });
        await waitFor(() => {
            assert.equal(document.activeElement, box);
        });
        await userEvent.keyboard("FF00FF{Enter}");
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.glow"), "#FF00FF");
                assert.equal(glowOf(session), "#ff00ff");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Glow settings" }));
        });
        assert.equal(written(session, nodeLayer, "node.glow"), "#FF00FF", "closing a written entry keeps it");

        // A second glow is refused, with its reason.
        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Add to node effects" }));
        const item = await screen.findByRole("menuitem", { name: /^Glow/ });
        assert.include(item.textContent ?? "", "One glow per element");
        assert.isTrue(item.hasAttribute("data-disabled"), "Glow is disabled in the menu");
        await userEvent.keyboard("{Escape}");

        // The eye writes the glow's off value, which the element draws as no glow.
        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Hide glow" }));
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.glow"), "none");
                assert.equal(glowOf(session), "none", "the element draws no glow");
            },
            { timeout: TIMEOUT_MS },
        );
        // Showing it again gives back the color it had, not the element's default.
        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Hide glow" }));
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.glow"), "#FF00FF");
                assert.equal(glowOf(session), "#ff00ff", "the element draws the glow again");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("an effect entry is one line: a chip, its name, settings, eye and minus, each a 24 px target", async () => {
        const { session, element } = await mountElement();
        const [nodeLayer] = await renderRow(session, element);
        await session.styles.update(nodeLayer, { set: { "node.opacity": 1, "node.haloColor": "#111111" } });
        const entry = await waitFor(
            () => {
                const found = nodeEffects().querySelector<HTMLElement>('[data-effect="Halo"]');
                assert.isNotNull(found);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        const { height } = entry.getBoundingClientRect();
        assert.isAtMost(height, 30, "one line");
        // The color is a chip, named with its state and value; no hex box to cut.
        const chip = within(entry).getByRole("button", { name: /^Halo color, set here, #111111$/i });
        assert.isNull(within(entry).queryByRole("textbox"), "no hex box on the line");
        const targets = [
            chip,
            within(entry).getByRole("button", { name: "Halo settings" }),
            within(entry).getByRole("button", { name: "Hide halo" }),
            within(entry).getByRole("button", { name: "Remove halo" }),
        ];
        for (const target of targets) {
            const box = target.getBoundingClientRect();
            assert.isAtLeast(Math.round(box.width), 24, `${target.getAttribute("aria-label") ?? ""} is 24 px wide`);
            assert.isAtLeast(Math.round(box.height), 24, `${target.getAttribute("aria-label") ?? ""} is 24 px tall`);
        }

        // Its color, size and opacity are in its settings; the opacity reads as a percent.
        await userEvent.click(within(entry).getByRole("button", { name: "Halo settings" }));
        const settings = await screen.findByRole("dialog", { name: "Halo settings" });
        assert.isNotNull(within(settings).getByRole("textbox", { name: /^Node halo/ }));
        const opacity = settings.querySelector<HTMLInputElement>('[data-line="node.haloOpacity"] input');
        assert.isNotNull(opacity);
        assert.equal(opacity?.placeholder, "40", "the halo's opacity beneath reads 40, as a percent");
        assert.include(settings.querySelector('[data-line="node.haloOpacity"]')?.textContent ?? "", "%");
        opacity?.focus();
        await userEvent.keyboard("75{Enter}");
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.haloOpacity"), 0.75, "75 % writes 0.75");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("a glow written beneath shows as a gray line, and its eye covers it on this row", async () => {
        const { session, element } = await mountElement();
        await session.styles.add({
            name: "Glowing",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#00FF00" },
        });
        const [nodeLayer] = await renderRow(session, element);

        await waitFor(
            () => {
                assert.isNotNull(within(nodeEffects()).getByText("Glow, from Glowing"));
                assert.equal(glowOf(session), "#00ff00");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Hide glow from Glowing" }));
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.glow"), "none");
                assert.equal(glowOf(session), "none");
                // The entry is now this row's own, with its minus.
                assert.isNotNull(within(nodeEffects()).getByRole("button", { name: "Remove glow" }));
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("None for Head writes none, and an end color left empty reads 'Line color'", async () => {
        const { session, element } = await mountElement();
        const [, edgeLayer] = await renderRow(session, element);
        const ends = await screen.findByTestId("style-tab");

        await userEvent.click(within(ends).getByRole("combobox", { name: /^Edge head,/ }));
        await userEvent.click(await screen.findByRole("option", { name: "None" }));
        await waitFor(
            () => {
                assert.equal(written(session, edgeLayer, "edge.arrowHead"), "none");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(within(ends).getByRole("button", { name: "Edge ends settings" }));
        const settings = await screen.findByRole("dialog", { name: "Ends settings" });
        const color = within(settings).getByRole<HTMLInputElement>("textbox", { name: /^Edge head color(,|$)/ });
        assert.equal(color.value, "");
        assert.equal(color.placeholder, "Line color");
    });
});
