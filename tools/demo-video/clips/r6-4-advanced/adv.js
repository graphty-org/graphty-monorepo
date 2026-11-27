// Round 6, advanced styling, notes and the AI assistant: what these clips share. A .js file, so
// record.mjs does not take it for a clip. Setup only, through the app's UI (the hand's nodeBox reads
// graphty-element's public nodeScreenPosition, as round 2's clips do).
import { join } from "node:path";

import { OUT, TOOL } from "../../lib/env.mjs";

export { nodeBox } from "../r2-1-fraud-ring/bank.js";
export { inspector } from "../r2-5b-and-more/more.js";

/** Where the hand rests after a beat: the canvas's empty lower right. */
export const REST = { x: 1460, y: 900, width: 100, height: 60 };

/** The files these clips open (data/r6-advanced, credits in its LICENSES.md). */
export const DUCK = join(TOOL, "data/r6-advanced/Duck.glb");
export const SKY = join(TOOL, "data/r6-advanced/dusk-sky.png");
/** "Light up the path between these.", spoken by OpenAI text-to-speech (tmp/demo-video/r6/tts.mjs), with 2.2 s of silence first. */
export const SPEECH = join(OUT, "r6/path-between-these.wav");

/**
 * The opened sample in 3D, settled and framed (setup only).
 * @param h - the hand
 */
export async function ready3D(h) {
    await h.app.closeTable();
    await h.app.mode("3D");
    await h.app.settled();
    await h.app.camera("Fit");
    await h.app.settled();
}

/**
 * The Everything layer open in the inspector on its Style tab, Node or Edge (setup only).
 * @param h - the hand
 * @param tab - "Node" or "Edge"
 */
export async function everything(h, tab = "Node") {
    const { page } = h;
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style" }).click();
    await page
        .getByRole("tablist", { name: "Style for" })
        .getByRole("tab", { name: new RegExp(`^${tab}`) })
        .click();
}

/**
 * A number field in the inspector set (setup only).
 * @param h - the hand
 * @param name - the spinbutton's name ("Node size")
 * @param value - the value
 */
export async function setNumber(h, name, value) {
    const field = h.page.getByRole("complementary", { name: "Inspector" }).getByRole("spinbutton", { name });
    await field.fill(String(value));
    await field.press("Enter");
}

/**
 * Graph settings' background color (setup only).
 * @param h - the hand
 * @param hex - without "#"
 */
export async function backgroundColor(h, hex) {
    const { page } = h;
    await page.getByRole("button", { name: "Graph settings" }).click();
    const field = page
        .getByRole("complementary", { name: "Inspector" })
        .getByRole("textbox", { name: /^Background color, / });
    await field.fill(hex);
    await field.press("Enter");
}

/**
 * Settings, a section (setup only).
 * @param h - the hand
 * @param section - "General", "AI provider"
 * @returns the Settings dialog
 */
export async function settings(h, section) {
    const { page } = h;
    await page.getByRole("toolbar", { name: "Places" }).getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByRole("gridcell", { name: section }).click();
    return dialog;
}

/**
 * Settings > General > Your name, so a note is signed (setup only).
 * @param h - the hand
 * @param name - the name
 */
export async function yourName(h, name) {
    const dialog = await settings(h, "General");
    await dialog.getByRole("textbox", { name: "Your name" }).fill(name);
    await dialog.getByRole("button", { name: "Done" }).click();
    await dialog.waitFor({ state: "hidden" });
}

/**
 * Settings > AI provider: the provider picked, its key typed into the masked API key field and Save
 * (setup only, off camera). The key comes from the recorder's environment (node --env-file), never
 * from the clip's source or a command line. Save closes Settings and opens the Assistant.
 * @param h - the hand
 * @param provider - "OpenAI", "Google"
 * @param envName - the environment variable holding its key
 */
export async function aiProvider(h, provider, envName) {
    const { page } = h;
    const key = process.env[envName];
    if (!key) throw new Error(`${envName} is not set: start the recorder with node --env-file=<main>/.env`);
    const dialog = await settings(h, "AI provider");
    await dialog.getByRole("combobox", { name: "Provider" }).click();
    await page.getByRole("option", { name: provider, exact: true }).click();
    await dialog.getByRole("textbox", { name: "API key" }).fill(key);
    await dialog.getByRole("button", { name: "Save" }).click();
    await dialog.waitFor({ state: "hidden" });
}

/**
 * The Assistant's message field.
 * @param page - the Playwright page
 * @returns its locator
 */
export const composer = (page) =>
    page.getByRole("region", { name: "Assistant" }).getByRole("textbox", { name: "Message the assistant" });

/**
 * The assistant has answered the last message: its Undo is in the chat.
 * @param page - the Playwright page
 * @returns its locator
 */
export const answered = (page) =>
    page.getByRole("region", { name: "Chat" }).getByRole("button", { name: "Undo" }).last();
