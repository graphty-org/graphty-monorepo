/**
 * @file What live match counts cost: no build, and each row of the incoming field read once
 * however many ways it is hashed (as asked, and with each toggle that is off turned on).
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../../src/session";
import { build, tableRows } from "../../../src/session/sources/steps/build";

const counter = vi.hoisted(() => ({ reads: 0 }));

vi.mock("../../../src/session/sources/steps/build", async (original) => {
    const real = await original<typeof import("../../../src/session/sources/steps/build")>();
    const counted = (...args: Parameters<typeof real.tableRows>): ReturnType<typeof real.tableRows> => {
        const rows = real.tableRows(...args);
        return rows === null
            ? null
            : new Proxy(rows, {
                  get(target, key, receiver) {
                      if (typeof key === "string" && /^\d+$/.test(key)) {
                          counter.reads++;
                      }
                      return Reflect.get(target, key, receiver) as unknown;
                  },
              });
    };
    return { ...real, build: vi.fn(real.build), tableRows: vi.fn(counted) };
});

describe("source-steps match counts: counted work", () => {
    it.each([50, 400])("reads each of %i rows once and builds nothing", async (size) => {
        const session = createGraphSession({ features: ["source-steps"] });
        const people = Array.from({ length: size }, (_, i) => `p${String(i)},P ${String(i)}`).join("\n");
        await session.data.import(
            { type: "csv", config: { data: `id,name\n${people}` }, name: "people.csv" },
            {
                key: "id",
                type: "person",
            },
        );
        const badges = Array.from({ length: size }, (_, i) => `e${String(i)},p${String(i * 2)}`).join("\n");
        const e = await session.data.stage(
            { type: "csv", config: { data: `entry,badge\n${badges}` }, name: "entries.csv" },
            { key: "entry" },
        );
        vi.mocked(build).mockClear();
        vi.mocked(tableRows).mockClear();
        counter.reads = 0;
        const c = session.data.matchCounts({ from: { source: e, field: "badge" }, into: { space: "person" } });
        assert.strictEqual(c.matched, Math.ceil(size / 2));
        assert.strictEqual(vi.mocked(build).mock.calls.length, 0, "no build");
        assert.strictEqual(vi.mocked(tableRows).mock.calls.length, 1, "one read of the incoming table");
        assert.strictEqual(counter.reads, size, "each row read once");
        session.dispose();
    });
});
