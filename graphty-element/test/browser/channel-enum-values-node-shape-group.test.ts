/**
 * @file Every value of the other node shape channels changes the picture against the channel's default, in 2D and in 3D. One of the
 * channel-enum-values-* files, split so the browser shards run them side by side; the suite and its instrument
 * are in test/helpers/channel-paints.ts.
 */
import { afterAll, beforeAll, describe, it } from "vitest";

import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";
import { enumValuesSuite } from "../helpers/channel-paints";

/** The node shape and the shapes of its underlay and overlay, each of which lists every shape. */
const SHAPE_LISTS = new Set(["node.shape", "node.underlayShape", "node.overlayShape"]);

enumValuesSuite(
    "the other node shape channels",
    (descriptor) =>
        descriptor.target === "node" && descriptor.group === "shape" && !SHAPE_LISTS.has(descriptor.channel),
    { describe, beforeAll, afterAll, it },
    CHANNEL_DESCRIPTORS,
);
