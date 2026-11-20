/**
 * Nothing the owner ordered out of the Style panel comes back (owner-forbidden.ts), on the REAL
 * graphty-element and real input: the v2 Node and Edge Style tabs, in 2D and in 3D, with every "+" menu
 * opened, every thing it offers added, and every row's pop-over opened, show none of the forbidden words,
 * lines or icons; Settings shows none of the forbidden switches; and no source file under
 * graphty/src/workspace/style/ brings one back. Pointing at every row, a shader row included, changes
 * nothing on the graph (E181).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { OWNER_FORBIDDEN } from "./owner-forbidden";
import { openGraph, openStyle, picture, pixelsApart } from "./v2Harness";

/** What a walk saw. */
interface Seen {
    /** Every line of visible words: section titles, menu items, row names, pop-over lines, gallery tiles. */
    readonly words: Set<string>;
    /** Every line's channel (data-line) in the panel and its pop-overs. */
    readonly lines: Set<string>;
    /** Every forbidden selector found, with where. */
    readonly selectors: Set<string>;
    /** Every number field with no scrub slot, by its line (E181, E330: a number is Figma's number input). */
    readonly unscrubbed?: Set<string>;
    /** How many number fields the walk saw. */
    numbers?: number;
}

/** The v2 panel shown now. */
function panel(): HTMLElement {
    const found = document.querySelector<HTMLElement>("[data-style-panel-v2]");
    if (found === null) {
        throw new Error("no v2 panel");
    }
    return found;
}

/**
 * Records what a part of the page shows.
 * @param seen - the record.
 * @param root - the part.
 */
function look(seen: Seen, root: HTMLElement): void {
    for (const line of root.innerText.split("\n")) {
        const word = line.trim();
        if (word !== "") {
            seen.words.add(word);
        }
    }
    for (const each of root.querySelectorAll("[data-line]")) {
        seen.lines.add(each.getAttribute("data-line") ?? "");
    }
    for (const forbidden of OWNER_FORBIDDEN) {
        if (forbidden.selector !== undefined && root.querySelector(forbidden.selector) !== null) {
            seen.selectors.add(forbidden.selector);
        }
    }
    for (const input of root.querySelectorAll('input[role="spinbutton"]')) {
        seen.numbers = (seen.numbers ?? 0) + 1;
        const line = input.closest(".ws-row, [data-line]") ?? input.parentElement;
        if (line?.querySelector("[data-scrub]") === null || line === null) {
            seen.unscrubbed?.add(line?.getAttribute("data-line") ?? input.getAttribute("aria-label") ?? "?");
        }
    }
}

/** Every open menu, pop-over and dialog. */
function floating(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[role="menu"], [role="dialog"], [role="listbox"]')];
}

/** Closes whatever is open with Escape, until nothing is. */
async function closeAll(): Promise<void> {
    for (let i = 0; i < 4 && floating().length > 0; i++) {
        await userEvent.keyboard("{Escape}");
    }
}

/**
 * Switches the view from the toolbar's Mode menu, as a reader does.
 * @param to - the view.
 */
async function switchView(to: "2D" | "3D"): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^Mode, / }));
    const menu = await screen.findByRole("menu", { name: /^Mode/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(`^${to}`) }));
    await waitFor(() => {
        assert.isNotNull(within(toolbar).queryByRole("button", { name: `Mode, ${to}` }));
    });
}

/** Every section "+" of the panel shown now. */
function pluses(): HTMLElement[] {
    return [...panel().querySelectorAll<HTMLElement>("[data-plus]")].filter(
        (each) => each.getAttribute("aria-disabled") !== "true",
    );
}

/**
 * Opens every "+" menu, records it, and (when adding) clicks each item it offers once, recording
 * whatever opens: a gallery, a list editor, the code dialog.
 * @param seen - the record.
 * @param adding - whether to add what the menus offer.
 */
async function walkMenus(seen: Seen, adding: boolean): Promise<void> {
    const count = pluses().length;
    for (let index = 0; index < count; index++) {
        const done = new Set<string>();
        for (let round = 0; round < 40; round++) {
            const plus = pluses()[index];
            if (plus === undefined) {
                break;
            }
            await userEvent.click(plus);
            const menu = document.querySelector<HTMLElement>('[role="menu"]');
            if (menu === null) {
                // A section of one thing adds it straight away.
                for (const each of floating()) {
                    look(seen, each);
                }
                await closeAll();
                break;
            }
            look(seen, menu);
            const next = within(menu)
                .queryAllByRole("menuitem")
                .find(
                    (item) =>
                        item.getAttribute("aria-disabled") !== "true" && !done.has(item.textContent?.trim() ?? ""),
                );
            if (!adding || next === undefined) {
                await closeAll();
                break;
            }
            done.add(next.textContent?.trim() ?? "");
            await userEvent.click(next);
            for (const each of floating()) {
                look(seen, each);
            }
            await closeAll();
        }
    }
}

