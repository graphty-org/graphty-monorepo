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
    await waitFor(() => {
        found = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
        assert.isDefined(found?.session);
    });
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
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Samples..." }));
    const samples = await screen.findByRole("dialog", { name: "Samples" });
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
    const place = await screen.findByRole("region", { name: "Data place" });
    return within(within(place).getByRole("group", { name: "Attributes" }));
}

/**
 * The kinds the Fields list holds, in order.
 * @param section - the Fields section.
 * @param side - nodes or edges.
 * @returns the entries' kinds.
 */
function entries(section: ReturnType<typeof within>, side: "nodes" | "edges"): string[] {
    const plus: HTMLElement = section.getByRole("button", {
        name: `Add to ${side === "nodes" ? "node" : "edge"} attributes`,
    });
    const list = plus.closest("[data-fields-side]");
    return [...(list?.querySelectorAll<HTMLElement>("[data-entry]") ?? [])].map((each) => each.dataset.entry ?? "");
}

/**
 * Opens "+"'s item for a kind of entry and picks a column from its submenu, as a reader does: the
 * pointer rests on the item, which opens the submenu, then clicks the column.
 * @param kind - the "+" menu's item.
 * @param column - the column, a menu item of the submenu.
 */
async function pickFromSubmenu(kind: string, column: string | RegExp): Promise<void> {
    await userEvent.hover(await screen.findByRole("menuitem", { name: kind }));
    await userEvent.click(await screen.findByRole("menuitem", { name: column }));
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
 * @param store - the chrome store, when the test reads it.
 * @returns the session.
 */
async function dropCsv(
    csv: string,
    store = createWorkspaceStore({ project: { name: "Fields", id: 1 }, place: "data" }),
): Promise<GraphSession> {
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
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Samples..." }));
        const samples = await screen.findByRole("dialog", { name: "Samples" });
        await openBy(store, () =>
            userEvent.click(within(samples).getByRole("button", { name: /^OpenFlights airline routes/ })),
        );
        assert.equal(element.session.data.statistics().nodeCount, 3214);
        await waitFor(() => {
            assert.includeMembers(entries(section, "nodes"), ["label", "latitude", "longitude"]);
            assert.include(entries(section, "edges"), "weight");
        });
        assert.equal(shown(section, "Node label"), "label");
        assert.equal(shown(section, "Node latitude column"), "latitude");
        assert.equal(shown(section, "Node longitude column"), "longitude");
    });

    it("shows an empty list for a CSV with nothing to detect", async () => {
        await dropCsv("code,colour\nA,red\nB,blue\nC,green\n");
        const section = await fields();
        await waitFor(() => {
            section.getByRole("button", { name: "Add to node attributes" });
            assert.deepEqual(entries(section, "nodes"), []);
        });
        assert.isNull(section.queryByRole("option", { name: "none" }));
    });

    it("lists the columns that fit a field first, each with its kind's glyph, and says how many of the rest will not convert", async () => {
        await dropCsv("code,count,size\nA,1,10\nB,2,x\nC,3,30\n");
        const section = await fields();
        await userEvent.click(await section.findByRole("button", { name: "Add to node attributes" }));
        // A load reads no node weight, so none is obvious: Weight asks for its column.
        await pickFromSubmenu("Weight", /^count/);
        await waitFor(() => {
            assert.equal(shown(section, "Node weight"), "count");
        });
        await userEvent.click(section.getByRole("combobox", { name: "Node weight" }));
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

    it("adds Time on edges from a submenu led by the column read as time, one undo step, and undo takes it away", async () => {
        const store = createWorkspaceStore({ project: { name: "Fields", id: 1 }, place: "data" });
        render(<Workspace store={store} />);
        const element = await loadSample(store, "Marvel films");
        const { session } = element;
        const section = await fields();
        await waitFor(() => {
            section.getByRole("button", { name: "Add to edge attributes" });
        });
        assert.notInclude(entries(section, "edges"), "time");
        assert.isNull(session.time.field);
        const steps = session.history.steps.length;

        const plus = section.getByRole("button", { name: "Add to edge attributes" });
        await userEvent.click(plus);
        // Time asks for its column, as Weight does, the one the element reads as time first.
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Time" }));
        const released = await screen.findByRole("menuitem", { name: /^released/ });
        const submenu = released.closest<HTMLElement>('[role="menu"]');
        assert.isNotNull(submenu);
        assert.strictEqual(within(submenu).getAllByRole("menuitem")[0], released, "best column first");
        assert.isNull(session.time.field, "nothing while the submenu is open");
        // Leaving the menu adds nothing.
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
        assert.isNull(session.time.field, "nothing left behind");
        assert.equal(session.history.steps.length, steps, "no undo step");

        await userEvent.click(plus);
        await pickFromSubmenu("Time", /^released/);
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "released" } });
            assert.equal(shown(section, "Edge time"), "released");
            // Focus is in the new entry's column, its list closed.
            assert.strictEqual(document.activeElement, section.getByRole("combobox", { name: "Edge time" }));
        });
        assert.isNull(screen.queryByRole("listbox"), "no list left open");
        assert.equal(session.history.steps.length, steps + 1, "one undo step");

        // Undo, from the keyboard in the new entry's column, takes the entry away again.
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isNull(session.time.field);
            assert.notInclude(entries(section, "edges"), "time");
        });
    });

    it("offers a submenu for a kind with no obvious column: leaving it adds nothing, a pick adds the entry", async () => {
        const session = await dropCsv("code,colour\nA,red\nB,blue\nC,green\n");
        const section = await fields();
        const plus = await section.findByRole("button", { name: "Add to node attributes" });
        await waitFor(() => {
            assert.deepEqual(entries(section, "nodes"), []);
        });

        await userEvent.click(plus);
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Label" }));
        await screen.findByRole("menuitem", { name: "colour" });
        assert.deepEqual(entries(section, "nodes"), [], "no entry while the submenu is open");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
            assert.strictEqual(document.activeElement, plus);
        });
        assert.deepEqual(entries(section, "nodes"), [], "nothing left behind");

        await userEvent.click(plus);
        await pickFromSubmenu("Label", "colour");
        await waitFor(() => {
            assert.deepEqual(entries(section, "nodes"), ["label"]);
            assert.equal(shown(section, "Node label"), "colour");
            assert.strictEqual(document.activeElement, section.getByRole("combobox", { name: "Node label" }));
        });
        assert.include(
            session.data.attributes().find((a) => a.kind === "node" && a.name === "colour")?.roles ?? [],
            "label",
        );
    });

    it("checks a found location as the column's role in its header's Role menu, as Fields lists it", async () => {
        await dropCsv("name,lat,lon\nA,42.1,-71.1\nB,42.2,-71.2\nC,42.3,-71.3\n");
        const section = await fields();
        await waitFor(() => {
            assert.equal(shown(section, "Node latitude column"), "lat");
        });
        await userEvent.keyboard("{Shift>}T{/Shift}");
        // The header marks the role too, as it marks a designated one.
        const grid = await screen.findByRole("grid", { name: "Nodes" });
        await waitFor(() => {
            const pills = [...grid.querySelectorAll<HTMLElement>(".ws-th-role")].map((each) => each.textContent);
            assert.includeMembers(pills, ["Latitude", "Longitude"]);
        });
        await userEvent.click(await screen.findByRole("button", { name: "Options for lat" }));
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
            section.getByRole("button", { name: "Add to node attributes" });
        });
        assert.notInclude(entries(section, "nodes"), "time");

        await userEvent.click(section.getByRole("button", { name: "Add to node attributes" }));
        await pickFromSubmenu("Time", /^year/);
        await waitFor(() => {
            assert.equal(element.session.time.field?.nodes?.start, "year");
            assert.equal(shown(section, "Node time"), "year");
        });
        assert.isNull(screen.queryByRole("listbox"), "no list left open");

        await userEvent.click(section.getByRole("button", { name: "Remove node time" }));
        await waitFor(() => {
            assert.isNull(element.session.time.field);
            assert.notInclude(entries(section, "nodes"), "time");
            // Focus goes to "+".
            assert.strictEqual(document.activeElement, section.getByRole("button", { name: "Add to node attributes" }));
        });

        // The work is saved, then the page goes away and comes back: a reload.
        await waitFor(() => {
            assert.strictEqual(element.autosaver.status.state, "saved");
        });
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
            section.getByRole("button", { name: "Add to node attributes" });
        });
        assert.notInclude(entries(section, "nodes"), "time");
        assert.isNull(restored.session.time.field);
        second.unmount();
    });

    it("drops the wait to focus an entry the element refuses, so the row never grabs focus later", async () => {
        const store = createWorkspaceStore({ project: { name: "Fields", id: 1 }, place: "data" });
        await dropCsv("code,colour\nA,red\nB,blue\nC,green\n", store);
        const section = await fields();
        await userEvent.click(section.getByRole("button", { name: "Add to node attributes" }));
        await pickFromSubmenu("Time", /^colour/);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "colour has no times");
        });
        assert.isNull(store.get().fieldsEntry);
        assert.notInclude(entries(section, "nodes"), "time");
    });

    it("makes a text column of dates a date column when it is set as the time", async () => {
        const session = await dropCsv("id,opened\nA,2015-03-02\nB,2017-06-14\nC,2016-09-01\n");
        const typeOf = (): string | undefined =>
            session.data.attributes().find((each) => each.kind === "node" && each.name === "opened")?.type;
        assert.equal(typeOf(), "string", "the days load as text");
        const section = await fields();
        await userEvent.click(section.getByRole("button", { name: "Add to node attributes" }));
        await pickFromSubmenu("Time", /^opened/);
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.start, "opened");
            // The column's kind and the timeline say the same thing: dates.
            assert.equal(typeOf(), "time");
        });
    });

    it("lists a detected city and the country narrowing it as two entries, and their minuses stop the search", async () => {
        const session = await dropCsv("id,city,country\na,Paris,France\nb,Lyon,France\nc,Berlin,Germany\n");
        const section = await fields();
        await waitFor(() => {
            assert.includeMembers(entries(section, "nodes"), ["country", "city"]);
        });
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
        const plus = await section.findByRole("button", { name: "Add to node attributes" });
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

        // No column is an obvious city: City opens a submenu of the columns, and picking one adds
        // the entry with it, focus in its column.
        await pickFromSubmenu("City", "place");
        await waitFor(() => {
            assert.equal(session.config.data.knownFields.nodeCityPath, "place");
            assert.deepInclude(session.layout.locationColumns(), { from: "designated", using: "city", role: "city" });
            assert.equal(shown(section, "Node city column"), "place");
            assert.strictEqual(document.activeElement, section.getByRole("combobox", { name: "Node city column" }));
        });

        // A Country listed beside it narrows the city: no "Within" control.
        await userEvent.click(plus);
        assert.isNull(screen.queryByRole("menuitem", { name: "City" }), "a kind listed is not offered again");
        await pickFromSubmenu("Country", "land");
        await waitFor(() => {
            assert.deepInclude(session.layout.locationColumns(), {
                kinds: { city: "place", country: "land" },
                within: "land",
                unused: [],
            });
            assert.deepEqual(entries(section, "nodes"), ["country", "city"]);
        });
        assert.isNull(section.queryByRole("combobox", { name: /read as|place type|within/i }));

        // Leaving a submenu with no pick adds nothing, and focus goes back to "+".
        await userEvent.click(plus);
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Region" }));
        await screen.findByRole("menuitem", { name: "north" });
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
            assert.deepEqual(entries(section, "nodes"), ["country", "city"]);
            assert.strictEqual(document.activeElement, plus);
        });

        // Half a pair is listed, but the city is what is read: the latitude says so, not only by dimming.
        await userEvent.click(plus);
        await pickFromSubmenu("Latitude", "north");
        await waitFor(() => {
            const latitude = section.getByRole("combobox", { name: "Node latitude column" });
            assert.equal((latitude as HTMLInputElement).value, "north");
            assert.equal(latitude.getAttribute("aria-description"), "Not used: the location comes from City");
            assert.isNotNull(latitude.closest("[data-unused]"));
        });
        assert.isNull(section.getByRole("combobox", { name: "Node city column" }).closest("[data-unused]"));
    });
});
