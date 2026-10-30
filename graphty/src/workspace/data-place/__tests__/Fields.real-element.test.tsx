/**
 * Data > Fields as a "+" list on the REAL graphty-element: what the element detects is listed with
 * no action from the reader, nothing detected leaves the list empty, "+" adds a field and the
 * minus takes it away through the element (and it stays away after a reload), and each kind of
 * location -- Latitude, Longitude, Coordinates, Country, Region, City -- is an entry of its own. Every change is made by real input; every assertion reads the element or
 * what is drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { HeroTurns } from "../../start/heroTurns";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

type ElementUnderTest = HTMLElementTagNameMap["graphty-element"];

/**
 * Deletes autosave's database and this tab's own-entry record, so each test starts with nothing kept.
 * @returns settles once the database is gone.
 */
function forgetAutosave(): Promise<void> {
    sessionStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("graphty-autosave");
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database was not deleted"));
        };
    });
}

/**
 * Mounts the workspace on its start screen with autosave on, as the application does, with the
 * start screen's graph holding still as in Storybook: turning, it draws a frame forever, and every
 * real click on the page waits behind each frame (issue #4139).
 * @returns the render result.
 */
function mountWorkspace(store: WorkspaceStore): ReturnType<typeof render> {
    return render(
        <HeroTurns.Provider value={false}>
            <Workspace store={store} />
        </HeroTurns.Provider>,
    );
}

/**
 * Waits for the open project's element.
 * @returns the element.
 */
