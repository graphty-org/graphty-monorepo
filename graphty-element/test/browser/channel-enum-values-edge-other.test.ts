/**
 * @file Every value of the edge channels outside the line and arrow groups changes the picture against the channel's default, in 2D and in 3D. One of the
 * channel-enum-values-* files, split so the browser shards run them side by side; the suite and its instrument
 * are in test/helpers/channel-paints.ts.
 */
import { afterAll, beforeAll, describe, it } from "vitest";

import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";
import { enumValuesSuite } from "../helpers/channel-paints";

enumValuesSuite(
    "the edge channels outside the line and arrow groups",
    (descriptor) => descriptor.target === "edge" && descriptor.group !== "line" && descriptor.group !== "arrows",
    { describe, beforeAll, afterAll, it },
    CHANNEL_DESCRIPTORS,
);
