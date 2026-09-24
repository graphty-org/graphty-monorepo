import { type DatasetMeta } from "../build.js";

/** What the knuthMiles dataset is, where it came from and under which terms. */
export const knuthMilesMeta: DatasetMeta = {
    name: "knuth-miles",
    title: "Knuth's North American city mileages",
    description:
        "128 cities of the United States and Canada with the 1949 highway mileage between every pair, as a complete weighted graph (8,128 edges). Node ids are the city names; each city carries its latitude, longitude and population as recorded in the Stanford GraphBase.",
    citation: "D. E. Knuth, The Stanford GraphBase: A Platform for Combinatorial Computing, Addison-Wesley (1993).",
    source: "https://mirrors.ctan.org/support/graphbase/miles.dat",
    license:
        'Derived from the Stanford GraphBase file miles.dat (copyright 1992 Stanford University; "may be freely copied but please do not change it in any way") -- this is a changed file, converted to a graph, and is not part of the Stanford GraphBase.',
    nodes: 128,
    edges: 8128,
    directed: false,
    weighted: true,
    attributes: {
        latitude: "f64: degrees north",
        longitude: "f64: degrees east (negative: west)",
        population: "u32: the population recorded in the Stanford GraphBase",
    },
    groundTruth: null,
    showcases: [
        "minimum spanning tree (Knuth's own demonstration)",
        "travelling-salesman heuristics on real distances",
        "thresholding a complete graph into a sparse road-like graph",
        "geographic and distance-based (MDS, stress) layouts",
    ],
};
