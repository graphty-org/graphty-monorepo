# Files Cytoscape loads in place of a corpus file

Cytoscape desktop 3.10.5 cannot load two corpus files, so `cytoscape-corpus.mjs` loads the same NDEx network in its
other encoding instead (`regenerate-corpus.mjs` passes the file named after the sample). The scene still names the
corpus file's hash. Nothing else reads these files.

| File                      | Sample               | Source                                                                                              | License     | Why                                                                            |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `cx2-imatinib-smpdb.cx`   | `cx2-imatinib-smpdb` | https://public.ndexbio.org/v2/network/66a902f5-2022-11e9-bb6a-0ac135e8bacf (CX)                     | none stated | Cytoscape fails to load the CX2 encoding: "Network view is null"               |
| `cx-polygenic-sle.cx2.gz` | `cx-polygenic-sle`   | https://public.ndexbio.org/v3/networks/26855444-c7db-11ec-b397-0ac135e8bacf (CX2, gzipped; Git LFS) | CC-BY-4.0   | CyREST throws reading the CX encoding's node views (an enhancedGraphics chart) |
