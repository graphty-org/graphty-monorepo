import { assert, describe, it } from "vitest";

import { GraphBackground } from "../../src/config/GraphStyle";

const skybox = (data: string): boolean => GraphBackground.safeParse({ backgroundType: "skybox", data }).success;

describe("a skybox image URL", () => {
    it("accepts any http(s) host, including localhost and an IP address", () => {
        assert.isTrue(skybox("https://example.com/sky.png"));
        assert.isTrue(skybox("http://localhost:6006/assets/sky.png"));
        assert.isTrue(skybox("http://127.0.0.1:9000/sky.png"));
    });

    it("refuses other protocols and strings that are not URLs", () => {
        assert.isFalse(skybox("ftp://example.com/sky.png"));
        assert.isFalse(skybox("javascript:alert(1)"));
        assert.isFalse(skybox("sky.png"));
    });
});
