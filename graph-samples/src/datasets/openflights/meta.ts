import { type DatasetMeta } from "../build.js";

/** What the openflights dataset is, where it came from and under which terms. */
export const openflightsMeta: DatasetMeta = {
    name: "openflights",
    title: "OpenFlights airline routes",
    description:
        "The world's airports and the airline routes between them as of June 2014. Directed: an arc runs from origin to destination, weighted by the number of airlines (codeshares included) listed on that route. Node ids are IATA codes, or ICAO codes for the few airports without one; only airports with a route are included.",
    citation: "OpenFlights.org, Airport, airline and route databases (routes as of June 2014), https://openflights.org/data.php",
    source: "https://github.com/jpatokal/openflights/tree/e3bc6dedbcceb8b7b74248a00dcd6207254da6bd/data",
    license:
        "Open Database License (ODbL) 1.0, contents under the Database Contents License 1.0. This converted database is a derived database and is itself available under the ODbL 1.0.",
    nodes: 3214,
    edges: 36906,
    directed: true,
    weighted: true,
    attributes: {
        label: "string: the airport name",
        city: "string: the city it serves",
        country: "dict: the country it is in",
        latitude: "f64: degrees north, to 6 decimal places",
        longitude: "f64: degrees east (negative: west), to 6 decimal places",
    },
    groundTruth: null,
    showcases: [
        "geographic layout from latitude and longitude",
        "strongly connected components and directed shortest paths",
        "betweenness and degree of hub airports",
        "communities that roughly follow continents",
    ],
};
