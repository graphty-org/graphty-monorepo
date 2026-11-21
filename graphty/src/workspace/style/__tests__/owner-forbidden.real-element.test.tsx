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
import { outsideTheList } from "./approvedControls";
import { showKind } from "./kindTab";
import { type Forbidden, OWNER_FORBIDDEN } from "./owner-forbidden";
import { onlyPlusAdds, openGraph, openShaderList, openStyle, picture, pixelsApart } from "./v2Harness";

/** What a walk saw. */
interface Seen {
    /** Every line of visible words: section titles, menu items, row names, pop-over lines, gallery tiles. */
    readonly words: Set<string>;
    /** Every section "+" menu item. */
    readonly plusItems: Set<string>;
    /** Every section "+" menu item and Switch to kind on the Node tab. */
    readonly nodePlusItems?: Set<string>;
    /** Every line's channel (data-line) in the panel and its pop-overs. */
    readonly lines: Set<string>;
    /** Every forbidden selector found, with where. */
    readonly selectors: Set<string>;
    /** Every number field with no scrub slot, by its line (E181, E330: a number is Figma's number input). */
    readonly unscrubbed?: Set<string>;
    /** Every scrub slot that is not one letter, by its line (E674: every number line's slot is its letter). */
    readonly oddSlots?: Set<string>;
    /** How many number fields the walk saw. */
    numbers?: number;
    /** Every row whose settings "..." is not its last control (E550: always at the far right). */
    readonly settingsNotLast?: Set<string>;
    /** How many rows with a settings "..." the walk saw. */
    settingsRows?: number;
    /** Everything the sidebar drew that is not an approved control (E174). */
    readonly unapproved?: Set<string>;
}

/**
 * The owner's removal a real-input check stands for.
 * @param check - the check.
 * @returns the removal.
 */
