/**
 * @file Switches the file styles experiment on for every session and element a test file creates
 * that names no features of its own, on top of whatever the configuration switched on, and puts
 * the page default back afterwards.
 */

import { afterAll, beforeAll, beforeEach } from "vitest";

import { pageDefaultFeatures, setDefaultFeatures } from "../../src/features/resolve";

/** Call once at the top of a test file that reads or writes a file's styles. */
export function fileStylesOn(): void {
    let before: readonly string[] = [];
    const on = (): void => {
        const now = pageDefaultFeatures();
        if (!now.includes("file-styles") && !now.includes("all")) {
            setDefaultFeatures([...now, "file-styles"]);
        }
    };
    beforeAll(() => {
        before = pageDefaultFeatures();
        on();
    });
    beforeEach(on);
    afterAll(() => {
        setDefaultFeatures(before);
    });
}
