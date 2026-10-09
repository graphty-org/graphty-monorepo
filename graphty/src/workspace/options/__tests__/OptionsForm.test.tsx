/**
 * The shared options form against a real graphty-element session with no view and the element's
 * own algorithm descriptors: key options first, the advanced ones behind a closed fold that puts
 * nothing in the DOM until it opens, internal options never, and no raw option key as a label.
 */
import { BUILT_IN_ALGORITHMS, type OptionDescriptor } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";

import { render, screen } from "../../../test/test-utils";
import { optionWords } from "../../analyze/words";
import { OptionsForm } from "../OptionsForm";

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
    it("draws PageRank's key options, and its advanced ones only once Advanced opens", async () => {
        const options = await renderFor("pagerank");

        assert.isNotNull(screen.getByRole("spinbutton", { name: "Damping factor" }));
        assert.isNotEmpty(screen.getAllByLabelText("Weight"));
        const fold = screen.getByRole("button", { name: /Advanced/ });
        assert.equal(fold.getAttribute("aria-expanded"), "false");
        assert.isNull(screen.queryByRole("spinbutton", { name: "Max iterations", hidden: true }));
        assert.isNull(screen.queryByText("Max iterations"));

        await userEvent.click(fold);
        assert.isNotNull(screen.getByRole("spinbutton", { name: "Max iterations" }));
        assert.isNotNull(screen.getByRole("spinbutton", { name: "Tolerance" }));
        // useDelta is internal: never drawn, open or closed.
        assert.isNull(screen.queryByText(/Delta/));

        const keys = new Set(options.map((o) => o.name));
        for (const text of labels()) {
            assert.isFalse(keys.has(text), text);
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
        const box = screen.getByRole("spinbutton", { name: "Damping factor" });
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

    it("puts Betweenness's sample size behind the Advanced fold", async () => {
        await renderFor("betweenness");

        assert.isNull(screen.queryByText("Sample size"));
        await userEvent.click(screen.getByRole("button", { name: /Advanced/ }));
        assert.isNotNull(screen.getByRole("spinbutton", { name: "Sample size" }));
    });

    it("draws no fold for an algorithm with no advanced options", async () => {
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
        assert.deepEqual(options, ["emails (closer, loaded)", "None", "cost (farther)"]);
        await userEvent.click(screen.getByRole("option", { name: "None" }));
        assert.deepEqual(changes, [null]);
    });
});
