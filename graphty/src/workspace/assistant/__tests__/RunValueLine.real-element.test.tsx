/**
 * A style change line names a run's value as the key does, on the REAL graphty-element: "Sized 16
 * nodes by Connections", never by the path the tool call carried (`results.degree.value`).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { sourceName } from "../../style/row";
import { Workspace } from "../../Workspace";
import { effectLine } from "../words";

describe("a style change line over a run's value", () => {
    it("names the value as the key names it", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const session = await openBy(store, () => pickSample("Florentine families"));
        await session.runs.start("degree", {}, { as: "degree", style: false });
        const nodes = session.data.nodes().length;

        const line = effectLine(session, {
            code: "AI_EFFECT_STYLE",
            params: { channel: "node.size", nodes, source: "results.degree.value" },
        });

        const key = sourceName(session, { by: "results.degree.value" });
        assert.isNotNull(key, "the key names the run's value");
        assert.strictEqual(line, `Sized ${String(nodes)} nodes by ${key ?? ""}`);
        assert.notMatch(line, /results\./);
    });
});
