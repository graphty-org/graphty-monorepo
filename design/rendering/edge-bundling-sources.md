# Edge bundling: sources, timings and cited code

The long tables behind [edge-bundling.md](edge-bundling.md): every published timing, every method,
every paper and implementation, the platform limits, the places where sources disagree, what was not
verified, and the repository code the design cites. Hardware differs between tables; old numbers are
on old hardware. All figures here are measured (published, or read in this repository) unless the
row says estimate.

Contents:

1. Timings
2. Every method in one matrix
3. Papers
4. Implementations
5. Libraries checked that do not bundle
6. Platform limits
7. Where sources disagree
8. Not verified
9. Repository code and design records cited

---

## 1. Timings

### 1.1 One graph, many methods (CUBu paper, Table 1)

US airlines, 235 nodes, about 2,100 edges, 86K sample points. Numbers collected from each method's
own paper, so hardware differs (2009-2015 machines; CUBu on a GTX 690). Seconds:

| FDEB |  DEB | SBEB | GBEB | ADEB | 3DHEB | KDEEB | MINGLE |  CUBu |
| ---: | ---: | ---: | ---: | ---: | ----: | ----: | -----: | ----: |
|   65 | 27.5 | 26.6 |  5.6 |  1.3 |   0.7 |   0.5 |    0.2 | 0.014 |

### 1.2 One machine, many methods (spanner paper, Table 3)

Ryzen 5 5600X with an RTX 3070, seconds:

| Method                        | Airlines (2.1K edges) | Migrations (9.7K edges) | Air traffic (16.5K edges) | Implementation |
| ----------------------------- | --------------------: | ----------------------: | ------------------------: | -------------- |
| CUBu                          |                  0.01 |                    0.01 |                      0.01 | C++/CUDA       |
| KDEEB                         |                  0.01 |                    0.03 |                      0.05 | C++            |
| Edge-path with greedy spanner |                  0.01 |                    0.11 |                      0.19 | C++, one core  |
| Plain edge-path               |                  0.03 |                    0.60 |                      2.67 | C++            |
| Winding Roads                 |                  0.35 |                    3.27 |                      7.60 | C++            |
| Force-directed                |                  2.34 |                   17.97 |                     32.50 | JavaScript     |

Edge-path with spanner, larger: Amazon subset (192K nodes, 269K edges) 11 s against 47 min for
plain edge-path; Panama Papers (743K nodes, 1.12M edges) 9.5 min against 11.5 h. 5-256x faster
than plain edge-path, same worst case.

### 1.3 The original edge-path paper (2022)

C++, Ryzen 5 5600X: Cubes 128 ms, Noise 401 ms, US airlines (235 nodes, 2,101 edges) 920 ms,
Migrations (1,702 nodes, 9,726 edges, directed) 10.6-15.3 s, Air traffic (1,533 nodes, 14,825
edges) 49.6 s, Amazon subset (192K, 269K) 7.5 hours. On the same Air traffic graph: CUBu 5 ms
including rendering, KDEEB 45 ms, force-directed 32.5 s, divided force-directed 3.2 h, Winding
Roads 7.6 s, confluent drawing (adapted to fixed positions) 157 s. The authors: "works well up to
about ten thousand edges".

### 1.4 CUBu and KDEEB on one GPU (CUBu paper, Table 2)

One GPU of a GTX 690 (2012), CUDA, presets (15 iterations, 512 x 512 grid), milliseconds:

| Graph           |   Edges | Samples | KDEEB | CUBu |
| --------------- | ------: | ------: | ----: | ---: |
| US airlines     |   2,099 |     86K |   500 |   14 |
| US migrations   |   9,780 |    221K | 1,500 |   24 |
| France airlines |  17,275 |    330K | 1,800 |   25 |
| Amazon          | 899,791 |     19M | 8,053 |  152 |

