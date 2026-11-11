/**
 * typedoc.json documents the package's three entries, and every exported symbol carries a description, so the API
 * reference on the docs site has no empty entries.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const PKG = resolve(__dirname, "..");
const CONVERTER = resolve(__dirname, "helpers/convert-typedoc.mjs");
const execFileAsync = promisify(execFile);
const config = JSON.parse(readFileSync(resolve(PKG, "typedoc.json"), "utf8")) as { entryPoints: string[] };

describe("typedoc.json", () => {
    it("documents the core, the browser and the Node entries, and every entry point exists", () => {
        expect(config.entryPoints).toEqual(["./src/index.ts", "./src/browser/index.ts", "./src/node/index.ts"]);
        expect(config.entryPoints.filter((p) => !existsSync(resolve(PKG, p)))).toEqual([]);
    });

    it("gives every exported symbol a description", async () => {
        // in a child process, which coverage does not instrument
        const { stdout } = await execFileAsync(process.execPath, [CONVERTER, PKG, "--not-documented"], {
            maxBuffer: 64 * 1024 * 1024,
        });
        const result = JSON.parse(stdout) as { converted: boolean; messages: string[] };
        expect(result.converted).toBe(true);
        expect(result.messages.filter((m) => m.includes("does not have any documentation"))).toEqual([]);
    });
});