/**
 * Opens every row's settings pop-over and records it.
 * @param seen - the record.
 */
async function walkPopovers(seen: Seen): Promise<void> {
    const names = [...panel().querySelectorAll<HTMLElement>("button[aria-label$=' settings']")].map(
        (each) => each.getAttribute("aria-label") ?? "",
    );
    for (const name of names) {
        const button = panel().querySelector<HTMLElement>(`button[aria-label="${CSS.escape(name)}"]`);
        if (button === null) {
            continue;
        }
        await userEvent.click(button);
        for (const each of floating()) {
            look(seen, each);
        }
        await closeAll();
    }
}

/**
 * Walks one kind's tab: menus, then (when adding) every item, then the rows and their pop-overs.
 * @param seen - the record.
 * @param kind - nodes or edges.
 * @param adding - whether to add what the menus offer.
 */
async function walkKind(seen: Seen, kind: "node" | "edge", adding: boolean): Promise<void> {
    await openStyle(kind === "node" ? "Key people" : "Links");
    await showKind(kind);
    await walkMenus(seen, adding);
    look(seen, panel());
    await walkPopovers(seen);
}

/**
 * What every layer of the session writes.
 * @param session - the session.
 * @returns the channels.
 */
function writtenChannels(session: GraphSession): string[] {
    return session.styles.list().flatMap((layer) => Object.keys(session.styles.get(layer.id)?.set ?? {}));
}

