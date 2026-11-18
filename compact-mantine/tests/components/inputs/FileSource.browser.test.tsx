/**
 * FileSource in a real browser: files dropped on it or chosen in the browser's file picker reach
 * `onFiles`, a URL typed and entered reaches `onUrl` only when it is one, and `variant="auto"`
 * follows the width of its container.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { FileSource, StatusBar } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

// The two browser commands only this file uses (registered in vitest.config.ts).
declare module "vitest/browser" {
    interface BrowserCommands {
        collectGarbage: () => Promise<void>;
        openFileChooser: (selector: string) => Promise<void>;
    }
}

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

    it("opens the typed address from an Open button beside the field, when it has one", async () => {
        const onUrl = vi.fn();
        await renderThemed(
            <div style={{ width: 320 }}>
                <FileSource variant="row" openLabel="Open" onFiles={() => undefined} onUrl={onUrl} />
            </div>,
        );
        const field = screen.getByRole("textbox", { name: "URL" });
        await userEvent.click(field);
        await userEvent.keyboard("not a url");
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        expect(onUrl).not.toHaveBeenCalled();
        expect(field).toHaveAttribute("aria-invalid", "true");

        await userEvent.clear(field);
        await userEvent.keyboard("https://graphty.app/data/karate.json");
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        expect(onUrl).toHaveBeenCalledWith("https://graphty.app/data/karate.json");
    });

    it("draws no Open button without openLabel", async () => {
        await renderThemed(<FileSource variant="row" onFiles={() => undefined} onUrl={() => undefined} />);
        expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    });

    it("ignores drops and keeps its controls off while disabled", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="drop" disabled onFiles={onFiles} />);
        expect(screen.getByRole("button", { name: "Choose file" })).toBeDisabled();
        await commands.dropFiles(".cm-file-drop-target", [CSV]);
        expect(onFiles).not.toHaveBeenCalled();
    });

    it("hands a folder chosen in the folder picker to onFiles with each file's path", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="drop" folder onFiles={onFiles} />);
        await commands.chooseFiles("button:has-text('Choose folder')", [
            { name: "kit/car.obj", type: "", text: "o car" },
            { name: "kit/parts/car.mtl", type: "", text: "newmtl red" },
        ]);
        await vi.waitFor(() => {
            assert.equal(onFiles.mock.calls.length, 1);
        });
        const [files, paths] = onFiles.mock.calls[0] as [File[], ReadonlyMap<string, File>];
        assert.sameMembers(
            files.map((file) => file.name),
            ["car.obj", "car.mtl"],
        );
        assert.sameMembers([...paths.keys()], ["kit/car.obj", "kit/parts/car.mtl"]);
    });

    it("puts a folder icon beside the row's file icon when asked, and hands the folder's paths", async () => {
        const onFiles = vi.fn();
        await renderThemed(
            <div style={{ width: 320 }}>
                <FileSource variant="row" folder onFiles={onFiles} onUrl={() => undefined} />
            </div>,
        );
        await commands.chooseFiles("button[aria-label='Choose folder']", [
            { name: "kit/car.obj", type: "", text: "o car" },
            { name: "kit/parts/car.mtl", type: "", text: "newmtl red" },
        ]);
        await vi.waitFor(() => {
            assert.equal(onFiles.mock.calls.length, 1);
        });
        const [, paths] = onFiles.mock.calls[0] as [File[], ReadonlyMap<string, File>];
        assert.sameMembers([...paths.keys()], ["kit/car.obj", "kit/parts/car.mtl"]);
    });

    it("draws no folder icon in a row that was not asked for one", async () => {
        await renderThemed(<FileSource variant="row" onFiles={() => undefined} onUrl={() => undefined} />);
        assert.isNull(screen.queryByRole("button", { name: "Choose folder" }));
    });

    it("hands no paths for files chosen one by one", async () => {
        const onFiles = vi.fn();
        await renderThemed(<FileSource variant="drop" folder onFiles={onFiles} />);
        await commands.chooseFiles("button:has-text('Choose file')", [CSV]);
        await vi.waitFor(() => {
            assert.equal(onFiles.mock.calls.length, 1);
        });
        assert.isUndefined(onFiles.mock.calls[0][1]);
    });

    it("draws no folder button, hint or bar unless asked", async () => {
        await renderThemed(<FileSource variant="drop" onFiles={() => undefined} />);
        assert.isNull(screen.queryByRole("button", { name: "Choose folder" }));
        assert.isNull(screen.queryByRole("progressbar"));
        assert.isNull(document.querySelector(".cm-file-hint"));
    });

    it("shows its hint under the buttons and a bar for a load under way", async () => {
        await renderThemed(<FileSource variant="drop" hint="GLB, OBJ, STL" progress={0.4} onFiles={() => undefined} />);
        assert.equal(document.querySelector(".cm-file-hint")?.textContent, "GLB, OBJ, STL");
        const bar = screen.getByRole("progressbar", { name: "Loading" });
        assert.equal(bar.getAttribute("aria-valuenow"), "40");
    });

    it("draws a full moving bar for a load whose size is not known, announced with no value", async () => {
        await renderThemed(<FileSource variant="drop" progress={null} onFiles={() => undefined} />);
        const bar = screen.getByRole("progressbar", { name: "Loading" });
        assert.isNull(bar.getAttribute("aria-valuenow"), "an indeterminate bar, not 100%");
        assert.isNull(bar.getAttribute("aria-valuetext"));
        assert.lengthOf(screen.getAllByRole("progressbar"), 1, "one bar, not a bar inside a bar");
    });

    it("shows a load's stage, how far it has come and a Cancel that stops it", async () => {
        const onCancel = vi.fn();
        await renderThemed(
            <FileSource
                variant="drop"
                progress={0.25}
                status={{ label: "Downloading", detail: "1 of 4 MB" }}
                onCancel={onCancel}
                onFiles={() => undefined}
            />,
        );
        assert.isNotNull(screen.getByText("Downloading"));
        assert.isNotNull(screen.getByText("1 of 4 MB"));
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        assert.equal(onCancel.mock.calls.length, 1);
    });

    it("says why an address was refused under the field, tied to it", async () => {
        await renderThemed(
            <FileSource variant="row" error="Not reached" onFiles={() => undefined} onUrl={() => undefined} />,
        );
        const field = screen.getByRole("textbox", { name: "URL" });
        assert.equal(field.getAttribute("aria-invalid"), "true");
        const described = field.getAttribute("aria-describedby") ?? "";
        assert.include(document.getElementById(described.split(" ")[0])?.textContent ?? "", "Not reached");
    });

    it("takes a typed address back on Escape and says so through onDiscard", async () => {
        const onDiscard = vi.fn();
        await renderThemed(
            <FileSource variant="row" onDiscard={onDiscard} onFiles={() => undefined} onUrl={() => undefined} />,
        );
        const field = screen.getByRole<HTMLInputElement>("textbox", { name: "URL" });
        await userEvent.click(field);
        await userEvent.keyboard("https://graphty.app/x.glb{Escape}");
        assert.equal(field.value, "");
        assert.equal(onDiscard.mock.calls.length, 1);
        await userEvent.keyboard("{Escape}");
        assert.equal(onDiscard.mock.calls.length, 1, "an empty field leaves Escape to the page");
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

/** A weak reference to an object: what it gives back once the object is freed is undefined. */
interface Weak<T> {
    deref(): T | undefined;
}

