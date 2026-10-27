import { type DatasetMeta } from "../build.js";
import { PACKED } from "../packed.js";

/** What the veniceTransit dataset is, where it came from and under which terms. */
export const veniceTransitMeta: DatasetMeta = {
    name: "venice-transit",
    title: "Venice public transport",
    description:
        "The bus, tram and waterbus (vaporetto) stops of Venice and its mainland within 20 km of the city, and the links between consecutive stops, from ACTV's December 2016 timetables. Directed: an arc runs from one stop to the next stop a vehicle serves, weighted by the straight-line distance between them in metres. Node ids are the extract's stop numbers; each stop carries its name, latitude, longitude and the modes that serve it.",
    citation:
        "R. Kujala, C. Weckstrom, R. K. Darst, M. N. Mladenovic and J. Saramaki, A collection of public transport network data sets for 25 cities, Scientific Data 5, 180089 (2018). doi:10.1038/sdata.2018.89; data set v1.2, doi:10.5281/zenodo.1186215",
    source: "https://zenodo.org/records/1186215",
    license:
        "Creative Commons Attribution 3.0 Italy (CC BY 3.0 IT): timetable data by ACTV SpA, adapted by R. Kujala, C. Weckstrom and R. Darst. This converted network is a changed version and is available under the same license.",
    nodes: 1874,
    edges: 2702,
    directed: true,
    weighted: true,
    attributes: {
        label: "string: the stop name",
        latitude: "f64: degrees north",
        longitude: "f64: degrees east",
        mode: "dict: what serves the stop: bus, tram, bus and tram, or ferry (the waterbuses)",
    },
    groundTruth: null,
    showcases: [
        "geographic layout from latitude and longitude, at city scale",
        "shortest paths by distance across the lagoon",
        "the waterbus network as a separate piece from the roads",
    ],
    hosting: "remote",
    ...PACKED["venice-transit"],
};
