// Chapter 10, use AI: your own provider and key. Both keys were saved in setup, off camera (Google
// last); on camera the hand picks OpenAI and its key field is already filled, masked.
import { aiProvider, settings } from "./adv.js";

export default {
    id: "advanced-provider",
    chapter: 10,
    caption: "Use your own AI provider and key",
    dataset: "Les Miserables",
    async setup(h) {
        await h.app.ready2D();
        await aiProvider(h, "OpenAI", "OPENAI_API_KEY");
        await aiProvider(h, "Google", "GOOGLE_API_KEY");
        await settings(h, "AI provider");
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const dialog = page.getByRole("dialog", { name: "Settings" });
        await h.click(dialog.getByRole("combobox", { name: "Provider" }));
        await h.click(page.getByRole("option", { name: "OpenAI", exact: true }));
        await h.waitFor(dialog.getByRole("link", { name: "Get a key from OpenAI" }));
        await h.hover(dialog.getByRole("textbox", { name: "API key" }), 700);
        h.mark("masked");
        await h.move(dialog.getByRole("button", { name: "Save" }));
    },
    holdMs: 2200,
};
