/**
 * Done and Cancel in the selection workspace on a generated graph, on the REAL graphty-element,
 * driven by real clicks: the workspace stays open, saying Drawing, until the result is painted.
 */

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { framesUntilClosed, oneStep, openGenerated, openLayer, REPAINTED_NODES } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    // One test each: on software rendering a repaint of 50,000 nodes takes minutes, and the two
    // together pass the test guard.
    for (const button of ["Done", "Cancel"] as const) {
        it(`${button} keeps the workspace open, saying Drawing, until the result is painted`, async () => {
            const session = await openGenerated(REPAINTED_NODES);
            await openLayer(
                session,
                "Closing",
                oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
            );
            const row = document.querySelector<HTMLElement>(".sel-rest [data-edit]");
            if (row === null) {
                throw new Error("the Style Nodes... line is drawn");
            }
            await userEvent.click(row);
            const values = await screen.findByRole("group", { name: "community values" });
            await waitFor(() => {
                assert.isTrue(session.styles.showingBranches);
                assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
            });
            const count = document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null;
            await userEvent.click(within(values).getAllByRole("checkbox")[0]);
            await waitFor(() => {
                assert.notStrictEqual(document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null, count);
                assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
            });
            const ws = document.querySelector<HTMLElement>(".sel-ws");
            if (ws === null) {
                throw new Error("the workspace is open");
            }
            const closing = await framesUntilClosed(() =>
                userEvent.click(within(ws).getByRole("button", { name: button })),
            );
            assert.strictEqual(
                closing.quiet,
                0,
                `${button}: ${String(closing.quiet)} of ${String(closing.open)} frames without Drawing`,
            );
            assert.isTrue(closing.paintedAtClose, `${button}: the result was painted when the workspace closed`);
            assert.isFalse(session.styles.showingBranches);
        });
    }
});
