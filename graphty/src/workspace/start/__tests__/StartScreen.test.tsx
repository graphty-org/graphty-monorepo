/**
 * The start page, Settings and the usage data card, without the element (its tag stays an
 * empty box): what the page says, the card's answers and the chip that follows them, Settings
 * and its sections, and the ways in, for a first visit and a returning reader. `StartScreen.real-element.test.tsx` opens the samples.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { ariaKey, formatKey } from "../../keys/keys";
import { forgetUsageAnswer, setUsageSenderForTests } from "../../privacy/usageData";
import { clearRecent, rememberRecent } from "../../project/recent";
import { SINGLE_KEY_SHORTCUTS } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

/** Where Sentry would start and stop: the usage data card's Share and No call these instead. */
const initSentry = vi.fn();
const stopSentry = vi.fn();
setUsageSenderForTests({ start: initSentry, stop: stopSentry });

const OWNER_WORDS =
    "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions.";

/**
 * Renders the workspace with no project open.
 * @returns the store.
 */
function renderStart(initial?: Parameters<typeof createWorkspaceStore>[0]) {
    const store = createWorkspaceStore(initial);
    render(<Workspace store={store} />);
    return store;
}

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
    localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
    initSentry.mockClear();
    stopSentry.mockClear();
});
afterEach(() => {
    forgetUsageAnswer();
    localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
    vi.unstubAllGlobals();
});

