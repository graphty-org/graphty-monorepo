import { type DatasetMeta } from "../build.js";

/** What the contiguousUsa dataset is, where it came from and under which terms. */
export const contiguousUsaMeta: DatasetMeta = {
    name: "contiguous-usa",
    title: "Contiguous United States",
    description:
        "The 48 contiguous states and the District of Columbia, joined when they share a land border. States that touch only at a point (the Four Corners) or face each other across water are not joined. Node ids are postal codes; latitude and longitude are each state's 2020 centre of population.",
    citation:
        "U.S. Census Bureau, County Adjacency File (2024); U.S. Census Bureau, Centers of Population by State, 2020 Census.",
    source: "https://www2.census.gov/geo/docs/reference/county_adjacency/county_adjacency2024.txt",
    license:
        "Public domain: works of the US federal government (17 U.S.C. 105). Borders derived from the Census county adjacency file; centres of population from https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt",
    nodes: 49,
    edges: 107,
    directed: false,
    weighted: false,
    attributes: {
        label: "string: the state name",
        latitude: "f64: the latitude of the 2020 centre of population, degrees north",
        longitude: "f64: the longitude of the 2020 centre of population, degrees east (negative: west)",
        population: "u32: the 2020 census population",
    },
    groundTruth: null,
    showcases: [
        "planar layouts (the graph is planar)",
        "graph colouring (four colours suffice)",
        "BFS layers and eccentricity from one state",
        "geographic layout from latitude and longitude",
    ],
};
