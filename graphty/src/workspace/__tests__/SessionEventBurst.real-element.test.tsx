/**
 * A burst of session changes on the REAL graphty-element: thirty style layers added one at a time
 * through `session.styles.add`, with the whole workspace rendered, reach the style tree without
 * React's "Maximum update depth exceeded" (#8851), and thirty edits made in one task coalesce: the
 * workspace commits fewer renders than there were edits.
 *
 * The coalescing is counted over edits made in one task, never over the awaited burst. Awaited one
 * at a time, the edits span as many tasks as graphty-element yields to the event loop while it
 * repaints (its slices are measured in time, so a loaded machine yields more often), and the header
 * draws the first few history steps of every task at once (Header.tsx): on a loaded core the
 * awaited burst committed 35 to 42 times (#9565).
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
        const tree = within(screen.getByRole("region", { name: "Graph place" })).getByRole("tree", {
            name: "Style layers",
        });
        const layer = (n: number): Parameters<typeof session.styles.add>[0] => ({
            name: `Burst ${String(n)}`,
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": n },
        });

        for (let n = 1; n <= 30; n += 1) {
            await session.styles.add(layer(n));
        }
        await found.waitForSettled();
        await waitFor(() => {
            assert.isNotNull(within(tree).queryByText("Burst 30"));
        });
        assert.equal(session.styles.list().length, before + 30);

        // Thirty more, each its own step, made in one task.
        const commitsBefore = commits;
        const adds: PromiseLike<unknown>[] = [];
        for (let n = 31; n <= 60; n += 1) {
            adds.push(session.styles.add(layer(n)));
        }
        await Promise.all(adds);
        await found.waitForSettled();
        await waitFor(() => {
            assert.isNotNull(within(tree).queryByText("Burst 60"));
        });
        window.removeEventListener("error", onError);
        const burstCommits = commits - commitsBefore;
        assert.equal(session.styles.list().length, before + 60);
        assert.deepEqual(
            errors.filter((e) => e.includes("Maximum update depth")),
            [],
        );
        assert.isAtLeast(burstCommits, 1, "the burst reached the screen");
        assert.isBelow(burstCommits, 30, "thirty edits in one task coalesce into fewer renders");
    });
});
