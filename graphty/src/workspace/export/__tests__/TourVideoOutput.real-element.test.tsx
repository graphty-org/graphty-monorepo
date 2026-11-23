/**
 * The Video output of the Export dialog on the REAL graphty-element: choosing a tour, a still view
 * held for its seconds, the frame rate, a tour that can no longer be recorded, and the stop a
 * recording is on. Every file is caught where the page hands it to the browser.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** The files the page handed the browser, by name. */
interface Saved {
    readonly name: string;
    readonly blob: Blob;
}

/**
 * Catches every download: the blob behind each object URL, named by the anchor clicked with it.
 * @returns the files saved so far.
 */
function catchDownloads(): Saved[] {
    const saved: Saved[] = [];
    const blobs = new Map<string, Blob>();
    const create = URL.createObjectURL.bind(URL);
    vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
        const url = create(object);
        if (object instanceof Blob) {
            blobs.set(url, object);
        }
        return url;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        const blob = blobs.get(this.href);
        if (this.download !== "" && blob !== undefined) {
            saved.push({ name: this.download, blob });
        }
    });
    return saved;
}

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Mounts a new project with a small ring, a saved camera and the given tours.
 * @param tours - the tours to save, each a stop on the Overview camera held so long.
 * @returns the element's session.
 */
async function openWithTours(tours: readonly (readonly [string, number])[]): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const ids = ["a", "b", "c", "d"];
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 1) % ids.length] })));
    await session.views.save([{ name: "Overview" }]);
    await session.tours.save(tours.map(([name, hold]) => ({ name, tour: { stops: [{ view: "Overview", hold }] } })));
    return session;
}

/**
 * Opens a tour's Export video... from its row menu in the Views place.
 * @param name - the tour.
 * @returns the dialog.
 */
async function exportVideo(name: string): Promise<HTMLElement> {
    await userEvent.click(
        within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
    );
    const place = await screen.findByRole("region", { name: "Views place" });
    await userEvent.click(within(place).getByRole("button", { name: `More for ${name}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Export video/ }));
    return screen.findByRole("dialog", { name: "Export video" });
}

/**
 * The Record button.
 * @param dialog - the dialog.
 * @returns the button.
 */
function recordButton(dialog: HTMLElement): HTMLButtonElement {
    return within(dialog).getByRole<HTMLButtonElement>("button", { name: "Record" });
}

describe("Export video", () => {
    it("chooses another tour, and the frame count follows the frame rate", async () => {
        await openWithTours([
            ["First", 1000],
            ["Second", 2000],
        ]);
        const dialog = await exportVideo("Second");
        const frames = within(dialog).getByTestId("video-frames");
        await waitFor(() => {
            assert.match(frames.textContent ?? "", /^\d+ frames$/);
        });
        const at30 = Number.parseInt(frames.textContent ?? "", 10);

        await userEvent.click(within(dialog).getByRole("combobox", { name: "Tour" }));
        await userEvent.click(await screen.findByRole("option", { name: "First" }));
        await waitFor(() => {
            assert.equal(within(dialog).getByTestId("video-length").textContent, "0:01");
        });
        await waitFor(() => {
            assert.isBelow(Number.parseInt(frames.textContent ?? "", 10), at30, "a shorter tour has fewer frames");
        });
        const first30 = Number.parseInt(frames.textContent ?? "", 10);

        await userEvent.click(within(dialog).getByText("60 fps"));
        await waitFor(() => {
            assert.isAbove(Number.parseInt(frames.textContent ?? "", 10), first30, "twice the rate, more frames");
        });
    });

    it("records a still camera held for its seconds, named after the camera", async () => {
        const saved = catchDownloads();
        await openWithTours([["Walk", 1000]]);
        const dialog = await exportVideo("Walk");

        await userEvent.click(within(dialog).getByText("Still"));
        const camera = await within(dialog).findByRole<HTMLInputElement>("combobox", { name: "Camera" });
        assert.isNull(within(dialog).queryByRole("combobox", { name: "Tour" }), "a still has no tour");
        assert.isNull(within(dialog).queryByTestId("video-length"));
        const frames = within(dialog).getByTestId("video-frames");

        await userEvent.click(within(dialog).getByText("10 s"));
        await waitFor(() => {
            assert.equal(frames.textContent, "300 frames");
        });
        await userEvent.click(within(dialog).getByText("3 s"));
        await waitFor(() => {
            assert.equal(frames.textContent, "90 frames");
        });

        await userEvent.click(recordButton(dialog));
        await within(dialog).findByRole("progressbar", { name: "Recording" });
        // A still is on no tour's stop.
        assert.isNull(within(dialog).queryByText(/^Stop \d+ of \d+$/));
        const notice = await screen.findByText(/^Exported untitled_[\w-]+\.(webm|mp4)/, {});
        const video = saved.find(({ name }) => notice.textContent?.includes(name) ?? false);
        assert.isDefined(video, `the video of ${camera.value} was saved`);
        assert.match(video?.blob.type ?? "", /^video\//);
    });

    it("goes back from Still to the tour it was on", async () => {
        await openWithTours([["Walk", 2000]]);
        const dialog = await exportVideo("Walk");
        await userEvent.click(within(dialog).getByText("Still"));
        await within(dialog).findByRole("combobox", { name: "Camera" });

        await userEvent.click(within(dialog).getByText("Tour"));
        const tour = await within(dialog).findByRole<HTMLInputElement>("combobox", { name: "Tour" });
        assert.equal(tour.value, "Walk");
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:02");
    });

    it("refuses to record a tour whose camera is gone, and says which stop", async () => {
        const session = await openWithTours([["Walk", 1000]]);
        const dialog = await exportVideo("Walk");
        await waitFor(() => {
            assert.isFalse(recordButton(dialog).disabled);
        });

        await session.views.remove(["Overview"]);
        await waitFor(() => {
            assert.isTrue(recordButton(dialog).disabled, "nothing to record");
        });
        await within(dialog).findByText(/^Stop 1: /);
    });

    it("keeps a removed tour chosen, in error, until another is picked", async () => {
        const session = await openWithTours([
            ["First", 1000],
            ["Second", 2000],
        ]);
        const dialog = await exportVideo("Second");
        await session.tours.remove(["Second"]);
        await waitFor(() => {
            assert.isTrue(recordButton(dialog).disabled);
        });
        const tour = within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" });
        assert.equal(tour.value, "Second");

        await userEvent.click(tour);
        await userEvent.click(await screen.findByRole("option", { name: "First" }));
        await waitFor(() => {
            assert.isFalse(recordButton(dialog).disabled);
        });
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:01");
    });

    it("says the stop a tour recording is on, and Stop ends it with nothing saved", async () => {
        const saved = catchDownloads();
        await openWithTours([["Long", 600_000]]);
        const dialog = await exportVideo("Long");
        await userEvent.click(recordButton(dialog));
        await within(dialog).findByText("Stop 1 of 1");
        assert.isTrue(
            within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).disabled,
            "the fields wait while it records",
        );

        await userEvent.click(within(dialog).getByRole("button", { name: "Stop" }));
        await waitFor(() => {
            assert.isNull(within(dialog).queryByRole("progressbar", { name: "Recording" }));
        });
        assert.isNull(within(dialog).queryByRole("alert"), "a stop is not a failure");
        assert.lengthOf(saved, 0);
    });
});
