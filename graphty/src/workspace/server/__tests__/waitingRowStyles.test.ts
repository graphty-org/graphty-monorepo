/**
 * @file A waiting load's row in the server form (`WaitingLoads`) is laid out by the data place's source-row rules:
 * each class it uses keeps a rule in data-place.css, so a reopened project's row is padded and aligned.
 */
import { assert, describe, it } from "vitest";

import css from "../../data-place/data-place.css?raw";
import form from "../ServerForm.tsx?raw";

describe("a waiting load's row", () => {
    it("has a rule for every source-row class it uses", () => {
        for (const name of ["dp-source", "dp-source-icon", "dp-source-name"]) {
            assert.include(form, `className="${name}"`, `the row uses ${name}`);
            assert.match(css, new RegExp(`^\\.${name} \\{`, "m"), `data-place.css styles .${name}`);
        }
    });
});