/** The browser's WeakRef (ES2021), which the project's ES2020 library types leave out. */
const WeakRefOf = (globalThis as unknown as { WeakRef: new <T extends object>(target: T) => Weak<T> }).WeakRef;

/**
 * Drags files over an element without dropping them, as a drag from the desktop starts.
 * @param target - the element dragged over.
 * @returns the DataTransfer, to drop or leave with.
 */
function dragOver(target: Element): DataTransfer {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([CSV.text], CSV.name, { type: CSV.type }));
    for (const type of ["dragenter", "dragover"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    return dataTransfer;
}

describe("FileSource's picker", () => {
    it("keeps its file input alive while the picker is open, so Safari does not drop the choice", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <FileSource variant="row" onFiles={() => undefined} onUrl={() => undefined} />
            </div>,
        );
        // Only a weak reference: the test must not be what keeps the input alive.
        const made: Weak<HTMLInputElement>[] = [];
        const create = document.createElement.bind(document);
        const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
            const element = create(tag);
            if (element instanceof HTMLInputElement) {
                made.push(new WeakRefOf(element));
            }
            return element;
        });
        await commands.openFileChooser("button[aria-label='Choose file']");
        spy.mockClear();
        spy.mockRestore();
        assert.lengthOf(made, 1, "the click made one file input");
        await commands.collectGarbage();
        assert.isDefined(made[0].deref(), "the input survives a collection while its picker is open");
    });
});

