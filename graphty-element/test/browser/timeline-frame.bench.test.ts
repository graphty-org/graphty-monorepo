/**
 * @file Frame cost while a 2% time window moves over 1,000,000 edges on 100,000 nodes. The cases and
 * how to run them: `timeline-frame-bench.ts`.
 */
import { describeFrames } from "./timeline-frame-bench";

describeFrames(100_000);
