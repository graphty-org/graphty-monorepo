/**
 * The start screen, Settings and the usage data card, without the element (its tag stays an
 * empty box): what the screen says, the card's answers and the chip that follows them, Settings
 * and its sections, and the ways in. `StartScreen.real-element.test.tsx` opens the samples.
 */
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

const { initSentry, stopSentry } = vi.hoisted(() => ({ initSentry: vi.fn(), stopSentry: vi.fn() }));
vi.mock("../../../lib/sentry", () => ({ initSentry, stopSentry, captureUserFeedback: vi.fn() }));

import { render, screen, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { SINGLE_KEY_SHORTCUTS } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const OWNER_WORDS =
    "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions.";

/**
 * Renders the workspace with no project open.
 * @returns the store.
 */
function renderStart() {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    return store;
}

beforeEach(() => {
    forgetUsageAnswer();
    localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
    initSentry.mockClear();
    stopSentry.mockClear();
});
afterEach(() => {
    forgetUsageAnswer();
    localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
});

describe("the start screen", () => {
    it("offers the two ways in, Recent projects and the four samples, Les Miserables first", () => {
        renderStart();

        assert.isNotNull(screen.getByRole("button", { name: /Open project or file\.\.\./ }));
        assert.isNotNull(screen.getByRole("button", { name: /New from data\.\.\./ }));
        assert.isNotNull(screen.getByText("Projects you open or create appear here. They are kept in this browser."));
        const samples = within(screen.getByRole("region", { name: "Samples" })).getAllByRole("button");
        assert.deepEqual(
            samples.map((button) => button.getAttribute("aria-label")),
            [
                "Open the Les Miserables sample",
                "Open the Zachary's karate club sample",
                "Open the College football sample",
                "Open the Florentine families sample",
            ],
        );
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
        assert.equal(screen.getByRole("button", { name: "Local only" }).textContent, "Local only");
        assert.equal(initSentry.mock.calls.length, 0);
    });

    it("turns usage data on with Share usage data, and the chip says so", async () => {
        renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Share usage data" }));

        assert.isNull(screen.queryByRole("complementary", { name: "Usage data" }));
        assert.isNotNull(screen.getByText(/Thank you\. Usage data is on, with content masked\./));
        assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));
        assert.equal(initSentry.mock.calls.length, 1);
    });

    it("keeps usage data off with No thanks, and the answer line opens Settings > Privacy", async () => {
        renderStart();

        await userEvent.click(screen.getByRole("button", { name: "No thanks" }));
        assert.isNotNull(screen.getByText(/Usage data stays off\./));
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

    it("opens the Data page for New from data...", async () => {
        const store = renderStart();

        await userEvent.click(screen.getByRole("button", { name: /New from data\.\.\./ }));

        assert.equal(store.get().page, "data-page");
        assert.isNotNull(store.get().project);
    });

    it("opens a dropped file as a project named after it", async () => {
        const store = renderStart();
        const transfer = new DataTransfer();
        transfer.items.add(new File(["graph [ ]"], "my network.gml"));

        const screenRoot = screen.getByRole("region", { name: "Start" }).closest(".ws-start");
        assert.isNotNull(screenRoot);
        screenRoot?.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: transfer }));
        assert.isNotNull(await screen.findByText("Drop to open"));
        screenRoot?.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));

        assert.equal(store.get().project?.name, "my network");
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

    it("turns usage data on and off from Privacy, and the chip follows", async () => {
        renderStart();

        await userEvent.click(screen.getByRole("button", { name: "Local only" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        assert.isNotNull(within(dialog).getByText(new RegExp(OWNER_WORDS.slice(0, 40))));

        await userEvent.click(within(dialog).getByRole("switch", { name: "Share usage data" }));
        assert.equal(initSentry.mock.calls.length, 1);
        assert.isNotNull(
            within(dialog).getByText("Usage data: sent with content masked, only while Share usage data is on."),
        );
        assert.isNotNull(screen.getByRole("button", { name: "Usage data on, content masked" }));

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