describe("FileSource's row options", () => {
    it("draws the upload glyph on the row's choose button unless given another", async () => {
        const { container } = await renderThemed(
            <>
                <FileSource variant="row" onFiles={() => undefined} onUrl={() => undefined} />
                <FileSource variant="row" chooseGlyph="fileUpload" onFiles={() => undefined} onUrl={() => undefined} />
            </>,
        );
        const glyphs = [...container.querySelectorAll("button[aria-label='Choose file'] svg")].map((svg) =>
            svg.getAttribute("data-glyph"),
        );
        assert.deepEqual(glyphs, ["upload", "fileUpload"]);
    });

    it("draws the folder glyph on the folder button unless given another", async () => {
        const { container } = await renderThemed(
            <>
                <FileSource variant="row" folder onFiles={() => undefined} onUrl={() => undefined} />
                <FileSource
                    variant="row"
                    folder
                    folderGlyph="folderUpload"
                    onFiles={() => undefined}
                    onUrl={() => undefined}
                />
                <FileSource variant="button" folder folderGlyph="folderUpload" onFiles={() => undefined} />
            </>,
        );
        const glyphs = [...container.querySelectorAll("button[aria-label='Choose folder'] svg")].map((svg) =>
            svg.getAttribute("data-glyph"),
        );
        assert.deepEqual(glyphs, ["folder", "folderUpload"]);
        const button = [...container.querySelectorAll("button")].find((b) => b.textContent === "Choose folder");
        assert.equal(button?.querySelector("svg")?.getAttribute("data-glyph"), "folderUpload");
    });

    it("names the URL field by urlLabel while its placeholder says more", async () => {
        await renderThemed(
            <FileSource
                variant="row"
                placeholder="Address, or drop a file"
                urlLabel="Address"
                onFiles={() => undefined}
                onUrl={() => undefined}
            />,
        );
        const field = screen.getByRole("textbox", { name: "Address" });
        assert.equal(field.getAttribute("placeholder"), "Address, or drop a file");
    });

    it("draws no drop cue for a drag over a row given neither dropping nor dropLabel", async () => {
        const { container } = await renderThemed(
            <FileSource variant="row" onFiles={() => undefined} onUrl={() => undefined} />,
        );
        const source = container.querySelector<HTMLElement>(".cm-file-source")!;
        dragOver(source);
        await expect.poll(() => source.dataset.over).toBe("true");
        assert.isUndefined(source.dataset.dropping);
        assert.isNull(container.querySelector(".cm-file-drop-cue"));
    });

    it("says what a drop does over the field while files are dragged over a row with dropLabel", async () => {
        const onFiles = vi.fn();
        const { container } = await renderThemed(
            <div style={{ width: 240 }}>
                <FileSource variant="row" dropLabel="Drop to load model" onFiles={onFiles} onUrl={() => undefined} />
            </div>,
        );
        const source = container.querySelector<HTMLElement>(".cm-file-source")!;
        dragOver(source);
        await expect.poll(() => container.querySelector(".cm-file-drop-cue")).not.toBeNull();
        const shown = container.querySelector<HTMLElement>(".cm-file-drop-cue")!;
        assert.equal(shown.textContent, "Drop to load model");
        assert.equal(source.dataset.dropping, "true");
        const field = container.querySelector<HTMLElement>(".cm-file-url input")!.getBoundingClientRect();
        const box = shown.getBoundingClientRect();
        assert.equal(box.height, 24, "as tall as the field");
        assert.equal(box.top, field.top, "over the field");
        assert.equal(getComputedStyle(shown).pointerEvents, "none", "the drop lands on the row under it");
        await commands.dropFiles(".cm-file-drop-cue", [CSV]);
        await expect.poll(() => names(onFiles)).toEqual([["nodes.csv"]]);
        await expect.poll(() => container.querySelector(".cm-file-drop-cue")).toBeNull();
    });

    it("draws the drop cue, with the default words, while a drag over its dialog sets dropping", async () => {
        const { container } = await renderThemed(
            <FileSource variant="row" dropping onFiles={() => undefined} onUrl={() => undefined} />,
        );
        assert.equal(container.querySelector(".cm-file-drop-cue")?.textContent, "Drop to load");
    });
});

