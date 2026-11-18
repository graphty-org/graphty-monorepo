/**
 * @file `session.config.inEffect`: which graph settings change the drawing in the view as it is,
 * so a settings panel hides the rest without knowing which view ignores what.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createElementSession, createGraphSession } from "../../src/session";

describe("whether a graph setting is in effect", () => {
    it("answers that the 2D view ignores lighting and depth, and keeps the rest", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);

        await session.layout.setDimension("3d");
        assert.deepStrictEqual(session.config.inEffect("lighting"), {
            inEffect: true,
            code: "setting.inEffect",
            params: { setting: "lighting" },
        });

        await session.layout.setDimension("2d");
        assert.deepStrictEqual(session.config.inEffect("lighting"), {
            inEffect: false,
            code: "setting.notIn2d",
            params: { setting: "lighting" },
        });
        assert.isFalse(session.config.inEffect("node.sizeSpace").inEffect);
        assert.isTrue(session.config.inEffect("labels.declutter").inEffect);
        assert.isTrue(session.config.inEffect("node.outlineWidth").inEffect);
        assert.isTrue(session.config.inEffect("background").inEffect);
        session.dispose();
    });

    it("answers that the 2D view keeps a node size space of screen, and ignores pivot", async () => {
        let space: string | undefined = "screen";
        const session = createElementSession({}, { nodeSizeSpace: () => space });
        await session.data.addNodes([{ id: "a" }]);
        await session.layout.setDimension("2d");
        assert.isTrue(session.config.inEffect("node.sizeSpace").inEffect);
        space = "pivot";
        assert.deepStrictEqual(session.config.inEffect("node.sizeSpace"), {
            inEffect: false,
            code: "setting.notIn2d",
            params: { setting: "node.sizeSpace" },
        });
        await session.layout.setDimension("3d");
        assert.isTrue(session.config.inEffect("node.sizeSpace").inEffect);
        session.dispose();
    });

    it("refuses a key that names no graph setting", () => {
        const session = createGraphSession();
        try {
            session.config.inEffect("shininess" as "lighting");
            assert.fail("an unknown setting was answered");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }
        session.dispose();
    });
});
