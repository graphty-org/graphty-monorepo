/**
 * Every model format and variant graphty-element reads, loaded through the Load custom model dialog
 * on the real element by real input (issue #3396). One test per entry of graphty-element's variant
 * table (`graphty-element/test/fixtures/models/variants/manifest.json`, written with its fixtures by
 * `generate.ts` there): the files, folder or .zip are chosen in the dialog; an accepted variant's
 * preview is drawn, not blank, in the variant's color, its caption names the variant, the element's
 * record and summary report the expected format and parts, and Add draws it on the layer's nodes; a
 * refused one is named and has no preview. Also: a web address, a missing texture shown and then
 * supplied, and no request to any host but the test server (no decoder from a CDN).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { ModelSummary } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { screen, within } from "../../../test/test-utils";
import { modelChip } from "../modelWords";
import { CUSTOM_MODEL } from "../words";
import { addModel, fileInput, openCustom, openShapes, previewOf, reaches, written } from "./modelHarness";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Starts listing requests to any host but the test server (vitest.config.ts). */
        watchOffOriginRequests: () => Promise<void>;
        /** The requests listed since, emptying the list. */
        takeOffOriginRequests: () => Promise<string[]>;
    }
}

/** graphty-element's variant fixtures, relative to the graphty project (as uploads take them). */
const VARIANTS = "../graphty-element/test/fixtures/models/variants";

/** One entry of the variant table (see generate.ts beside it). */
interface Variant {
    readonly id: string;
    readonly what: string;
    readonly files: readonly string[];
    readonly upload: "files" | "folder";
    readonly format: string;
    readonly geometry?: ModelSummary["geometry"];
    readonly encoding?: ModelSummary["encoding"];
    readonly compression?: ModelSummary["compression"];
    readonly gltfVersion?: ModelSummary["gltfVersion"];
    readonly color: "red" | "green" | "blue" | "any";
    readonly warnings: readonly string[];
    readonly refused: { readonly code: string } | null;
    readonly needs?: string;
    readonly drawFails?: readonly string[];
}

const TABLE = JSON.parse(await commands.readFile(`${VARIANTS}/manifest.json`)) as Variant[];

/** Files that hold other files: their parts are named inside them, not by the files chosen. */
const CONTAINER = /\.(zip|sog)$/;

/**
 * The share of a picture's pixels that are drawn, and of those dominated by a color (that channel
 * at least 40 above each other one).
 * @param picture - the preview.
 * @param color - the color, or "any".
 * @returns both shares, 0 to 1.
 */
async function shares(picture: HTMLImageElement, color: Variant["color"]): Promise<{ drawn: number; colored: number }> {
    await picture.decode();
    const canvas = document.createElement("canvas");
    canvas.width = picture.naturalWidth;
    canvas.height = picture.naturalHeight;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(picture, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const c = { red: 0, green: 1, blue: 2, any: -1 }[color];
    let drawn = 0;
    let colored = 0;
    for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] === 0) {
            continue;
        }
        drawn++;
        const others = [0, 1, 2].filter((k) => k !== c).map((k) => data[at + k]);
        colored += c >= 0 && others.every((o) => data[at + c] >= o + 40) ? 1 : 0;
    }
    const all = data.length / 4;
    return { drawn: drawn / all, colored: colored / all };
}

/**
 * Asserts the preview shows the model: drawn over at least 3% of it and, for a colored variant, at
 * least 1% in that color.
 * @param dialog - the dialog.
 * @param variant - the variant.
 */
async function assertPreview(dialog: HTMLElement, variant: Variant): Promise<void> {
    // The name graphty-element's record gives it, as the dialog's Name field shows it.
    const name = (await within(dialog).findByRole<HTMLInputElement>("textbox", { name: "Name" })).value;
    const { drawn, colored } = await shares(await previewOf(dialog, name), variant.color);
    assert.isAtLeast(drawn, 0.03, `${variant.id}: the preview is not blank`);
    if (variant.color !== "any") {
        assert.isAtLeast(colored, 0.01, `${variant.id}: the preview shows ${variant.color}`);
    }
}

