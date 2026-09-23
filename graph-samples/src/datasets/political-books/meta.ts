import { type DatasetMeta } from "../build.js";

/** What the politicalBooks dataset is, where it came from and under which terms. */
export const politicalBooksMeta: DatasetMeta = {
    name: "political-books",
    title: "Books about US politics",
    description:
        "Books about US politics sold by Amazon.com around the 2004 election, joined when the same buyers frequently bought both. Mark Newman labelled each book liberal, neutral or conservative from its descriptions and reviews.",
    citation: "V. Krebs, unpublished (compiled 2004), http://www.orgnet.com/; labels by M. E. J. Newman.",
    source: "https://web.archive.org/web/20240730210010id_/https://public.websites.umich.edu/~mejn/netdata/polbooks.zip",
    license:
        'unclear: Mark Newman\'s data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.',
    nodes: 105,
    edges: 441,
    directed: false,
    weighted: false,
    attributes: { label: "string: the book title", lean: "dict: liberal, conservative or neutral (ground truth)" },
    groundTruth: "lean",
    showcases: [
        "two- and three-way community detection against the political lean",
        "force-directed layouts coloured by lean",
    ],
};
