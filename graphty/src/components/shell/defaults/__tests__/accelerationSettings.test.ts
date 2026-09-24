import { ACCELERATION_POLICIES, ACCELERATION_POLICY_DEFAULT } from "@graphty/graphty-element/session";
import { beforeEach, describe, expect, it } from "vitest";

import {
    ACCELERATION_SETTINGS_STORAGE_KEY,
    DEFAULT_ACCELERATION_SETTINGS,
    readPersistedAccelerationSettings,
    resolveAccelerationSettings,
    writePersistedAccelerationSettings,
} from "../accelerationSettings";

/* Every board below reads the store, so the store is emptied before each of them: a value
   one board wrote must not decide what the next one gets. */
beforeEach(() => {
    window.localStorage.removeItem(ACCELERATION_SETTINGS_STORAGE_KEY);
});

describe("accelerationSettings", () => {
    it("defaults to the element's own default", () => {
        expect(DEFAULT_ACCELERATION_SETTINGS.policy).toBe(ACCELERATION_POLICY_DEFAULT);
    });

    it("round-trips every policy the element lists", () => {
        for (const policy of ACCELERATION_POLICIES) {
            writePersistedAccelerationSettings({ policy });

            expect(resolveAccelerationSettings(readPersistedAccelerationSettings()).policy).toBe(policy);
        }
    });

    it("reads an absent key as the default", () => {
        expect(readPersistedAccelerationSettings()).toEqual({});
        expect(resolveAccelerationSettings(readPersistedAccelerationSettings())).toEqual(DEFAULT_ACCELERATION_SETTINGS);
    });

    it("drops malformed JSON, a non-object, an array and a value the element does not accept", () => {
        for (const stored of ["{", '"auto"', "[1]", '{"policy":"maybe"}', '{"policy":1}']) {
            window.localStorage.setItem(ACCELERATION_SETTINGS_STORAGE_KEY, stored);

            expect(readPersistedAccelerationSettings()).toEqual({});
        }
    });

    it("reads an explicit undefined as the default, not as undefined", () => {
        expect(resolveAccelerationSettings({ policy: undefined })).toEqual(DEFAULT_ACCELERATION_SETTINGS);
    });
});
