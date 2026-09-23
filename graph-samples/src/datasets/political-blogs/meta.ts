import { type DatasetMeta } from "../build.js";

/** What the politicalBlogs dataset is, where it came from and under which terms. */
export const politicalBlogsMeta: DatasetMeta = {
    name: "political-blogs",
    title: "US political blogs, 2004",
    description:
        "Hyperlinks between US political weblogs, crawled from their front pages in February 2005, with each blog labelled liberal or conservative from blog directories and by hand. Directed; 266 blogs have no links. The crawl recorded 65 links twice and 3 blogs linking to themselves: each link is kept once and the self-links are dropped.",
    citation:
        "L. A. Adamic and N. Glance, The political blogosphere and the 2004 U.S. election: divided they blog, Proceedings of the 3rd International Workshop on Link Discovery (LinkKDD 2005), 36-43. doi:10.1145/1134271.1134277",
    source: "https://web.archive.org/web/20240730122800id_/https://public.websites.umich.edu/~mejn/netdata/polblogs.zip",
    license:
        'unclear: posted on Mark Newman\'s data page with the authors\' permission, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.',
    nodes: 1490,
    edges: 19022,
    directed: true,
    weighted: false,
    attributes: {
        label: "string: the blog's address",
        lean: "dict: liberal or conservative (ground truth)",
        directory: "string: the blog directories the label came from",
    },
    groundTruth: "lean",
    showcases: [
        "two-way community detection against the political lean",
        "PageRank and HITS on a directed graph",
        "degree-corrected block models",
        "force-directed layouts coloured by lean",
    ],
};