async function openElement(): Promise<ElementUnderTest> {
    let found: ElementUnderTest | null = null;
    await waitFor(
        () => {
            found = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
            assert.isDefined(found?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === null) {
        throw new Error("the element never came up");
    }
    return found;
}

/**
 * Brings a sample into the open project through the Data place's own door, Sources "+" >
 * Samples..., and waits for it to open.
 * @param store - the workspace store.
 * @param name - the sample's name.
 * @returns the element.
 */
async function loadSample(store: WorkspaceStore, name: string): Promise<ElementUnderTest> {
    const element = await openElement();
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Samples..." }));
    const samples = await screen.findByRole("dialog", { name: "Samples" }, { timeout: TIMEOUT_MS });
    await openBy(store, () => userEvent.click(within(samples).getByRole("button", { name: new RegExp(`^${name}`) })));
    // A real click waits behind every frame drawn while the layout moves: start clicking once the
    // picture is at rest, as a reader would.
    await element.waitForStableFrame();
    return element;
}

/**
 * The Data place's Fields section, opened from the rail. The rail's Data button only selects the
 * Data place, so it is clicked whether or not the place is already open: a reloaded workspace can
 * reopen the place on its own between a check and a click.
 * @returns queries inside it.
 */
async function fields(): Promise<ReturnType<typeof within>> {
    // Exact, so "Data place" (the region) does not also match.
    await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
    const place = await screen.findByRole("region", { name: "Data place" }, { timeout: TIMEOUT_MS });
    return within(within(place).getByRole("group", { name: "Fields" }));
}

/**
 * The kinds the Fields list holds, in order.
 * @param section - the Fields section.
 * @param side - nodes or edges.
 * @returns the entries' kinds.
 */
function entries(section: ReturnType<typeof within>, side: "nodes" | "edges"): string[] {
    const plus: HTMLElement = section.getByRole("button", {
        name: `Add to ${side === "nodes" ? "node" : "edge"} fields`,
    });
    const list = plus.closest("[data-fields-side]");
    return [...(list?.querySelectorAll<HTMLElement>("[data-entry]") ?? [])].map((each) => each.dataset.entry ?? "");
}

/**
 * The value a Fields dropdown shows.
 * @param section - the Fields section.
 * @param name - the dropdown's name.
 * @returns its text.
 */
const shown = (section: ReturnType<typeof within>, name: string): string =>
    (section.getByRole("combobox", { name }) as HTMLInputElement).value;

/**
 * Drops files as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Opens a project on the Data place and drops a CSV onto it.
 * @param csv - the file's text.
 * @returns the session.
 */
async function dropCsv(csv: string): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Fields", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    await openElement();
    const session = await openBy(store, async () => {
        drop(new File([csv], "places.csv"));
        await Promise.resolve();
    });
    assert.isAbove(session.data.statistics().nodeCount, 0);
    return session;
}

describe("Data > Fields as a + list on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });
    beforeEach(forgetAutosave);
    afterEach(forgetAutosave);

    it("lists the airline sample's label, location and weight with no action from the reader", async () => {
        // The sample comes in through the Data place's own door, Sources "+" > Samples..., in an
        // empty project, and the list is read as the load lands. Every click here is made while
        // the element draws nothing: a real click is several round trips to the page, and each
        // waits behind the frame being drawn. Through the start screen, one click waited on the
        // turning start-page graph and one on the airline's 36,906 edges laying out; on a
        // software GPU each frame held the page for 100 to 600 ms, so on a loaded runner each
        // click took 3 to 6 s and the test passed its 15 s limit (issue #3981).
        const store = createWorkspaceStore({ project: { name: "Fields", id: 1 }, place: "data" });
        render(<Workspace store={store} />);
        const element = await openElement();
        const section = await fields();
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Samples..." }));
        const samples = await screen.findByRole("dialog", { name: "Samples" }, { timeout: TIMEOUT_MS });
        await openBy(store, () =>
            userEvent.click(within(samples).getByRole("button", { name: /^OpenFlights airline routes/ })),
        );
        assert.equal(element.session.data.statistics().nodeCount, 3214);
        await waitFor(
            () => {
                assert.includeMembers(entries(section, "nodes"), ["label", "latitude", "longitude"]);
                assert.include(entries(section, "edges"), "weight");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(shown(section, "Node label"), "label");
        assert.equal(shown(section, "Node latitude column"), "latitude");
        assert.equal(shown(section, "Node longitude column"), "longitude");
    });

    it("shows an empty list for a CSV with nothing to detect", async () => {
        await dropCsv("code,colour\nA,red\nB,blue\nC,green\n");
        const section = await fields();
        await waitFor(() => {
            section.getByRole("button", { name: "Add to node fields" });
            assert.deepEqual(entries(section, "nodes"), []);
        });
        assert.isNull(section.queryByRole("option", { name: "none" }));
    });

    it("lists the columns that fit a field first, each with its kind's glyph, and says how many of the rest will not convert", async () => {
        await dropCsv("code,count,size\nA,1,10\nB,2,x\nC,3,30\n");
        const section = await fields();
        await userEvent.click(await section.findByRole("button", { name: "Add to node fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Weight" }));
        await screen.findByRole("option", { name: /^count/ });
        const options = screen.getAllByRole("option");
        assert.deepEqual(
            options.map((each) => each.textContent),
            ["count", "size1 will not convert", "code3 will not convert"],
        );
        for (const each of options) {
            // The list's check, then the column's type glyph.
            assert.lengthOf(each.querySelectorAll("svg"), 2, `${each.textContent ?? ""} has a glyph`);
        }
        await userEvent.keyboard("{Escape}");
    });

    it("checks a found location as the column's role in its header's Role menu, as Fields lists it", async () => {
        await dropCsv("name,lat,lon\nA,42.1,-71.1\nB,42.2,-71.2\nC,42.3,-71.3\n");
        const section = await fields();
        await waitFor(() => {
            assert.equal(shown(section, "Node latitude column"), "lat");
        });
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await userEvent.click(await screen.findByRole("button", { name: "Options for lat" }, { timeout: TIMEOUT_MS }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Role" }));
        const latitude = await screen.findByRole("menuitemradio", { name: "Latitude" });
        assert.equal(latitude.getAttribute("aria-checked"), "true");
        assert.equal(screen.getByRole("menuitemradio", { name: "None" }).getAttribute("aria-checked"), "false");
        await userEvent.keyboard("{Escape}");
    });

    it("adds Time from +, removes it with the minus, and it stays gone after a reload", async () => {
        // The sample comes in through the Data place's own door, as in the airline test above, so
        // no click waits behind the start screen's turning graph or the sample's layout.
        const store = createWorkspaceStore({ autosave: true, project: { name: "Fields", id: 1 }, place: "data" });
        const first = render(<Workspace store={store} />);
        const element = await loadSample(store, "Paper citations");
        assert.equal(element.session.data.statistics().nodeCount, 159);
        let section = await fields();
        await waitFor(() => {
            section.getByRole("button", { name: "Add to node fields" });
        });
        assert.notInclude(entries(section, "nodes"), "time");

        await userEvent.click(section.getByRole("button", { name: "Add to node fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
        // Picking the kind opens its column list.
        await userEvent.click(await screen.findByRole("option", { name: "year" }));
        await waitFor(() => {
            assert.equal(element.session.time.field?.nodes?.start, "year");
            assert.equal(shown(section, "Node time"), "year");
        });

        await userEvent.click(section.getByRole("button", { name: "Remove node time" }));
        await waitFor(() => {
            assert.isNull(element.session.time.field);
            assert.notInclude(entries(section, "nodes"), "time");
            // Focus goes to "+".
            assert.strictEqual(document.activeElement, section.getByRole("button", { name: "Add to node fields" }));
        });

        // The work is saved, then the page goes away and comes back: a reload.
        await waitFor(
            () => {
                assert.strictEqual(element.autosaver.status.state, "saved");
            },
            { timeout: TIMEOUT_MS },
        );
        first.unmount();
        // This tab's own work reopens straight into the workspace, with no offer to answer.
        const kept = createWorkspaceStore({ autosave: true });
        const second = mountWorkspace(kept);
        await openBy(kept, () => Promise.resolve());
        const restored = await openElement();
        assert.equal(restored.session.data.statistics().nodeCount, 159);
        await restored.waitForStableFrame();
        section = await fields();
        await waitFor(() => {
            section.getByRole("button", { name: "Add to node fields" });
        });
        assert.notInclude(entries(section, "nodes"), "time");
        assert.isNull(restored.session.time.field);
        second.unmount();
    });

    it("makes a text column of dates a date column when it is set as the time", async () => {
        const session = await dropCsv("id,opened\nA,2015-03-02\nB,2017-06-14\nC,2016-09-01\n");
        const typeOf = (): string | undefined =>
            session.data.attributes().find((each) => each.kind === "node" && each.name === "opened")?.type;
        assert.equal(typeOf(), "string", "the days load as text");
        const section = await fields();
        await userEvent.click(section.getByRole("button", { name: "Add to node fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("option", { name: /^opened/ }));
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.start, "opened");
            // The column's kind and the timeline say the same thing: dates.
            assert.equal(typeOf(), "time");
        });
    });

    it("lists a detected city and the country narrowing it as two entries, and their minuses stop the search", async () => {
        const session = await dropCsv("id,city,country\na,Paris,France\nb,Lyon,France\nc,Berlin,Germany\n");
        const section = await fields();
        await waitFor(
            () => {
                assert.includeMembers(entries(section, "nodes"), ["country", "city"]);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(shown(section, "Node city column"), "city");
        assert.equal(shown(section, "Node country column"), "country");

        // The minus on the city leaves the country listed, read on its own.
        await userEvent.click(section.getByRole("button", { name: "Remove node city" }));
        await waitFor(() => {
            assert.deepInclude(session.layout.locationColumns(), { kinds: { country: "country" }, using: "country" });
            assert.deepEqual(entries(section, "nodes"), ["country"]);
        });
        // The last minus tells the element no location, so it stops finding one.
        await userEvent.click(section.getByRole("button", { name: "Remove node country" }));
        await waitFor(() => {
            assert.equal(session.config.data.knownFields.nodeLocationRole, "none");
            assert.equal(session.layout.locationColumns().from, "none");
            assert.deepEqual(entries(section, "nodes"), []);
        });
    });

    it("adds a location one kind at a time from +, and dims a kind the element does not read", async () => {
        // Column names the element does not find a location by, so the list starts empty.
        const session = await dropCsv("id,place,land,north\na,Paris,France,48.85\nb,Lyon,France,45.76\n");
        const section = await fields();
        const plus = await section.findByRole("button", { name: "Add to node fields" });
        await waitFor(() => {
            assert.deepEqual(entries(section, "nodes"), []);
        });

        // "+" is one flat list: every kind of location is an item of its own, in this order.
        await userEvent.click(plus);
        const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        assert.deepEqual(
            items.filter((label) =>
                ["Latitude", "Longitude", "Coordinates", "Country", "Region", "City"].includes(label ?? ""),
            ),
            ["Latitude", "Longitude", "Coordinates", "Country", "Region", "City"],
        );
        assert.notInclude(items, "Location");

        // Picking City opens its column list with focus in it; picking the column designates it.
        await userEvent.click(screen.getByRole("menuitem", { name: "City" }));
        await userEvent.click(await screen.findByRole("option", { name: "place" }));
        await waitFor(() => {
            assert.equal(session.config.data.knownFields.nodeCityPath, "place");
            assert.deepInclude(session.layout.locationColumns(), { from: "designated", using: "city", role: "city" });
            assert.equal(shown(section, "Node city column"), "place");
        });

        // A Country listed beside it narrows the city: no "Within" control.
        await userEvent.click(plus);
        assert.isNull(screen.queryByRole("menuitem", { name: "City" }), "a kind listed is not offered again");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Country" }));
        await userEvent.click(await screen.findByRole("option", { name: "land" }));
        await waitFor(() => {
            assert.deepInclude(session.layout.locationColumns(), {
                kinds: { city: "place", country: "land" },
                within: "land",
                unused: [],
            });
            assert.deepEqual(entries(section, "nodes"), ["country", "city"]);
        });
        assert.isNull(section.queryByRole("combobox", { name: /read as|place type|within/i }));

        // Closing a new entry's list with no pick drops it and puts focus back on "+".
        await userEvent.click(plus);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Region" }));
        await screen.findByRole("option", { name: "north" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.notInclude(entries(section, "nodes"), "region");
            assert.strictEqual(document.activeElement, plus);
        });

        // Half a pair is listed, but the city is what is read: the latitude says so, not only by dimming.
        await userEvent.click(plus);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Latitude" }));
        await userEvent.click(await screen.findByRole("option", { name: "north" }));
        await waitFor(() => {
            const latitude = section.getByRole("combobox", { name: "Node latitude column" });
            assert.equal((latitude as HTMLInputElement).value, "north");
            assert.equal(latitude.getAttribute("aria-description"), "Not used: the location comes from City");
            assert.isNotNull(latitude.closest("[data-unused]"));
        });
        assert.isNull(section.getByRole("combobox", { name: "Node city column" }).closest("[data-unused]"));
    });
});
