/**
 * @file Frame cost while a 2% time window moves over 1,000,000 edges on 10,000 nodes, which takes the
 * cost of 100,000 node instances out of the frame. The cases and how to run them:
 * `timeline-frame-bench.ts`.
 */
import { describeFrames } from "./timeline-frame-bench";

describeFrames(10_000);