describe("the start screen", () => {
    it("offers the first visit's ways in and the sample library, the four samples first", async () => {
        renderStart();

        assert.isNotNull(screen.getByRole("img", { name: "graphty" }));
        assert.equal(
            screen.getByRole("heading", { level: 1 }).textContent,
            "Analyze any network.Free and open source.",
        );
        assert.isNotNull(screen.getByRole("button", { name: /^Open a file/ }));
        assert.isNotNull(screen.getByRole("button", { name: "Open network data" }));
        assert.isNotNull(screen.getByRole("button", { name: "Samples" }));
        assert.isNotNull(screen.getByRole("button", { name: "New project" }));
        assert.isNotNull(screen.getByRole("link", { name: "MIT licensed on GitHub" }));
        assert.isNotNull(screen.getByRole("link", { name: "Put it on your own site" }));
        assert.isNotNull(screen.getByRole("toolbar", { name: "Analyze the graph" }));
        const samples = within(screen.getByRole("region", { name: "Sample library" })).getAllByRole("button", {
            name: /^Open the .+ sample$/,
        });
        const names = samples.map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names.slice(0, 4), [
            "Open the Les Miserables sample",
            "Open the Zachary's karate club sample",
            "Open the College football sample",
            "Open the Florentine families sample",
        ]);
        // Then the four timed samples, then graph-samples' other datasets, the large ones too, without a
        // second copy of the four, and without the three past graphty-element's ceilings (road-ny,
        // com-dblp, ogbn-arxiv).
        assert.deepEqual(names.slice(4, 8), [
            "Open the Campus contacts sample",
            "Open the Graph researchers sample",
            "Open the Marvel films sample",
            "Open the Paper citations sample",
        ]);
        assert.lengthOf(names, 24);
        assert.include(names, "Open the Venice public transport sample");
        assert.include(names, "Open the Doubtful Sound dolphins sample");
        assert.equal(new Set(names).size, names.length, "no sample twice");
        // Each shows the picture graph-samples publishes of its graph, the large ones and every
        // generator too, and the picture loads: no tile shows the plain stand-in.
        const pictures = samples.map((button) => button.querySelector<HTMLImageElement>("img.ws-land-sample-pic"));
        for (const [i, picture] of pictures.entries()) {
            assert.match(picture?.src ?? "", /\/(data\/graph-samples\/v1|samples)\/[a-z0-9-]+\.webp$/, names[i] ?? "");
        }
        const generators = within(screen.getByRole("region", { name: "Sample library" })).getAllByRole("button", {
            name: /^Generate a graph: /,
        });
        assert.isAbove(generators.length, 50);
        for (const button of generators) {
            const picture = button.querySelector<HTMLImageElement>("img.ws-land-sample-pic");
            assert.match(picture?.src ?? "", /\/data\/graph-samples\/v1\/generator-[a-z0-9-]+\.webp$/);
        }
        assert.isNull(document.querySelector(".ws-land-sample-none"), "no stand-in picture");
        // A small dataset's, a large dataset's and a generator's picture each load.
        const loaded = [
            pictures[0],
            pictures.at(-1),
            generators[0]?.querySelector<HTMLImageElement>("img.ws-land-sample-pic"),
        ];
        for (const picture of loaded) {
            assert.isNotNull(picture);
            assert.isDefined(picture);
            picture.loading = "eager";
            await picture.decode();
            assert.equal(picture.naturalWidth, 480, picture.src);
        }
    });

    it("narrows the sample library to what the search box names", async () => {
        renderStart();
        const library = screen.getByRole("region", { name: "Sample library" });

        await userEvent.type(within(library).getByRole("searchbox", { name: "Search samples" }), "dolphin");

        const names = within(library)
            .getAllByRole("button", { name: /^Open the .+ sample$/ })
            .map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names, ["Open the Doubtful Sound dolphins sample"]);
    });

    it("narrows the sample library to one field, and tags each tile with its field", async () => {
        renderStart();
        const library = screen.getByRole("region", { name: "Sample library" });

        await userEvent.click(within(library).getByRole("button", { name: "Sports" }));

        const tiles = within(library).getAllByRole("button", { name: /^Open the .+ sample$/ });
        assert.deepEqual(
            tiles.map((button) => button.getAttribute("aria-label")),
            ["Open the College football sample"],
        );
        assert.isNotNull(within(tiles[0]).getByText("Sports"));
        assert.isNotNull(within(tiles[0]).getByText("Conferences fall out of who played whom"));
        await userEvent.click(within(library).getByRole("button", { name: "Any" }));
        assert.lengthOf(within(library).getAllByRole("button", { name: /^Open the .+ sample$/ }), 24);
    });

    it("shows the usage data card in the owner's words, with What is collected behind a disclosure", async () => {
        renderStart();

        const card = screen.getByRole("complementary", { name: "Usage data" });
        assert.isNotNull(within(card).getByText("Your data is yours, but please help us."));
        assert.isNotNull(within(card).getByText(OWNER_WORDS));
        const collected = within(card).getByText("No file contents ever leave your computer.");
        assert.isFalse(collected.checkVisibility());
        await userEvent.click(within(card).getByText("What is collected"));
        assert.isTrue(collected.checkVisibility());
        assert.equal(initSentry.mock.calls.length, 0);
    });

    it("turns usage data on with Share usage data, and says so", async () => {
        renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Share usage data" }));

        assert.isNull(screen.queryByRole("complementary", { name: "Usage data" }));
        assert.isNotNull(
            screen.getByText(/Thank you\. Usage data is on, with content masked\./, { selector: ".ws-start-answer" }),
        );
        assert.equal(initSentry.mock.calls.length, 1);
    });

    it("keeps usage data off with No thanks, and the answer line opens Settings > Privacy", async () => {
        renderStart();

        await userEvent.click(screen.getByRole("button", { name: "No thanks" }));
        assert.isNotNull(screen.getByText(/Usage data stays off\./, { selector: ".ws-start-answer" }));
        assert.equal(initSentry.mock.calls.length, 0);

        await userEvent.click(screen.getByRole("button", { name: "Change this in Settings > Privacy" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        assert.isFalse(within(dialog).getByRole<HTMLInputElement>("switch", { name: "Share usage data" }).checked);
        assert.isNotNull(within(dialog).getByText("Usage data: off. Nothing is sent."));
    });

    it("does not show the card again once it was answered", async () => {
        const first = render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: "No thanks" }));
        first.unmount();

        renderStart();
        assert.isNull(screen.queryByRole("complementary", { name: "Usage data" }));
        assert.isNull(screen.queryByText(/Usage data stays off/));
    });

    it("opens a sample as a project named after it, before the card is answered", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));

        assert.equal(store.get().project?.name, "Florentine families");
        assert.equal(store.get().opening?.name, "Florentine families");
        assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine families" }));
        assert.isNotNull(screen.getByRole("button", { name: "Local only" }));
    });

    it("opens an empty project for New project", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "New project" }));

        assert.equal(store.get().project?.name, "Untitled");
        assert.equal(store.get().page, "panels");
    });

    it("scrolls to the samples for Samples", async () => {
        renderStart();
        const samples = screen.getByRole("region", { name: "Sample library" });
        let scrolled = false;
        samples.scrollIntoView = () => {
            scrolled = true;
        };

        await userEvent.click(screen.getByRole("button", { name: "Samples" }));

        assert.isTrue(scrolled);
    });

    it("lists the network sources, and opens a graph from a link", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Open network data" }));
        const dialog = await screen.findByRole("dialog", { name: "Open network data" });
        for (const source of ["NDEx", "Neo4j", "Web API"]) {
            assert.isNotNull(within(dialog).getByText(source));
        }
        // Memgraph cannot be reached from an https page without a server, so it is not offered.
        assert.isNull(within(dialog).queryByText("Memgraph"));
        const field = within(dialog).getByRole("textbox", { name: "Web address of a graph file" });
        // Enter on something that is not a web address opens nothing.
        await userEvent.type(field, "trade routes{Enter}");
        assert.isNull(store.get().project);

        await userEvent.clear(field);
        await userEvent.type(field, "https://example.com/data/trade%20routes.graphml{Enter}");

        assert.equal(store.get().project?.name, "trade routes");
        assert.equal(store.get().opening?.name, "trade routes");
    });

    it("opens a typed web address from the Open button beside the box", async () => {
        const store = renderStart();
        await userEvent.click(screen.getByRole("button", { name: "Open network data" }));
        const dialog = await screen.findByRole("dialog", { name: "Open network data" });
        const field = within(dialog).getByRole("textbox", { name: "Web address of a graph file" });
        await userEvent.type(field, "https://example.com/data/sites.csv");
        await userEvent.click(within(dialog).getByRole("button", { name: "Open" }));
        assert.equal(store.get().opening?.name, "sites");
    });

    it("leads a reader who came with a file on this computer to Open a file", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Open network data" }));
        const dialog = await screen.findByRole("dialog", { name: "Open network data" });
        // The browser's own file picker, as where a browser has no File System Access picker.
        vi.stubGlobal("showOpenFilePicker", undefined);
        await commands.chooseNextFile("my network.gml", "text/plain", "graph [ ]");
        const open = within(dialog).getByRole("button", { name: /^Open a file/ });
        // Its key is on the button, as every key is.
        assert.equal(open.getAttribute("aria-keyshortcuts"), ariaKey("Mod+O"));
        assert.include(open.textContent, formatKey("Mod+O"));
        await userEvent.click(open);

        await waitFor(() => {
            assert.equal(store.get().project?.name, "my network");
        });
        // The chooser lives in the workspace, so it stays mounted until its close transition ends.
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Open network data" }), "the chooser closed");
        });
    });

    it("opens the server form on the Data place for a network source", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Open network data" }));
        const dialog = await screen.findByRole("dialog", { name: "Open network data" });
        await userEvent.click(within(dialog).getByText("Neo4j"));

        const state = store.get();
        assert.equal(state.project?.name, "Untitled");
        assert.equal(state.place, "data");
        assert.equal(state.dialog, "server");
    });

    it("opens a dropped file as a project named after it", async () => {
        const store = renderStart();
        const transfer = new DataTransfer();
        transfer.items.add(new File(["graph [ ]"], "my network.gml"));

        const screenRoot = document.querySelector(".ws-land");
        assert.isNotNull(screenRoot);
        // A file dragged in from the desktop: userEvent drags only elements of the page, so the
        // browser's own drag events for an outside file are dispatched as the browser sends them
        screenRoot?.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: transfer }));
        screenRoot?.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: transfer }));
        assert.isNotNull(await screen.findByText("Drop to open"));
        screenRoot?.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));

        // graphty-element is asked first whether it is a model, which reads the file's first bytes.
        await waitFor(() => {
            assert.equal(store.get().project?.name, "my network");
        });
    });

    it("welcomes a returning reader with Resume and the next three recent projects", async () => {
        await rememberRecent({ id: "a", name: "Trade routes", nodes: 40, at: 1 });
        await rememberRecent({ id: "b", name: "Karate split", nodes: 34, at: 2 });
        await rememberRecent({ id: "c", name: "Florentine marriages", nodes: 15, at: 3 });
        await rememberRecent({ id: "d", name: "Key players", nodes: 77, at: 4 });
        await rememberRecent({ id: "e", name: "Oldest", nodes: 5, at: 0 });
        renderStart();

        assert.equal(screen.getByRole("heading", { level: 1 }).textContent, "Welcome back.");
        assert.isNotNull(screen.getByRole("button", { name: /^Resume Key players/ }));
        assert.deepEqual(
            ["Florentine marriages", "Karate split", "Trade routes", "Oldest"].map(
                (name) => screen.queryByRole("button", { name: `Open ${name}` }) !== null,
            ),
            [true, true, true, false],
        );
        assert.isNotNull(screen.getByRole("button", { name: /^Open a file/ }));
        assert.isNotNull(screen.getByRole("button", { name: "New project" }));
        assert.isNull(screen.queryByRole("button", { name: "Open network data" }));
    });
});

