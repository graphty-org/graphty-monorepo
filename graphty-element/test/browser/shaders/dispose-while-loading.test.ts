/**
 * @file A graph disposed while its shader runtime's module is still loading (issue #5950). The
 * import is held open by a mock of the module, so the order of events is the test's and not the
 * network's: ask for the runtime, dispose the graph, let the import finish.
 *
 * The work the dispose abandoned ends quietly (test/setup.ts fails the test on anything unhandled),
 * and a caller still awaiting an answer gets one: the session's `E_DISPOSED`. The runtime's module
 * loads once per page, so only the file's first test holds the import.
 */

import "../../../src/graphty-element";

import type { Effect } from "@babylonjs/core";
import { assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import type { LayerSpec } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { operationQueueOf } from "../../../src/Graph";
import { shadersControllerOf } from "../../../src/session/shaders";
import type { LazyShaderHost } from "../../../src/shaders/chunk";

/** A group outline, which loads its pass through the runtime. */
const OUTLINE: LayerSpec = {
    name: "Outline",
    target: "node",
    selector: { match: "has", path: "data.community" },
    set: { "node.shaders": [{ shader: "metaball-hull", groupBy: "data.community" }] },
};

/** A shader to compile, which the runtime does. */
const TINT = `/* graphty-shader 1
{ "id": "user/tint", "name": "Tint", "place": "paint" }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

const load = vi.hoisted(() => {
    let asked = (): void => undefined;
    let release = (): void => undefined;
    return {
        /** Settles when something first imports the runtime. */
        asked: new Promise<void>((resolve) => {
            asked = resolve;
        }),
        /** Settles when the test lets the import finish. */
        released: new Promise<void>((resolve) => {
            release = resolve;
        }),
        ask: (): void => {
            asked();
        },
        release: (): void => {
            release();
        },
    };
});

vi.mock("../../../src/shaders/runtime", async (original) => {
    load.ask();
    await load.released;
    return original();
});

/**
 * A mounted element, up and idle.
 * @returns The element.
 */
async function mountedElement(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "320px";
    element.style.height = "240px";
    element.renderOnDemand = true;
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

describe("disposing a graph while the shader runtime loads", () => {
    it("ends the abandoned work quietly and answers the callers still waiting", async () => {
        const element = await mountedElement();
        await element.session.data.addNodes([{ id: "a", community: 1 }]);

        // Nobody awaits the background and outline passes' loads; these two callers await theirs.
        element.background = { backgroundType: "color", color: "#000000", shader: { id: "nebula" } };
        await element.session.styles.add(OUTLINE);
        const host = shadersControllerOf(element.session)?.host as LazyShaderHost;
        const runtime = host.runtime().then(
            () => null,
            (error: unknown) => error,
        );
        const check = element.session.shaders.check(TINT);
        await load.asked;

        element.remove();
        load.release();

        const refused = await runtime;
        assert.isTrue(isGraphtyError(refused) && refused.code === "E_DISPOSED", `the runtime gave ${String(refused)}`);
        assert.isFalse((await check).ok, "a check that could not run did not pass");
    });

    it("answers a check whose compile the dispose cut off", async () => {
        load.release();
        const element = await mountedElement();
        const host = shadersControllerOf(element.session)?.host as LazyShaderHost;
        await host.runtime();
        // An engine disposed under a compile drops the effect and never calls back.
        const compiling = new Promise<void>((started) => {
            vi.spyOn(element.graph.engine, "createEffect").mockImplementation(() => {
                started();
                return undefined as unknown as Effect;
            });
        });
        const check = element.session.shaders.check(TINT);
        await compiling;

        element.remove();

        assert.isFalse((await check).ok, "a check that could not finish did not pass");
    });
});
