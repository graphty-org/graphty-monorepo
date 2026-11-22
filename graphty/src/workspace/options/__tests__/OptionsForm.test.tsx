/**
 * The shared options form against a real graphty-element session with no view and the element's
 * own algorithm descriptors: key options first, the advanced ones behind a closed fold that puts
 * nothing in the DOM until it opens, internal options never, and no raw option key as a label.
 */
import { PopoutManager } from "@graphty/compact-mantine";
import { BUILT_IN_ALGORITHMS, type OptionDescriptor } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { optionWords } from "../../analyze/words";
import { OptionsForm } from "../OptionsForm";
import { splitOptions } from "../splitOptions";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * The form for one built-in algorithm, on a session holding one weighted edge.
 * @param key - the algorithm's key.
 * @returns its option descriptors.
 */
async function renderFor(key: string): Promise<readonly OptionDescriptor[]> {
    const made = createGraphSession();
    session = made;
    await made.data.addNodes([{ id: "a" }, { id: "b" }]);
    await made.data.addEdges([{ source: "a", target: "b", shared: 2 }]);
    const descriptor = BUILT_IN_ALGORITHMS.find((d) => d.key === key);
    if (descriptor === undefined) {
        throw new Error(`no ${key}`);
    }
    render(
        <OptionsForm
            session={made}
            options={descriptor.options}
            values={{}}
            words={(option) => optionWords(key, option)}
            algorithm={key}
            onChange={() => undefined}
        />,
    );
    return descriptor.options;
}

/**
 * Every visible label's text.
 * @returns the texts.
 */
const labels = (): string[] => [...document.querySelectorAll("label")].map((label) => label.textContent.trim());

