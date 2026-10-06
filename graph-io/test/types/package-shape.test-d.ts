import * as graphIo from "@graphty/graph-io";
import { expectTypeOf } from "vitest";

// The package is ESM with named exports only: no default export.
expectTypeOf(graphIo).toBeObject();
expectTypeOf(graphIo).not.toHaveProperty("default");

// Listing the graphs of an input and choosing one: the registry answers null for a format that
// does not list its graphs, and importGraph() takes the choice next to the common options.
expectTypeOf(graphIo.listGraphs).returns.resolves.toEqualTypeOf<readonly graphIo.GraphListing[] | null>();
expectTypeOf<graphIo.GraphListing["name"]>().toEqualTypeOf<string | null>();
expectTypeOf<graphIo.GraphChoiceOptions["graphIndex"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<graphIo.ImportGraphOptions>().toMatchTypeOf<graphIo.GraphChoiceOptions>();
