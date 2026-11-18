/**
 * Quick actions lists every algorithm in the REAL graphty-element's catalog, found by real keys:
 * by its name, by a plain word its catalog entry names ("bridge") and by a question that holds one
 * ("who is most connected"). A row with settings opens Analyze on it, where Run runs it; a row
 * with nothing to set runs at once.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor } from "../../../test/test-utils";
import { runsAsPicked } from "../../analyze/run";
import { wordsFor } from "../../analyze/words";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * The workspace on Les Miserables.
 * @returns The session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.styles.settled();
    return session;
}

/**
 * Opens Quick actions and types into its search.
 * @param text - What to type.
 * @returns The search field.
 */
async function search(text: string): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}k{/Control}");
    const field = await screen.findByPlaceholderText("Search commands");
    await userEvent.type(field, text);
    return field;
}

/**
 * A pattern for an option whose accessible name starts with a row's label.
 * @param name - The label.
 * @returns The pattern.
 */
function startsWith(name: string): RegExp {
    return new RegExp(`^${name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
}

// Every experiment stays off here.
withFeatures([]);

describe("algorithms in Quick actions", () => {
    it("lists a row for every algorithm in the catalog", async () => {
        const session = await openScene();
        await userEvent.keyboard("{Control>}k{/Control}");
        await screen.findByPlaceholderText("Search commands");
        for (const descriptor of session.catalog.algorithms()) {
            const { name } = wordsFor(descriptor);
            assert.isNotEmpty(screen.queryAllByRole("option", { name: startsWith(name) }), name);
        }
    });

    it("finds an algorithm by a plain word or a question its entry names", async () => {
        await openScene();
        await search("bridge");
        await screen.findByRole("option", { name: /^Betweenness\b/ });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByPlaceholderText("Search commands"));
        });
        await search("who is most connected");
        await screen.findByRole("option", { name: /^Degree\b/ });
    });

    it("opens Analyze on a grouping algorithm, where Run runs it", async () => {
        const session = await openScene();
        await search("Louvain");
        await screen.findByRole("option", { name: /^Louvain\b/ });
        await userEvent.keyboard("{Enter}");
        await userEvent.click(await screen.findByRole("button", { name: "Run Louvain" }));
        await waitFor(() => {
            assert.equal(session.runs.list().find((r) => r.algorithm === "louvain")?.status, "succeeded");
        });
    });

    it("runs an algorithm with nothing to set at once", async () => {
        const session = await openScene();
        const plain = session.catalog.algorithms().find((d) => runsAsPicked(d));
        if (plain === undefined) {
            return;
        }
        const { name } = wordsFor(plain);
        await search(name);
        await screen.findByRole("option", { name: startsWith(name) });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(session.runs.list().find((r) => r.algorithm === plain.key)?.status, "succeeded");
        });
        assert.isNull(screen.queryByRole("button", { name: `Run ${name}` }));
    });
});