describe("the options form", () => {
    it("draws PageRank's key options and then its advanced ones, in place", async () => {
        const options = await renderFor("pagerank");

        assert.isNotNull(screen.getByRole("spinbutton", { name: /^Damping factor(,|$)/ }));
        assert.isNotEmpty(screen.getAllByLabelText("Weight"));
        assert.isNotNull(screen.getByRole("spinbutton", { name: /^Max iterations(,|$)/ }));
        assert.isNotNull(screen.getByRole("spinbutton", { name: /^Tolerance(,|$)/ }));
        // useDelta is internal: never drawn.
        assert.isNull(screen.queryByText(/Delta/));

        const keys = new Set(options.map((o) => o.name));
        for (const text of labels()) {
            assert.isFalse(keys.has(text), text);
        }
    });

    it("draws no control yet for the weight and direction options whose card design is still to come", async () => {
        // graphty-element declares them (issue #313); the app draws them with the per-card design.
        const pagerank = await renderFor("pagerank");
        assert.isTrue(pagerank.some((o) => o.name === "directed"));
        assert.isNull(screen.queryByText(/direction/i));
        session?.dispose();

        for (const key of ["closeness", "hits"]) {
            document.body.innerHTML = "";
            const options = await renderFor(key);
            assert.isTrue(
                options.some((o) => o.name === "weight"),
                key,
            );
            assert.isEmpty(screen.queryAllByLabelText("Weight"), key);
            session?.dispose();
        }
    });

    it("draws no reset beside a run's setting at its default, and one that resets it once changed", async () => {
        const made = createGraphSession();
        session = made;
        await made.data.addNodes([{ id: "a" }, { id: "b" }]);
        const descriptor = BUILT_IN_ALGORITHMS.find((d) => d.key === "pagerank");
        assert.isDefined(descriptor);
        const damping = descriptor.options.find((o) => o.name === "dampingFactor");
        if (damping === undefined) {
            throw new Error("no damping factor");
        }
        assert.strictEqual(damping.default, 0.85);
        const options = [damping];
        let last: Record<string, unknown> = {};
        // A run records the default it used, as a run's Made with section hands it over.
        function Form(): React.JSX.Element {
            const [values, setValues] = React.useState<Record<string, unknown>>({ dampingFactor: 0.85 });
            return (
                <OptionsForm
                    session={made}
                    options={options}
                    values={values}
                    words={(option) => optionWords("pagerank", option)}
                    onChange={(name, value) => {
                        last = { ...values, [name]: value };
                        setValues(last);
                    }}
                />
            );
        }
        render(<Form />);
        const user = userEvent.setup();
        const box = screen.getByRole("spinbutton", { name: /^Damping factor(,|$)/ });
        assert.strictEqual((box as HTMLInputElement).value, "0.85");
        assert.isNull(screen.queryByRole("button", { name: /reset/i }));
        await user.clear(box);
        await user.type(box, "0.9{Enter}");
        await user.click(screen.getByRole("button", { name: /reset/i }));
        // The reset puts the default back as the value, so the run reads as unchanged.
        assert.deepEqual(last, { dampingFactor: 0.85 });
        assert.strictEqual((box as HTMLInputElement).value, "0.85");
        assert.isNull(screen.queryByRole("button", { name: /reset/i }));
    });

    it("draws Leiden's advanced settings beside its key one, with nothing to open", async () => {
        await renderFor("leiden");
        // One name per idea across the forms (OptionsForm.tsx, ONE_NAME).
        const names = [/^Resolution(,|$)/, /^Max iterations(,|$)/, /^Tolerance(,|$)/];
        const seed = /^Seed(,|$)/;

        for (const name of names) {
            assert.isNotNull(screen.getByRole("spinbutton", { name }));
        }
        // Leiden is unseeded by default, so its seed is an empty box (a text box until it holds a number).
        assert.strictEqual(screen.getByRole<HTMLInputElement>("textbox", { name: seed }).value, "");
        assert.isNull(screen.queryByRole("button", { name: /Advanced/ }));
        assert.isNull(screen.queryByRole("dialog"));
    });

    it("says which of an algorithm's drawn options are key and which advanced", () => {
        const descriptor = BUILT_IN_ALGORITHMS.find((d) => d.key === "pagerank");
        assert.isDefined(descriptor);
        const { key, advanced } = splitOptions(descriptor.options);
        assert.include(
            key.map((o) => o.name),
            "dampingFactor",
        );
        assert.include(
            advanced.map((o) => o.name),
            "maxIterations",
        );
        assert.notInclude(
            [...key, ...advanced].map((o) => o.name),
            "useDelta",
            "an internal option is neither",
        );
    });

    it("draws Betweenness's sample size in place", async () => {
        await renderFor("betweenness");

        // No default: the empty box is a text box until it holds a number (a spinbutton reads 0).
        assert.isNotNull(screen.getByRole("textbox", { name: /^Sample size(,|$)/ }));
    });

    it("draws no button for an algorithm with no advanced options", async () => {
        await renderFor("components");

        assert.isNull(screen.queryByRole("button", { name: /Advanced/ }));
    });

    it("draws a weighted algorithm's Weight line: the loaded weight first, then None, then other columns", async () => {
        const made = createGraphSession();
        session = made;
        await made.data.import(
            { type: "csv", config: { data: "from,to,emails,cost\np01,p02,14,2\np02,p03,9,4\n" } },
            {
                mapping: {
                    rowsAre: "edges",
                    source: "from",
                    target: "to",
                    weight: "emails",
                    weightMeaning: "strength",
                },
            },
        );
        const descriptor = made.catalog.algorithms().find((d) => d.key === "shortest-path");
        if (descriptor === undefined) {
            throw new Error("no shortest-path");
        }
        const changes: unknown[] = [];
        render(
            <OptionsForm
                session={made}
                options={descriptor.options}
                values={{}}
                words={(option) => optionWords("shortest-path", option)}
                weightReads={descriptor.weightMeaning ?? null}
                onChange={(_name, value) => changes.push(value)}
            />,
        );
        const select = screen.getByRole("combobox", { name: "Weight" });
        assert.equal((select as HTMLInputElement).value, "emails (closer, loaded)");
        await userEvent.click(select);
        const options = screen.getAllByRole("option").map((option) => option.textContent);
        // A column is named alone, without what the run reads it as (OptionsForm.tsx).
        assert.deepEqual(options, ["emails (closer, loaded)", "None", "cost"]);
        await userEvent.click(screen.getByRole("option", { name: "None" }));
        assert.deepEqual(changes, [null]);
    });
    describe("options drawn from a descriptor the form is handed", () => {
        /**
         * A form of hand-written descriptors on a session of three nodes, holding what it was set
         * to, as a run's Made with section does.
         * @param options - the descriptors.
         * @param props - the form's other props.
         * @returns every change, by name.
         */
        async function renderOwn(
            options: readonly OptionDescriptor[],
            props: Partial<React.ComponentProps<typeof OptionsForm>> = {},
        ): Promise<[string, unknown][]> {
            const made = createGraphSession();
            session = made;
            await made.data.addNodes([
                { id: "a", name: "Alpha" },
                { id: "b", name: "Beta" },
                { id: "c", group: "x" },
            ]);
            const changes: [string, unknown][] = [];
            function Form(): React.JSX.Element {
                const [values, setValues] = React.useState<Record<string, unknown>>({});
                return (
                    <OptionsForm
                        session={made}
                        options={options}
                        values={values}
                        words={(option) => ({ label: option.plainName, choice: (v) => v })}
                        onChange={(name, value) => {
                            changes.push([name, value]);
                            setValues((was) => ({ ...was, [name]: value }));
                        }}
                        {...props}
                    />
                );
            }
            render(
                <PopoutManager>
                    <Form />
                </PopoutManager>,
            );
            return changes;
        }

        it("draws a color option at its default in capitals, and a typed color as the new value", async () => {
            const changes = await renderOwn([{ name: "tint", plainName: "Tint", type: "color", default: "#ff8800" }]);
            const hex = screen.getByTestId<HTMLInputElement>("compact-color-input-hex");
            assert.strictEqual(hex.value, "FF8800");

            await userEvent.tripleClick(hex);
            await userEvent.keyboard("00aa00{Enter}");
            assert.deepEqual(changes, [["tint", "#00AA00"]]);

            // The color already shown is no change.
            await userEvent.tripleClick(hex);
            await userEvent.keyboard("00AA00{Enter}");
            assert.deepEqual(changes, [["tint", "#00AA00"]]);
        });

        it("draws a text option with its default as the hint, and a cleared box as unset", async () => {
            const changes = await renderOwn([{ name: "prefix", plainName: "Prefix", type: "string", default: "n" }]);
            const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Prefix" });
            assert.strictEqual(box.value, "");
            assert.strictEqual(box.placeholder, "n");

            await userEvent.type(box, "ab");
            assert.deepEqual(changes.at(-1), ["prefix", "ab"]);
            await userEvent.clear(box);
            assert.deepEqual(changes.at(-1), ["prefix", undefined]);
            assert.strictEqual(box.value, "");
        });

        it("draws no node option with no node and none selected, and offers the selected node", async () => {
            const source: OptionDescriptor = { name: "source", plainName: "Source", type: "node-id" };
            await renderOwn([source], { canUseSelectedNode: true });
            assert.isNull(screen.queryByText("Source"), "nothing to show");
            document.body.innerHTML = "";
            session?.dispose();

            const made = createGraphSession();
            session = made;
            await made.data.addNodes([
                { id: "a", name: "Alpha" },
                { id: "b", name: "Beta" },
            ]);
            await made.selection.apply({ nodes: ["b"] });
            const changes: [string, unknown][] = [];
            function Form(): React.JSX.Element {
                const [value, setValue] = React.useState<unknown>(undefined);
                return (
                    <OptionsForm
                        session={made}
                        options={[source]}
                        values={{ source: value }}
                        canUseSelectedNode
                        words={(option) => ({ label: option.plainName, choice: (v) => v })}
                        onChange={(name, next) => {
                            changes.push([name, next]);
                            setValue(next);
                        }}
                    />
                );
            }
            render(<Form />);
            assert.isNotNull(screen.getByText("None"), "no node yet");
            await userEvent.click(screen.getByRole("button", { name: "Use selected node as Source" }));
            assert.deepEqual(changes, [["source", "b"]]);
            // The selected node is the option's now: named, and not offered again.
            const named = made.data.nodeName("b").name;
            await waitFor(() => {
                assert.isNotNull(screen.getByText(named));
            });
            assert.isNull(screen.queryByRole("button", { name: "Use selected node as Source" }));
        });

        it("lists a column the element refused disabled, with the reason under it, and says why a field is locked", async () => {
            await renderOwn(
                [
                    {
                        name: "where",
                        plainName: "Where",
                        type: "attribute",
                        values: [
                            { value: "group", label: "group" },
                            {
                                value: "name",
                                label: "name",
                                refusal: { code: "location.column-unfit", params: { role: "location", share: 0 } },
                            },
                        ],
                    },
                    {
                        name: "mode",
                        plainName: "Mode",
                        type: "enum",
                        default: null,
                        values: [{ value: "x", label: "x" }],
                    },
                ],
                {
                    choiceNote: (_option, refusal) => `refused: ${refusal.code}`,
                    disabledReason: (option) => (option.name === "mode" ? "Set by the layout" : null),
                },
            );
            await userEvent.click(screen.getByRole("combobox", { name: "Where" }));
            const refused = screen.getByRole("option", { name: /^name/ });
            assert.include(refused.textContent, "refused: location.column-unfit");
            assert.strictEqual(refused.getAttribute("data-combobox-disabled"), "true");
            assert.notInclude(screen.getByRole("option", { name: /^group/ }).textContent, "refused");
            await userEvent.keyboard("{Escape}");

            const mode = screen.getByRole<HTMLInputElement>("combobox", { name: "Mode" });
            assert.isTrue(mode.disabled);
            assert.strictEqual(mode.placeholder, "Not set");
            assert.isNotNull(document.querySelector('[aria-description="Set by the layout"]'));
        });

        it("draws options named in one row side by side, in the row's order, where its first one stands", async () => {
            await renderOwn(
                [
                    { name: "width", plainName: "Width", type: "number", default: 1 },
                    { name: "gap", plainName: "Gap", type: "number", default: 2 },
                    { name: "height", plainName: "Height", type: "number", default: 3 },
                ],
                { rows: [["height", "width"]] },
            );
            const names = [...document.querySelectorAll(".ws-option-name")].map((n) => n.textContent);
            assert.sameMembers(names, ["Height", "Width", "Gap"]);
            assert.strictEqual(names.indexOf("Width"), names.indexOf("Height") + 1, "Width right after Height");
            const line = (name: string): Element | null | undefined =>
                screen.getByRole("spinbutton", { name: new RegExp(`^${name}(,|$)`) }).closest(".ws-option-row")
                    ?.parentElement;
            assert.strictEqual(line("Height"), line("Width"), "one row holds both");
            assert.notStrictEqual(line("Gap"), line("Height"));
        });
    });

    it("picks the loaded weight back after None, and shows another column picked by its name", async () => {
        const made = createGraphSession();
        session = made;
        await made.data.import(
            { type: "csv", config: { data: "from,to,emails,cost\np01,p02,14,2\np02,p03,9,4\n" } },
            {
                mapping: {
                    rowsAre: "edges",
                    source: "from",
                    target: "to",
                    weight: "emails",
                    weightMeaning: "strength",
                },
            },
        );
        const descriptor = made.catalog.algorithms().find((d) => d.key === "shortest-path");
        if (descriptor === undefined) {
            throw new Error("no shortest-path");
        }
        const changes: unknown[] = [];
        function Form(): React.JSX.Element {
            const [weight, setWeight] = React.useState<unknown>(null);
            return (
                <OptionsForm
                    session={made}
                    options={descriptor?.options ?? []}
                    values={{ weight }}
                    words={(option) => optionWords("shortest-path", option)}
                    weightReads={descriptor?.weightMeaning ?? null}
                    onChange={(_name, value) => {
                        changes.push(value);
                        setWeight(value);
                    }}
                />
            );
        }
        render(<Form />);
        const select = screen.getByRole<HTMLInputElement>("combobox", { name: "Weight" });
        assert.equal(select.value, "None");
        await userEvent.click(select);
        await userEvent.click(screen.getByRole("option", { name: "emails (closer, loaded)" }));
        // The loaded weight is the option left absent.
        assert.deepEqual(changes, [undefined]);
        await waitFor(() => {
            assert.equal(select.value, "emails (closer, loaded)");
        });
        await userEvent.click(select);
        await userEvent.click(screen.getByRole("option", { name: "cost" }));
        assert.deepEqual(changes, [undefined, "cost"]);
        await waitFor(() => {
            assert.equal(select.value, "cost");
        });
    });

    it("shows None for a loaded weight the run would leave unread, listed but not offered, and says why", async () => {
        const made = createGraphSession();
        session = made;
        await made.data.import(
            { type: "csv", config: { data: "from,to,flow\np01,p02,14\np02,p03,9\n" } },
            {
                mapping: {
                    rowsAre: "edges",
                    source: "from",
                    target: "to",
                    weight: "flow",
                    weightMeaning: "capacity",
                },
            },
        );
        const descriptor = made.catalog.algorithms().find((d) => d.key === "shortest-path");
        if (descriptor === undefined) {
            throw new Error("no shortest-path");
        }
        render(
            <OptionsForm
                session={made}
                options={descriptor.options}
                values={{}}
                words={(option) => optionWords("shortest-path", option)}
                weightReads={descriptor.weightMeaning ?? null}
                algorithm="shortest-path"
                onChange={() => undefined}
            />,
        );
        const select = screen.getByRole<HTMLInputElement>("combobox", { name: "Weight" });
        // The plan is asked for first: the box says what the run reads once it answers.
        await waitFor(() => {
            assert.equal(select.value, "None");
            assert.include(document.body.textContent, "Each edge counts as 1.");
        });
        await userEvent.click(select);
        const loaded = screen.getByRole("option", { name: /^flow \(.*loaded, not read\)$/ });
        assert.strictEqual(loaded.getAttribute("data-combobox-disabled"), "true");
    });
});