describe("FileSource's loaded state", () => {
    it("draws what was loaded as one line with an x in place of the field, and clears it", async () => {
        /**
         * A row that holds what is chosen until its x is pressed.
         * @returns the row
         */
        function Harness(): React.JSX.Element {
            const [held, setHeld] = useState<string | undefined>("model.glb");
            return (
                <div style={{ width: 240 }}>
                    <FileSource
                        variant="row"
                        loaded={held === undefined ? undefined : { name: held }}
                        onClear={() => setHeld(undefined)}
                        onFiles={([file]) => setHeld(file.name)}
                        onUrl={() => undefined}
                    />
                </div>
            );
        }
        const { container } = await renderThemed(<Harness />);
        const line = container.querySelector<HTMLElement>(".cm-file-loaded")!;
        assert.equal(line.textContent, "model.glb");
        assert.equal(line.getAttribute("title"), "model.glb");
        assert.equal(line.querySelector("svg")?.getAttribute("data-glyph"), "file", "a file glyph before the name");
        assert.equal(line.getBoundingClientRect().height, 24, "one 24px line");
        assert.isNull(screen.queryByRole("textbox"), "no URL field");
        assert.isNull(screen.queryByRole("button", { name: "Choose file" }), "no choose button");

        // A drop still replaces it.
        await commands.dropFiles(".cm-file-loaded", [CSV]);
        await expect.poll(() => container.querySelector(".cm-file-loaded")?.textContent).toBe("nodes.csv");

        await userEvent.click(screen.getByRole("button", { name: "Remove nodes.csv" }));
        await expect.poll(() => container.querySelector(".cm-file-loaded")).toBeNull();
        assert.equal(document.activeElement, screen.getByRole("textbox", { name: "URL" }), "focus goes to the field");
    });

    it("leaves focus where the reader is when an x the page did not act on is followed by a load", async () => {
        /**
         * A row whose x does nothing, and a load the test starts with a button.
         * @returns the row and the other controls
         */
        function Harness(): React.JSX.Element {
            const [progress, setProgress] = useState<number | undefined>(undefined);
            return (
                <div style={{ width: 240 }}>
                    <FileSource
                        variant="row"
                        loaded={{ name: "a.glb" }}
                        progress={progress}
                        onClear={() => undefined}
                        onFiles={() => undefined}
                        onUrl={() => undefined}
                    />
                    <input aria-label="Elsewhere" />
                    <button type="button" onClick={() => setProgress(0.1)}>
                        Start load
                    </button>
                </div>
            );
        }
        const { container } = await renderThemed(<Harness />);
        await userEvent.click(screen.getByRole("button", { name: "Remove a.glb" }));
        assert.isNotNull(container.querySelector(".cm-file-loaded"), "the page kept it");
        const elsewhere = screen.getByRole("textbox", { name: "Elsewhere" });
        await userEvent.click(elsewhere);
        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{Enter}");
        await expect.poll(() => container.querySelector("[role='progressbar']")).not.toBeNull();
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Start load" }), "focus stays put");
    });

    it("keeps a long name's end, with its extension, when it is cut", async () => {
        const name = "a-very-long-model-name-that-will-not-fit-here.gltf";
        const { container } = await renderThemed(
            <div style={{ width: 160 }}>
                <FileSource variant="row" loaded={{ name }} onClear={() => undefined} onFiles={() => undefined} />
            </div>,
        );
        const head = container.querySelector<HTMLElement>(".cm-file-loaded-head")!;
        assert.equal(container.querySelector(".cm-file-loaded-name")?.textContent, name, "the whole name is there");
        assert.isAbove(head.scrollWidth, head.clientWidth, "the start is cut");
        assert.isTrue(container.querySelector(".cm-file-loaded-name")!.textContent!.endsWith("ere.gltf"));
        const tail = container.querySelector<HTMLElement>(".cm-file-loaded-name")!.getBoundingClientRect();
        const x = screen.getByRole("button", { name: `Remove ${name}` }).getBoundingClientRect();
        assert.isAtMost(tail.right, x.left, "the name stops before the x");
    });

    it("draws a link glyph for an address, and the bar instead of the line while a load is under way", async () => {
        const loaded = { name: "https://a.example/m.glb", kind: "url" } as const;
        const { container } = await renderThemed(
            <>
                <FileSource variant="row" loaded={loaded} clearLabel="Take it out" onFiles={() => undefined} />
                <FileSource variant="row" loaded={loaded} progress={0.5} onFiles={() => undefined} />
            </>,
        );
        const [idle, busy] = [...container.querySelectorAll(".cm-file-source")];
        assert.equal(idle.querySelector(".cm-file-loaded svg")?.getAttribute("data-glyph"), "link");
        assert.isNotNull(screen.getByRole("button", { name: "Take it out" }));
        assert.isNull(busy.querySelector(".cm-file-loaded"), "no line while it loads");
        assert.isNotNull(busy.querySelector("[role='progressbar']"));
    });

    it("is ignored by the drop and button variants", async () => {
        const { container } = await renderThemed(
            <FileSource variant="drop" loaded={{ name: "model.glb" }} onFiles={() => undefined} />,
        );
        assert.isNull(container.querySelector(".cm-file-loaded"));
        assert.isNotNull(container.querySelector(".cm-file-drop-target"));
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