describe("nothing the owner ordered out of the Style panel comes back", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("no source file under style/ brings a removal back", () => {
        const files = import.meta.glob(["../**/*.ts", "../**/*.tsx", "!../**/__tests__/**"], {
            query: "?raw",
            import: "default",
            eager: true,
        });
        assert.isAbove(Object.keys(files).length, 20, "the scan reads the style sources");
        for (const forbidden of OWNER_FORBIDDEN) {
            if (forbidden.source === undefined) {
                continue;
            }
            const found = Object.entries(files).filter(([, text]) => forbidden.source?.test(text));
            assert.deepEqual(
                found.map(([path]) => path),
                [],
                `${forbidden.what} (${forbidden.ledger})`,
            );
        }
    });

    it("the Node and Edge tabs, every '+' menu, row and pop-over, in 2D and 3D, show none of them", async () => {
        const { session } = await openGraph();
        const seen: Seen = { words: new Set(), lines: new Set(), selectors: new Set(), unscrubbed: new Set() };
        await switchView("3D");
        await walkKind(seen, "node", true);
        await walkKind(seen, "edge", true);
        await switchView("2D");
        await walkKind(seen, "node", false);
        await walkKind(seen, "edge", false);
        assert.isAbove(seen.lines.size, 10, "the walk reached the rows' lines");
        assert.isAbove(seen.numbers ?? 0, 10, "the walk reached number fields");
        assert.deepEqual([...(seen.unscrubbed ?? [])], [], "every number field has a scrub slot (E181, E330)");
        const written = writtenChannels(session);
        for (const forbidden of OWNER_FORBIDDEN) {
            const why = `${forbidden.what} (${forbidden.ledger})`;
            if (forbidden.text !== undefined) {
                assert.deepEqual(
                    [...seen.words].filter((word) => forbidden.text?.test(word)),
                    [],
                    why,
                );
            }
            if (forbidden.channel !== undefined) {
                assert.deepEqual(
                    [...seen.lines, ...written].filter((channel) => forbidden.channel?.test(channel)),
                    [],
                    why,
                );
            }
            if (forbidden.selector !== undefined) {
                assert.isFalse(seen.selectors.has(forbidden.selector), why);
            }
        }
    });

    it("the code dialog's Place, where a shader is created, offers no group outline place (E420, E422)", async () => {
        await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        const shaders = tab.querySelector<HTMLElement>('[data-style-panel-v2] [data-section="node-shaders"]');
        assert.isNotNull(shaders);
        if (shaders === null) {
            return;
        }
        await userEvent.click(within(shaders).getByRole("button", { name: /^Add to node shaders/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^(Custom shader|New shader\.\.\.)$/ }));
        const dialog = await screen.findByRole("dialog", { name: /shader/i });
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Place/ }));
        const options = (await screen.findAllByRole("option")).map((option) => option.textContent.trim());
        assert.isNotEmpty(options);
        assert.deepEqual(
            options.filter((option) => /group/i.test(option)),
            [],
            "no place draws around a group",
        );
        await closeAll();
    });

    it("a file's group padding and draw order still draw, and no panel line shows them (E420, E422)", async () => {
        const { session } = await openGraph();
        await session.data.import(
            {
                type: "json",
                name: "compound.cyjs",
                config: {
                    data: JSON.stringify({
                        elements: {
                            nodes: [
                                { data: { id: "p" } },
                                { data: { id: "x", parent: "p" }, position: { x: 0, y: 0 } },
                                { data: { id: "y", parent: "p" }, position: { x: 60, y: 0 } },
                            ],
                            edges: [],
                        },
                        style: [
                            { selector: "node", style: { "z-index": 7 } },
                            { selector: ":parent", style: { padding: "30px" } },
                        ],
                    }),
                },
            },
            { styles: "file" },
        );
        await session.styles.settled();
        const drawn = (channel: string): number =>
            session.styles
                .drawnValues(channel as "node.groupPadding")
                .filter((each) => each.value !== undefined && each.value !== null)
                .reduce((sum, each) => sum + each.count, 0);
        assert.isAbove(drawn("node.groupPadding"), 0, "the parent's padding is drawn");
        assert.isAbove(drawn("node.drawOrder"), 0, "the draw order is drawn");
        const seen: Seen = { words: new Set(), lines: new Set(), selectors: new Set() };
        const writes = session.styles
            .list()
            .filter((layer) =>
                [
                    ...Object.keys(session.styles.get(layer.id)?.set ?? {}),
                    ...Object.keys(session.styles.get(layer.id)?.encode ?? {}),
                ].some((channel) => /^node\.(drawOrder|group[A-Z])/.test(channel)),
            );
        assert.isNotEmpty(writes, "a file layer writes them");
        for (const layer of writes) {
            await openStyle(layer.name);
            await showKind("node");
            look(seen, panel());
            await walkPopovers(seen);
        }
        assert.deepEqual(
            [...seen.lines].filter((channel) => /^node\.(zIndex|drawOrder|group[A-Z])/.test(channel)),
            [],
            "no line shows them",
        );
    });

    it("Settings shows none of the forbidden switches", async () => {
        await openGraph();
        await userEvent.click(screen.getByRole("button", { name: "Settings" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        const words = dialog.innerText;
        assert.include(words, "Theme", "Settings > General is shown");
        for (const forbidden of OWNER_FORBIDDEN) {
            if (forbidden.setting !== undefined) {
                assert.notMatch(words, forbidden.setting, `${forbidden.what} (${forbidden.ledger})`);
            }
        }
        await userEvent.keyboard("{Escape}");
    });

    it("pointing at every Node and Edge row, a shader row included, peeks nothing and leaves the graph as it was (E181)", async () => {
        const { session, element, nodes } = await openGraph();
        // A still one, so two pictures differ only by what pointing at a row does.
        const shader = session.catalog
            .shaders({ target: "node", place: "around" })
            .find((each) => each.motion.loop === undefined);
        assert.isDefined(shader, "a still node shader drawn around the node");
        await session.styles.update(nodes, {
            set: {
                "node.color": "#E8590C",
                "node.size": 2,
                "node.borderColor": "#1971C2",
                "node.borderWidth": 0.2,
                "node.shaders": [{ shader: shader?.id ?? "" }],
            },
        });
        await session.styles.settled();
        let rows = 0;
        let shaderRows = 0;
        for (const kind of ["node", "edge"] as const) {
            await walkKind({ words: new Set(), lines: new Set(), selectors: new Set() }, kind, false);
            const before = await picture(element);
            const found = [...panel().querySelectorAll<HTMLElement>("[data-thing], [data-shader]")];
            assert.isNotEmpty(found, `the ${kind} tab has rows`);
            shaderRows += found.filter((row) => row.hasAttribute("data-shader")).length;
            for (const row of found) {
                await userEvent.hover(row);
                rows++;
                assert.isNull(session.selection.peeked, "nothing is peeked");
            }
            await userEvent.hover(screen.getByRole("searchbox", { name: /Find a setting/ }));
            assert.equal(pixelsApart(before, await picture(element)), 0, `the ${kind} rows leave the graph as it was`);
        }
        assert.isAbove(rows, 3);
        assert.isAbove(shaderRows, 0, "a shader row was pointed at");
    });
});
