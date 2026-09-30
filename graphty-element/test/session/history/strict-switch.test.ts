import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { strictStateEnabled } from "../../../src/session/project/strict";

type Global = typeof globalThis & { __GRAPHTY_STRICT_STATE__?: unknown };

describe("the strict-state switch", () => {
    const global = globalThis as Global;
    let saved: unknown;
    let savedEnv: string | undefined;

    beforeEach(() => {
        saved = global.__GRAPHTY_STRICT_STATE__;
        savedEnv = process.env.GRAPHTY_STRICT_STATE;
        delete global.__GRAPHTY_STRICT_STATE__;
        delete process.env.GRAPHTY_STRICT_STATE;
    });

    afterEach(() => {
        global.__GRAPHTY_STRICT_STATE__ = saved;
        if (savedEnv === undefined) {
            delete process.env.GRAPHTY_STRICT_STATE;
        } else {
            process.env.GRAPHTY_STRICT_STATE = savedEnv;
        }
    });

    it("is on in this test project, because the setup file turned it on", () => {
        assert.strictEqual(saved, true);
    });

    it("is off when neither the global nor the variable is set", () => {
        assert.isFalse(strictStateEnabled());
    });

    it("is turned on by the global", () => {
        global.__GRAPHTY_STRICT_STATE__ = true;
        assert.isTrue(strictStateEnabled());
    });

    it("is turned on by GRAPHTY_STRICT_STATE=1 in Node", () => {
        process.env.GRAPHTY_STRICT_STATE = "1";
        assert.isTrue(strictStateEnabled());
    });

    it("reads without throwing where there is no process, as in a browser", () => {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, "process");
        assert.isDefined(descriptor);
        delete (globalThis as { process?: unknown }).process;
        try {
            assert.isFalse(strictStateEnabled());
            global.__GRAPHTY_STRICT_STATE__ = true;
            assert.isTrue(strictStateEnabled());
        } finally {
            Object.defineProperty(globalThis, "process", descriptor);
        }
    });
});
