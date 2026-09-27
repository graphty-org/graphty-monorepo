import { assert, describe, it } from "vitest";

import { DerivationLane } from "../../../src/session/project/derive";
import { createProjectState, type ProjectState } from "../../../src/session/project/state";
import { setup } from "./fake-commands";

/** The name of the stand-in stack in a state, or null for an empty stack. */
function stackOf(state: ProjectState): string | null {
    const top = state.styles[0] as unknown as { name: string } | undefined;
    return top?.name ?? null;
}

describe("derivation lane", () => {
    it("runs one pass for thirty undos made without awaiting, and the hook sees the net change", async () => {
        const { dispatcher, clock } = setup();
        for (let index = 1; index <= 30; index++) {
            await dispatcher.dispatch({ op: "fake.styles", name: `s${index}` });
            await dispatcher.dispatch({ op: "fake.config", key: `k${index}`, value: "v" });
            clock.advance(5000);
        }

        const passes: { from: string | null; to: string | null; dirty: string[] }[] = [];
        const configKeys: string[][] = [];
        dispatcher.lane.register("styles", (rendered, target, dirty) => {
            passes.push({ from: stackOf(rendered), to: stackOf(target), dirty: [...dirty] });
        });
        dispatcher.lane.register("config", (_rendered, _target, dirty) => {
            configKeys.push([...dirty].sort());
        });

        const presses: Promise<unknown>[] = [];
        for (let index = 0; index < 60; index++) {
            presses.push(dispatcher.undo());
        }

        assert.strictEqual(dispatcher.history.position, 0, "every press moved the cursor at call time");
        assert.lengthOf(passes, 0, "no pass runs inside the calls");
        await Promise.all(presses);

        assert.deepEqual(passes, [{ from: "s30", to: null, dirty: [""] }]);
        assert.lengthOf(configKeys, 1);
        assert.lengthOf(configKeys[0], 30);
        assert.isNull(stackOf(dispatcher.lane.rendered));
        assert.strictEqual(dispatcher.lane.rendered.config.size, 0);
    });

    it("derives a forward commit, and a rollback of live writes, through the same hooks", async () => {
        const { dispatcher } = setup();
        const seen: string[] = [];
        dispatcher.lane.register("config", (rendered, target, dirty) => {
            for (const key of dirty) {
                seen.push(`${key}:${String(rendered.config.get(key))}->${String(target.config.get(key))}`);
            }
        });

        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "red" });
        assert.deepEqual(seen, ["bg:undefined->red"]);

        await dispatcher.dispatch({ op: "fake.fail-after-write", key: "fg" }).catch(() => undefined);
        assert.deepEqual(
            seen,
            ["bg:undefined->red", "fg:undefined->undefined"],
            "written and reverted before the pass: the hook sees the key and no net change",
        );
    });

    it("runs hooks in the fixed order: graph, layout, pins, arrangement, then the rest", async () => {
        const lane = new DerivationLane(createProjectState());
        const order: string[] = [];
        const slices = [
            "views",
            "scopes",
            "visibility",
            "styles",
            "runs",
            "config",
            "arrangement",
            "pins",
            "layout",
            "graph",
        ] as const;
        for (const slice of slices) {
            lane.register(slice, () => {
                order.push(slice);
            });
            lane.touch(slice, "");
        }

        await lane.settled();
        assert.deepEqual(order, [
            "graph",
            "layout",
            "pins",
            "arrangement",
            "config",
            "runs",
            "styles",
            "visibility",
            "scopes",
            "views",
        ]);
    });

    it("makes a change that arrives during a pass wait for the next pass", async () => {
        const lane = new DerivationLane(createProjectState());
        const log: string[] = [];
        let first = true;
        lane.register("config", async (_rendered, _target, dirty) => {
            log.push(`config:${[...dirty].join(",")}`);
            if (first) {
                first = false;
                await Promise.resolve();
                lane.touch("config", "late");
            }
        });
        lane.register("views", (_rendered, _target, dirty) => {
            log.push(`views:${[...dirty].join(",")}`);
        });

        lane.touch("config", "early");
        lane.touch("views", "v");
        await lane.settled();
        await lane.settled();

        assert.deepEqual(
            log,
            ["config:early", "views:v", "config:late"],
            "the first pass finished before the late change",
        );
    });

    it("holds the restoring flag from the call until the arrangement hook has run", async () => {
        const lane = new DerivationLane(createProjectState());
        const seen: string[] = [];
        for (const slice of ["graph", "arrangement", "config"] as const) {
            lane.register(slice, () => {
                seen.push(`${slice}:${String(lane.restoring)}`);
            });
            lane.touch(slice, "");
        }

        assert.isFalse(lane.restoring);
        lane.restore();
        assert.isTrue(lane.restoring);
        await lane.settled();
        assert.deepEqual(seen, ["graph:true", "arrangement:true", "config:false"]);
        assert.isFalse(lane.restoring);
    });

    it("keeps the restoring flag for the next pass when a restore arrives after the arrangement hook", async () => {
        const lane = new DerivationLane(createProjectState());
        const seen: string[] = [];
        let late = false;
        lane.register("arrangement", () => {
            seen.push(`arrangement:${String(lane.restoring)}`);
        });
        lane.register("config", () => {
            if (!late) {
                late = true;
                lane.restore();
                lane.touch("arrangement", "");
            }

            seen.push(`config:${String(lane.restoring)}`);
        });
        lane.restore();
        lane.touch("arrangement", "");
        lane.touch("config", "");
        await lane.settled();
        await lane.settled();
        assert.deepEqual(seen, ["arrangement:true", "config:true", "arrangement:true"]);
        assert.isFalse(lane.restoring);
    });

    it("stops calling a hook once it is unregistered", async () => {
        const lane = new DerivationLane(createProjectState());
        let calls = 0;
        const unregister = lane.register("config", () => {
            calls++;
        });
        lane.touch("config", "a");
        await lane.settled();
        unregister();
        lane.touch("config", "b");
        await lane.settled();
        assert.strictEqual(calls, 1);
    });

    it("reports a hook that throws and still runs the hooks after it and moves rendered", async () => {
        const errors: unknown[] = [];
        const state = createProjectState();
        const lane = new DerivationLane(state, { onError: (error) => errors.push(error) });
        const ran: string[] = [];
        lane.register("config", () => {
            throw new Error("paint failed");
        });
        lane.register("views", () => {
            ran.push("views");
        });
        lane.touch("config", "a");
        lane.touch("views", "b");
        await lane.settled();

        assert.lengthOf(errors, 1);
        assert.deepEqual(ran, ["views"]);
        assert.notStrictEqual(lane.rendered, state, "rendered is a copy the state's writers cannot reach");
    });
});
