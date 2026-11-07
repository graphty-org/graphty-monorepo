/**
 * A model missing parts with the node models experiment on (issue #3396), on the real
 * graphty-element, by real input: the Kenney car kit's police.glb names its picture as the separate
 * file Textures/colormap.png. By a folder or a .zip it draws at once; alone it shows the
 * "1 missing" chip, whose Parts pop-over takes the picture dropped on its row, dropped anywhere in
 * the pop-over, chosen, or by address -- or draws without it. Every assertion reads what the
 * element reports: its layers and its model states.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { dropOn, fileInput, openModels, openShapes, shapeField, written } from "./modelHarness";

/** The car kit's folder, as the file chooser reads it (relative to the graphty project). */
const KIT_FOLDER = "src/workspace/style/__fixtures__/car-kit";

const PART = "Textures/colormap.png";
/** The part as the reader reads and hears it: its file name (design 13.9). */
const PART_NAME = "colormap.png";

const CHIP = "police: 1 file missing";

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * A fixture's bytes, from the test server.
 * @param url - its URL.
 * @returns the bytes.
 */
async function bytesOf(url: string): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

/**
 * police.glb, as a file.
 * @returns the file.
 */
async function policeFile(): Promise<File> {
    return new File([await bytesOf(policeUrl)], "police.glb", { type: "model/gltf-binary" });
}

/**
 * colormap.png, as a file.
 * @returns the file.
 */
async function colormapFile(): Promise<File> {
    return new File([await bytesOf(colormapUrl)], "colormap.png", { type: "image/png" });
}

/**
 * A CRC-32, for the zip below.
 * @param bytes - the bytes.
 * @returns the checksum.
 */
function crc32(bytes: Uint8Array): number {
    let crc = -1;
    for (const byte of bytes) {
        crc ^= byte;
        for (let k = 0; k < 8; k++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ -1) >>> 0;
}

/**
 * A .zip of files stored without compression, as an archiver writes one.
 * @param files - path to bytes.
 * @returns the zip's bytes.
 */
function storedZip(files: ReadonlyMap<string, Uint8Array>): Uint8Array<ArrayBuffer> {
    const local: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const [path, data] of files) {
        const name = new TextEncoder().encode(path);
        const crc = crc32(data);
        const head = new Uint8Array(30 + name.length);
        const h = new DataView(head.buffer);
        h.setUint32(0, 0x04034b50, true);
        h.setUint16(4, 20, true);
        h.setUint32(14, crc, true);
        h.setUint32(18, data.length, true);
        h.setUint32(22, data.length, true);
        h.setUint16(26, name.length, true);
        head.set(name, 30);
        const entry = new Uint8Array(46 + name.length);
        const c = new DataView(entry.buffer);
        c.setUint32(0, 0x02014b50, true);
        c.setUint16(4, 20, true);
        c.setUint16(6, 20, true);
        c.setUint32(16, crc, true);
        c.setUint32(20, data.length, true);
        c.setUint32(24, data.length, true);
        c.setUint16(28, name.length, true);
        c.setUint32(42, offset, true);
        entry.set(name, 46);
        local.push(head, data);
        central.push(entry);
        offset += head.length + data.length;
    }
    const size = central.reduce((n, e) => n + e.length, 0);
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, files.size, true);
    e.setUint16(10, files.size, true);
    e.setUint32(12, size, true);
    e.setUint32(16, offset, true);
    const out = new Uint8Array(offset + size + 22);
    let at = 0;
    for (const part of [...local, ...central, end]) {
        out.set(part, at);
        at += part.length;
    }
    return out;
}

/**
 * Waits until graphty-element reports the model the layer names drawn.
 * @param session - the element's session.
 */
async function drawn(session: GraphSession): Promise<void> {
    await waitFor(() => {
        const ref = written(session, "node.model");
        assert.isString(ref);
        assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, "drawn");
    });
}

/**
 * police.glb chosen alone in the Models pop-over: the layer names it while it waits, the Parts
 * pop-over opens in the Models pop-over's place with focus in the first row's address, one Escape
 * closes it, and the Shape field keeps the chip.
 * @returns the session, the Style tab and the chip.
 */
async function policeAlone(): Promise<{ session: GraphSession; tab: HTMLElement; chip: HTMLElement }> {
    const { session, tab } = await openShapes();
    const models = await openModels(tab);
    await userEvent.upload(fileInput(models), [await policeFile()]);
    const parts = await screen.findByRole("dialog", { name: "police.glb" });
    assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "one pop-over at a time");
    await waitFor(() => {
        assert.equal(document.activeElement?.getAttribute("aria-label"), `${PART_NAME} address`);
    });
    assert.isTrue(parts.contains(document.activeElement));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "police.glb" }));
    });
    const chip = await within(tab).findByRole("button", { name: CHIP });
    assert.equal(chip.textContent, "1 missing");
    assert.isString(written(session, "node.model"), "the layer names the model while it waits");
    assert.isNotNull(within(tab).getByRole("combobox", { name: "Node shape, police" }));
    return { session, tab, chip };
}

/**
 * Opens the Parts pop-over from the chip by the keyboard.
 * @param chip - the chip.
 * @returns the pop-over.
 */
async function openParts(chip: HTMLElement): Promise<HTMLElement> {
    chip.focus();
    await userEvent.keyboard("{Enter}");
    const parts = await screen.findByRole("dialog", { name: "police.glb" });
    await waitFor(() => {
        assert.equal(document.activeElement?.getAttribute("aria-label"), `${PART_NAME} address`);
    });
    return parts;
}

