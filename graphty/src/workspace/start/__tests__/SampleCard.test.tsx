/**
 * The start page's sample library and the Samples dialog show one list with one card: the same
 * samples in the same order, with the same titles, words and pictures. Reached as a reader
 * reaches each: the start page with no project open, and the dialog from a project's Sources "+".
 */
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * What a reader sees of each card: its title, the line under it and its picture.
 * @param cards - the cards' buttons, in order.
 * @returns one line per card.
 */
function seen(cards: readonly HTMLElement[]): string[] {
    return cards.map((card) =>
        [
            card.querySelector(".ws-land-sample-t")?.textContent,
            card.querySelector(".ws-land-sample-m")?.textContent,
            card.querySelector("img")?.src ?? "no picture",
        ].join(" | "),
    );
}

describe("the sample card", () => {
    it("shows the same samples, in the same order and with the same pictures, on the start page and in Samples", async () => {
        await siteFeatures(["timeline"]);
        const start = render(<Workspace store={createWorkspaceStore()} />);
        const library = await screen.findByRole("region", { name: "Sample library" });
        const onStart = seen([...library.querySelectorAll<HTMLElement>("button.ws-land-sample")]);
        start.unmount();

        render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /Samples/ }));
        const dialog = await screen.findByRole("dialog", { name: "Samples" });
        const inDialog = seen(
            ["Samples", "Generated"].flatMap((group) => [
                ...within(dialog)
                    .getByRole("region", { name: group })
                    .querySelectorAll<HTMLElement>("button.ws-land-sample"),
            ]),
        );

        assert.isAbove(onStart.length, 20);
        assert.deepEqual(inDialog, onStart);
    });
});