function forbiddenBy(check: NonNullable<Forbidden["check"]>): Forbidden {
    const found = OWNER_FORBIDDEN.find((each) => each.check === check);
    if (found === undefined) {
        throw new Error(`no owner removal for ${check}`);
    }
    return found;
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
    for (const more of root.querySelectorAll<HTMLElement>("button[aria-label$=' settings']")) {
        const row = more.closest(".ws-row");
        if (row === null) {
            continue;
        }
        seen.settingsRows = (seen.settingsRows ?? 0) + 1;
        const controls = [...row.querySelectorAll("button, input, [role='button'], [role='combobox']")];
        if (controls.at(-1) !== more) {
            seen.settingsNotLast?.add(row.getAttribute("data-line") ?? more.getAttribute("aria-label") ?? "?");
        }
    }
    // A number field set or unset: an unset one has no spinbutton role yet, only its decimal input mode.
    for (const input of root.querySelectorAll('input[role="spinbutton"], input[inputmode="decimal"]')) {
        if (input.closest(".cm-paint-opacity") !== null) {
            continue; // counted below, with its "%" handle
        }
        seen.numbers = (seen.numbers ?? 0) + 1;
        const line = input.closest(".ws-row, [data-line]") ?? input.parentElement;
        if (line?.querySelector("[data-scrub]") === null || line === null) {
            seen.unscrubbed?.add(line?.getAttribute("data-line") ?? input.getAttribute("aria-label") ?? "?");
        }
    }
    for (const slot of root.querySelectorAll<HTMLElement>(".cm-scrub-slot[data-scrub]")) {
        if (!/^[A-Z]$/.test(slot.textContent.trim()) || slot.querySelector("svg") !== null) {
            seen.oddSlots?.add(slot.closest("[data-line]")?.getAttribute("data-line") ?? slot.innerHTML);
        }
    }
    // A color's opacity is Figma's paint row (design/ui/figma/components.md section 28): no letter slot, its "%"
    // is the scrub handle.
    for (const opacity of root.querySelectorAll<HTMLElement>(".cm-paint-opacity")) {
        seen.numbers = (seen.numbers ?? 0) + 1;
        const handle = opacity.querySelector(".cm-paint-suffix");
        if (handle === null || getComputedStyle(handle).cursor !== "ew-resize") {
            seen.unscrubbed?.add(opacity.closest("[data-line]")?.getAttribute("data-line") ?? "an opacity");
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
async function walkMenus(seen: Seen, adding: boolean, kind: "node" | "edge"): Promise<void> {
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
            for (const item of within(menu).queryAllByRole("menuitem")) {
                seen.plusItems.add(item.textContent.trim());
                if (kind === "node") {
                    seen.nodePlusItems?.add(item.textContent.trim());
                }
            }
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
 * Opens every row's settings pop-over and Switch to menu and records them.
 * @param seen - the record.
 */
async function walkPopovers(seen: Seen): Promise<void> {
    const names = [
        ...panel().querySelectorAll<HTMLElement>("button[aria-label$=' settings'], button[aria-label^='Switch ']"),
    ].map((each) => each.getAttribute("aria-label") ?? "");
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
 * Walks one kind's tab: (when adding, on the fresh layer) each section's title, bar and "+" with real clicks, then
 * its menus and every item, then the rows and their pop-overs, checking the sidebar draws only approved controls.
 * @param seen - the record.
 * @param kind - nodes or edges.
 * @param adding - whether to add what the menus offer.
 * @param session - the session, to tell whether a click added anything; none skips the "+" sections' check.
 */
async function walkKind(seen: Seen, kind: "node" | "edge", adding: boolean, session?: GraphSession): Promise<void> {
    await openStyle(kind === "node" ? "Key people" : "Links");
    await showKind(kind);
    if (adding && session !== undefined) {
        const why = forbiddenBy("only-plus-adds");
        for (const section of panel().querySelectorAll<HTMLElement>('[data-plus-list="section"]')) {
            await onlyPlusAdds(session, section, `${kind} ${section.textContent} (${why.ledger})`);
        }
    }
    await walkMenus(seen, adding, kind);
    look(seen, panel());
    for (const each of outsideTheList(panel())) {
        seen.unapproved?.add(`${kind}: ${each}`);
    }
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
        const seen: Seen = {
            words: new Set(),
            plusItems: new Set(),
            nodePlusItems: new Set(),
            lines: new Set(),
            selectors: new Set(),
            unscrubbed: new Set(),
            oddSlots: new Set(),
            settingsNotLast: new Set(),
            unapproved: new Set(),
        };
        await switchView("3D");
        await walkKind(seen, "node", true, session);
        await walkKind(seen, "edge", true, session);
        await switchView("2D");
        await walkKind(seen, "node", false);
        await walkKind(seen, "edge", false);
        assert.isAbove(seen.lines.size, 10, "the walk reached the rows' lines");
        assert.isAbove(seen.numbers ?? 0, 10, "the walk reached number fields");
        assert.deepEqual([...(seen.unscrubbed ?? [])], [], "every number field has a scrub slot (E181, E330)");
        assert.deepEqual([...(seen.oddSlots ?? [])], [], "every number field's slot is one letter, no icon (E674)");
        assert.isAbove(seen.settingsRows ?? 0, 5, "the walk reached rows with a settings button");
        assert.deepEqual(
            [...(seen.settingsNotLast ?? [])],
            [],
            'every row\'s settings "..." is its last control (E550)',
        );
        const information = forbiddenBy("approved-controls");
        assert.deepEqual([...(seen.unapproved ?? [])], [], `${information.what} (${information.ledger})`);
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
            if (forbidden.plusItem !== undefined) {
                assert.deepEqual(
                    [...seen.plusItems].filter((item) => forbidden.plusItem?.test(item)),
                    [],
                    why,
                );
            }
            if (forbidden.nodePlusItem !== undefined) {
                assert.deepEqual(
                    [...(seen.nodePlusItems ?? [])].filter((item) => forbidden.nodePlusItem?.test(item)),
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
        await openShaderList(tab, "node");
        await userEvent.click(await screen.findByRole("button", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: /^(New|Edit) shader$/ });
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
        const seen: Seen = { words: new Set(), plusItems: new Set(), lines: new Set(), selectors: new Set() };
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

    it("Find a setting, on both tabs, finds none of them by name", async () => {
        await openGraph();
        const words = [
            "Glyph",
            "Group",
            "Order",
            "Group outline",
            "Stacking",
            "Custom shader",
            "Around",
            "Material",
            "Outline",
            "Halo",
        ];
        for (const kind of ["node", "edge"] as const) {
            await openStyle(kind === "node" ? "Key people" : "Links");
            await showKind(kind);
            const search = screen.getByRole("searchbox", { name: /Find a setting/ });
            for (const word of words) {
                await userEvent.clear(search);
                await userEvent.type(search, word);
                const results = await waitFor(() => {
                    const found = panel().querySelector<HTMLElement>("[data-find-results]");
                    assert.isNotNull(found, "the results replace the sections");
                    return found;
                });
                // A heading is "Part - Item": each half is a section or a row's name.
                const headings = [...results.querySelectorAll<HTMLElement>("[data-find-group] > :first-child")].flatMap(
                    (heading) => heading.innerText.split(" - ").map((half) => half.trim()),
                );
                const channels = [...results.querySelectorAll<HTMLElement>("[data-result]")].map(
                    (line) => line.dataset.result ?? "",
                );
                if (kind === "node" && word === "Glyph") {
                    // a glyph is the Label row's Glyph kind, found under the Label and headed by its kind (01469b21ac)
                    const label = [...results.querySelectorAll<HTMLElement>("[data-find-group]")].find(
                        (group) => group.querySelector('[data-result="node.glyph"]') !== null,
                    );
                    assert.equal(
                        label?.firstElementChild?.textContent.trim(),
                        "Text - Label (Glyph)",
                        "glyph is under Label",
                    );
                }
                for (const forbidden of OWNER_FORBIDDEN) {
                    const why = `${kind} Find "${word}": ${forbidden.what} (${forbidden.ledger})`;
                    if (forbidden.text !== undefined) {
                        assert.deepEqual(
                            headings.filter((heading) => forbidden.text?.test(heading)),
                            [],
                            why,
                        );
                    }
                    if (forbidden.channel !== undefined) {
                        assert.deepEqual(
                            channels.filter((channel) => forbidden.channel?.test(channel)),
                            [],
                            why,
                        );
                    }
                }
            }
            await userEvent.clear(search);
        }
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
});

describe("pointing at a Style row, with the assistant experiment on so a peek could draw", () => {
    withFeatures(["file-styles", "style-panel-v2", "assistant"]);

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
        // With the assistant experiment on a peek is allowed and draws: the control below proves a restored row
        // peek would show in the pictures, so their staying equal means no row peeks.
        const still = await picture(element);
        await session.selection.peek({ nodes: ["a"] });
        assert.isNotNull(session.selection.peeked, "a peek is allowed with the assistant on");
        assert.isAbove(pixelsApart(still, await picture(element)), 0, "a peek draws");
        await session.selection.peek(null);
        assert.isNull(session.selection.peeked);
        let rows = 0;
        let shaderRows = 0;
        for (const kind of ["node", "edge"] as const) {
            await walkKind(
                { words: new Set(), plusItems: new Set(), lines: new Set(), selectors: new Set() },
                kind,
                false,
            );
            const before = await picture(element);
            const found = [...panel().querySelectorAll<HTMLElement>("[data-thing], [data-shader]")];
            assert.isNotEmpty(found, `the ${kind} tab has rows`);
            shaderRows += found.filter((row) => row.hasAttribute("data-shader")).length;
            for (const row of found) {
                await userEvent.hover(row);
                rows++;
                assert.isNull(session.selection.peeked, "nothing is peeked");
                // Taken while the row is still pointed at: a peek that clears on leaving would show here.
                assert.equal(
                    pixelsApart(before, await picture(element)),
                    0,
                    `pointing at ${kind} row ${row.getAttribute("data-thing") ?? row.getAttribute("data-shader") ?? ""} leaves the graph as it was`,
                );
            }
        }
        assert.isAbove(rows, 3);
        assert.isAbove(shaderRows, 0, "a shader row was pointed at");
    });
});
