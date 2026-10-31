// The minimum-work-per-frame test mode (src/managers/minimumWork.ts, issue #4218), switched on for
// every graph a file of the "minimum-work" project builds: one small paint batch and one layout
// round per frame, and every other render tick skipped. In hooks, before the file's own, so a graph
// built in a file's beforeAll is split too; beforeEach switches it back on after a test that turned
// it off.
import { beforeAll, beforeEach } from "vitest";

import { setMinimumWorkPerFrame } from "../src/managers/minimumWork";

function switchOn(): void {
    setMinimumWorkPerFrame(true);
}

beforeAll(switchOn);
beforeEach(switchOn);