/**
 * Chooses a variant's files, or its folder, in the dialog.
 * @param dialog - the dialog.
 * @param variant - the variant.
 */
async function choose(dialog: HTMLElement, variant: Variant): Promise<void> {
    const folder = `${VARIANTS}/${variant.id}`;
    await (variant.upload === "folder"
        ? userEvent.upload(fileInput(dialog, true), folder)
        : userEvent.upload(
              fileInput(dialog),
              variant.files.map((f) => `${folder}/${f}`),
          ));
}

/**
 * The closed Advanced line, with its chips.
 * @param dialog - the dialog.
 * @returns the line.
 */
function advancedLine(dialog: HTMLElement): HTMLElement {
    const advanced = within(dialog).getByRole("button", { name: "Advanced" });
    return advanced.parentElement ?? dialog;
}

/**
 * A fixture's bytes, read by the test runner.
 * @param path - below the variants folder.
 * @returns the bytes.
 */
async function bytesOf(path: string): Promise<Uint8Array<ArrayBuffer>> {
    return Uint8Array.from(atob(await commands.readFile(`${VARIANTS}/${path}`, "base64")), (ch) => ch.charCodeAt(0));
}

beforeEach(async () => {
    await commands.watchOffOriginRequests();
});

afterEach(async () => {
    vi.restoreAllMocks();
    // No decoder, texture or part comes from a third-party host: Draco, meshopt and KTX2 included.
    assert.deepEqual(await commands.takeOffOriginRequests(), [], "nothing is fetched from another host");
});

