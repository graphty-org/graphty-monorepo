/**
 * The Layout and Analyze lists on the REAL graphty-element follow one pattern: every option sits
 * under exactly one section heading (a named group drawn with the shared heading), none is indented,
 * and the Layout list is one Tab stop whose arrow keys walk across its sections.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const IDS = ["a", "b", "c", "d", "e"];
const EDGES = IDS.flatMap((src, i) => IDS.slice(i + 1).map((dst) => ({ src, dst })));

/**
 * The workspace on a small graph, its element up and both tools enabled.
 * @returns the element's session.
 */
async function openGraph(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Sections", id: 1 } })} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(EDGES);
    await waitFor(() => {
        assert.isFalse(tool("Layout").hasAttribute("aria-disabled"));
        assert.isFalse(tool("Analyze").hasAttribute("aria-disabled"));
    });
    return session;
}

/**
 * A tool on the canvas toolbar.
 * @param name - the tool's name.
 * @returns the tool.
 */
function tool(name: string): HTMLElement {
    return within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name });
}

/**
 * The section a reader hears an option in: its group's name.
 * @param option - the option.
 * @returns the group's name, or null outside a group.
 */
function sectionOf(option: Element | null): string | null {
    return option?.closest('[role="group"]')?.getAttribute("aria-label") ?? null;
}

/**
 * Asserts the decided pattern on one list: every option in exactly one named group, each group
 * opening with the shared heading that reads its name, and no option indented.
 * @param list - the listbox.
 * @returns the groups' names, in order.
 */
function assertSectioned(list: HTMLElement): string[] {
    const options = within(list).getAllByRole("option");
    assert.isAbove(options.length, 0);
    for (const option of options) {
        const groups = [];
        for (let at = option.parentElement; at !== null && at !== list; at = at.parentElement) {
            if (at.getAttribute("role") === "group") {
                groups.push(at);
            }
        }
        assert.lengthOf(groups, 1, `${option.textContent ?? ""} sits in exactly one section`);
        assert.isFalse(option.hasAttribute("data-nested"), `${option.textContent ?? ""} is not indented`);
    }
    const groups = within(list).getAllByRole("group");
    for (const group of groups) {
        const heading = group.querySelector(".ws-analyze-heading");
        assert.isNotNull(heading, "a section opens with the shared heading");
        assert.strictEqual(heading?.textContent, group.getAttribute("aria-label"));
        assert.notStrictEqual(heading?.getAttribute("role"), "option", "a heading is not an option");
        assert.isAbove(within(group).queryAllByRole("option").length, 0, "no section is drawn empty");
    }
    return groups.map((group) => group.getAttribute("aria-label") ?? "");
}

describe("menu sections in the Layout and Analyze lists", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("draws both lists with section headings and every option under one", async () => {
        await openGraph();
        await userEvent.click(tool("Layout"));
        const layouts = await screen.findByRole("listbox", { name: "Layouts" });
        assert.deepEqual(assertSectioned(layouts), ["Force-directed", "Shapes", "Hierarchy", "Other"]);
        assert.strictEqual(sectionOf(within(layouts).getByRole("option", { name: /^ForceAtlas2/ })), "Force-directed");
        assert.strictEqual(sectionOf(within(layouts).getByRole("option", { name: /^Random/ })), "Shapes");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Layouts" }));
        });

        await userEvent.click(tool("Analyze"));
        const analyses = await screen.findByRole("listbox", { name: "Analyses" });
        assert.isAbove(assertSectioned(analyses).length, 1);
    });

    it("makes the Layout list one Tab stop whose arrow keys walk across its sections", async () => {
        await openGraph();
        await userEvent.click(tool("Layout"));
        const list = await screen.findByRole("listbox", { name: "Layouts" });
        const options = within(list).getAllByRole("option");
        const stops = options.filter((option) => option.tabIndex === 0);
        assert.lengthOf(stops, 1, "the list is one Tab stop");
        // Focus starts on the checked row.
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-selected"), "true");
        });

        await userEvent.keyboard("{Home}");
        assert.strictEqual(document.activeElement, options[0]);
        const heard: string[] = [];
        for (let i = 0; i < options.length; i++) {
            const focused = document.activeElement;
            assert.strictEqual(focused?.getAttribute("role"), "option", "the arrow keys land only on options");
            const section = sectionOf(focused);
            if (section !== null && heard.at(-1) !== section) {
                heard.push(section);
            }
            await userEvent.keyboard("{ArrowDown}");
        }
        assert.deepEqual(heard, ["Force-directed", "Shapes", "Hierarchy", "Other"]);
        assert.strictEqual(document.activeElement, options.at(-1), "ArrowDown stops at the last row");

        await userEvent.keyboard("{ArrowUp}");
        assert.strictEqual(document.activeElement, options.at(-2));
        await userEvent.keyboard("{Home}");
        assert.strictEqual(document.activeElement, options[0]);
        await userEvent.keyboard("{End}");
        assert.strictEqual(document.activeElement, options.at(-1));
        assert.lengthOf(
            within(list)
                .getAllByRole("option")
                .filter((option) => option.tabIndex === 0),
            1,
            "still one Tab stop, on the focused row",
        );
    });
});
