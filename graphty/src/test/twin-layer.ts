/**
 * The condition cards of a style layer's Which nodes. One layer alone edits its rule in the
 * selection editor; the cards edit what several selected layers share. A test of the cards adds
 * a twin of its layer and selects both, as a reader does with Ctrl and a click.
 */
import type { GraphSession } from "@graphty/graphty-element/session";
import { userEvent } from "vitest/browser";

import { screen, within } from "./test-utils";

/**
 * Adds a twin of a layer, "<name> too", with the same target, rule and values, and selects the
 * layer and its twin in the style tree.
 * @param session - the element's session.
 * @param name - the layer's name.
 */
export async function selectWithTwin(session: GraphSession, name: string): Promise<void> {
    const layer = session.styles.list().find((each) => each.name === name);
    if (layer === undefined) {
        throw new Error(`no layer ${name}`);
    }
    await session.styles.add({ name: `${name} too`, target: layer.target, selector: layer.selector, set: layer.set });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await userEvent.keyboard("{Control>}");
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name} too, `) }));
    await userEvent.keyboard("{/Control}");
}
