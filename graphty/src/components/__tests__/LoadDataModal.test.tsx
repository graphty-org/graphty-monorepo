/**
 * Boards for the Load data dialog's one new obligation: surviving a refused load.
 *
 * The dialog used to call `onLoad` and close in the same breath, which was safe only
 * while a load could not fail in a way anyone noticed. It can: the shell now reports a
 * load that did not arrive, and `handleClose` runs `resetState` -- dropping the selected
 * file, the URL and the pasted text. So a dialog that closed on a refusal destroyed
 * exactly the input the reader needs to fix a separator, a format or a typo and try
 * again, and spec 1107-1108 is explicit that "Errors stop the import" rather than
 * quietly finishing it.
 *
 * These boards therefore drive the dialog through a REJECTED load and a RESOLVED one and
 * assert what is left on screen, and they assert that the dialog's own pre-flight
 * refusals still land in the one error line it already had.
 */

import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/test-utils";
import { LoadDataModal, type LoadDataModalProps, type LoadDataRequest } from "../LoadDataModal";

/** What the dialog says when a refusal carried no message of its own. */
const UNREADABLE_LOAD_ERROR = "The data could not be loaded, and the loader gave no reason.";

/** The label of the button the harness reopens the dialog with. */
const REOPEN = "Reopen";

/**
 * Renders the dialog under a host that owns its open state, as the Data panel does.
 *
 * The open state has to live outside the dialog for these boards to mean anything: "the
 * dialog stayed open" is a claim about what the dialog asked its host to do, and a
 * dialog rendered with a pinned `opened` could not fail that claim. The Reopen button is
 * how a board reads the other half of the contract -- what survived `resetState`.
 * @param onLoad - the load the dialog awaits.
 * @returns the render result.
 */
function renderModal(onLoad: (request: LoadDataRequest) => Promise<void>) {
    function Harness(): React.JSX.Element {
        const [opened, setOpened] = useState(true);

        return (
            <>
                <button
                    type="button"
                    onClick={() => {
                        setOpened(true);
                    }}
                >
                    {REOPEN}
                </button>
                <LoadDataModal
                    opened={opened}
                    onClose={() => {
                        setOpened(false);
                    }}
                    onLoad={onLoad}
                />
            </>
        );
    }

    return render(<Harness />);
}

/**
 * Puts a URL in the dialog and presses Load.
 * @param url - the URL to type.
 */
function loadFromUrl(url: string): void {
    fireEvent.click(screen.getByText("URL"));
    fireEvent.change(screen.getByLabelText("Data URL"), { target: { value: url } });
    fireEvent.click(screen.getByRole("button", { name: /^Load / }));
}

describe("LoadDataModal", () => {
    describe("a load that was refused", () => {
        it("stays open, with the reader's URL still in it and the reason on screen", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("Failed to fetch URL: 404 Not Found");
            });

            renderModal(onLoad);
            loadFromUrl("https://example.com/missing.json");

            expect(await screen.findByText("Failed to fetch URL: 404 Not Found")).toBeInTheDocument();

            /* The dialog is still here, and so is the URL. `handleClose` calls
               `resetState`, so a dialog that closed here would have thrown away the one
               thing the reader needs to try again. */
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(screen.getByLabelText("Data URL")).toHaveValue("https://example.com/missing.json");
        });

        it("keeps pasted text through the refusal, which is the input with no other copy", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("Unexpected end of JSON input");
            });

            renderModal(onLoad);
            fireEvent.click(screen.getByText("Paste"));
            fireEvent.change(screen.getByLabelText("Paste graph data"), {
                target: { value: '{"nodes": [{"id": "a"}' },
            });
            fireEvent.click(screen.getByRole("button", { name: /^Load / }));

            expect(await screen.findByText("Unexpected end of JSON input")).toBeInTheDocument();
            expect(screen.getByLabelText("Paste graph data")).toHaveValue('{"nodes": [{"id": "a"}');
        });

        it("says something a reader can act on when the refusal carried no message", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("");
            });

            renderModal(onLoad);
            loadFromUrl("https://example.com/missing.json");

            // Never an empty line at a reader: an error line that says nothing is the
            // silent failure again, one indirection further along.
            expect(await screen.findByText(UNREADABLE_LOAD_ERROR)).toBeInTheDocument();
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    describe("a load that was accepted", () => {
        it("closes the dialog and forgets what the reader typed", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();
            });

            renderModal(onLoad);
            loadFromUrl("https://example.com/graph.json");

            await waitFor(() => {
                expect(screen.queryByRole("dialog")).toBeNull();
            });

            expect(onLoad).toHaveBeenCalledTimes(1);
            expect(onLoad).toHaveBeenCalledWith(
                expect.objectContaining({
                    inputMethod: "url",
                    url: "https://example.com/graph.json",
                    replaceExisting: true,
                }),
            );

            // And the next opening starts clean, which is what `resetState` is for.
            fireEvent.click(screen.getByRole("button", { name: REOPEN }));

            expect(await screen.findByLabelText("Data URL")).toHaveValue("");
        });
    });

    describe("the dialog's own refusals", () => {
        /*
         * DEVIATION from the plan, which asked for a board on each of the two pre-flight
         * refusals ("Could not determine file format...", "Please provide data to load.")
         * rendering in the same block. Neither is reachable through the dialog: `canLoad`
         * disables the Load button under exactly the conditions that would set them --
         * pasted text with no detected format fails its `hasFormat` clause, and every
         * "no data" case fails `hasData` -- so a board that pressed Load would be
         * asserting against a click that does nothing. What IS asserted here is the one
         * thing the change could have broken: the dialog still has ONE error line, and a
         * rejected load and the dialog's own state share it.
         */
        it("leaves Load disabled rather than refusing afterwards, when the pasted text names no format", () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();
            });

            renderModal(onLoad);
            fireEvent.click(screen.getByText("Paste"));
            fireEvent.change(screen.getByLabelText("Paste graph data"), {
                target: { value: "this is not a graph in any format" },
            });

            expect(screen.getByRole("button", { name: /^Load / })).toBeDisabled();
            expect(onLoad).not.toHaveBeenCalled();
        });

        it("draws a refused load in the block it already had, beside its own icon", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("Failed to fetch URL: 404 Not Found");
            });

            renderModal(onLoad);
            loadFromUrl("https://example.com/missing.json");

            const message = await screen.findByText("Failed to fetch URL: 404 Not Found");

            // The AlertCircle the dialog has always drawn beside its error line, not a
            // second surface bolted on for this one case.
            expect(message.parentElement?.querySelector("svg")).not.toBeNull();

            // And the line clears when the reader changes the input, so a stale refusal
            // cannot sit under a URL it was never about.
            fireEvent.click(screen.getByText("Paste"));

            expect(screen.queryByText("Failed to fetch URL: 404 Not Found")).toBeNull();
        });
    });

    describe("the module's surface", () => {
        it("publishes its props, so a caller can see that the load is awaited", () => {
            /* A type-level assertion first: this does not compile unless
               `LoadDataModalProps` is exported and `onLoad` returns a promise. The
               interface was unexported until the dialog began awaiting `onLoad`, which
               made its return type something a caller has to be able to read. */
            const props: LoadDataModalProps = {
                opened: false,
                onClose: () => undefined,
                onLoad: async () => {
                    await Promise.resolve();
                },
            };

            expect(props.opened).toBe(false);
            expect(props.onLoad({ inputMethod: "paste", format: "json", replaceExisting: true })).toBeInstanceOf(
                Promise,
            );
        });
    });
});
