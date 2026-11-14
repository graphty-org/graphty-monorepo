/**
 * @file The `seed` option, one schema for every seeded layout.
 */

import { z } from "zod";

/**
 * A layout seed: an integer >= 0 (0 included) gives the same drawing every time; null, the
 * default, gives a different one each run. The element imposes no seed of its own: a consumer
 * that wants a repeatable drawing passes one.
 */
export const seedSchema = z.number().int().nonnegative().nullable().default(null);
