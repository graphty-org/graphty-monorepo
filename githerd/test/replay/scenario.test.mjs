import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../../lib/config.mjs";
import { createGitHub } from "../../lib/github.mjs";
import { updateLane } from "../../lib/master.mjs";
import { createFakeGh, httpOutput } from "../helpers/fake-gh.mjs";
import { BACKWARDS, createReplay } from "./replay.mjs";

const CONFIG = normalizeConfig(
    JSON.parse(readFileSync(new URL("../../../githerd.config.json", import.meta.url), "utf8")),
);
const MASTER = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";
/** Lane id by the workflow name the runs answer carries. */
const LANES = { CI: "ci", GPU: "gpu", Hosts: "hosts" };

describe("replay scenario", () => {
    it("10-02 polled every minute through the real client: the GitHub lane's alarms, no backwards alarm, no writes", async () => {
        const replay = createReplay();
        const fake = createFakeGh((call) => httpOutput(replay.response(call)));
        const gh = createGitHub({
            repo: "graphty-org/graphty-monorepo",
            exec: fake.exec,
            mode: "dry-run",
            ledger: () => {},
            now: replay.now,
        });
        /** @type {Record<string, any>} */
        const lanes = {};
        /** @type {{at: string, event: string, lane: string, runId: number, attempt?: number}[]} */
        const events = [];
        let changed = 0;
        const from = Date.parse("2026-10-02T00:00:00Z");
        for (let at = from; at < from + 24 * 3_600_000; at += 60_000) {
            replay.setTime(at);
            const res = await gh.get(MASTER);
            if (res.changed) changed++;
            for (const [name, lane] of Object.entries(LANES)) {
                const runs = res.body.workflow_runs.filter((/** @type {any} */ r) => r.name === name);
                const out = updateLane(lane, lanes[lane], runs, CONFIG, at);
                lanes[lane] = out.lane;
                for (const e of out.events) events.push({ at: new Date(at).toISOString().slice(11, 16), ...e });
            }
        }

        expect(fake.calls).toHaveLength(1440);
        expect(fake.writes()).toEqual([]);
        expect(changed).toBeLessThan(1440);
        expect(gh.rate.counters.core.used).toBeLessThan(200);
        // The stale 09-30 run never raises an alarm.
        expect(events.filter((e) => e.runId === BACKWARDS.runId)).toEqual([]);
        // Every lane change of the day, as the record and that day's watcher saw them: CI red from the
        // 10-01 evening run until 03:27; GPU out of balance at 04:04 (the watcher: 04:05) and green
        // only when a newer run finished, since a cancelled run is the newest finished one between;
        // the Windows host failures from 04:34; the camera race on CI at 05:00; the benchmark row at
        // 07:29 (the watcher: 07:30); the balance again at 23:42 (the watcher: 23:43).
        expect(events.map((e) => `${e.at} ${e.event} ${e.lane} ${e.runId}/${e.attempt}`)).toEqual([
            "00:00 lane-green gpu 36930897006/1",
            "00:00 lane-green hosts 36930896966/1",
            "00:01 lane-red ci 36930897062/1",
            "03:27 lane-green ci 36955648111/1",
            "04:06 lane-red gpu 36962785245/1",
            "04:36 lane-red hosts 36961459359/1",
            "05:02 lane-red ci 36964426977/1",
            "05:51 lane-green gpu 36964426982/1",
            "05:55 lane-green ci 36967422970/1",
            "07:09 lane-green hosts 36973764472/1",
            "07:31 lane-red gpu 36973764479/1",
            "08:21 lane-green gpu 36973764479/2",
            "23:42 lane-red gpu 37078532134/1",
        ]);
    });
});