describe("Settings", () => {
    it("opens on General from the gear and from Mod+,", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Settings..." }));
        let dialog = await screen.findByRole("dialog", { name: "Settings" });
        assert.isNotNull(within(dialog).getByRole("radiogroup", { name: "Theme" }));
        assert.isNotNull(within(dialog).getByRole("radiogroup", { name: "Number format" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
        assert.isNull(store.get().dialog);

        await userEvent.keyboard("{Control>},{/Control}");
        dialog = await screen.findByRole("dialog", { name: "Settings" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "General" }));
    });

    it("turns usage data on and off from Privacy", async () => {
        renderStart({ dialog: "settings:privacy" });

        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        assert.isNotNull(within(dialog).getByText(new RegExp(OWNER_WORDS.slice(0, 40))));

        await userEvent.click(within(dialog).getByRole("switch", { name: "Share usage data" }));
        assert.equal(initSentry.mock.calls.length, 1);
        assert.isNotNull(
            within(dialog).getByText("Usage data: sent with content masked, only while Share usage data is on."),
        );

        await userEvent.click(within(dialog).getByRole("switch", { name: "Share usage data" }));
        assert.equal(stopSentry.mock.calls.length, 1);
    });

    it("switches single-key shortcuts off and keeps the choice for the next launch", async () => {
        const store = createWorkspaceStore({ dialog: "settings:accessibility" });
        const first = render(<Workspace store={store} />);
        const dialog = await screen.findByRole("dialog", { name: "Settings" });

        await userEvent.click(within(dialog).getByRole("switch", { name: /^Single-key shortcuts/ }));
        assert.isFalse(store.get().singleKeyShortcuts);
        first.unmount();

        const next = createWorkspaceStore();
        render(<Workspace store={next} />);
        assert.isFalse(next.get().singleKeyShortcuts);
    });

    it("moves between its sections from the section list", async () => {
        const store = createWorkspaceStore({ dialog: "settings" });
        render(<Workspace store={store} />);
        const dialog = await screen.findByRole("dialog", { name: "Settings" });

        await userEvent.click(within(dialog).getByText("Accessibility and input"));
        assert.equal(store.get().dialog, "settings:accessibility");
        assert.isNotNull(within(dialog).getByRole("switch", { name: /^Single-key shortcuts/ }));
    });
});
