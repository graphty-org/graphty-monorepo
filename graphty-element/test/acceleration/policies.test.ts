import { assert, describe, it } from "vitest";

import { ACCELERATION_POLICIES, ACCELERATION_POLICY_DEFAULT, isAccelerationPolicy } from "../../src/acceleration";

describe("the acceleration policy list, its default and its guard", () => {
    it("the list carries exactly the three policies in order", () => {
        assert.deepStrictEqual([...ACCELERATION_POLICIES], ["auto", "off", "required"]);
    });

    it("the default is one of them and is auto", () => {
        assert.strictEqual(ACCELERATION_POLICY_DEFAULT, "auto");
        assert.isTrue(isAccelerationPolicy(ACCELERATION_POLICY_DEFAULT));
    });

    it("the guard accepts each of them and rejects a near miss, a number and undefined", () => {
        for (const policy of ACCELERATION_POLICIES) {
            assert.isTrue(isAccelerationPolicy(policy), policy);
        }

        assert.isFalse(isAccelerationPolicy("requried"));
        assert.isFalse(isAccelerationPolicy(1));
        assert.isFalse(isAccelerationPolicy(undefined));
    });
});
