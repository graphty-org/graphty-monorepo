/**
 * FileSource in a real browser: files dropped on it or chosen in the browser's file picker reach
 * `onFiles`, a URL typed and entered reaches `onUrl` only when it is one, and `variant="auto"`
 * follows the width of its container.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { FileSource, StatusBar } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const CSV = { name: "nodes.csv", type: "text/csv", text: "id\na\nb\n" };
const PNG = { name: "picture.png", type: "image/png", text: "not really a png" };

/**
 * The names of the files of each call to a spy.
 * @param spy - the onFiles spy.
 * @returns one list of names per call.
 */
function names(spy: ReturnType<typeof vi.fn>): string[][] {
    return spy.mock.calls.map(([files]) => (files as File[]).map((file) => file.name));
}

describe("FileSource", () => {
    it("hands files dropped on the row to onFiles, keeping only the accepted ones", async () => {
        const onFiles = vi.fn();
        await renderThemed(
            <div style={{ width: 240 }}>
                <FileSource variant="row" accept=".csv" multiple onFiles={onFiles} onUrl={() => undefined} />
            </div>,
        );
        await commands.dropFiles(".cm-file-source", [CSV, PNG]);
        await expect.poll(() => names(onFiles)).toEqual([["nodes.csv"]]);
    });

    it("takes only the first file of a drop when multiple is off", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="drop" onFiles={onFiles} />);
        await commands.dropFiles(".cm-file-drop-target", [CSV, PNG]);
        await expect.poll(() => names(onFiles)).toEqual([["nodes.csv"]]);
    });

    it("hands a file chosen in the picker opened by the row's upload button to onFiles", async () => {
        const onFiles = vi.fn();
        await renderThemed(
            <div style={{ width: 240 }}>
                <FileSource variant="row" onFiles={onFiles} onUrl={() => undefined} />
            </div>,
        );
        await commands.chooseFiles("button[aria-label='Choose file']", [CSV]);
        await expect.poll(() => names(onFiles)).toEqual([["nodes.csv"]]);
    });

    it("shows the address in effect, and the next one when it changes", async () => {
        /**
         * A field whose address in effect a button changes.
         * @returns the field and the button
         */
        function Harness(): React.JSX.Element {
            const [address, setAddress] = useState("https://a.example/x.png");
            return (
                <>
                    <FileSource
                        variant="row"
                        placeholder="Address"
                        defaultValue={address}
                        onFiles={() => undefined}
                        onUrl={() => undefined}
                    />
                    <button type="button" onClick={() => setAddress("https://b.example/y.png")}>
                        Next
                    </button>
                </>
            );
        }
        await renderThemed(<Harness />);
        const field = screen.getByRole("textbox", { name: "Address" });
        expect(field).toHaveValue("https://a.example/x.png");
        await userEvent.clear(field);
        await userEvent.click(screen.getByRole("button", { name: "Next" }));
        await expect.poll(() => (field as HTMLInputElement).value).toBe("https://b.example/y.png");
    });

    it("hands a file chosen through the button variant to onFiles", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="button" label="Open file" onFiles={onFiles} />);
        expect(screen.getByRole("button", { name: "Open file" })).toBeInTheDocument();
        await commands.chooseFiles(".cm-file-source button", [CSV]);
        await expect.poll(() => names(onFiles)).toEqual([["nodes.csv"]]);
    });

    it("calls onUrl when a URL is typed and Enter pressed, and not for a value that is not a URL", async () => {
        const onUrl = vi.fn();
        await renderThemed(
            <div style={{ width: 240 }}>
                <FileSource variant="row" onFiles={() => undefined} onUrl={onUrl} />
            </div>,
        );
        const field = screen.getByRole("textbox", { name: "URL" });

        await userEvent.click(field);
        await userEvent.keyboard("not a url{Enter}");
        expect(onUrl).not.toHaveBeenCalled();
        expect(field).toHaveAttribute("aria-invalid", "true");

        await userEvent.clear(field);
        await userEvent.keyboard("https://graphty.app/data/karate.json{Enter}");
        expect(onUrl).toHaveBeenCalledTimes(1);
        expect(onUrl).toHaveBeenCalledWith("https://graphty.app/data/karate.json");
        expect(field).not.toHaveAttribute("aria-invalid", "true");
    });

    it("ignores drops and keeps its controls off while disabled", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="drop" disabled onFiles={onFiles} />);
        expect(screen.getByRole("button", { name: "Choose file" })).toBeDisabled();
        await commands.dropFiles(".cm-file-drop-target", [CSV]);
        expect(onFiles).not.toHaveBeenCalled();
    });

    it("draws a drop target in a wide space and a row once the space narrows (auto)", async () => {
        const { container } = await renderThemed(
            <div className="space" style={{ width: 400 }}>
                <FileSource onFiles={() => undefined} onUrl={() => undefined} />
            </div>,
        );
        const source = (): HTMLElement => container.querySelector<HTMLElement>(".cm-file-source")!;
        expect(source().dataset.variant).toBe("drop");
        expect(container.querySelector(".cm-file-drop-target")).not.toBeNull();

        container.querySelector<HTMLElement>(".space")!.style.width = "200px";
        await expect.poll(() => source().dataset.variant).toBe("row");
        expect(container.querySelector(".cm-file-drop-target")).toBeNull();
        expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();

        container.querySelector<HTMLElement>(".space")!.style.width = "400px";
        await expect.poll(() => source().dataset.variant).toBe("drop");
    });
});

describe("StatusBar", () => {
    it("is a 24px row with its start and end slots at the two ends, and no live region of its own", async () => {
        const { container } = await renderThemed(
            <div style={{ width: 600 }}>
                <StatusBar left={<span role="status">Saved</span>} right={<span>Local only</span>} />
            </div>,
        );
        const bar = container.querySelector<HTMLElement>(".cm-status-bar")!;
        expect(bar.getBoundingClientRect().height).toBe(24);
        expect(bar).not.toHaveAttribute("role");
        expect(screen.getByRole("status")).toHaveTextContent("Saved");
        const start = screen.getByText("Saved").getBoundingClientRect();
        const end = screen.getByText("Local only").getBoundingClientRect();
        const box = bar.getBoundingClientRect();
        expect(start.left - box.left).toBeLessThan(16);
        expect(box.right - end.right).toBeLessThan(16);
    });
});
