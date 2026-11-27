// Chapter 10, use AI: say it, and point. Talk held with its key (Ctrl+Shift+Space, badge "Talk"), the
// hand points at Napoleon and then Child1 while "Light up the path between these." plays into Chromium's fake
// microphone; OpenAI transcribes it, the words land in the chat and the assistant lights the path.
//
// Headless Chromium's own speech recognition hears nothing and the element never falls back to the
// provider's transcription (reported as an app defect), so setup writes the element's remembered
// "browser recognition fails" outcome for this origin before linking, which sends speech to OpenAI.
import { aiProvider, answered, composer, nodeBox, REST, SPEECH } from "./adv.js";

let from;
let to;

export default {
    id: "advanced-say-and-point",
    chapter: 10,
    caption: "Or say it, and point",
    dataset: "Les Miserables",
    browserArgs: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${SPEECH}%noloop`,
    ],
    async setup(h) {
        const { page } = h;
        await page.evaluate(() => globalThis.localStorage.setItem("@graphty-ai-voice:recognition", "fails"));
        await h.app.ready2D();
        await aiProvider(h, "OpenAI", "OPENAI_API_KEY");
        await composer(page).waitFor();
        await page.getByRole("region", { name: "Assistant" }).getByRole("button", { name: "Talk" }).waitFor();
        await h.app.settled();
        from = await nodeBox(h, "Napoleon");
        to = await nodeBox(h, "Child1");
        await h.park({ x: 700, y: 900 });
    },
    async run(h) {
        const { page } = h;
        const talk = page.getByRole("region", { name: "Assistant" }).getByRole("button", { name: "Talk" });
        await h.badge("Ctrl+Shift+Space", { near: talk, label: "Talk", badgeMs: 5600 });
        const pressed = Date.now();
        for (const k of ["Control", "Shift", "Space"]) await page.keyboard.down(k);
        h.mark("talk");
        await h.move(from);
        await h.pause(350);
        await h.move(to);
        h.mark("pointed");
        // the speech ends 4.85 s after the press (2.2 s of silence, then the words)
        await h.pause(Math.max(300, 5400 - (Date.now() - pressed)));
        for (const k of ["Space", "Shift", "Control"]) await page.keyboard.up(k);
        h.mark("released");
        await h.waitFor(
            page.getByRole("region", { name: "Chat" }).getByText("Path between these", { exact: false }).first(),
        );
        h.mark("heard");
        await h.waitFor(answered(page));
        await h.move(REST);
        await h.app.settled();
        h.mark("path");
    },
    holdMs: 3000,
};
