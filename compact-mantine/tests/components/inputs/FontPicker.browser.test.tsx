/**
 * FontPicker in a real browser: it opens from a click and from the keyboard, lists the generic
 * families and the caller's fonts once each, draws every option in its own face, filters by word
 * start, picks with Enter or a click, takes a font file from the file picker or a drop and refuses
 * any other file, and offers the fonts installed on this computer where the browser has the API.
 */
import { screen, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { PopoutManager } from "../../../src";
import { FontPicker, type FontPickerProps } from "../../../src/components/inputs/FontPicker";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

/**
 * A picker holding its value, reporting each pick to `onPicked`.
 * @param props - FontPicker's props, less the value
 * @returns The picker in a pop-out manager
 */
function Harness(
    props: Omit<FontPickerProps, "value" | "onChange"> & { initial?: string | null; onPicked?: (f: string) => void },
): React.JSX.Element {
    const { initial = "sans-serif", onPicked, ...rest } = props;
    const [font, setFont] = useState<string | null>(initial);
    return (
        <PopoutManager>
            <div style={{ width: 192 }}>
                <FontPicker
                    {...rest}
                    value={font}
                    onChange={(next) => {
                        setFont(next);
                        onPicked?.(next);
                    }}
                />
            </div>
        </PopoutManager>
    );
}

/** @returns the trigger field */
function trigger(): HTMLInputElement {
    return screen.getByRole<HTMLInputElement>("textbox", { name: "Label font" });
}

/** @returns the open list */
async function list(): Promise<HTMLElement> {
    return screen.findByRole("listbox", { name: "Label font" });
}

/** @returns the names of the options shown */
function optionNames(): string[] {
    return screen.getAllByRole("option").map((option) => option.textContent ?? "");
}

/**
 * Opens a picker that takes uploads.
 * @returns the upload and pick spies
 */
async function openWithUpload(): Promise<{
    onUpload: ReturnType<typeof vi.fn<NonNullable<FontPickerProps["onUpload"]>>>;
    onPicked: ReturnType<typeof vi.fn>;
}> {
    const onUpload = vi.fn<NonNullable<FontPickerProps["onUpload"]>>();
    const onPicked = vi.fn();
    await renderThemed(<Harness label="Label font" onUpload={onUpload} onPicked={onPicked} />);
    await userEvent.click(trigger());
    await list();
    return { onUpload, onPicked };
}

describe("FontPicker", () => {
    it("opens from a click, filters by word start, picks with Enter and gives focus back", async () => {
        const onPicked = vi.fn();
        await renderThemed(<Harness label="Label font" onPicked={onPicked} />);
        assert.strictEqual(trigger().value, "sans-serif");
        await userEvent.click(trigger());
        const listbox = await list();
        assert.isNotNull(within(listbox).getByRole("group", { name: "Generic families" }));
        await expect.poll(() => document.activeElement?.getAttribute("placeholder")).toBe("Find font");
        await userEvent.keyboard("mono");
        const names = optionNames();
        assert.include(names, "monospace");
        assert.include(names, "ui-monospace");
        assert.isTrue(
            names.every((name) => /(^|[^a-z])mono/i.test(name)),
            names.join(", "),
        );
        await userEvent.keyboard("{Enter}");
        await expect.poll(() => onPicked.mock.calls).toEqual([[names[0]]]);
        await expect.poll(() => document.activeElement).toBe(trigger());
        assert.strictEqual(trigger().value, names[0]);
    });

    it("opens from ArrowDown, walks with the arrows and End, and picks with Enter", async () => {
        const onPicked = vi.fn();
        await renderThemed(<Harness label="Label font" onPicked={onPicked} />);
        trigger().focus();
        await userEvent.keyboard("{ArrowDown}");
        await list();
        await expect.poll(() => document.activeElement?.getAttribute("placeholder")).toBe("Find font");
        const search = document.activeElement as HTMLInputElement;
        await userEvent.keyboard("{End}");
        const options = screen.getAllByRole("option");
        const last = options.at(-1);
        assert.strictEqual(search.getAttribute("aria-activedescendant"), last?.id);
        await userEvent.keyboard("{Enter}");
        await expect.poll(() => onPicked.mock.calls).toEqual([[last?.textContent]]);
    });

    it("draws every option in its own face", async () => {
        await renderThemed(<Harness label="Label font" />);
        await userEvent.click(trigger());
        await list();
        for (const option of screen.getAllByRole("option")) {
            const family = getComputedStyle(option.querySelector(".cm-listbox-label") as Element).fontFamily;
            assert.include(family.split('"').join(""), option.textContent ?? "", family);
        }
    });

    it("shows a held stack as its first family, listed and checked", async () => {
        await renderThemed(<Harness label="Label font" initial='"Fira Code", monospace' />);
        assert.strictEqual(trigger().value, "Fira Code");
        await userEvent.click(trigger());
        await list();
        const checked = screen.getAllByRole("option", { selected: true });
        assert.deepEqual(
            checked.map((option) => option.textContent),
            ["Fira Code"],
        );
        const common = screen.getByRole("group", { name: "Common fonts" });
        assert.include(within(common).getAllByRole("option").at(-1)?.textContent, "Fira Code");
    });

    it("lists the caller's fonts first under Uploaded, each family once", async () => {
        await renderThemed(
            <Harness label="Label font" fonts={[{ family: "Outfit" }, { family: "monospace", label: "Mono" }]} />,
        );
        await userEvent.click(trigger());
        const listbox = await list();
        const groups = within(listbox).getAllByRole("group");
        assert.strictEqual(groups[0].getAttribute("aria-labelledby") !== null, true);
        assert.deepEqual(
            within(groups[0])
                .getAllByRole("option")
                .map((option) => option.textContent),
            ["Outfit", "Mono"],
        );
        const generic = within(listbox).getByRole("group", { name: "Generic families" });
        assert.notInclude(
            within(generic)
                .getAllByRole("option")
                .map((option) => option.textContent),
            "monospace",
        );
    });

    it("takes a font from the file picker, hands its bytes to onUpload and picks it", async () => {
        const { onUpload, onPicked } = await openWithUpload();
        const text = "wOF2 stand-in bytes";
        await commands.chooseFiles("button:has-text('Upload font')", [
            { name: "Outfit.woff2", type: "font/woff2", text },
        ]);
        await expect.poll(() => onPicked.mock.calls).toEqual([["Outfit"]]);
        assert.strictEqual(onUpload.mock.calls.length, 1);
        const [upload] = onUpload.mock.calls[0];
        assert.strictEqual(upload.format, "woff2");
        assert.strictEqual(upload.family, "Outfit");
        assert.strictEqual(upload.bytes.byteLength, text.length);
        assert.strictEqual(upload.file.name, "Outfit.woff2");
    });

    it("refuses a file that is not a font, and takes a font dropped on the pop-out", async () => {
        const { onUpload, onPicked } = await openWithUpload();
        await commands.chooseFiles("button:has-text('Upload font')", [
            { name: "picture.png", type: "image/png", text: "png" },
        ]);
        const alert = await screen.findByRole("alert");
        assert.strictEqual(alert.textContent, "picture.png is not a font file. Use .ttf, .otf, .woff or .woff2.");
        assert.strictEqual(onUpload.mock.calls.length, 0);
        await commands.dropFiles(".cm-font-picker", [{ name: "Mono Two.ttf", type: "font/ttf", text: "ttf" }]);
        await expect.poll(() => onPicked.mock.calls).toEqual([["Mono Two"]]);
        assert.strictEqual(onUpload.mock.calls[0][0].format, "ttf");
    });

    it("shows a failed upload's message", async () => {
        await renderThemed(
            <Harness
                label="Label font"
                onUpload={() => Promise.reject(new Error("The browser could not read Broken.otf"))}
            />,
        );
        await userEvent.click(trigger());
        await list();
        await commands.chooseFiles("button:has-text('Upload font')", [
            { name: "Broken.otf", type: "font/otf", text: "x" },
        ]);
        assert.strictEqual((await screen.findByRole("alert")).textContent, "The browser could not read Broken.otf");
    });

    it("offers no installed fonts where the browser lacks the API", async () => {
        assert.isFalse("queryLocalFonts" in window);
        await renderThemed(<Harness label="Label font" />);
        await userEvent.click(trigger());
        await list();
        assert.isNull(screen.queryByRole("button", { name: "Show fonts on this computer" }));
    });

    it("lists the installed fonts after the reader asks for them", async () => {
        const query = vi.fn(() =>
            Promise.resolve([{ family: "Zeta Sans" }, { family: "Alpha Serif" }, { family: "Alpha Serif" }]),
        );
        vi.stubGlobal("queryLocalFonts", query);
        const permissions = vi
            .spyOn(navigator.permissions, "query")
            .mockResolvedValue({ state: "prompt" } as PermissionStatus);
        try {
            await renderThemed(<Harness label="Label font" />);
            await userEvent.click(trigger());
            await list();
            const show = await screen.findByRole("button", { name: "Show fonts on this computer" });
            assert.strictEqual(query.mock.calls.length, 0);
            await userEvent.click(show);
            const local = await screen.findByRole("group", { name: "On this computer" });
            assert.deepEqual(
                within(local)
                    .getAllByRole("option")
                    .map((option) => option.textContent),
                ["Alpha Serif", "Zeta Sans"],
            );
            assert.isNull(screen.queryByRole("button", { name: "Show fonts on this computer" }));
        } finally {
            permissions.mockRestore();
            vi.unstubAllGlobals();
        }
    });
});