/**
 * The model drew, the chip and the pop-over went, and focus is back on the Shape field.
 * @param session - the element's session.
 * @param tab - the Style tab.
 */
async function finished(session: GraphSession, tab: HTMLElement): Promise<void> {
    await drawn(session);
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "police.glb" }));
        assert.isNull(within(tab).queryByRole("button", { name: CHIP }));
        assert.equal(document.activeElement, shapeField(tab));
    });
    assert.isNotNull(within(tab).getByRole("combobox", { name: "Node shape, police" }), "still named police");
}

describe("a model missing parts, on the real element", () => {
    it("draws police from the folder chooser with its Textures folder, with no chip", async () => {
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        await userEvent.upload(fileInput(models, true), KIT_FOLDER);
        await drawn(session);
        assert.isNull(within(tab).queryByRole("button", { name: CHIP }));
    });

    it("draws police from a dropped .zip of the two files, with no chip", async () => {
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        const zip = storedZip(
            new Map([
                ["police.glb", await bytesOf(policeUrl)],
                [PART, await bytesOf(colormapUrl)],
            ]),
        );
        dropOn(within(models).getByTestId("models-popover"), [new File([zip], "car-kit.zip")]);
        await drawn(session);
        assert.isNull(within(tab).queryByRole("button", { name: CHIP }));
    });

    it("shows '1 missing' for police.glb alone, and takes colormap.png dropped on its row", async () => {
        const { session, tab, chip } = await policeAlone();
        // The detail is the chip's description, for a screen reader.
        assert.include(document.getElementById(chip.getAttribute("aria-describedby") ?? "")?.textContent, PART);
        const parts = await openParts(chip);
        const row = within(parts).getByRole("group", { name: PART_NAME });
        assert.isNotNull(within(row).getByText("Texture"));
        dropOn(row, [await colormapFile()]);
        await finished(session, tab);
    });

    it("takes colormap.png dropped anywhere in the pop-over, matched by its name", async () => {
        const { session, tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        dropOn(within(parts).getByText("Drop files here"), [await colormapFile()]);
        await finished(session, tab);
    });

    it("takes colormap.png from the row's Choose button", async () => {
        const { session, tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        const row = within(parts).getByRole("group", { name: PART_NAME });
        assert.isNotNull(within(row).getByRole("button", { name: `Choose ${PART_NAME}` }));
        await userEvent.upload(fileInput(row), [await colormapFile()]);
        await finished(session, tab);
    });

    it("draws without the picture on Load without it, showing 'Without 1'", async () => {
        const { session, tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        await userEvent.click(within(parts).getByRole("button", { name: `Load without ${PART_NAME}` }));
        await finished(session, tab);
        assert.isNotNull(await within(tab).findByText("Without 1"));
    });

    it("takes the picture's address on the same site, and asks first for another site", async () => {
        // police.glb is answered where its picture is not beside it; the picture is the real file on
        // the test server, the same origin, in another folder.
        const main = `${location.origin}/parts-test/kit/police.glb`;
        const police = await bytesOf(policeUrl);
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const url = input instanceof Request ? input.url : String(input);
            return url === main ? Promise.resolve(new Response(police, { status: 200 })) : original(input, init);
        });
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        await userEvent.type(within(models).getByRole("textbox", { name: "Model address" }), `${main}{Enter}`);
        let parts = await screen.findByRole("dialog", { name: "police.glb" });

        // Another site: the web-address question comes first, worded for a part the reader supplied.
        await userEvent.type(
            within(parts).getByRole("textbox", { name: `${PART_NAME} address` }),
            "https://assets.example.com/colormap.png{Enter}",
        );
        const question = await screen.findByRole("dialog", { name: "Open a web address?" });
        assert.include(question.textContent, "Load a part of this model from assets.example.com?");
        assert.include(question.textContent, "colormap.png");
        await userEvent.click(within(question).getByRole("button", { name: "Cancel" }));
        const still = await within(tab).findByRole("button", { name: CHIP });

        // The same site: fetched at once, and drawn.
        parts = screen.queryByRole("dialog", { name: "police.glb" }) ?? (await openParts(still));
        const field = within(parts).getByRole("textbox", { name: `${PART_NAME} address` });
        await userEvent.clear(field);
        await userEvent.type(field, `${new URL(colormapUrl, location.href).href}{Enter}`);
        await finished(session, tab);
    });

    it("words a GitHub page address as 'Web page' and fills in the file's own address", async () => {
        const blob = "https://github.com/kenney/car-kit/blob/main/Textures/colormap.png";
        const raw = "https://raw.githubusercontent.com/kenney/car-kit/main/Textures/colormap.png";
        const requested: string[] = [];
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const url = input instanceof Request ? input.url : String(input);
            requested.push(url);
            return original(input, init);
        });
        const { tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        await userEvent.type(within(parts).getByRole("textbox", { name: `${PART_NAME} address` }), `${blob}{Enter}`);

        // Known as a page by its address: no question, and nothing fetched.
        const row = within(parts).getByRole("group", { name: PART_NAME });
        assert.isNotNull(await within(row).findByText("Web page"));
        assert.isNull(screen.queryByRole("dialog", { name: "Open a web address?" }));
        assert.notInclude(requested, blob);
        await userEvent.click(within(row).getByRole("button", { name: "Use file address" }));
        assert.equal(within(row).getByRole<HTMLInputElement>("textbox", { name: `${PART_NAME} address` }).value, raw);
        assert.isNotNull(within(tab).getByRole("button", { name: CHIP }));
    });
});
