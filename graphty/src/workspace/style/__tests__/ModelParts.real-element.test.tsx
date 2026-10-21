/**
 * A model missing parts, in the tier 3 Style panel, on the REAL graphty-element, by real input
 * (node-models design 13.4, 13.6): the Kenney car kit's police.glb names its picture as the
 * separate file Textures/colormap.png. By a folder or a .zip it draws at once; alone it shows the
 * "1 missing" chip, whose Parts pop-over takes the picture dropped on its row, dropped anywhere in
 * the pop-over, chosen, or by address -- or draws without it. Every assertion reads what the
 * element reports: its layers and its model states.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";

/** A hang guard for the element coming up, loading and drawing a model, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The car kit's folder, as the file chooser reads it (relative to the graphty project). */
const KIT_FOLDER = "src/workspace/style/__fixtures__/car-kit";

const PART = "Textures/colormap.png";

const NODES = [
    { id: "1", position: { x: -2, y: 0, z: 0 } },
    { id: "2", position: { x: 2, y: 0, z: 0 } },
];

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
 * The element on the project's canvas, once it has come up.
 * @returns the element.
 */
async function canvasElement(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            element = document.querySelector(".ws-canvas graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    return element;
}

/**
 * A project with two nodes and a "Shapes" layer drawing them as cylinders, its Style tab open.
 * @returns the session and the Style tab.
 */
async function openShapes(): Promise<{ session: GraphSession; tab: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Car kit", id: 1 } });
    render(<Workspace store={store} />);
    const { session } = await canvasElement();
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.styles.add({
        name: "Shapes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "cylinder" },
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Shapes, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return { session, tab: await screen.findByTestId("style-tab") };
}

/**
 * What the "Shapes" layer's node.model names.
 * @param session - the element's session.
 * @returns the ref, or undefined.
 */
function namedModel(session: GraphSession): string | undefined {
    const layer = session.styles.list().find((l) => l.name === "Shapes");
    const value = (layer?.set as Record<string, unknown> | undefined)?.["node.model"];
    return typeof value === "string" ? value : undefined;
}

/**
 * The Shape field's input.
 * @param tab - the Style tab.
 * @returns the combobox.
 */
function shapeField(tab: HTMLElement): HTMLElement {
    return within(tab).getByRole("combobox", { name: /^Node shape/ });
}

/**
 * Opens the Models pop-over by the keyboard: the Shape field, ArrowDown, End, Enter on Model....
 * @param tab - the Style tab.
 * @returns the pop-over.
 */
async function openModels(tab: HTMLElement): Promise<HTMLElement> {
    shapeField(tab).focus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("option", { name: "Model..." });
    await userEvent.keyboard("{End}{Enter}");
    return screen.findByRole("dialog", { name: "Models" });
}

/**
 * Waits until graphty-element reports the model the layer names drawn.
 * @param session - the element's session.
 */
async function drawn(session: GraphSession): Promise<void> {
    await waitFor(
        () => {
            const ref = namedModel(session);
            assert.isDefined(ref);
            assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, "drawn");
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Drops files as the browser does. A synthetic DragEvent, the one exception to real input: a page
 * cannot start a drag of a file from the operating system, and Playwright's drag-and-drop moves
 * page elements, never files.
 * @param target - where they are dropped.
 * @param files - the files.
 */
function dropOn(target: EventTarget, files: readonly File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * The file input of a pop-over: the files chooser, or the folder chooser.
 * @param root - where it is.
 * @param folder - the folder chooser.
 * @returns the input.
 */
function chooserIn(root: HTMLElement, folder = false): HTMLInputElement {
    const input = root.querySelector<HTMLInputElement>(
        folder ? "input[type=file][webkitdirectory]" : "input[type=file]:not([webkitdirectory])",
    );
    if (input === null) {
        throw new Error("no file input");
    }
    return input;
}

/**
 * police.glb chosen alone in the Models pop-over: the layer names it while it waits, and the
 * Shape field shows the chip.
 * @returns the session, the Style tab and the chip.
 */
async function policeAlone(): Promise<{ session: GraphSession; tab: HTMLElement; chip: HTMLElement }> {
    const { session, tab } = await openShapes();
    const models = await openModels(tab);
    await userEvent.upload(chooserIn(models), [await policeFile()]);
    const chip = await within(tab).findByRole("button", { name: "police: 1 file missing" }, { timeout: TIMEOUT_MS });
    assert.equal(chip.textContent, "1 missing");
    assert.isDefined(namedModel(session), "the layer names the model while it waits");
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
        assert.equal(document.activeElement?.getAttribute("aria-label"), `${PART} address`);
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
        assert.isNull(within(tab).queryByText(/missing$/));
        assert.equal(document.activeElement, shapeField(tab));
    });
}

describe("a model missing parts, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("draws police from the Folder button with its Textures folder, with no chip", async () => {
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        await userEvent.upload(chooserIn(models, true), KIT_FOLDER);
        await drawn(session);
        assert.isNull(within(tab).queryByText(/missing$/));
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
        dropOn(within(models).getByRole("group", { name: "Model files" }), [new File([zip], "car-kit.zip")]);
        await drawn(session);
        assert.isNull(within(tab).queryByText(/missing$/));
    });

    it("shows '1 missing' for police.glb alone, and takes colormap.png dropped on its row", async () => {
        const { session, tab, chip } = await policeAlone();
        await userEvent.hover(chip);
        assert.equal((await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS })).textContent, PART);
        const parts = await openParts(chip);
        const row = within(parts).getByRole("group", { name: PART });
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
        const row = within(parts).getByRole("group", { name: PART });
        assert.isNotNull(within(row).getByRole("button", { name: `Choose ${PART}` }));
        await userEvent.upload(chooserIn(row), [await colormapFile()]);
        await finished(session, tab);
    });

    it("draws without the picture on Load without it, showing 'Without 1'", async () => {
        const { session, tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        await userEvent.click(within(parts).getByRole("button", { name: `Load without ${PART}` }));
        await finished(session, tab);
        const without = await within(tab).findByText("Without 1");
        await userEvent.hover(without);
        assert.equal((await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS })).textContent, PART);
    });

    it("takes the picture's address on the same site, and asks first for another site", async () => {
        // police.glb is answered where its picture is not beside it; the picture is the real file
        // on the test server, the same origin, in another folder.
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
        const chip = await within(tab).findByRole(
            "button",
            { name: "police: 1 file missing" },
            { timeout: TIMEOUT_MS },
        );

        // Another site: the web-address question comes first.
        let parts = await openParts(chip);
        await userEvent.type(
            within(parts).getByRole("textbox", { name: `${PART} address` }),
            "https://assets.example.com/colormap.png{Enter}",
        );
        const question = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        assert.include(question.textContent, "assets.example.com");
        await userEvent.click(within(question).getByRole("button", { name: "Cancel" }));
        const still = await within(tab).findByRole("button", { name: "police: 1 file missing" });

        // The same site: fetched at once, and drawn.
        parts = screen.queryByRole("dialog", { name: "police.glb" }) ?? (await openParts(still));
        const field = within(parts).getByRole("textbox", { name: `${PART} address` });
        await userEvent.clear(field);
        await userEvent.type(field, `${new URL(colormapUrl, location.href).href}{Enter}`);
        await finished(session, tab);
    });

    it("words a GitHub page address as 'Web page' and fills in the file's own address", async () => {
        const blob = "https://github.com/kenney/car-kit/blob/main/Textures/colormap.png";
        const raw = "https://raw.githubusercontent.com/kenney/car-kit/main/Textures/colormap.png";
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const url = input instanceof Request ? input.url : String(input);
            return url === blob
                ? Promise.resolve(new Response("<!doctype html><html><body>GitHub</body></html>", { status: 200 }))
                : original(input, init);
        });
        const { tab, chip } = await policeAlone();
        const parts = await openParts(chip);
        const field = within(parts).getByRole("textbox", { name: `${PART} address` });
        await userEvent.type(field, `${blob}{Enter}`);
        const question = await screen.findByRole("dialog", { name: "Open a web address?" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(question).getByRole("button", { name: "Continue" }));

        const open = screen.queryByRole("dialog", { name: "police.glb" }) ?? (await openParts(chip));
        const row = within(open).getByRole("group", { name: PART });
        assert.isNotNull(await within(row).findByText("Web page", {}, { timeout: TIMEOUT_MS }));
        await userEvent.click(within(row).getByRole("button", { name: "Use file address" }));
        assert.equal(within(row).getByRole<HTMLInputElement>("textbox", { name: `${PART} address` }).value, raw);
        assert.isNotNull(within(tab).getByRole("button", { name: "police: 1 file missing" }));
    });
});
