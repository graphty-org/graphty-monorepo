/**
 * The shared options form against a real graphty-element session with no view and the element's
 * own algorithm descriptors: key options first, the advanced ones behind a closed fold that puts
 * nothing in the DOM until it opens, internal options never, and no raw option key as a label.
 */
import { BUILT_IN_ALGORITHMS, type OptionDescriptor } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
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
});
