/**
 * @file The `seed` option, one schema for every seeded layout.
 */

import { z } from "zod";

/**
 * A layout seed: an integer >= 0 (0 included) gives the same drawing every time; null, the
 * default, gives a different one each run. The element imposes no seed of its own: a consumer
 * that wants a repeatable drawing passes one.
 *
 * A seeded simulation layout starts from its seed at every apply and whenever new data arrives,
 * never from the drawing already on screen, so the same seed over the same graph draws the same
 * picture however often it is applied and however the data was split across writes. The picture
 * is the same on the same engine: a run on an accelerator is repeatable, but its floating-point
 * sums are not ordered as the CPU's are, so the CPU and the accelerator can settle the same seed
 * in slightly different places.
 */
export const seedSchema = z.number().int().nonnegative().nullable().default(null);
