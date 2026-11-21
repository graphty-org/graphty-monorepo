/**
 * A burst of session changes on the REAL graphty-element: thirty style layers added one at a time
 * through `session.styles.add`, with the whole workspace rendered, reach the style tree without
 * React's "Maximum update depth exceeded" (#8851), and the burst coalesces: the workspace commits
 * fewer renders than there were edits.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { Profiler } from "react";
import { afterEach, assert, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../test/test-utils";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];

const IDS = ["a", "b", "c", "d", "e", "f"];

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a burst of session changes", () => {
    it("adds thirty layers one at a time without nesting React updates", async () => {
        const errors: string[] = [];
        const original = console.error.bind(console);
        vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
            errors.push(args.map(String).join(" "));
            original(...args);
        });
        const onError = (event: ErrorEvent): void => {
            errors.push(event.message);
        };
        window.addEventListener("error", onError);

        let commits = 0;
        render(
            <Profiler
                id="workspace"
                onRender={() => {
                    commits += 1;
                }}
            >
                <Workspace store={createWorkspaceStore({ project: { name: "Burst", id: 1 } })} />
            </Profiler>,
        );
        let element: GraphElement | null = null;
        await waitFor(() => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        });
        if (element === null) {
            throw new Error("the element never came up");
        }
        const found: GraphElement = element;
        const { session } = found;
        await session.data.addNodes(IDS.map((id) => ({ id })));
        await found.waitForSettled();
        const before = session.styles.list().length;
        const commitsBefore = commits;

        for (let n = 1; n <= 30; n += 1) {
            await session.styles.add({
                name: `Burst ${String(n)}`,
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": n },
            });
        }
        await found.waitForSettled();

        const tree = within(screen.getByRole("region", { name: "Graph place" })).getByRole("tree", {
            name: "Style layers",
        });
        await waitFor(() => {
            assert.isNotNull(within(tree).queryByText("Burst 30"));
        });
        window.removeEventListener("error", onError);
        const burstCommits = commits - commitsBefore;
        assert.equal(session.styles.list().length, before + 30);
        assert.deepEqual(
            errors.filter((e) => e.includes("Maximum update depth")),
            [],
        );
        assert.isAtLeast(burstCommits, 1, "the burst reached the screen");
        assert.isBelow(burstCommits, 30, "thirty edits coalesce into fewer renders");
    });
});
