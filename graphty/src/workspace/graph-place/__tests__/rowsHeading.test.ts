/**
 * The Style tree's counts follow the reader's Number format, as the inspector's do (#7074).
 */

import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { setNumberFormat } from "../../settings/numberFormat";
import { NUMBER_FORMAT } from "../../settings/preferences";
import { rowsHeading } from "../rows";

/**
 * Only the two style reads rowsHeading makes: one folder row reaching `layers` layers.
 * @param layers - how many layers the folder reaches.
 * @returns the session's stand-in.
 */
function sessionReaching(layers: number): GraphSession {
    const folder = { id: "f", children: [] } as unknown as StyleRow;
    const styles = {
        tree: () => [folder],
        layersUnder: () => Array.from({ length: layers }, (_, i) => `l${String(i)}`),
    };
    return { styles } as unknown as GraphSession;
}

afterEach(() => {
    setNumberFormat("system");
    localStorage.removeItem(NUMBER_FORMAT.key);
});

describe("rowsHeading", () => {
    it("spells the layer count in the reader's Number format", () => {
        setNumberFormat("comma");
        assert.equal(rowsHeading(sessionReaching(1234), ["f"]), "1.234 layers");
        setNumberFormat("period");
        assert.equal(rowsHeading(sessionReaching(1234), ["f"]), "1,234 layers");
        assert.equal(rowsHeading(sessionReaching(1), ["f"]), "1 layer");
    });
});
