/**
 * @file Every value of the node channels outside the shape group changes the picture against the channel's default, in 2D and in 3D. One of the
 * channel-enum-values-* files, split so the browser shards run them side by side; the suite and its instrument
 * are in test/helpers/channel-paints.ts.
 */
import { afterAll, beforeAll, describe, it } from "vitest";

import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";
import { enumValuesSuite } from "../helpers/channel-paints";

enumValuesSuite(
    "the node channels outside the shape group",
    (descriptor) => descriptor.target === "node" && descriptor.group !== "shape",
    { describe, beforeAll, afterAll, it },
    CHANNEL_DESCRIPTORS,
);
