/**
 * FileDrop, driven by real input in a real browser: Enter and Space on its button open the file
 * chooser and the chosen files arrive; a folder chosen with the folder button arrives with each
 * file's path in the folder; files dragged in from outside the page arrive on drop, and the zone is
 * drawn as a target while they are held over it.
 */
import { screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { FileDrop } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const MODEL = [{ path: "police.glb", text: "glTF" }];

/**
 * Draws a FileDrop for model files.
 * @param onFiles - where its files go
 */
async function renderDrop(onFiles: (files: File[]) => void): Promise<void> {
    await renderThemed(
        <FileDrop
            label="Model files"
            chooseLabel="Choose files"
            chooseName="Choose model files"
            folderLabel="Folder"
            folderName="Choose model folder"
            accept=".glb,.zip"
            onFiles={onFiles}
        />,
    );
}

describe("FileDrop", () => {
    it.each(["{Enter}", " "])("opens the chooser on %s and hands over the chosen files", async (key) => {
        const onFiles = vi.fn();
        await renderDrop(onFiles);
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Choose model files" }));
        await commands.chooseNextFiles(MODEL);
        await userEvent.keyboard(key);
        await waitFor(() => {
            expect(onFiles).toHaveBeenCalledTimes(1);
        });
        const [files] = onFiles.mock.calls[0] as [File[]];
        expect(files.map((f) => f.name)).toEqual(["police.glb"]);
        expect(await files[0].text()).toBe("glTF");
    });

    it("hands over a chosen folder's files with their paths in it", async () => {
        const onFiles = vi.fn();
        await renderDrop(onFiles);
        await commands.chooseNextFiles(
            [
                { path: "police.glb", text: "glTF" },
                { path: "Textures/colormap.png", text: "PNG" },
            ],
            "car-kit",
        );
        await userEvent.click(screen.getByRole("button", { name: "Choose model folder" }));
        await waitFor(() => {
            expect(onFiles).toHaveBeenCalledTimes(1);
        });
        const [files] = onFiles.mock.calls[0] as [File[]];
        expect(files.map((f) => f.webkitRelativePath).sort()).toEqual([
            "car-kit/Textures/colormap.png",
            "car-kit/police.glb",
        ]);
    });

    it("hands over files dropped on it from outside the page, with their DataTransfer", async () => {
        const onFiles = vi.fn();
        await renderDrop(onFiles);
        await commands.dropFiles('[role="group"][aria-label="Model files"]', [{ path: "colormap.png", text: "PNG" }]);
        await waitFor(() => {
            expect(onFiles).toHaveBeenCalledTimes(1);
        });
        const [files, transfer] = onFiles.mock.calls[0] as [File[], DataTransfer | undefined];
        expect(files.map((f) => f.name)).toEqual(["colormap.png"]);
        expect(transfer).toBeInstanceOf(DataTransfer);
    });

    it("is drawn as a target while files are held over it, and not after they leave", async () => {
        const onFiles = vi.fn();
        await renderDrop(onFiles);
        const zone = screen.getByRole("group", { name: "Model files" });
        const rest = getComputedStyle(zone).backgroundColor;
        let held = "";
        new MutationObserver(() => {
            if (zone.hasAttribute("data-over")) {
                held = getComputedStyle(zone).backgroundColor;
            }
        }).observe(zone, { attributes: true, attributeFilter: ["data-over"] });
        await commands.dropFiles('[role="group"][aria-label="Model files"]', MODEL, true);
        expect(held).not.toBe("");
        expect(held).not.toBe(rest);
        await waitFor(() => {
            expect(zone).not.toHaveAttribute("data-over");
        });
        expect(onFiles).not.toHaveBeenCalled();
    });
});
