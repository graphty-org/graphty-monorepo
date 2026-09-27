/**
 * Loading and closing a dataset against the REAL graphty-element, and what one Undo does after
 * each.
 *
 * The rest of the shell's boards stand a fake session on an element that is never registered.
 * These register the element, so what they assert is the element's own history: a load is one
 * step that takes the file, the layout the element chose for it, the degree run and the label
 * layer with it; a load that fails records nothing and leaves the previous dataset where it
 * was; and Close dataset is one step that one Undo takes back, styles included.
 */

// Registers the real element, which the shell's other boards never do.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../../data/sampleGraphs";
import { fireEvent, render, screen, waitFor, within } from "../../../test/test-utils";
import { AppShell } from "../AppShell";
import { SHELL_DEFAULTS_TEMPLATE_ID } from "../defaults/styleDescriptors";

/** How long a real load, its degree pass and its repaint are given. */
const SETTLE_MS = 15_000;

/**
 * A GEXF document with no graph element, which graphty-element refuses outright. (Malformed JSON
 * is not a failure there: the JSON source recovers it as an empty graph and reports the parse
 * errors, so it cannot stand in for a load that did not arrive.)
 */
const UNLOADABLE_PASTE = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">',
    '  <nodes><node id="1" label="A"/></nodes>',
    "</gexf>",
].join("\n");

/**
 * Mounts the shell and waits for the element's session.
 * @returns the container and the session.
 */
async function mountShell(): Promise<{ container: HTMLElement; session: GraphSession }> {
    const { container } = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} />);
    const element = container.querySelector("graphty-element");

    if (element === null) {
        throw new Error("the shell mounted no graphty-element");
    }

    await waitFor(() => {
        expect(element.session).toBeTruthy();
    });

    return { container, session: element.session };
}

/**
 * The layers the shell's own load decisions added.
 * @param session - the element's session.
 * @returns those layers.
 */
function shellLayers(session: GraphSession): readonly unknown[] {
    return session.styles
        .list()
        .filter((layer) => layer.source.by === "template" && layer.source.templateId === SHELL_DEFAULTS_TEMPLATE_ID);
}

/**
 * Whether a degree run the load started has finished.
 * @param session - the element's session.
 * @returns true once one has succeeded.
 */
function degreeDone(session: GraphSession): boolean {
    return session.runs.list().some((run) => run.algorithm === "degree" && run.status === "succeeded");
}

/**
 * Clicks the cat sample and waits for the load, its degree pass and its label layer.
 * @param container - the render result's container.
 * @param session - the element's session.
 */
async function loadCat(container: HTMLElement, session: GraphSession): Promise<void> {
    fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);

    await waitFor(
        () => {
            expect(session.data.statistics().nodeCount).toBe(CAT_SOCIAL_NETWORK.nodes.length);
            expect(degreeDone(session)).toBe(true);
            expect(shellLayers(session)).toHaveLength(1);
            expect(session.history.pending).toHaveLength(0);
        },
        { timeout: SETTLE_MS },
    );
}

describe("AppShell loads and closes as undoable steps", () => {
    it("takes the whole load back with one Undo, labels and chosen layout included", async () => {
        const { container, session } = await mountShell();

        await session.layout.set("spiral");

        const before = session.history.steps.length;

        await loadCat(container, session);

        expect(session.history.steps).toHaveLength(before + 1);
        expect(session.history.steps.at(-1)?.label).toBe(CAT_SOCIAL_NETWORK_NAME);
        expect(session.layout.id).not.toBe("spiral");

        fireEvent.click(screen.getByRole("button", { name: "Undo" }));

        await waitFor(
            () => {
                expect(session.history.position).toBe(before);
            },
            { timeout: SETTLE_MS },
        );

        expect(session.data.statistics().nodeCount).toBe(0);
        expect(shellLayers(session)).toHaveLength(0);
        expect(session.runs.list().filter((run) => run.algorithm === "degree")).toHaveLength(0);
        expect(session.layout.id).toBe("spiral");
        await waitFor(() => {
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();
        });
    }, 30_000);

    it("records nothing for a load that fails, and leaves the previous dataset on screen", async () => {
        const { container, session } = await mountShell();

        await loadCat(container, session);

        const steps = session.history.steps.map((step) => step.id);

        fireEvent.click(screen.getByRole("button", { name: "Data" }));
        fireEvent.click(
            within(screen.getByRole("region", { name: "Data" })).getByRole("button", { name: "Paste data" }),
        );

        const dialog = await screen.findByRole("dialog");

        fireEvent.click(within(dialog).getByText("Paste"));
        fireEvent.change(within(dialog).getByLabelText("Paste graph data"), { target: { value: UNLOADABLE_PASTE } });
        fireEvent.click(within(dialog).getByRole("button", { name: /^Load / }));

        expect(await within(dialog).findByText(/^Could not load pasted-data\./, {}, { timeout: SETTLE_MS })).toBeInTheDocument();

        expect(session.history.steps.map((step) => step.id)).toEqual(steps);
        expect(session.data.statistics().nodeCount).toBe(CAT_SOCIAL_NETWORK.nodes.length);
        expect(shellLayers(session)).toHaveLength(1);
        expect(screen.getAllByText(CAT_SOCIAL_NETWORK_NAME).length).toBeGreaterThan(0);
        expect(container.querySelector("[data-canvas-welcome='true']")).toBeNull();
    }, 30_000);

    it("brings a closed dataset back with its styles on one Undo", async () => {
        const { container, session } = await mountShell();

        await loadCat(container, session);

        const labels = shellLayers(session);

        fireEvent.click(screen.getByRole("button", { name: "Data" }));
        fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByRole("button", { name: "More" }));
        fireEvent.click(await screen.findByText("Close dataset. Starts a new session"));

        await waitFor(
            () => {
                expect(session.data.statistics().nodeCount).toBe(0);
                expect(shellLayers(session)).toHaveLength(0);
            },
            { timeout: SETTLE_MS },
        );

        fireEvent.click(screen.getByRole("button", { name: "Undo" }));

        await waitFor(
            () => {
                expect(session.data.statistics().nodeCount).toBe(CAT_SOCIAL_NETWORK.nodes.length);
            },
            { timeout: SETTLE_MS },
        );

        expect(shellLayers(session)).toEqual(labels);
        expect(container.querySelector("[data-canvas-welcome='true']")).toBeNull();
        expect(screen.getAllByText(CAT_SOCIAL_NETWORK_NAME).length).toBeGreaterThan(0);
    }, 30_000);
});