describe("every model format and variant, through the Load custom model dialog", () => {
    it.each(TABLE.map((v) => [`${v.id}: ${v.what}`, v] as const))("%s", async (_name, variant) => {
        const { session, tab, store } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, variant);

        if (variant.refused?.code === "E_MODEL_AMBIGUOUS") {
            const files = await within(dialog).findByTestId("model-files");
            assert.isNotNull(await within(files).findByRole("combobox", { name: "Which file is the model" }));
            assert.isNull(within(dialog).queryByRole("img"), "no preview until the reader picks one");
            return;
        }
        if (variant.refused !== null) {
            const refusal = await within(dialog).findByTestId("model-refusal");
            assert.match(refusal.textContent, new RegExp(`^${variant.format.toUpperCase()} not read`), "names it");
            assert.isNull(within(dialog).queryByRole("img"), "no preview");
            return;
        }
        if (variant.drawFails !== undefined) {
            const preview = await within(dialog).findByTestId("model-preview");
            assert.isNotNull(await within(preview).findByText("Not loaded"));
            assert.isNull(preview.querySelector("img"));
            const addButton = within(dialog).getByRole("button", { name: "Add model" });
            assert.equal(addButton.getAttribute("aria-disabled"), "true");
            // The reader is told, as an intake refusal is told.
            const refusal = await within(dialog).findByTestId("model-refusal");
            assert.equal(store.get().announcement, refusal.textContent, "the failure is announced");
            // Neither a click nor Enter or Space on the blocked Add adds the model. A browser clicks an
            // aria-disabled button; Playwright only does with `force`, which skips its own enabled check.
            const before = written(session, "node.model");
            await userEvent.click(addButton, { force: true });
            await userEvent.keyboard("{Enter}");
            await userEvent.keyboard(" ");
            assert.equal(written(session, "node.model"), before, "a blocked Add adds nothing");
            assert.isTrue(dialog.isConnected, "the dialog stays open");
            return;
        }
        if (variant.needs !== undefined) {
            const row = await within(await within(dialog).findByTestId("model-files")).findByRole("group", {
                name: variant.needs,
            });
            await userEvent.click(within(row).getByRole("button", { name: `Load without ${variant.needs}` }));
        }

        await assertPreview(dialog, variant);
        assert.equal(
            within(dialog).getByTestId("model-variant").textContent,
            CUSTOM_MODEL.variantLine(variant),
            "the caption names the variant",
        );
        for (const code of variant.warnings.filter((w) => w !== "W_MODEL_PART_SKIPPED")) {
            assert.isNotNull(within(advancedLine(dialog)).getByText(modelChip({ code, params: {} }).word), code);
        }

        await addModel(dialog);
        const ref = String(written(session, "node.model"));
        assert.match(ref, /^asset:/);
        const record = session.assets.find(ref);
        assert.equal(record?.state, "accepted");
        assert.isDefined(record);
        const summary = session.assets.inspect(record.id);
        assert.equal(summary.format, variant.format);
        assert.equal(summary.geometry ?? "mesh", variant.geometry ?? "mesh");
        assert.equal(summary.encoding, variant.encoding);
        assert.deepEqual(summary.compression ?? [], variant.compression ?? []);
        assert.equal(summary.gltfVersion === "1.0" ? "1.0" : undefined, variant.gltfVersion);
        const codes = record.problems.map((p) => p.code);
        for (const code of variant.warnings) {
            assert.include(codes, code);
        }
        const parts = record.parts ?? [];
        assert.equal(parts[0]?.role, "model", "the main file is the model");
        for (const part of parts) {
            assert.equal(part.state, part.name === variant.needs ? "skipped" : "found", part.name);
        }
        if (!variant.files.some((f) => CONTAINER.test(f))) {
            const found = parts.filter((p) => p.state === "found").map((p) => (p.file ?? p.name).split("/").pop());
            assert.sameMembers(
                found,
                variant.files.filter((f) => f !== variant.needs),
                "every file is a part",
            );
        }

        await reaches(session, ref, "drawn");
        assert.include(session.assets.usedBy(ref), session.styles.list().find((l) => l.name === "Shapes")?.id);
    });

    it("loads a .gltf and its .bin from a web address, with the preview drawn", async () => {
        const base = "https://models.example.com/cube/";
        const served = new Map([
            [`${base}cube.gltf`, await bytesOf("gltf-bin/cube.gltf")],
            [`${base}cube.bin`, await bytesOf("gltf-bin/cube.bin")],
        ]);
        const asked: string[] = [];
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const to = input instanceof Request ? input.url : String(input);
            const body = served.get(to);
            if (body === undefined) {
                return original(input, init);
            }
            asked.push(to);
            return Promise.resolve(new Response(body, { status: 200 }));
        });
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}cube.gltf{Enter}`);
        const variant = TABLE.find((v) => v.id === "gltf-bin");
        assert.isDefined(variant);
        await assertPreview(dialog, variant);
        assert.sameMembers(asked, [...served.keys()], "the model and its buffer were fetched");
        await addModel(dialog);
        const ref = String(written(session, "node.model"));
        await reaches(session, ref, "drawn");
    });

    it("lists a missing texture, takes it from its row's Choose, and draws the model with it", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [
            `${VARIANTS}/obj-mtl-missing-png/cube.obj`,
            `${VARIANTS}/obj-mtl-missing-png/cube.mtl`,
        ]);
        const files = await within(dialog).findByTestId("model-files");
        const row = await within(files).findByRole("group", { name: "cube.png" });
        assert.isNotNull(within(row).getByText("Texture"));
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");
        await userEvent.upload(fileInput(row), [`${VARIANTS}/obj-mtl-png/cube.png`]);
        const waiting = TABLE.find((v) => v.id === "obj-mtl-missing-png");
        assert.isDefined(waiting);
        // Its blue Kd times the green picture draws dark: no one color to look for.
        await assertPreview(dialog, { ...waiting, color: "any" });
        await addModel(dialog);
        const ref = String(written(session, "node.model"));
        assert.deepEqual(
            session.assets.find(ref)?.parts?.map((p) => [p.role, p.state]),
            [
                ["model", "found"],
                ["materials", "found"],
                ["texture", "found"],
            ],
        );
        const supplied = session.assets.find(ref);
        assert.isDefined(supplied);
        assert.equal(session.assets.inspect(supplied.id).textures, 1, "drawn with the picture");
        await reaches(session, ref, "drawn");
        assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
    });
});