Also Radial (4K edges) 23 ms and Poker 11 ms. CUBu presets: kernel radius 5% of the drawing, 15
iterations (10-15 converge), 512 x 512 grid (1024 x 1024 for the paper's figures), about one sample
per 10 px of edge length. Cost O(pixels x iterations x samples) worst case; measured linear in
iterations and samples and in the square root of the pixel count, roughly independent of the
radius. On a 2021 RTX 3070, Air traffic took 5 ms including rendering.

### 1.5 FFTEB (Table 1)

GTX 690, 1000 x 1000 image, kernel 21 px, 10 iterations, milliseconds:

| Graph           |   Edges | KDEEB | CUBu | FFTEB | ADEB directional | CUBu directional | FFTEB directional |
| --------------- | ------: | ----: | ---: | ----: | ---------------: | ---------------: | ----------------: |
| US airlines     |   2,099 |   500 |   14 |    10 |              150 |               28 |                11 |
| Poker           |   2,127 |   400 |   11 |     8 |              200 |               22 |                 6 |
| Radial          |   4,021 | 1,500 |   23 |    13 |              450 |               46 |                13 |
| US migration    |   9,780 | 1,500 |   24 |    15 |              650 |               48 |                15 |
| France airlines |  17,275 | 1,800 |   25 |    16 |              400 |               50 |                13 |
| Amazon          | 899,791 | 8,053 |  152 |    93 |              n/a |              304 |                98 |

Complexity O(I(N + R^2 log R)) against CUBu's O(I(N + R^3)) worst case. Streams sample chunks so a
graph larger than GPU memory fits (63 billion points, over 15 GB, for one migrations run).

### 1.6 Bundling in a browser (PBEB paper, Table I)

Desktop i7 3.6 GHz with a GTX 1080 Ti, Chrome, milliseconds per iteration (similarity, bundling and
rendering):

| Graph               | Edges | Force CPU | Force CUDA | Force d3 (JS) | TBEB WebGL | MINGLE JS | FFTEB CUDA | PBEB WebGL |
| ------------------- | ----: | --------: | ---------: | ------------: | ---------: | --------: | ---------: | ---------: |
| US airlines         |  2.1K |       900 |        105 |         1,080 |         15 |       170 |         19 |          5 |
| France airlines     |   17K |     2,100 |        926 |           n/a |        n/a |     1,040 |        380 |         20 |
| Large US migrations |  546K |       n/a |        n/a |           n/a |        n/a |    93,600 |      5,200 |        103 |

On a Nexus 9 tablet (airlines): force d3 3,423 ms per iteration, MINGLE JS 664, TBEB 49, PBEB 30
(France airlines 60). PBEB samples fewer sites than FFTEB (2.4M against 6.4M on the large graph), so
read the comparison as "the same order as native CUDA". PBEB is the strongest evidence that density
bundling runs at interactive rates in a browser without compute shaders.

Earlier browser figures (Wu, Yu and Yu, TBEB, IEEE Big Data 2015, Tables I-III): d3.ForceBundle on a
desktop i7, synthetic graphs: 100 edges 0.126 s, 500 edges 2.6 s, 1,000 edges 10.4 s, 2,000 edges
11.3 s; US migration (2,180 edges) 19 s desktop, 60 s laptop, 12.8 s tablet. TBEB on about 2k edges:
0.05 s desktop (GTX 660), 0.09 s laptop, 0.16-0.23 s tablet.

### 1.7 The WebGPU edge-path thesis (Ellhotka, TU Wien 2025)

Apple M4 MacBook Air, theta-spanner variant with Floyd-Warshall in WGSL, average ms, against the
CPU original:

| Graph                          | WebGPU | CPU (C++ spanner edge-path) |
| ------------------------------ | -----: | --------------------------: |
| Airlines                       |     38 |                          16 |
| Migrations                     |    348 |                         292 |
| Air traffic                    |    287 |                         563 |
| Complete, 529 nodes (140K e)   |    150 |                       1,250 |
| Complete, 1,024 nodes (524K e) |    924 |                       6,607 |

A naive JavaScript version: 15.8 s airlines, 44 min migrations. Re-computation after a parameter
change: 12-54 ms. Graphs of 193K and 743K vertices could not run: the all-pairs matrix must fit one
buffer (about 8,200 vertices at the 256 MiB spec minimum). The bottlenecks it reports: upload, a
CPU-driven Floyd-Warshall loop with one dispatch per step, readback, and Canvas2D rendering. Note
the spanner paper's single-core figure for Air traffic is 190 ms, faster than the WebGPU port's
287 ms.

### 1.8 3D density bundling (Zielasko et al. 2019, Table 2)

C++ on the CPU with Intel TBB, mean of 10 runs, core algorithm. Grid sized from the average edge
length (20 sample points per average edge), kernel size 3, 4 moves per point, 3 cycles, under 200 MB:

| Graph                | Nodes |  Edges | Voxels |  3D | Directed |      Time |
| -------------------- | ----: | -----: | -----: | --: | -------: | --------: |
| NEST (macaque brain) |    32 |    564 |    25K | yes |      yes |     69 ms |
| US airlines          |   235 |  2,101 |    15K |  no |       no |    296 ms |
| funcBrain            |   437 |  8,031 |    72K | yes |       no |    674 ms |
| US migration         | 6,517 |  9,780 |     8K |  no |      yes |    474 ms |
| funcBrain full       |   437 | 95,266 |    51K | yes |       no | 10,044 ms |

Voxel count trades scale for time: airlines at 3,772 cells about 100 ms, 14,720 (the default)
about 700 ms, 59,248 about 5,800 ms (Fig. 7); grid resolution "profoundly influences the scale of
the bundling". The authors call it up to a magnitude slower than CUBu, attributing that to the CPU,
not the method. Direction-aware (opposite edges get separate trails), and it keeps explicit
edge-to-bundle links, which helps picking and unbundling.

### 1.9 Other measured figures

- Force-directed, Holten's own C++: 19 s airlines, 80 s migrations (9,660 edges), Core 2 2.66 GHz,
  2009 (as quoted in Gansner et al. 2011, Table 1).
- MINGLE, CPU (Xeon E5506 2.13 GHz): airlines (1,297 edges) 0.1 s; migrations (9,660) 1.0 s;
  wiki-Vote (100,762) 18.4 s; amazon0302 (899,792) 277 s; 4.65M edges 1,049 s.
- Ordered bundles (MSAGL, 3.1 GHz quad core, Table 1): airlines (235 nodes, 1,297 edges) 3.3 s;
  jazz (2,732 edges) 4.0 s; power grid (4,941 nodes, 6,594 edges) 26 s; migrations (6,529 edges)
  36 s.
- datashader `hammer_bundle`: 100 nodes, 20,000 random edges, 400 x 400 canvas: 13.6-15.3 s of CPU
  including rendering, against 1.7 s for straight edges.
- MLSEB (Titan X): airlines 22 ms against FFTEB 40; 546K edges 554 ms against 123.
- Divided force-directed bundling on Air traffic (14.8K edges): 3.2 hours.
- Spectral sparsification front-end (FEB, IEEE VIS 2025): 61% runtime improvement over the base
  method.

### 1.10 graphty-element's own renderer (`design/edges/sharp-corners.md`)

RTX 4070 SUPER, ANGLE over Vulkan, 4x MSAA, 50,000 edges of about 3 pieces each (150K pieces):

| Variant             | Update ms (2D / 3D) | Still frame ms (2D / 3D) |
| ------------------- | ------------------: | -----------------------: |
| Shipped (joined)    |           4.6 / 4.4 |              0.87 / 0.52 |
| Shipped, miter-clip |           4.9 / 4.8 |              0.89 / 0.62 |

Moving frames 1.6-2.2 ms. SwiftShader: 47.8 ms a still frame at 7,500 pieces, 220.8 ms at 30,000
(2D); a plain non-instanced mesh of the same rectangles 28.6 ms at 30,000; about 1,080 ms a frame for
the 50,000-edge scene. "Its cost follows the instance count, not the vertices."

### 1.11 Estimates (not measured)

Density bundle, 15 iterations at 512 x 512, about 13 samples an edge:

| Edges | Samples | WebGPU desktop |   WebGPU iPad M1+ | WebGPU iPad A12-A14 |  CPU (JS) |
| ----: | ------: | -------------: | ----------------: | ------------------: | --------: |
|    1k |     13K |        2-10 ms |          15-40 ms |            10-40 ms | 30-150 ms |
|   10k |    130K |        5-20 ms |          25-80 ms |           30-120 ms |   0.2-1 s |
|  100k |    1.3M |       20-80 ms |         80-300 ms |          150-600 ms |   1.5-5 s |
|    1M |     13M |        0.3-1 s | chunk the samples |   chunk the samples |   15-50 s |

The blur alone is about 512^2 x 2 x 51 taps = 27M taps an iteration, about 400M over 15 iterations,
whatever the edge count; an M1 iPad has about 68 GB/s of memory bandwidth against the GTX 690's
192 GB/s per GPU, so the memory-bound gather is about 3x slower there. A box-filter cascade costs
about 1.6M adds an iteration at 512^2 regardless of radius.

Force-directed work model, d3.ForceBundle defaults (6 cycles, 1-32 points, about 840 point-force
evaluations per compatible pair):

| Edges | Pairs | Force evaluations (all pairs) | Compatible-pair list at 20% |
| ----: | ----: | ----------------------------: | --------------------------: |
|    1k |   1e6 |                         8.4e8 |                      0.8 MB |
|   10k |   1e8 |                        8.4e10 |                       80 MB |
|  100k |  1e10 |                        8.4e12 |         8 GB (not possible) |

Renderer, scaling section 1.10 linearly, 32 points an edge:

| Edges | Pieces | Slot memory (CPU copy; GPU the same again) |  Still frame | Full update |
| ----: | -----: | -----------------------------------------: | -----------: | ----------: |
|   10k |   310K |                                      18 MB |   about 2 ms | about 10 ms |
|  100k |   3.1M |                               about 170 MB |  about 18 ms | about 95 ms |
|    1M |    31M |                                     1.8 GB | not drawable |             |

On SwiftShader (about 7.4 ms per 1,000 instanced pieces): 1k bundled edges at 32 points is about
230 ms a frame, 10k about 2.3 s. GPU readback of a bundle at 100k edges: about 10 MB. A route mesh
reading 3.2M points from an RGBA32F texture: about 51 MB of GPU memory plus the CPU copy. A CPU pick
grid over 3.2M points: tens of ms to build and 50-100 MB of index.

## 2. Every method in one matrix

| Method                    | Needs                    | Cost class                    | Large-graph evidence               | Iterative      | 3D                        | Direction      | Ambiguity              |
| ------------------------- | ------------------------ | ----------------------------- | ---------------------------------- | -------------- | ------------------------- | -------------- | ---------------------- |
| Hierarchical (2006)       | hierarchy + layout       | O(E h), one pass              | any size                           | beta blend     | yes (3D variants)         | color gradient | within a branch        |
| Force-directed (2009)     | 2D layout                | O(E^2 P) per iteration        | about 10K edges, minutes on CPU    | yes            | yes (Zielasko 2016)       | no             | high                   |
| GBEB (2008)               | 2D layout                | control mesh, about quadratic | small                              | no             | no                        | no             | high                   |
| Winding Roads (2010)      | layout                   | grid shortest paths           | 16K edges in 7.6 s                 | iterated       | on a sphere (geographic)  | no             | medium                 |
| Divided (2011)            | 2D layout, directed      | more than force-directed      | 15K edges in 3.2 h                 | yes            | not published             | yes (lanes)    | lower                  |
| SBEB (2011)               | 2D layout + clustering   | GPU images                    | seconds                            | yes            | no                        | no             | high                   |
| MINGLE (2011)             | 2D layout                | kNN + multilevel              | 1M edges in minutes                | multilevel     | not published             | no             | high                   |
| KDEEB (2012)              | layout                   | O(I N R^2)                    | 900K edges in 8 s (GPU + CPU)      | yes            | yes, slow (Boettger 2014) | ADEB variant   | high                   |
| CUBu (2016)               | 2D layout                | O(I N sqrt(pixels)), all GPU  | 900K edges in 152 ms (GTX 690)     | yes, real time | no (2D grid)              | yes            | high                   |
| FFTEB (2017)              | 2D layout                | O(I(N + R^2 log R))           | 900K edges in 93 ms; streaming     | yes            | no                        | yes            | high                   |
| MLSEB (2017)              | layout                   | neighbor least squares        | 546K edges about 0.5 s/iteration   | yes            | plausible                 | no             | high                   |
| PBEB (2023)               | 2D layout, WebGL         | density in fragment shaders   | 546K edges 103 ms/iteration        | yes            | no                        | no             | high                   |
| 3D voxel density (2019)   | layout                   | linear, coarse voxel grid     | 95K edges in 10 s (CPU)            | yes            | yes                       | yes            | high                   |
| Edge-path (2022)          | layout (any dimension)   | O(E^2 log V)                  | 10K edges practical                | no             | yes                       | directed paths | none across components |
| Edge-path, spanner (2023) | layout                   | spanner + Dijkstra            | 1.1M edges in 9.5 min, one core    | no             | yes                       | directed paths | none across components |
| Ordered bundles (2011)    | 2D layout, node outlines | visibility-graph routing      | several thousand edges in a minute | no             | no                        | lanes          | low (own lane each)    |
| Confluent (2017)          | structure-driven layout  | bicliques / modules           | small                              | no             | no                        | no             | none                   |

Shared pipeline (survey): sample edges into polylines; define a distance and a compatibility between
edges; apply the bundling operator; post-process (relaxation, smoothing); render (shading,
transparency, direction). Implicit (iterative) methods give multiscale bundling for free through the
kernel radius.

## 3. Papers

Bundling methods:

- Holten, "Hierarchical Edge Bundles: Visualization of Adjacency Relations in Hierarchical Data",
  IEEE TVCG 12(5):741-748, 2006.
- Holten and van Wijk, "Force-Directed Edge Bundling for Graph Visualization", CGF 28(3):983-990,
  2009: https://diglib.eg.org/handle/10.1111/v28i3pp0983-0990 (timings reproduced in course slides:
  https://faculty.cs.niu.edu/~dakoop/cs627-2020fa/lectures/lecture06.pdf)
- Cui et al., "Geometry-Based Edge Clustering for Graph Visualization" (GBEB), IEEE TVCG 14(6), 2008.
- Lambert, Bourqui and Auber, "Winding Roads: Routing edges into bundles", CGF 29(3), 2010.
- Selassie, Heller and Heer, "Divided Edge Bundling for Directional Network Data", IEEE TVCG 17(12),
  2011: https://idl.uw.edu/papers/divided-edge-bundling
- Ersoy et al., "Skeleton-Based Edge Bundling for Graph Visualization" (SBEB), IEEE TVCG 17(12),
  2011: https://webspace.science.uu.nl/~telea001/InfoVis/SBEB
- Gansner, Hu, North and Scheidegger, "Multilevel Agglomerative Edge Bundling for Visualizing Large
  Graphs" (MINGLE), PacificVis 2011:
  https://www.sci.utah.edu/images/people/Alumni/scheidegger/gansner_edge_bundling.pdf and
  https://www.graphviz.org/pdf/mingle.1.pdf
- Hurter, Ersoy and Telea, "Graph Bundling by Kernel Density Estimation" (KDEEB), CGF 31(3), 2012:
  https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf
- Boettger et al., "Three-Dimensional Mean-Shift Edge Bundling for the Visualization of Functional
  Connectivity in the Brain", IEEE TVCG 20(3), 2014.
- Peysakhovich, Hurter and Telea, attribute-driven edge bundling (ADEB), PacificVis 2015.
- Wu, Yu and Yu, "Texture-Based Edge Bundling" (TBEB), IEEE Big Data 2015:
  https://cse.unl.edu/~yu/homepage/publications/paper/2015.Texture-Based%20Edge%20Bundling.pdf
- van der Zwan, Codreanu and Telea, "CUBu: Universal Real-Time Bundling for Large Graphs", IEEE TVCG
  22(12):2550-2563, 2016: https://webspace.science.uu.nl/~telea001/uploads/PAPERS/TVCG15/paper.pdf
- Zielasko et al., "Interactive 3D Force-Directed Edge Bundling", CGF 35(3), 2016:
  https://diglib.eg.org/handle/10.1111/cgf12881
- Lhuillier, Hurter and Telea, "FFTEB: Edge Bundling of Huge Graphs by the Fast Fourier Transform",
  PacificVis 2017: https://webspace.science.uu.nl/~telea001/uploads/PAPERS/PacificVis17/paper.pdf and
  https://hal-enac.archives-ouvertes.fr/hal-01533755
- Wu, Zeng, Zhu and Yu, "MLSEB: Edge Bundling using Moving Least Squares Approximation", Graph
  Drawing 2017: https://www.alphaxiv.org/abs/1709.01221
- Zielasko et al., "Voxel-based edge bundling through direction-aware kernel smoothing", Computers
  and Graphics 83:87-96, 2019: https://vr.rwth-aachen.de/media/papers/181/Zielasko2019_redSize.pdf and
  https://vr.rwth-aachen.de/publication/02181
- Wallinger, Archambault, Auber, Noellenburg and Peltonen, "Edge-Path Bundling: A Less Ambiguous
  Edge Bundling Approach", IEEE TVCG 28(1):313-323, 2022: https://arxiv.org/abs/2108.05467
- Wallinger et al., "Faster Edge-Path Bundling Through Graph Spanners", CGF 42(6), 2023:
  https://diglib.eg.org/handle/10.1111/cgf14789 (PDF:
  https://diglib.eg.org/bitstream/handle/10.1111/cgf14789/v42i6_33_14789.pdf)
- Wu et al., "Accelerating Web-based Graph Visualization with Pixel-Based Edge Bundling" (PBEB),
  IEEE Big Data 2023: https://par.nsf.gov/servlets/purl/10539354
- Ellhotka, "Improving the Performance of Edge-Path Bundling With WebGPU", TU Wien bachelor thesis,
  2025: https://www.cg.tuwien.ac.at/research/publications/2025/ellhotka-2025-ipo/
- Bereg, Holroyd, Nachmanson and Pupyrev, "Edge Routing with Ordered Bundles", GD 2011 / CGTA 2016:
  https://arxiv.org/abs/1209.4227
- Dickerson, Eppstein, Goodrich and Meng, "Confluent Drawings", GD 2003; Bach, Riche, Hurter,
  Marriott and Dwyer, "Towards Unambiguous Edge Bundling: Investigating Confluent Drawings for
  Network Visualization", IEEE TVCG 23(1), 2017:
  https://ialab.it.monash.edu/~dwyer/papers/confluentbundling.pdf
- Jiang, Hong, Meidiana and Zeng, spectral sparsification for bundling: https://arxiv.org/abs/2604.26994 ;
  FEB at IEEE VIS 2025:
  https://aa.ieeevis.org/year/2025/program/paper_333107f7-56b6-4215-823a-2550e2a1c1e1.html

Surveys, studies and quality:

- Lhuillier, Hurter and Telea, "State of the Art in Edge and Trail Bundling Techniques", CGF 36(3),
  2017: https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis17/star.pdf
- Wallinger and Kobourov, "A Task Taxonomy for Edge and Trail Bundling", 2026:
  https://arxiv.org/abs/2607.20089
- Wallinger, Akbulut, Rufai, Purchase and Archambault, "How Do People Perceive Bundling? An
  Experiment", CHI 2025, doi 10.1145/3706598.3713444:
  https://blogs.ncl.ac.uk/nova/2025/03/06/how-do-people-perceive-bundling-an-experiment
- McGee and Dingliana, "An empirical study on the impact of edge bundling on user comprehension of
  graphs", AVI 2012, doi 10.1145/2254556.2254670 (read through a 2018 poster:
  https://diglib.eg.org/handle/10.2312/eurp20181121)
- Luo, Liu, Chen and Ma, "Ambiguity-Free Edge-Bundling for Interactive Graph Visualization", IEEE
  TVCG 18(5), doi 10.1109/TVCG.2011.104: https://scholars.lib.ntu.edu.tw/handle/123456789/106099
- Holten and van Wijk, "A User Study on Visualizing Directed Edges in Graphs", CHI 2009; Holten,
  Isenberg, van Wijk and Fekete, PacificVis 2011:
  https://www.lri.fr/~isenberg/publications/papers/Holten_2011_AEP.pdf
- Nguyen, Eades and Hong, "On the faithfulness of graph visualizations", PacificVis 2013:
  https://ar5iv.arxiv.org/html/1701.00921
- Kwon, Muelder, Lee and Ma, bundling in VR, IEEE TVCG 2016: https://doi.org/10.1109/TVCG.2016.2520921
- Li, Zhang, Hu and Huang, "The influence of edge bundling on visual information search",
  Information Sciences 495, 2019 (abstract only): https://opus.lib.uts.edu.au/handle/10453/133848
- Hurter et al., dynamic bundling: https://webspace.science.uu.nl/~telea001/InfoVis/DynBundling

## 4. Implementations

| Implementation                        | Language                  | License        | Family                                   | Notes                                                                                                             | Link                                                                                                  |
| ------------------------------------- | ------------------------- | -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| d3-shape `curveBundle`                | JS                        | ISC            | hierarchical                             | about 60 lines; `p' = beta p_i + (1 - beta)(p0 + (i/j)(pj - p0))`, then a basis spline; beta default 0.85         | https://github.com/d3/d3-shape/blob/main/src/curve/bundle.js                                          |
| graph-tool hierarchy control points   | C++/Python                | LGPL-3.0       | hierarchical                             | beta default 0.8; per-edge beta allowed                                                                           | https://graph-tool.skewed.de/static/doc/autosummary/graph_tool.draw.get_hierarchy_control_points.html |
| mwallinger-tu/edge-path-bundling      | JS (canvas), Python, C++  | MIT            | edge-path                                | defaults: 50 curve points, weight exponent 2, max distortion 2; allocates two n x n matrices                      | https://github.com/mwallinger-tu/edge-path-bundling                                                   |
| xpeterk1/edge-path-bundling           | Python + numba, C++ globe | none           | edge-path                                | 19,080-edge airports set                                                                                          | https://github.com/xpeterk1/edge-path-bundling                                                        |
| YannicEl/edge_bundling_webgpu         | TypeScript + WGSL         | none           | spanner edge-path on WebGPU              | the thesis code; demo https://bachelor.yannic.at/                                                                 | https://github.com/YannicEl/edge_bundling_webgpu                                                      |
| holoviz/datashader `hammer_bundle`    | Python + numba            | BSD-3-Clause   | density (KDEEB variant)                  | bandwidth 0.05, decay 0.7, 4 passes, tension 0.3, grid 501^2, 50 advection steps; all distances relative to [0,1] | https://github.com/holoviz/datashader/blob/main/datashader/bundling.py                                |
| schochastics/edgebundle (R)           | C++ (Rcpp)                | MIT            | force, KDEEB, MINGLE, edge-path, divided | the best compact permissive reference for five methods (also https://github.com/thomasp85/edgebundle)             | https://github.com/schochastics/edgebundle                                                            |
| CUBu                                  | C++ / CUDA / OpenGL 1.1   | none stated    | density on the GPU                       | read only                                                                                                         | https://webspace.science.uu.nl/~telea001/InfoVis/CUBu (code: .../uploads/Software/CUBu/cubu.zip)      |
| FFTEB                                 | CUDA + cuFFT              | no public code | density by FFT                           | -                                                                                                                 | -                                                                                                     |
| microsoft/msagljs                     | TypeScript                | MIT            | ordered bundles                          | `modules/core/src/routing/spline/bundling/`; also through JointJS (`@joint/layout-msagl`)                         | https://github.com/microsoft/msagljs/tree/main/modules/core/src/routing/spline/bundling               |
| antvis/G6 edge-bundling plugin        | TypeScript                | MIT            | force-directed                           | re-bundles on every render, order-dependent updates: the design to avoid                                          | https://github.com/antvis/G6/blob/v5/packages/g6/src/plugins/edge-bundling/index.ts                   |
| upphiminn/d3.ForceBundle              | JS                        | GPL-2.0        | force-directed                           | read only; O(E^2) compatibility pass; about 247 iterations (fork: vasturiano/d3.ForceBundle)                      | https://github.com/upphiminn/d3.ForceBundle                                                           |
| CreativeCodingLab/GPUEdgeBundling     | JS + WebGL1               | GPL-2.0        | force-directed on textures (TBEB)        | read only                                                                                                         | https://github.com/CreativeCodingLab/GPUEdgeBundling                                                  |
| Cytoscape desktop `edge-bundler-impl` | Java                      | LGPL-2.1       | force-directed, 3 handles an edge        | 500 iterations, threaded; writes edge bends                                                                       | https://github.com/cytoscape/cytoscape-impl/tree/develop/edge-bundler-impl                            |
| philogb/mingle                        | JS                        | custom         | MINGLE                                   | -                                                                                                                 | https://github.com/philogb/mingle                                                                     |
| davidselassie/DividedEdgeBundling     | Objective-C + OpenCL      | none           | divided                                  | Mac only, 2012                                                                                                    | https://github.com/davidselassie/DividedEdgeBundling                                                  |
| ricardopieper/fdeb-rs                 | Rust                      | none           | force-directed                           | airlines about 180 ms; ran 46K edges                                                                              | https://github.com/ricardopieper/fdeb-rs                                                              |
| synesenom/fdeb                        | C++                       | MIT            | force-directed                           | -                                                                                                                 | https://github.com/synesenom/fdeb                                                                     |
| oan-J/3D-FDEB                         | JS                        | MIT            | force-directed in x, y, z                | shows the method needs no new ideas in 3D                                                                         | https://github.com/oan-J/3D-FDEB                                                                      |
| netgraph                              | Python                    | permissive     | force-directed                           | with Wu 2015's control-point insertion                                                                            | https://netgraph.readthedocs.io/en/latest/edge_layout.html                                            |
| Tulip                                 | C++                       | LGPL           | Winding Roads                            | -                                                                                                                 | https://tulip.labri.fr/Documentation/current/tulip-python/html/tulippluginsdocumentation.html         |
| yFiles                                | Java / JS                 | commercial     | hierarchical-style, circular layouts     | -                                                                                                                 | https://docs.yfiles.com/yfiles-html/dguide/layout-edge_bundling/                                      |

Also: datashader's guide https://datashader.org/user_guide/Networks.html ; JointJS MSAGL
https://docs.jointjs.com/learn/features/automatic-layouts/msagl ; G6 docs
https://g6.antv.antgroup.com/en/manual/plugin/edge-bundling .

Tricks worth borrowing, from all of the above: output control points and leave drawing to a curve
renderer; few control points plus a smooth curve beat many raw points; every distance a fraction of
the layout's extent; a spatial grid or nearest-neighbor list instead of all-pairs tests; a
coarse-to-fine schedule (decaying bandwidth); bundle once per settle and cache, never per render.

## 5. Libraries checked that do not bundle

sigma.js, cosmos.gl (cosmograph), deck.gl, Graphistry, Gephi and Cytoscape.js: no geometric edge
bundling found. KeyLines and ReGraph document curved links and link combining (aggregating parallel
links), not bundling; not confirmed absent. Babylon.js has no bundling example; three.js has only
small third-party demos.

## 6. Platform limits

- WebGPU spec default limits: `maxBufferSize` 256 MiB, `maxStorageBufferBindingSize` 128 MiB,
  `maxComputeWorkgroupStorageSize` 16 KiB, `maxComputeInvocationsPerWorkgroup` 256,
  `maxComputeWorkgroupsPerDimension` 65,535, `maxStorageBuffersPerShaderStage` 8,
  `maxTextureDimension2D` 8192: https://docs.w3cub.com/dom/gpusupportedlimits
- iOS devices report 8 storage buffers per shader stage in almost all cases:
  https://web3dsurvey.com/webgpu/limits/maxStorageBuffersPerShaderStage/platform/iOS . No
  authoritative per-device iPadOS buffer limits were found.
- WGSL atomics exist only for `i32` and `u32`; there is no float atomic add.
- `r16float` and `rgba16float` blend in core WebGPU; `r32float` blending needs the
  `float32-blendable` feature (Chrome 132): https://developer.chrome.com/blog/new-in-webgpu-132
- WebGL: Safari on iOS does not support `EXT_float_blend` (blending into 32-bit float targets)
  through 26.5: https://caniuse.com/wf-ext-float-blend ,
  https://web3dsurvey.com/webgl2/extensions/EXT_float_blend ; iOS supports half-float render targets:
  https://web3dsurvey.com/webgl/extensions/EXT_color_buffer_half_float ; WebKit bug 217107:
  https://bugs.webkit.org/show_bug.cgi?id=217107
- WebGPU shipped in Chrome and Edge 113 (May 2023) and Safari 26 (September 2025) on macOS, iOS and
  iPadOS.
- In this repository (webgpu-graph-algorithms `CLAUDE.md`): a default Dawn device carries exactly the
  spec defaults even when the adapter reports more; `GpuContext` requests the adapter's own limits by
  default (`limits: "raise"`); Safari 26 fails `createComputePipeline` when pipeline constants name an
  override the entry point does not read, worked around in `composeWgsl` / `PipelineCache`; Dawn's
  indirect dispatch costs about 0.4 ms.

## 7. Where sources disagree

- **Force-directed on US airlines** is 19 s in its own 2009 paper and 65 s in CUBu's Table 1:
  different hardware and implementations.
- **Browser force-directed figures disagree.** d3.ForceBundle at 10.4 s for 1k edges (Wu 2015)
  against 1,080 ms per iteration at 2.1K edges (Wu 2023); with about 247 iterations the second
  implies minutes. Treat browser force-directed figures as orders of magnitude only.
- **Plain edge-path on Air traffic** is 49.6 s in the original paper and 2.67 s in the spanner
  paper's re-implementation. The spanner paper's numbers are fairer: every method ran on one machine.
- **The 3D density grid** is not 64^3 to 128^3. Zielasko 2019 sizes it from the average edge length
  (8K-72K voxels) and runs on the CPU in under 200 MB. A 512^3 grid (134M cells, 512 MB) was never
  the published method.
- **The 8,200-node limit** of the WebGPU thesis does not apply to this repository. The blocked
  Floyd-Warshall in webgpu-graph-algorithms (`src/algorithms/all-pairs.ts`) reaches 23,170 nodes
  under Dawn with raised limits, 5,792 under the spec defaults, and throws `E_TOO_LARGE` above that.
  Browser limits may be smaller than Dawn's in Node.
- **CUBu's Table 2 and Fig. 12** use different settings, not contradictory ones: Table 2 the presets
  (15 iterations, 512 x 512), Fig. 12 20 iterations, 1024 x 1024 and a 32 px kernel. Use Table 2 for
  preset cost and Fig. 12 for scaling slopes.
- **The edge-path speedup** comes from a greedy spanner built from the graph's own edges (CGF 2023,
  Algorithm 1). The theta-graph is from the 2025 thesis, which itself says a geometric spanner "may
  introduce edges that are not present in the original graph, leading to ambiguity".
- **Edge-path on directed graphs.** The original paper lists poor results on directed graphs as a
  limitation; the spanner paper says directed bundling works without change. What is missing is
  lanes for opposite directions.
- **Who owns bundling** (repository design records): `design/ui/unified-style-layers.md` says
  layout; `design/extensions/candidates.md` section 20 says the element; `5-styling.md` A13 says it
  is an arrangement, not a style channel. The split in the design fits all three.

## 8. Not verified

- Every estimate (section 1.11 and every "estimate" in the design).
- McGee and Dingliana's numbers; the CHI 2025 sample size and statistics; Kwon et al. 2016's
  findings on bundling in VR; the content of Wallinger's EuroVis 2026 "Quantitative Metrics for Edge
  Bundling" paper (title only).
- The timing tables of GBEB, SBEB, divided bundling, Boettger's 3D method and Zielasko's 2016 3D
  force-directed method; MINGLE's per-dataset timings in its own paper.
- Safari and iPad WebGPU limits and timings; iPad overdraw at device pixel ratio 2.
- Whether a 512 x 512 grid is enough at 100k edges (FFTEB warns low resolutions merge distinct
  bundles on huge graphs).
- Edge-path timing on a scale-free graph from a force layout.
- The bundle size of `@msagl/core`.

## 9. Repository code and design records cited

Read at origin/golden `d00cdb54c7` (2026-10-20); every reference below was checked there. Line
numbers move: search for the named symbol.

| What                                                                        | Where                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Edge.update` and its early exit (endpoint moved more than 0.001)           | `graphty-element/src/Edge.ts:662`, `:690-691`                                                                                                                                           |
| `placeBent`, `leaveNode`, `placeRun`                                        | `graphty-element/src/Edge.ts:1356`, `:1381`, `:1399-1418`                                                                                                                               |
| Label at the middle of the curve (`curveMiddle`)                            | `graphty-element/src/Edge.ts:444`, used at `:717`                                                                                                                                       |
| Why no edge is pickable                                                     | `graphty-element/src/Edge.ts:942-947`; `graphty-element/src/events.ts:709` (no edge-click)                                                                                              |
| `parseBends`, `bendPoints` (x-y plane only), `roundCorners`, `surfaceReach` | `graphty-element/src/meshes/edgeRoute.ts:28`, `:63`, `:84`, `:121`                                                                                                                      |
| 14 floats a piece                                                           | `graphty-element/src/meshes/edgeJoinShader.ts:34` (`JOIN_FLOATS_PER_PIECE`)                                                                                                             |
| Batch mesh unpickable; slot growth                                          | `graphty-element/src/meshes/EdgeLineBatch.ts:161`, `:545` (`grow`)                                                                                                                      |
| Straight-only patterns                                                      | `graphty-element/src/meshes/EdgeMesh.ts:275` (`drawsAsPattern`)                                                                                                                         |
| WebGL is the default renderer                                               | `graphty-element/src/Graph.ts:548` (`#rendererRequest = "webgl"`)                                                                                                                       |
| A layout supplies only the two ends                                         | `graphty-element/src/layout/LayoutEngine.ts:48` (`EdgePosition`)                                                                                                                        |
| The only Web Worker                                                         | `graphty-element/src/layout/graphviz/host.ts:34`                                                                                                                                        |
| Acceleration policy and threshold                                           | `graphty-element/src/acceleration/types.ts:57` (`AccelerationPolicy`), `:375` (`acceleration.minNodes`), per-capability floors from `:399`; `graphty-element/src/session/types.ts:2440` |
| Reasons as English sentences                                                | `graphty-element/src/acceleration/AccelerationController.ts:202`, `:555`, `:580-586`                                                                                                    |
| `edge.color` declared per-instance, not implemented                         | `graphty-element/src/session/styles/intern.ts:148`                                                                                                                                      |
| The settled event                                                           | `graphty-element/src/managers/EventManager.ts:124` (`graph-settled`)                                                                                                                    |
| Hierarchical clustering keeps only a cut                                    | `graphty-element/src/algorithms/HierarchicalClusteringAlgorithm.ts:102` (`cutAt`), `:105` (`forEachChunked`)                                                                            |
| Dendrogram memory (28 x n^2 bytes)                                          | `algorithms/src/indexed/hierarchical.ts:152-156`                                                                                                                                        |
| Dijkstra with cutoff and per-arc weights                                    | `algorithms/src/indexed/dijkstra.ts:42-44`, `:136-151`                                                                                                                                  |
| `LayoutAccelerator`                                                         | `layout/src/simulation/types.ts:102`                                                                                                                                                    |
| layout depends only on graph-format                                         | `layout/package.json`                                                                                                                                                                   |
| GPU primitives                                                              | `webgpu-graph-algorithms/src/primitives/grid.ts`, `grid-pyramid.ts`, `histogram.ts`, `scan.ts`, `radix-sort.ts`, `compact.ts`                                                           |
| GPU shortest paths and all-pairs                                            | `webgpu-graph-algorithms/src/algorithms/sssp.ts`, `all-pairs.ts`                                                                                                                        |
| GPU context limits and adopting a device                                    | `webgpu-graph-algorithms/src/context.ts:230` (`limits: "raise"`), `:254` (`GpuContext.from`)                                                                                            |
| Datasets                                                                    | `graph-samples/src/datasets/openflights/meta.ts`, `political-blogs/meta.ts`, `knuth-miles/meta.ts`; generator `graph-samples/src/generators/preferential-attachment.ts`                 |

Design records:

- `design/edges/sharp-corners.md` -- the measured renderer cost ("Results", table at line 114; "The
  SwiftShader finding").
- `design/extensions/layout.md` section 11 ("Known gaps": a layout cannot supply edge geometry).
- `design/extensions/candidates.md` section 20 (edge geometry: layout-supplied or element-owned).
- `design/ui/unified-style-layers.md` (row near line 427: bundling as a layout decision).
- `design/ui/object-first-ux/feature-fit/5-styling.md` A13 (bundling is an arrangement).
- `design/designloom/capabilities/visual-encoding-edges.yaml:23-24` (the 50-crossings rule and the
  strength parameter); `design/designloom/capabilities/large-graph-rendering.yaml:27`.
- `design/xr/vr-interaction-option-catalog.md` section 14.22 (a global bundling render mode with a
  strength dial).
- `design/rendering/adaptive-tessellation.md` (adaptive point counts for curves).
- `design/rendering/gpu-based-rendering.md` (a 2025 proposal; its thin-instance profile was corrected
  2026-09-26).
