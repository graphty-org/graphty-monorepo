/**
 * ImagePicker in a real browser: the field shows the picked image, a tile click or key picks and
 * closes, the tiles are one Tab stop, and files, drops and addresses reach the caller while the
 * pop-out stays open.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { PopoutManager } from "../../../src";
import { ImagePicker, type ImagePickerItem, type ImagePickerProps } from "../../../src/components/inputs/ImagePicker";
import { axeFindings } from "../../a11y/axe";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const DOT =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const IMAGES: ImagePickerItem[] = [
    { id: "a", name: "alpha.png", src: DOT },
    { id: "b", name: "beta.png" },
    { id: "c", name: "gamma.png", src: DOT },
];

const PNG = { name: "photo.png", type: "image/png", text: "not really a png" };

/**
 * The picker, holding the picked value in state, with every callback a spy.
 * @param props - props to pass through
 * @returns the picker in a PopoutManager
 */
function Harness(props: Partial<ImagePickerProps>): React.JSX.Element {
    const [value, setValue] = useState<string | null>(props.value ?? null);
    return (
        <PopoutManager>
            <div style={{ width: 200 }}>
                <ImagePicker
                    label="Picture"
                    images={IMAGES}
                    {...props}
                    value={value}
                    onChange={(next, event) => {
                        setValue(next);
                        props.onChange?.(next, event);
                    }}
                />
            </div>
        </PopoutManager>
    );
}

/**
 * The field that opens the pop-out.
 * @returns the field's input
 */
function field(): HTMLInputElement {
    return screen.getByRole("combobox", { name: /^Picture,/ });
}

/**
 * Click the field and wait for the pop-out's tiles.
 * @returns the tile group
 */
async function open(): Promise<HTMLElement> {
    await userEvent.click(field());
    return await screen.findByRole("group", { name: "In this project" });
}

describe("ImagePicker", () => {
    it("shows the picked image's thumbnail and name", async () => {
        await renderThemed(<Harness value="a" />);
        assert.strictEqual(field().value, "alpha.png");
        assert.strictEqual(field().getAttribute("aria-haspopup"), "dialog");
        const img = document.querySelector<HTMLImageElement>(".cm-image-picker img");
        assert.isNotNull(img);
        assert.strictEqual(img?.getAttribute("src"), DOT);
    });

    it("shows None with nothing picked", async () => {
        await renderThemed(<Harness />);
        assert.strictEqual(field().value, "None");
        assert.isNull(document.querySelector(".cm-image-picker img"));
    });

    it("shows valueName, else the value, for a value not in images", async () => {
        await renderThemed(<Harness value="https://example.com/x.png" valueName="x.png" />);
        assert.strictEqual(field().value, "x.png");
    });

    it("picks a tile by click, closes and returns focus to the field", async () => {
        const onChange = vi.fn();
        await renderThemed(<Harness onChange={onChange} />);
        await open();
        await userEvent.click(screen.getByRole("button", { name: "beta.png" }));
        assert.deepEqual(
            onChange.mock.calls.map(([v]) => v as unknown),
            ["b"],
        );
        await expect.poll(() => screen.queryByRole("group", { name: "In this project" })).toBeNull();
        await expect.poll(() => document.activeElement).toBe(field());
        assert.strictEqual(field().value, "beta.png");
    });

    it("picks null with None", async () => {
        const onChange = vi.fn();
        await renderThemed(<Harness value="a" onChange={onChange} />);
        await open();
        const none = screen.getByRole("button", { name: "None" });
        assert.strictEqual(none.getAttribute("aria-pressed"), "false");
        assert.strictEqual(screen.getByRole("button", { name: "alpha.png" }).getAttribute("aria-pressed"), "true");
        await userEvent.click(none);
        assert.deepEqual(
            onChange.mock.calls.map(([v]) => v as unknown),
            [null],
        );
    });

    it("walks the tiles with the arrows, picks with Enter, and is one Tab stop", async () => {
        const onChange = vi.fn();
        await renderThemed(<Harness value="a" onChange={onChange} onFiles={() => undefined} />);
        const group = await open();
        const tiles = [...group.querySelectorAll<HTMLButtonElement>("button")];
        assert.deepEqual(
            tiles.map((t) => t.tabIndex),
            [-1, 0, -1, -1],
        );
        tiles[1].focus();
        await userEvent.keyboard("{ArrowDown}");
        assert.strictEqual(document.activeElement, tiles[2]);
        await userEvent.keyboard("{End}");
        assert.strictEqual(document.activeElement, tiles[3]);
        await userEvent.keyboard("{Home}");
        assert.strictEqual(document.activeElement, tiles[0]);
        await userEvent.keyboard("{ArrowUp}");
        assert.strictEqual(document.activeElement, tiles[3]);
        // Tab leaves the group in one step, to the loader.
        await userEvent.keyboard("{Tab}");
        assert.isFalse(group.contains(document.activeElement));
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.strictEqual(document.activeElement, tiles[3]);
        await userEvent.keyboard("{Enter}");
        assert.deepEqual(
            onChange.mock.calls.map(([v]) => v as unknown),
            ["c"],
        );
        await expect.poll(() => document.activeElement).toBe(field());
    });

    it("opens from the keyboard and closes on Escape", async () => {
        await renderThemed(<Harness />);
        field().focus();
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("group", { name: "In this project" });
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => screen.queryByRole("group", { name: "In this project" })).toBeNull();
    });

    it("hands a dropped or chosen file to onFiles and stays open", async () => {
        const onFiles = vi.fn();
        await renderThemed(<Harness onFiles={onFiles} />);
        await open();
        await commands.dropFiles(".cm-image-picker-body .cm-file-drop-target", [PNG]);
        await expect.poll(() => onFiles.mock.calls.length).toBe(1);
        await commands.chooseFiles(".cm-image-picker-body .cm-file-drop-target button", [PNG]);
        await expect.poll(() => onFiles.mock.calls.length).toBe(2);
        const names = onFiles.mock.calls.map(([files]) => (files as File[]).map((f) => f.name));
        assert.deepEqual(names, [["photo.png"], ["photo.png"]]);
        assert.isNotNull(screen.queryByRole("group", { name: "In this project" }));
    });

    it("hands a typed address to onUrl", async () => {
        const onUrl = vi.fn();
        await renderThemed(<Harness onUrl={onUrl} />);
        await open();
        await userEvent.type(screen.getByPlaceholderText("Picture address"), "https://example.com/p.png{Enter}");
        assert.deepEqual(onUrl.mock.calls, [["https://example.com/p.png"]]);
    });

    it("disables the loader while busy and shows and announces an error", async () => {
        await renderThemed(<Harness onFiles={() => undefined} onUrl={() => undefined} busy error="Not a picture" />);
        await open();
        assert.isTrue((screen.getByPlaceholderText("Picture address") as HTMLInputElement).disabled);
        assert.isNotNull(screen.getByRole("progressbar"));
        assert.isNotNull(screen.getByText("Not a picture"));
    });

    it("has no loader without onFiles or onUrl", async () => {
        await renderThemed(<Harness />);
        await open();
        assert.isNull(document.querySelector(".cm-image-picker-body .cm-file-source, .cm-image-picker-body input"));
    });

    it("has no axe findings closed or open, under the AA token set", async () => {
        await renderThemed(<Harness value="a" onFiles={() => undefined} onUrl={() => undefined} />, {
            highContrast: true,
        });
        assert.deepEqual(await axeFindings("high"), []);
        await open();
        assert.deepEqual(await axeFindings("high"), []);
    });
});
