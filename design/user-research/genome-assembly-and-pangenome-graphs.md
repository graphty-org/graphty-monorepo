# Genome Assemblers, Microbial Genome Finishers and Pangenome Researchers: Assembly Graphs and Pangenome Graphs

## Summary

Genome assembly and pangenomics produce a kind of graph that no other population in this research brings: a
**sequence graph**. Each node is a stretch of DNA with a length (from tens of bases to millions), each edge joins one
specific end of one node to one specific end of another (a bidirected edge, so the same link can be read on either
strand), and a genome or haplotype is a **path** that walks through the nodes in order and orientation. The standard
file format is GFA (Graphical Fragment Assembly), where `S` lines are segments (nodes with a sequence or a length),
`L` lines are links (edges with an orientation at each end and an overlap), and `P` and `W` lines are paths and walks
([GFA 1 specification](https://github.com/GFA-spec/GFA-spec/blob/master/GFA1.md);
[Li, Feng and Chu 2020](https://ar5iv.labs.arxiv.org/html/2003.06079)).

Two groups use these graphs:

- **Assembly graph users** -- microbiologists, public health and clinical genomics labs, and assembler developers --
  open the graph an assembler (SPAdes, Unicycler, Flye, Velvet, Trinity, Miniasm) writes, to see whether a bacterial
  chromosome and its plasmids closed into circles, where repeats tangle the graph, and where a gene of interest sits.
  Their standard viewer is Bandage ([Wick et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4595904)), cited
  2,590 times ([Europe PMC](https://europepmc.org/article/MED/26099265), queried 2026-11-25), whose author now says
  "don't expect a lot development or support on this repo" and points to the BandageNG fork
  ([Bandage README](https://github.com/rrwick/Bandage)). Their graphs are small: a bacterial assembly graph is
  hundreds to a few thousand nodes (one SPAdes graph: 2,186 nodes and 3,061 edges,
  [PLoS Comput Biol figure](https://pmc.ncbi.nlm.nih.gov/articles/PMC7850483/figure/pcbi.1008586.g003)).
- **Pangenome graph users** -- human, plant and animal genomicists studying structural variation -- work with graphs
  built from many genome assemblies (the Human Pangenome Reference Consortium graph from 90 haplotypes,
  [Hickey et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10638906)). Whole graphs are tens of millions of
  nodes even for two to ten human haplotypes ([Andreace et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10691155/))
  and are viewed one region at a time: a few-kilobase to few-hundred-kilobase subgraph around a gene, cut out with
  `odgi extract` or `vg chunk` and opened in Bandage, SequenceTubeMap or odgi's 1D and 2D renderers
  ([GTPB CPANG22](https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs)).

A third group works with a different kind of pangenome graph, a **gene graph**, and is larger than the other two by
citation count:

- **Microbial pangenome analysts** -- bacterial population genomicists, epidemiologists and antimicrobial resistance
  researchers -- run Roary, Panaroo or PPanGGOLiN over hundreds to thousands of annotated isolates of one species. In
  the gene graph each node is a cluster of orthologous genes (a gene family), each edge joins two families whose genes
  sit next to each other on a contig, and every node and edge records which genomes contain it
  ([Tonkin-Hill et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924)). There are no strands, no sequence
  lengths drawn as geometry and no paths: it is an ordinary undirected graph with list-valued genome membership.
  Roary is cited 4,721 times and Panaroo 1,254 times ([Europe PMC: Roary](https://europepmc.org/article/MED/26198102);
  [Europe PMC: Panaroo](https://europepmc.org/article/MED/32698896), queried 2026-11-25). Panaroo writes
  `final_graph.gml`, which "includes all the meta-information such as gene annotation and which gene/edge is present
  in which genome" and is meant for Cytoscape
  ([Panaroo output docs](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/gettingstarted/output.md));
  PPanGGOLiN writes GEXF for Gephi
  ([PPanGGOLiN graph output](https://ppanggolin.readthedocs.io/en/latest/user/PangenomeAnalyses/pangenomeGraphOut.html)).
  Whole graphs are thousands to tens of thousands of nodes (section 6).

What sequence-graph users need from a viewer is specific: node length drawn in proportion to sequence length, read depth drawn as
node width or color, edges that attach to the correct end of a node, a way to show or merge the two strands, paths
drawn as colored tracks through the graph, highlights where a query sequence aligns, and the scope reduced to "the
nodes within N steps of these nodes" for anything large.

**Scope decision.** This population is **in scope at Tier B for assembly graphs and for extracted pangenome
subgraphs**, and **out of scope for whole-genome or whole-chromosome pangenome browsing**. The reasons: assembly
graphs and extracted subgraphs are ordinary node-link graphs of 10^2 to 10^5 nodes that a general graph tool can draw
once it reads GFA and honors the bidirected model; the work is visual inspection (components, cycles, neighborhoods,
depth, paths), which is exactly what a general tool does; and the incumbent viewer is a desktop program with little
active development. Whole-chromosome pangenome views are 10^7 nodes and are read in sequence coordinates, a job that
odgi's linear renderer and genome browsers own ([ODGI](https://pmc.ncbi.nlm.nih.gov/articles/PMC9237687);
[JBrowse graph genome view](https://jbrowse.org/jb2/docs/user_guides/graph_genome_view.md)). Graphty's graph model has
no bidirected edges, no sequence-length geometry, no GFA reader and no path overlay today, so even the in-scope part
needs new capabilities (section 10).

**Gene-level pangenome graphs are in scope at Tier B as well**, and fit graphty better than sequence graphs do: they
arrive as GML or GEXF, which graph-io already reads, and the work is coloring by how many genomes hold a node,
filtering to a genome set or a frequency band, cutting out a subgraph, and joining metadata -- general graph-tool
work. What is missing is a way to treat "the set of genomes this node or edge belongs to" as a first-class attribute,
joined to a per-genome metadata table (section 10).

## 2. Population

**Who they are.** Microbiologists and bioinformaticians who assemble bacterial, viral, fungal and organelle genomes
(research labs, hospital and public health laboratories, sequencing cores); metagenomics researchers who assemble
mixed communities; antimicrobial resistance researchers tracing resistance genes onto plasmids; developers of
assemblers and assembly-polishing tools; human, plant and animal genomicists who build and study pangenome graphs
to find structural variants; and microbial population genomicists who build gene-level pangenomes of a whole species
collection.

**Sub-populations.**

1. _Microbial genome finishers._ Assemble a bacterial isolate from short reads, long reads or both (Unicycler, Flye,
   Trycycler, Hybracter), then open the graph to see whether the chromosome and plasmids are complete circles. Unicycler
   says "Since a typical bacterial genome has no dead ends (the sequences are circular) an ideal assembly graph won't
   either" and normalizes depth so "the chromosome has a depth near 1x and plasmids may have different (typically
   higher) depths" ([Unicycler README](https://github.com/rrwick/Unicycler)). A completed _Klebsiella pneumoniae_
   assembly "contained three contigs (one chromosome and two plasmids)" and "When viewed in Bandage, the Unicycler
   graph clearly distinguished between replicons that formed completed circularised sequences"
   ([Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147)).
2. _Plasmid and antimicrobial resistance researchers._ Ask which replicon carries a resistance gene. The Galaxy
   plasmid tutorial assembles nanopore reads with Miniasm, views them in Bandage and asks "In how many samples were the
   full plasmid sequences assembled?" with the hint "what shape do you expect plasmid molecules to be?" before
   re-assembling with Unicycler and screening for resistance genes such as dfrA17
   ([Galaxy Training: plasmid metagenomics](https://training.galaxyproject.org/topics/microbiome/tutorials/plasmid-metagenomics-nanopore/tutorial.html)).
   plasmidSPAdes finds plasmids by removing graph edges whose coverage is close to the median, leaving plasmids as
   circular structures ([plasmidSPAdes](https://pubmed.ncbi.nlm.nih.gov/27466620/)).
3. _Metagenome assemblers._ Assemble communities into graphs of 10^5 to 10^6 nodes and look at small regions: Bandage
   warns large graphs such as metagenomes of 100 Mb or more "may take minutes and multiple gigabytes of RAM"
   ([Wick et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4595904)).
4. _Assembler and method developers._ Compare graphs across k-mer sizes or tools, look at where a tangle failed to
   resolve, and write `Bandage image` calls into pipelines to render graphs headlessly
   ([Bandage wiki: Command line](https://github.com/rrwick/Bandage/wiki/Command-line)).
5. _Pangenome graph builders and structural variant researchers._ Build graphs with Minigraph-Cactus or PGGB from
   dozens to hundreds of assemblies, then inspect bubbles (places where haplotypes disagree) at medically important
   loci such as the MHC, C4, RHD-RHCE and CYP2D6
   ([Liao et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10172123)).
6. _Plant and crop pangenome curators._ Work with gene presence and absence across tens to hundreds of cultivars, often
   in linearized views such as Panache, whose authors chose a linear layout because graphs "may be laid out
   differently each time they load" and clutter into a "hairball"
   ([Durant et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8652104)).
7. _Students and trainees._ Bioinformatics courses and Galaxy Training Network tutorials teach assembly with a Bandage
   step ([Galaxy Training: Unicycler](https://training.galaxyproject.org/topics/assembly/tutorials/unicycler-assembly/tutorial.html));
   pangenome courses teach `odgi extract`, `odgi viz` and Bandage on HLA and C4 subgraphs
   ([GTPB CPANG22](https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs)).
8. _Microbial gene-level pangenome analysts._ Annotate hundreds to thousands of isolates of one bacterial species
   (Prokka or Bakta), cluster their genes into families with Roary, Panaroo or PPanGGOLiN, and study the core genome
   (families in nearly every genome) and the accessory genome (the rest). The Panaroo paper's collections were 413
   _Mycobacterium tuberculosis_, 328 _Klebsiella pneumoniae_ and 1,054 _Neisseria gonorrhoeae_ genomes
   ([Tonkin-Hill et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924)); the PPanGGOLiN paper's example graph
   is 3,117 _Acinetobacter baumannii_ genomes, and it ran on 439 species and 136,287 genomes
   ([Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)). Most of their output is tables: a gene
   presence-absence matrix, a core gene alignment for the phylogeny, and association tests. The graph is the part they
   open to see where an accessory gene island, a plasmid or a rearrangement sits relative to core genes: Panaroo's
   authors say a rearrangement's context "can be investigated manually by interrogating the pangenome graph in
   Cytoscape" (same source). No source measures what share of users open the graph rather than only the matrix; the
   one training course checked uses only the core alignment and lists `final_graph.gml` without opening it
   ([Cambridge bacterial genomics course: Panaroo](https://cambiotraining.github.io/bacterial-genomics/materials/24-panaroo.html)).

**Rough size (evidence only).** Citations counted by Europe PMC on 2026-11-25 (citations bound the number of papers
that used a tool, not the number of people):

| Tool or paper                                                                                      | What it is                                                         | Citations |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| Unicycler ([Wick et al. 2017](https://doi.org/10.1371/journal.pcbi.1005595))                       | bacterial assembler that writes a GFA graph                        | 7,758     |
| Flye ([Kolmogorov et al. 2019](https://europepmc.org/article/MED/30936562))                        | long-read assembler built on repeat graphs                         | 5,627     |
| Roary ([Page et al. 2015](https://europepmc.org/article/MED/26198102))                             | bacterial gene-level pangenome; writes gene graphs as DOT          | 4,721     |
| Panaroo ([Tonkin-Hill et al. 2020](https://europepmc.org/article/MED/32698896))                    | bacterial gene-level pangenome; writes an annotated GML gene graph | 1,254     |
| PPanGGOLiN ([Gautreau et al. 2020](https://europepmc.org/article/MED/32191703))                    | partitioned bacterial gene graph; writes GEXF                      | 230       |
| Bandage ([Wick et al. 2015](https://europepmc.org/article/MED/26099265))                           | assembly graph viewer                                              | 2,590     |
| A draft human pangenome reference ([Liao et al. 2023](https://europepmc.org/article/MED/37165242)) | HPRC release 1                                                     | 1,297     |
| Trycycler ([Wick et al. 2021](https://europepmc.org/article/MED/34521459))                         | consensus bacterial assembly                                       | 509       |
| Minigraph-Cactus ([Hickey et al. 2024](https://doi.org/10.1038/s41587-023-01793-w))                | pangenome graph builder                                            | 332       |
| PGGB ([Garrison et al. 2024](https://europepmc.org/article/MED/39433878))                          | pangenome graph builder                                            | 223       |
| ODGI ([Guarracino et al. 2022](https://doi.org/10.1093/bioinformatics/btac308))                    | pangenome graph toolkit with 1D and 2D renderers                   | 179       |
| Hybracter ([Bouras et al. 2024](https://europepmc.org/article/MED/38717808))                       | automated bacterial assembly                                       | 118       |
| Sequence Tube Maps ([Beyer et al. 2019](https://doi.org/10.1093/bioinformatics/btz597))            | path-track viewer for vg graphs                                    | 61        |
| GfaViz ([Gonnella et al. 2019](https://doi.org/10.1093/bioinformatics/bty1046))                    | GFA1 and GFA2 viewer                                               | 39        |
| MoMI-G ([Yokoyama et al. 2019](https://europepmc.org/article/MED/31690272))                        | multi-scale genome graph browser                                   | 25        |
| Panache ([Durant et al. 2021](https://europepmc.org/article/MED/34601567))                         | linearized pangenome viewer                                        | 21        |

Bandage's 2,590 citations make it the most cited dedicated graph viewer in this population by two orders of magnitude
over the pangenome viewers. Its users are a subset of assembler users (Unicycler and Flye together exceed 13,000
citations). The gene-level pangenome tools have no dedicated viewer: Roary and Panaroo together (5,975 citations)
are cited more than twice as often as Bandage, and their graphs are opened in general tools -- Gephi for Roary
([Roary docs](https://sanger-pathogens.github.io/Roary/)) and PPanGGOLiN, Cytoscape for Panaroo. No download counts
or user surveys were found.

**How often they touch graph tools.** Microbial finishers look at a graph for every isolate they finish, and a
pipeline may render a graph image per isolate (Galaxy workflows include a "Bandage Image" step,
[Galaxy workflow](https://training.galaxyproject.org/training-material/topics/assembly/tutorials/assembly-with-preprocessing/workflows/assembly_with_preprocessing.html)).
Pangenome researchers look at subgraphs per locus of interest, a handful per paper. Assembler developers look daily
while debugging. No source measures frequency directly.

**Skill profile.** Command-line fluent; comfortable with FASTA, GFA, BLAST and alignment formats; strong on sequence
concepts (strand, reverse complement, k-mers, overlaps, depth, copy number). Graph theory is used informally:
connected components (replicons), cycles (circular molecules), dead ends, degree (a repeat has "multiple connections
in and multiple connections out", [Unicycler README](https://github.com/rrwick/Unicycler)), bubbles and paths.

**Team context.** A sequencing core or the analyst produces reads; the analyst assembles, inspects and polishes;
results go to GenBank or ENA, public health surveillance databases or a paper. Pangenome work happens in consortia
(HPRC) that release graphs as GFA, GBZ and VCF for others to use
([HPRC resources](https://github.com/human-pangenomics/hpp_pangenome_resources/blob/main/hprc-v1.0-mc.md)).

## 3. Personas

### Persona A: Dr. Yusuf Demir -- microbial genome finisher (id: bacterial-assembly-finisher)

- **Role.** Bioinformatician in a hospital or public health microbiology lab, closing genomes of resistant isolates.
- **Tools today.** Unicycler, Flye, Trycycler or Hybracter; Bandage or BandageNG; BLAST; Quast; Prokka or Bakta;
  AMRFinderPlus or staramr; IGV.
- **Data.** One GFA per isolate, a few to a few thousand segments, 2-8 Mb in total, with depth on each segment; a
  FASTA of resistance genes or marker genes to search for.
- **Goals.** Confirm the chromosome and each plasmid are complete circles; find which replicon carries a resistance
  gene; spot repeats that the assembler could not resolve and decide whether long reads would help.
- **Frustrations.** Bandage is desktop-only and barely developed; BLAST must be installed locally before the search
  works ([Bandage wiki: BLAST searches](https://github.com/rrwick/Bandage/wiki/BLAST-searches)); depth must be read node
  by node to judge plasmid copy number; Bandage paths cannot contain gaps, so SPAdes splits gapped scaffold paths with
  semicolons ([SPAdes output](https://ablab.github.io/spades/output.html)); figures need manual relayout.

### Persona B: Dr. Wiebke Hartmann -- pangenome structural variant researcher (id: pangenome-graph-researcher)

- **Role.** Human or crop genomicist studying structural variants at specific loci in a released pangenome graph.
- **Tools today.** Minigraph-Cactus or PGGB outputs; `odgi extract`, `odgi sort`, `odgi viz`, `odgi layout` and
  `odgi draw`; `vg chunk`; Bandage; SequenceTubeMap; JBrowse.
- **Data.** A chromosome-level graph (`.og`, `.gfa`, `.gbz`) of 10^7 nodes; extracted subgraphs of 10^2 to 10^5 nodes
  with tens to hundreds of haplotype paths named `SAMPLE#HAPLOTYPE#CONTIG`
  ([Cactus pangenome docs](https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md)).
- **Goals.** See how each haplotype traverses a bubble; count copies of a duplicated gene per haplotype; tell an
  inversion from a deletion; make a figure for a paper.
- **Frustrations.** 2D layouts of complex regions are hard to read ("complex, non-linear graph structures are difficult
  to interpret in a low number of dimensions", [ODGI](https://pmc.ncbi.nlm.nih.gov/articles/PMC9237687)); Bandage shows
  the graph but not the paths, while `odgi viz` shows the paths but not the topology; SequenceTubeMap's online version
  is "limited to small file sizes only" ([sequenceTubeMap](https://github.com/vgteam/sequenceTubeMap)); a tube map "can
  get progressively cluttered in the presence of many re-arrangements" ([Beyer et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6954646)).

### Persona C: Halvard Nygaard -- assembler and pipeline developer (id: assembly-method-developer)

- **Role.** Research software engineer developing or benchmarking assemblers and polishing tools, including
  metagenome assembly.
- **Tools today.** Bandage command line (`info`, `image`, `reduce`), gfatools, Python scripts over GFA, Bandage GUI.
- **Data.** Graphs from several tools or k-mer sizes for the same reads; metagenome graphs of 10^5 to 10^6 nodes.
- **Goals.** Compare graphs from two runs; find the tangle where resolution failed; render images in batch.
- **Frustrations.** Bandage layout of about 1.15 million nodes took 14.5 minutes with iterations at the minimum, and
  its advice is to cut scope, shorten nodes and turn off labels and antialiasing
  ([Bandage wiki: very large graphs](https://github.com/rrwick/Bandage/wiki/Working-with-very-large-graphs)); there is
  no side-by-side comparison of two graphs.

### Persona D: Dr. Thandiwe Mokoena -- microbial pangenome analyst (id: microbial-pangenome-analyst)

- **Role.** Bacterial population genomicist in a university or public health institute, studying hundreds to
  thousands of isolates of one species: which genes are core, which are accessory, and which accessory genes travel
  with a lineage, a country or a resistance phenotype.
- **Tools today.** Prokka or Bakta; Panaroo, Roary or PPanGGOLiN; Cytoscape with yFiles Organic layout, or Gephi with
  ForceAtlas2; pyseer for association tests; a tree viewer for the core phylogeny; a spreadsheet of isolate metadata
  (lineage or sequence type, country, year, phenotype).
- **Data.** A Panaroo `final_graph.gml` or a PPanGGOLiN `_light.gexf` of thousands to tens of thousands of gene
  family nodes, each node and edge carrying the list of genomes that contain it; a per-isolate metadata table; a
  per-gene annotation table.
- **Goals.** See the core and the accessory genome at a glance; find the accessory island, plasmid or rearrangement
  next to a core gene; show which lineages carry it; cut out the subgraph for a figure.
- **Why a separate persona and not a variant of bacterial-assembly-finisher.** The finisher works on one isolate's
  sequence graph (GFA, strands, depth, a few to a few thousand segments) and asks whether it is complete. This persona
  works on a species collection's gene graph (GML or GEXF, undirected, list-valued genome membership) and asks how gene
  content varies across genomes. The file format, the graph model, the attributes and the questions all differ.
- **Frustrations.** The default organic layout "produces some times very convoluted networks", and Panaroo ships a
  separate script that cuts long-range edges against a reference genome before relayout
  ([Panaroo layout guide](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/layout.md)); genome
  membership arrives as a semicolon-joined string (`genomeIDs`) or a list of integer indexes into a graph-level list
  of isolate names, so filtering by lineage means joining a second table by hand (Panaroo source,
  [`__main__.py`](https://github.com/gtonkinhill/panaroo/blob/master/panaroo/__main__.py)); Panaroo's metadata guide is
  "still under construction"
  ([Panaroo metadata page](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/metadata.md)); the
  PPanGGOLiN authors left families with fewer than 20 genes out of their figure for readability, though those were
  84.68 percent of nodes ([Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)); a graph-based
  pangenome study says Cytoscape, Gephi and Bandage offer restricted 2D layouts and slow down on complex networks
  ([Harling-Lee et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9548110)).

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                                                | Who                           | Frequency               | Stakes                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------- | ------------------------------------------------------ |
| 1    | Is this bacterial genome complete: are the chromosome and plasmids closed circles with no dead ends?                          | Finishers, AMR researchers    | Every isolate           | A reported "complete genome" that is not               |
| 2    | Which replicon (chromosome or which plasmid) carries this resistance or virulence gene?                                       | Finishers, AMR, public health | Per isolate of interest | Plasmid-borne resistance spreads between strains       |
| 3    | Where do repeats tangle the graph, and what copy number do they have?                                                         | Finishers, developers         | Per incomplete assembly | Whether to buy more long-read sequencing               |
| 4    | How do haplotypes traverse this structural variant bubble, and how many copies of this gene does each carry?                  | Pangenome researchers         | Per locus               | Disease association and genotyping claims              |
| 5    | How does this assembly graph differ from the one from another tool or k-mer size?                                             | Developers                    | Per benchmark           | Tool choice and published benchmarks                   |
| 6    | What is near this region in a large metagenome graph?                                                                         | Metagenome assemblers         | Per study               | Binning and plasmid-host assignment                    |
| 7    | What figure shows the graph for a paper or report?                                                                            | All                           | Per paper               | Reader trust                                           |
| 8    | In a species collection, which gene families are core and which accessory, and where do accessory islands attach to the core? | Microbial pangenome analysts  | Per collection          | Which genes are called accessory or mobile             |
| 9    | Which lineages, countries or phenotypes carry this accessory island, plasmid or rearrangement?                                | Microbial pangenome analysts  | Per finding             | Claims that a resistance region spreads with a lineage |

## 5. Step-by-step workflows

### 5.1 Check a bacterial assembly for completeness, plasmids and repeats

Sources: [Unicycler README](https://github.com/rrwick/Unicycler);
[Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147);
[Galaxy Training: plasmid metagenomics](https://training.galaxyproject.org/topics/microbiome/tutorials/plasmid-metagenomics-nanopore/tutorial.html);
[Bandage wiki](https://github.com/rrwick/Bandage/wiki).

1. **Assemble.** Run Unicycler on paired Illumina reads plus long reads ("Long reads": the MinION file, other
   parameters default). The Galaxy tutorial says the run "will take anywhere between 90 minutes and two hours"
   ([Galaxy Training: Unicycler](https://training.galaxyproject.org/topics/assembly/tutorials/unicycler-assembly/tutorial.html)).
   Outputs: `assembly.gfa`, `assembly.fasta`, `unicycler.log`.
2. **Summarize.** `Bandage info assembly.gfa` prints node count, edge count, total length, dead ends and N50
   ([Bandage wiki: Command line](https://github.com/rrwick/Bandage/wiki/Command-line)). Quast reports contig count and
   lengths; the tutorial's E. coli result was two contigs, the second being the phiX174 spike-in control.
3. **Load and draw the whole graph.** Open the GFA in Bandage with scope "Entire graph" and single node style, where
   "one node is drawn to the screen to represent both nodes in a complementary pair"
   ([Bandage wiki: node style](https://github.com/rrwick/Bandage/wiki/Single-vs-double-node-style)).
4. **Read the components.** Each replicon is a separate connected component. A complete replicon is "a single contig
   with a link connecting its end to its start" ([Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147)).
   Count the closed circles; note any component with dead ends.
5. **Read depth.** Color by depth (Unicycler's scheme uses "green for single-copy segments and yellow/orange/red for
   multi-copy segments"). A plasmid at about 4-5x the chromosome depth "occurs in approximately 4 or 5 copies per
   cell", interpreted loosely ([Unicycler README](https://github.com/rrwick/Unicycler)).
6. **Find repeats.** Look for nodes with "multiple connections in and multiple connections out"; their depth
   estimates copy number. Decide whether more long reads could bridge them.
7. **Compare assemblies (optional).** In the Galaxy plasmid tutorial, the Miniasm graph "shows one unclear
   hypothetical plasmid" while "the output of Unicycler tool shows two clear plasmids".
8. **Save.** `Bandage image assembly.gfa graph.png` (or `.svg`) for the report, and the FASTA of each replicon.

Decision points: whether a short circular component is a plasmid, a phage or a contaminant (phiX); whether a
multi-copy node is a chromosomal repeat or shared plasmid sequence; whether the assembly is finished.

### 5.2 Find a gene on the assembly graph by sequence search, and extract its path

Sources: [Bandage wiki: BLAST searches](https://github.com/rrwick/Bandage/wiki/BLAST-searches);
[Bandage wiki: Graph paths](https://github.com/rrwick/Bandage/wiki/Graph-paths);
[Bandage wiki: Graph scope](https://github.com/rrwick/Bandage/wiki/Graph-scope);
[Wick et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4595904).

1. **Install BLAST.** BLAST+ must be on the same computer.
2. **Build the database.** "Build BLAST database" indexes every node; build time grows with graph size.
3. **Load queries.** A FASTA of genes (nucleotide or protein); each query can be renamed and recolored.
4. **Run the search.** Optional blastn or tblastn parameters and hit filters, then "Run BLAST search". Hits appear in
   a sortable table.
5. **Show hits on the graph.** Color scheme "BLAST hits (solid)" or "BLAST hits (rainbow)"; the hit is painted onto
   the part of the node it covers. Optionally redraw with scope "Around BLAST hits" and a distance in nodes.
6. **Read query paths.** When a gene spans several nodes, Bandage looks for graph paths that spell the query; the
   "Paths" column counts them.
7. **Extract the path.** Select nodes forming an unambiguous path, or type an exact path such as `(51) 9+, 12- (87)`
   ("starts at base 51 of node 9+ and ends after the first 87 bases of node 12-"), and copy or save its sequence.
   "Bandage removes overlaps between connected nodes", so the path sequence may be shorter than the sum of its nodes.
8. **Interpret.** Which component the hit is on tells which replicon carries the gene. The Bandage paper reports
   rebuilding a complete 1,535 bp 16S rRNA gene from fragmented nodes and tracing resistance regions in _Salmonella_
   genomic islands.
9. **Batch alternative.** `Bandage querypaths <graph> <queries> <output_prefix>` writes the same results to a table.

Decision points: identity and coverage cutoffs for hits; which of several candidate paths is real (depth helps: the
most abundant copy of a gene shows on the highest-depth path).

### 5.3 Inspect a structural variant bubble in a pangenome subgraph

Sources: [GTPB CPANG22 subgraph exercise](https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs);
[odgi navigating and annotating graphs](https://odgi.readthedocs.io/en/latest/rst/tutorials/navigating_and_annotating_graphs.html);
[odgi viz](https://odgi.readthedocs.io/en/latest/rst/commands/odgi_viz.html);
[Cactus pangenome docs](https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md).

1. **Get the graph.** Build a chromosome graph from GFA: `odgi build -g chr6.pan...smooth.gfa -o chr6.pan.og -t 8 -P`
   (the Cactus docs recommend `--chrom-og` because "you usually work one chromosome at a time").
2. **Get coordinates.** Pull the gene's coordinates on the reference from a GTF, merge and pad them with bedtools, and
   rename the chromosome to the path name (`grch38#chr6`).
3. **Extract the subgraph.** `odgi extract -i chr6.pan.og -b C4.coordinates.bed -o - -c 0 -E -t 8 -P`, keep the
   largest piece with `odgi explode --biggest 1`, and sort it with `odgi sort ... -p Ygs`.
4. **Choose haplotypes.** `odgi paths -L` lists path names; keep the reference and a few samples.
5. **1D view.** `odgi viz -i C4.sorted.og -o C4.png -c 12 -w 100 -y 50 -p selected_paths.txt` draws nodes left to
   right in sort order and one row per path; `-m` colors by depth, `-z` by orientation ("black for forward, red for
   reverse").
6. **2D view.** `odgi layout` then `odgi draw`, or export GFA with `odgi view -g` and open it in Bandage with a node
   annotation CSV from `odgi position -E <gtf>`, described as "ready for Bandage".
7. **Answer the questions.** The course asks: "How many haplotypes have three copies of the C4 region?", "How many
   haplotypes are missing the HERV sequence?", what copy number the references carry, and how HERV presence shows in
   the 2D layout.
8. **Alternative: tube map.** Load the region into SequenceTubeMap, which draws nodes as "rounded rectangles" with the
   sequence on top and paths as "colored lines, which can correspond to haplotypes or sequencing reads"; a path that
   reverses through a node represents an inversion ([Beyer et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6954646)).
   The Cactus docs point to `vg chunk ... -O gfa` on the GBZ to extract a region.

Decision points: how far to pad the region; which haplotypes to show; whether a looped path is a duplication or a
collapsed repeat.

### 5.4 Reduce and compare large or metagenome assembly graphs

Sources: [Bandage wiki: very large graphs](https://github.com/rrwick/Bandage/wiki/Working-with-very-large-graphs);
[Bandage wiki: Graph scope](https://github.com/rrwick/Bandage/wiki/Graph-scope);
[Bandage wiki: Command line](https://github.com/rrwick/Bandage/wiki/Command-line);
[Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147).

1. **Summarize first.** `Bandage info` on each graph.
2. **Cut scope.** Use "Around nodes" (node names, exact or partial match, plus a distance "measured in nodes"),
   "Around BLAST hits", or "Depth range" to drop very low or very high depth nodes.
3. **Simplify drawing.** Minimize layout iterations, lower "Node length per megabase", raise "Node segment length",
   turn off labels and antialiasing.
4. **Save the reduced graph.** `Bandage reduce graph.fastg high_depth.gfa --scope depthrange --mindepth 100.0
--maxdepth 1000000` writes a subgraph as GFA.
5. **Compare runs.** Render the same region from two k-mer sizes or tools side by side. Unicycler's own comparison of
   k-mer graphs scores them by contig count and dead-end count, because "excessively large k-mers can cause a
   fragmented graph with dead ends" ([Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147)).
6. **Batch images.** `Bandage image graph.fastg image.svg --colour uniform` in a pipeline.

Decision points: depth thresholds; distance in nodes; which graph is "better" by dead ends and contiguity.

### 5.5 Explore a bacterial gene-level pangenome graph by genome count and lineage

Sources: [Panaroo Cytoscape guide](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/cytoscape.md);
[Panaroo layout guide](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/layout.md);
[Panaroo output docs](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/gettingstarted/output.md);
[Tonkin-Hill et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924);
[PPanGGOLiN graph output](https://ppanggolin.readthedocs.io/en/latest/user/PangenomeAnalyses/pangenomeGraphOut.html);
[PPanGGOLiN RGP analyses](https://ppanggolin.readthedocs.io/en/latest/user/RGP/rgpAnalyses.html).

1. **Build the pangenome.** Run Panaroo on the collection's annotated GFF files. Outputs include `final_graph.gml`,
   `gene_presence_absence.csv`, `struct_presence_absence.csv` (rearrangement events) and the core gene alignment. With
   PPanGGOLiN, `ppanggolin write_pangenome --light_gexf` writes the graph; the docs say the light file "should be the
   one you use to manipulate the pangenome graph most of the time" because the full one is very heavy.
2. **Load the graph.** In Cytoscape, Import Network and open `final_graph.gml`. Each node carries `size` (number of
   genomes), `genomeIDs`, `geneIDs`, `centroid`, `dna`, `protein` and `degrees`; each edge carries `genomeIDs` and
   `members` (Panaroo source, [`__main__.py`](https://github.com/gtonkinhill/panaroo/blob/master/panaroo/__main__.py)).
   A PPanGGOLiN node carries its gene count, gene and product name, partition, average and median length, genome
   count, and spot and module membership.
3. **Lay out.** Panaroo recommends the yFiles Organic layout; PPanGGOLiN recommends Gephi ForceAtlas2 with Stronger
   Gravity on and scaling 4000.
4. **Color by genome count.** "Colour the nodes by the number of genomes that they contain", which shows the core and
   accessory genome. PPanGGOLiN instead colors by partition (persistent, shell, cloud), sizes nodes by gene count and
   draws edge thickness by the number of genomes sharing the link
   ([Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)).
5. **Select a frequency band.** Make a rule, for example "all nodes that appear in between 1 and 3 genomes", or select
   by hand.
6. **Cut out a subgraph.** Create a new graph from the selection, or filter the selection out of the main graph.
7. **Join metadata.** Import a table keyed on the node `name` attribute (gene annotations). Lineage, country or
   phenotype belong to genomes, not nodes, so tying a node to a lineage means matching its genome list against the
   isolate table.
8. **Untangle the layout (optional).** Run Panaroo's `reference_based_layout.py` with a completely sequenced reference
   genome to get `capacity_cut_edges.txt`, import it as edge table columns, select edges where `is_cut_edge` is true,
   hide them, rerun the organic layout, then show all edges again.
9. **Read structure.** Accessory islands show as low-count nodes hanging off a core path; Panaroo calls structural
   variants from "distinct consecutive triplets of gene families", and its _N. gonorrhoeae_ association study returned
   138 triplets linked to antibiotic resistance, some with "phage-associated, transposase, or pilin genes". PPanGGOLiN
   names "Regions of Genome Plasticity", "clusters of genes made of shell and cloud genomes in the pangenome graph",
   and groups them into spots, "groups of RGPs that do not necessarily have the same gene content but have similar
   bordering persistent genes"; `ppanggolin draw --draw_spots` writes a GEXF per spot that is "basically a subgraph of
   the pangenome".
10. **Save.** An image of the subgraph and the node list of the island for the paper.

Decision points: which genome-count band counts as accessory (Panaroo's core threshold defaults to 95 percent of
genomes); whether to drop rare families from the drawing; which reference genome anchors the layout; whether an
island tracks a lineage or arose several times.

PPanGGOLiN's partitions and spots need no different view: partition is a categorical node attribute, spot and module
membership are list-valued node attributes, and a spot's GEXF is an ordinary subgraph. They need the same genome
membership support as Panaroo's graph, plus categorical coloring.

## 6. Data

**Formats.**

- **GFA 1.0, 1.1 and 1.2** ([spec](https://github.com/GFA-spec/GFA-spec/blob/master/GFA1.md)). `H` header; `S` segment
  (name, sequence or `*` when "the nucleotide sequence of the segment is not specified", tags `LN` length, `RC` read
  count, `FC` fragment count, `KC` k-mer count); `L` link (from, from orientation, to, to orientation, overlap as a
  CIGAR string or `*`); `C` containment; `P` path (name, comma-separated oriented segments, overlaps); `W` walk (GFA
  1.1: sample, haplotype index, sequence id, start, end, and a walk of `>` and `<` steps); `J` jump (GFA 1.2: a gap of
  signed distance). Assemblers add their own depth tags (`DP` is not in the spec). SPAdes writes GFA 1.2 with scaffold
  paths as `P` lines and offers `--gfa11` for consumers that cannot read 1.2
  ([SPAdes output](https://ablab.github.io/spades/output.html)).
- **rGFA**: GFA with stable reference coordinate tags (`SN`, `SO`, `SR`) per segment; it "disallows overlaps between
  edges" ([Li, Feng and Chu 2020](https://ar5iv.labs.arxiv.org/html/2003.06079)).
- **GFA 2** adds fragments, gaps and groups; GfaViz reads both versions
  ([GfaViz](https://github.com/ggonnella/gfaviz)).
- **FASTG** and Velvet **LastGraph**: older assembly graph formats Bandage also reads; SPAdes still writes
  `assembly_graph.fastg`, whose sequences are "contigs before repeat resolution (edges of the assembly graph)".
- **Binary pangenome formats**: vg, xg, GBZ (for Giraffe) and odgi `.og`; HAL for the underlying alignment; VCF
  derived from the graph ([Cactus pangenome docs](https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md)).
- **Alignments onto the graph**: GAF (path in column 6 in `>` and `<` notation) and GAM
  ([Li, Feng and Chu 2020](https://ar5iv.labs.arxiv.org/html/2003.06079)); BLAST tabular output from Bandage's search.
- **Node annotations**: CSV keyed on node name (Bandage CSV labels; `odgi position -E` output).
- **Gene-level pangenome graphs**: Panaroo GML written by NetworkX, where a node's `members` is a repeated key (a list
  of integer genome indexes), `genomeIDs` is the same list joined with semicolons, and the graph-level `isolateNames`
  list maps indexes to isolate names (Panaroo source,
  [`__main__.py`](https://github.com/gtonkinhill/panaroo/blob/master/panaroo/__main__.py)); PPanGGOLiN GEXF (light and
  full) and spot graphs as GEXF or GraphML
  ([PPanGGOLiN RGP outputs](https://ppanggolin.readthedocs.io/en/latest/user/RGP/rgpOutputs.html)); Roary's
  `accessory_graph.dot` and `core_accessory_graph.dot`, "how genes are linked together at the contig level", to be
  viewed "using Gephi" ([Roary docs](https://sanger-pathogens.github.io/Roary/)). graph-io's GML reader already turns a
  key repeated within one node into a list and understands NetworkX's list markers
  ([graph-io GML guide](../../graph-io/docs/guide/formats/gml.md)).
- **Per-genome metadata**: a CSV or TSV of isolates with lineage or sequence type, country, year and phenotype. It is
  keyed on genome, not on node, so it joins to the graph through each node's and edge's genome list.

**The model, and why it differs from an ordinary graph.** A sequence graph is bidirected: "each vertex v is associated
with a DNA sequence", and each edge has a direction at each endpoint, giving four edge types (forward-forward,
reverse-forward, forward-reverse, reverse-reverse); "The directions on an edge dictate how a sequence is spelled from
a walk/path in the graph" ([Li, Feng and Chu 2020](https://ar5iv.labs.arxiv.org/html/2003.06079)). In SPAdes'
de Bruijn graph, "SPAdes encodes assembly graph edges as segments", so a GFA segment is a de Bruijn edge and the count
of drawn nodes can differ from the contig count ([SPAdes output](https://ablab.github.io/spades/output.html)). A
viewer must therefore:

- store which end (start or end) of each node an edge touches, and draw it there;
- know that a node and its reverse complement are one object shown once (single style) or twice (double style, with
  arrowheads at 3' ends, [Bandage wiki](https://github.com/rrwick/Bandage/wiki/Single-vs-double-node-style));
- draw node length from `LN` or the sequence length, and width or color from depth;
- treat a path as an ordered list of oriented node visits that may repeat a node (duplication) or reverse through it
  (inversion) ([Beyer et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6954646));
- keep sequences available for extraction while not loading gigabases into the drawing.

**The gene graph model is different.** In Panaroo "nodes are clusters of orthologous genes (COGs)" and two nodes are
joined "if they are adjacent on a contig in any sample from the population"; "Each gene node and edge is annotated
with the genomes to which it belongs" ([Tonkin-Hill et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924)).
In PPanGGOLiN "Edges are labeled with the corresponding genome identifiers and weighted by the proportion of genomes
sharing that link" ([Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)). The graph is undirected
with no strands or lengths; what a viewer needs is genome membership as a set on both nodes and edges, a genome count
derived from it, and a join from genomes to a metadata table so a node can be filtered or colored by "present in any
genome of lineage X".

**Sizes.**

| Graph                                                                  | Nodes                                                                             | Edges                          | Source                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Finished bacterial assembly (Unicycler)                                | a few segments (3 contigs: chromosome and two plasmids)                           | a few                          | [Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147)                                 |
| SPAdes graph of a synthetic _Shigella dysenteriae_ dataset             | 2,186                                                                             | 3,061                          | [PLoS Comput Biol figure](https://pmc.ncbi.nlm.nih.gov/articles/PMC7850483/figure/pcbi.1008586.g003) |
| 5 Mb bacterial graph in Bandage                                        | not stated; loads in seconds in under 100 MB of RAM                               |                                | [Wick et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4595904)                                 |
| Large graph example in the Bandage wiki                                | about 1.15 million                                                                | not stated                     | [Bandage wiki](https://github.com/rrwick/Bandage/wiki/Working-with-very-large-graphs)                |
| Minigraph human graph, 20 haplotypes plus GRCh38                       | 148,618 segments                                                                  | 214,995 links                  | [Li, Feng and Chu 2020](https://ar5iv.labs.arxiv.org/html/2003.06079)                                |
| Minigraph-Cactus human graph, 2 haplotypes                             | 10,851,000                                                                        | 14,702,000                     | [Andreace et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10691155/)                           |
| Minigraph-Cactus human graph, 10 haplotypes                            | 37,767,000                                                                        | 51,595,000                     | same                                                                                                 |
| Minigraph human graph, 104 haplotypes                                  | 632,000                                                                           | 912,000                        | same (PGGB and Minigraph-Cactus did not finish on 104)                                               |
| HPRC release 1 Minigraph-Cactus graph, 90 haplotypes                   | not stated (3.29 Gb of sequence, 67,000 SV sites, 22 million small variant sites) |                                | [Liao et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10172123)                                |
| HPRC release 2 graph, 464 haplotypes                                   | not stated (GBZ file 5.4 GB)                                                      |                                | [JBrowse HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc.md)                    |
| PPanGGOLiN gene graph, 3,117 _A. baumannii_ genomes                    | 69,446 gene families (3,084 persistent, 1,529 shell, 64,833 cloud)                | not stated                     | [Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)                             |
| Gene synteny network, 778 _Staphylococcus aureus_ genomes              | 7,091 (2,711 after filtering)                                                     | 17,100 (4,110 after filtering) | [Harling-Lee et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9548110)                          |
| Panaroo `final_graph.gml`, species collections of 300 to 1,000 genomes | not stated; _K. pneumoniae_ core alone is 3,372 families                          | not stated                     | [Tonkin-Hill et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924)                          |

Minigraph-Cactus graphs have "roughly 200x more nodes and edges than the SV graphs from minigraph"
([Hickey et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10638906)). Extracted locus subgraphs are not sized in
any source found; the C4 exercise pads a gene region by 10 kb and 20 kb
([GTPB CPANG22](https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs)), and JBrowse's force-directed graph
view caps regions at 66,000-77,000 bp in its sessions and cuts at most 5 Mb
([JBrowse HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc.md);
[JBrowse graph genome view](https://jbrowse.org/jb2/docs/user_guides/graph_genome_view.md)).

## 7. Analysis methods

- **Connected components** as replicons; **cycles** as circular molecules; **dead ends** (a node end with no link) as
  incompleteness ([Unicycler README](https://github.com/rrwick/Unicycler)).
- **Depth and copy number**: depth normalized to the median; multiples of it suggest copy number; plasmidSPAdes removes
  edges near the median coverage to isolate plasmids ([plasmidSPAdes](https://pubmed.ncbi.nlm.nih.gov/27466620/)).
- **Degree at node ends**: a repeat has several links at each end; single-copy contigs have one per end
  ([Wick et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147)).
- **Neighborhood by node distance**: Bandage's "Around nodes" scope with a distance in nodes.
- **Sequence search on the graph**: BLAST hits painted onto nodes; query paths that spell a query across nodes.
- **Path spelling**: concatenating oriented node sequences minus overlaps.
- **Bubbles**: "a set of distinct possible paths (the variants) that share the same contexts at their sides"
  ([Popping bubbles in pangenome graphs](https://arxiv.org/pdf/2410.20932)); snarl decomposition in vg.
- **Path depth and untangling**: `odgi viz -m` colors by mean depth; `odgi untangle` reports per-segment copy number
  (`self.cov`) ([GTPB CPANG22](https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs)).
- **Path-guided layout**: ODGI's PG-SGD "learns a 1D or 2D organization of the graph nodes that matches nucleotide
  distances in graph paths", and its 1D view "is computed in linear-time"
  ([ODGI](https://pmc.ncbi.nlm.nih.gov/articles/PMC9237687)). Bandage uses a force-directed layout (OGDF in BandageNG,
  [BandageNG](https://github.com/asl/BandageNG)).

- **Core and accessory partition** (gene graphs): genome count per gene family against a core threshold (Panaroo's
  core alignment uses 95 percent of genomes by default); PPanGGOLiN's persistent, shell and cloud partitions from a
  Bernoulli mixture model with a Markov random field over the graph
  ([Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747)).
- **Structural variants as gene triplets** (Panaroo) and **regions of genome plasticity and spots** (PPanGGOLiN),
  both read from graph neighborhoods of core genes.
- **Reference-anchored layout**: Panaroo's minimum capacity graph cut finds edges that join regions far apart on a
  reference chromosome, hides them for layout and restores them afterward
  ([Panaroo layout guide](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/layout.md)).

Centrality, community detection and the statistics most other populations use are not part of these workflows.

## 8. Outputs and collaboration

- Static images of the graph for papers, lab reports and pipeline QC (`Bandage image`, `odgi viz`, `odgi draw`).
- Sequences extracted from paths (FASTA) for annotation and submission.
- Reduced subgraphs as GFA to share a region (`Bandage reduce`, `odgi view -g`, `vg chunk -O gfa`).
- Tables of hits and query paths (`Bandage querypaths`).
- Interactive views shared as files or a hosted SequenceTubeMap or JBrowse session.

## 9. Tools landscape and pain points

| Tool                                      | What it does                                                                                                     | Pain points (sourced)                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bandage                                   | Desktop viewer for assembly graphs (Velvet, SPAdes, Trinity, GFA); depth as width, BLAST hits, paths, scope, CLI | "don't expect a lot development or support"; layout of 1.15 million nodes took 14.5 minutes; needs local BLAST; paths cannot contain gaps ([README](https://github.com/rrwick/Bandage); [wiki](https://github.com/rrwick/Bandage/wiki/Working-with-very-large-graphs); [SPAdes](https://ablab.github.io/spades/output.html)) |
| BandageNG                                 | Community fork recommended by SPAdes; OGDF layouts                                                               | README says documentation "might be incomplete, missed and inaccurate" ([BandageNG](https://github.com/asl/BandageNG))                                                                                                                                                                                                       |
| GfaViz                                    | GFA1 and GFA2 viewer with GUI and CLI                                                                            | Low adoption (39 citations)                                                                                                                                                                                                                                                                                                  |
| SequenceTubeMap                           | Browser tube map of vg graphs with haplotype and read paths                                                      | Online version "limited to small file sizes only"; clutter with many rearrangements ([repo](https://github.com/vgteam/sequenceTubeMap); [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6954646))                                                                                                                           |
| odgi viz, layout, draw                    | 1D binned path-by-node image at gigabase scale; 2D raster drawing                                                | Static images; 2D "can be costly to compute"; the draw output "lacks path information" ([ODGI](https://pmc.ncbi.nlm.nih.gov/articles/PMC9237687))                                                                                                                                                                            |
| gfaestus                                  | Interactive 2D viewer that reads odgi layouts                                                                    | Depends on a precomputed odgi layout ([gfaestus](https://github.com/chfi/gfaestus/blob/master/README.md))                                                                                                                                                                                                                    |
| JBrowse graph genome view                 | Pangenome subgraphs inside a genome browser, walks as rows, tube maps, force layouts                             | Beta; region cut at most 5 Mb; assembly GFA without a reference gets no locus cut, and "Bandage is suggested for these" ([JBrowse](https://jbrowse.org/jb2/docs/user_guides/graph_genome_view.md))                                                                                                                           |
| Panache                                   | Linearized presence and absence browser for plant pangenomes                                                     | Needs the graph linearized first ([Durant et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8652104))                                                                                                                                                                                                                    |
| MoMI-G                                    | Multi-scale genome graph browser                                                                                 | Low adoption (25 citations)                                                                                                                                                                                                                                                                                                  |
| Cytoscape (with Panaroo GML)              | General network tool; Panaroo's recommended viewer for gene graphs                                               | Organic layout "very convoluted" on these graphs, fixed with a separate reference script; metadata guide unfinished ([Panaroo layout](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/layout.md); [metadata](https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/metadata.md))       |
| Gephi (with Roary DOT or PPanGGOLiN GEXF) | General network tool with ForceAtlas2                                                                            | Full PPanGGOLiN GEXF "can be very heavy to manipulate"; rare families dropped from published figures ([PPanGGOLiN docs](https://ppanggolin.readthedocs.io/en/latest/user/PangenomeAnalyses/pangenomeGraphOut.html); [Gautreau et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747))                                |
| Graphia                                   | 3D network tool used for genome, gene co-occurrence and synteny networks                                         | Chosen because Cytoscape, Gephi and Bandage have restricted 2D layouts and slow on complex networks ([Harling-Lee et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9548110))                                                                                                                                            |

**Cross-cutting pain points.** No viewer shows topology, paths and depth together at the scale of a locus subgraph;
the most used viewer is a desktop program with little development; large graphs need manual scope cutting; 2D layouts
differ on every load, which Panache's authors cite as a reason to avoid graphs.

**Why a general graph tool and not only a sequence viewer.** The assembly-graph questions in section 4 (ranks 1-3, 5, 6) are graph questions -- components, cycles, dead ends, degree at node ends, neighborhoods, comparison -- over graphs
of 10^2 to 10^5 nodes. A browser-based, actively maintained viewer that reads GFA and draws the bidirected model would
serve them without sequence-coordinate machinery. Whole-chromosome pangenome browsing (10^7 nodes, read by reference
position) is a genome browser's job and is out of scope.

## 10. Requirements implied

Before this research, graphty's Designloom set had no persona or workflow in genome assembly or pangenomics. Its model has directed or
undirected edges only, nodes as points with a size, no GFA reader and no notion of a path through nodes.

| Requirement                                                                                                                                                                                                    | Priority | Covered today?                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Import GFA 1.0-1.2: `S` (sequence or `*`, `LN`, `RC`, `KC`, `FC`, assembler depth tags), `L` (orientations, overlap), `P`, `W`, `J`; report unsupported lines; also FASTG                                      | Must     | No (graph-io reads 13 formats, none of them GFA)                                                      |
| Bidirected edge model: an edge records which end of each node it joins; drawn at that end                                                                                                                      | Must     | No                                                                                                    |
| Node geometry from sequence length: elongated nodes whose length is proportional to bp, with a minimum, a scale setting and a log option; width or color from depth                                            | Must     | No (node size exists; length-along-a-curve does not)                                                  |
| Single and double strand views of the same graph                                                                                                                                                               | Should   | No                                                                                                    |
| Paths and walks as colored tracks through nodes (tube map), with per-path show and hide and a per-node count of paths                                                                                          | Must     | Partial (path highlighting for one computed path)                                                     |
| Highlight where external sequence hits fall on nodes, imported from BLAST tabular or GAF, with the covered part of the node painted                                                                            | Should   | No                                                                                                    |
| Neighborhood scope: nodes within N steps of named nodes or hits; scope by depth range                                                                                                                          | Must     | Partial (ego network and filtering exist)                                                             |
| Components, cycles and dead ends reported and selectable (complete circles, open ends)                                                                                                                         | Must     | Partial (components and cycle detection exist; dead ends at node ends do not)                         |
| Extract the sequence spelled by a selected path, honoring orientation and overlaps                                                                                                                             | Should   | No                                                                                                    |
| Export a subgraph as GFA                                                                                                                                                                                       | Should   | No                                                                                                    |
| Node annotation table joined on segment name (CSV labels)                                                                                                                                                      | Must     | Yes (table join)                                                                                      |
| Side-by-side comparison of two assembly graphs                                                                                                                                                                 | Could    | Partial (comparison view)                                                                             |
| 1D linearized view: nodes in sort order across, paths as rows, colored by depth or orientation                                                                                                                 | Could    | No                                                                                                    |
| Headless image rendering from the command line for pipelines                                                                                                                                                   | Should   | Partial                                                                                               |
| Scale: 10^5-10^6 node metagenome graphs with level of detail                                                                                                                                                   | Should   | Unproven                                                                                              |
| Gene graphs: import Panaroo GML (repeated `members` keys, semicolon `genomeIDs`, graph-level `isolateNames`), PPanGGOLiN GEXF and Roary DOT, keeping list-valued genome membership on nodes and edges          | Must     | Partial (graph-io reads GML lists, GEXF and DOT; genome indexes are not resolved to isolate names)    |
| Genome membership as a set attribute on nodes and edges, with a derived genome count to color, size and filter by                                                                                              | Must     | No                                                                                                    |
| Join a per-genome metadata table (lineage, country, year, phenotype) through the membership sets, so nodes and edges can be filtered or colored by "present in any, all or none of the genomes with lineage X" | Must     | No (table join is keyed on node or edge, not on a set member)                                         |
| Select by genome-count band and make a new graph from the selection, or hide it                                                                                                                                | Must     | Partial (filtering and component extraction exist; new graph from an arbitrary selection is unproven) |
| Categorical coloring by partition and edge width by genome count                                                                                                                                               | Must     | Yes (visual encoding)                                                                                 |
| Hide a chosen edge set for layout and restore it afterward (reference-anchored untangling)                                                                                                                     | Could    | Partial (filtering and fixed positions exist)                                                         |
| Scale: 10^4-10^5 node gene graphs with every node kept, including rare families                                                                                                                                | Should   | Unproven                                                                                              |

New personas: `bacterial-assembly-finisher` (roster lead, Tier B), `pangenome-graph-researcher` and
`assembly-method-developer` (variants), and `microbial-pangenome-analyst` (Tier B, its own persona because the data
model, format and questions differ from the finisher's). New workflows: W1156 (section 5.1), W1157 (5.2), W1158
(5.3), W1159 (5.4), W2000 (5.5).
Whole-chromosome pangenome browsing is recorded as out of scope in the persona index.

## 11. Sources

- https://pmc.ncbi.nlm.nih.gov/articles/PMC4595904 -- Bandage paper: features, BLAST highlights, load times, large graphs.
- https://github.com/rrwick/Bandage -- Bandage README: development status, BandageNG pointer.
- https://github.com/rrwick/Bandage/wiki -- Bandage wiki index.
- https://github.com/rrwick/Bandage/wiki/Single-vs-double-node-style -- single and double node styles.
- https://github.com/rrwick/Bandage/wiki/Working-with-very-large-graphs -- 1.15 million node example and settings.
- https://github.com/rrwick/Bandage/wiki/Graph-scope -- entire graph, around nodes, around BLAST hits, depth range.
- https://github.com/rrwick/Bandage/wiki/Command-line -- load, info, image, querypaths, reduce.
- https://github.com/rrwick/Bandage/wiki/BLAST-searches -- BLAST procedure and query paths.
- https://github.com/rrwick/Bandage/wiki/Graph-paths -- path notation, extraction, overlaps.
- https://github.com/asl/BandageNG -- BandageNG fork.
- https://github.com/GFA-spec/GFA-spec/blob/master/GFA1.md -- GFA 1 line types and tags.
- https://ar5iv.labs.arxiv.org/html/2003.06079 -- Li, Feng and Chu 2020: bidirected sequence graphs, rGFA, GAF, minigraph sizes.
- https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md -- Minigraph-Cactus pipeline, outputs, visualization notes.
- https://www.nature.com/articles/s41587-023-01793-w.pdf -- Minigraph-Cactus paper (publisher copy).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10638906 -- Minigraph-Cactus paper: 90 haplotypes, clipping, 200x nodes.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10172123 -- Liao et al. 2023, draft human pangenome: 3.29 Gb, SV sites, loci.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10691155/ -- Andreace et al. 2023: node and edge counts by builder.
- https://github.com/human-pangenomics/hpp_pangenome_resources/blob/main/hprc-v1.0-mc.md -- HPRC release 1 files.
- https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc.md -- HPRC release 2 in JBrowse: 464 haplotypes, GBZ size.
- https://jbrowse.org/jb2/docs/user_guides/graph_genome_view.md -- JBrowse graph genome view inputs and limits.
- https://github.com/vgteam/sequenceTubeMap -- SequenceTubeMap repository and size limit.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6954646 -- Beyer et al. 2019, sequence tube maps.
- https://odgi.readthedocs.io/en/latest/rst/commands/odgi_viz.html -- odgi viz options.
- https://odgi.readthedocs.io/en/latest/rst/tutorials/navigating_and_annotating_graphs.html -- odgi extract, position, export for Bandage.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9237687 -- ODGI paper: scale, 1D and 2D rendering.
- https://gtpb.github.io/CPANG22/pages/Day3a_Pangenome_subgraphs -- C4 subgraph exercise and questions.
- https://github.com/chfi/gfaestus/blob/master/README.md -- gfaestus.
- https://github.com/ggonnella/gfaviz -- GfaViz.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8652104 -- Panache: linearized pangenome viewer.
- https://github.com/rrwick/Unicycler -- Unicycler README: dead ends, depth, repeats, colors.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5481147 -- Unicycler paper: completed replicons in Bandage, k-mer graph scoring.
- https://ablab.github.io/spades/output.html -- SPAdes GFA 1.2, FASTG, paths, Bandage-NG recommendation.
- https://pubmed.ncbi.nlm.nih.gov/27466620/ -- plasmidSPAdes.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7850483/figure/pcbi.1008586.g003 -- SPAdes graph of 2,186 nodes and 3,061 edges.
- https://training.galaxyproject.org/topics/assembly/tutorials/unicycler-assembly/tutorial.html -- Galaxy Unicycler tutorial.
- https://training.galaxyproject.org/topics/microbiome/tutorials/plasmid-metagenomics-nanopore/tutorial.html -- Galaxy plasmid tutorial with Bandage.
- https://training.galaxyproject.org/training-material/topics/assembly/tutorials/assembly-with-preprocessing/workflows/assembly_with_preprocessing.html -- Galaxy workflow with a Bandage Image step.
- https://arxiv.org/pdf/2410.20932 -- bubble definition.
- https://europepmc.org/article/MED/26099265 -- Bandage citation count (Europe PMC, 2026-11-25); other counts in section 2 from the Europe PMC REST search on the same date, linked per row.
- https://europepmc.org/article/MED/26198102 -- Roary citation count (4,721, Europe PMC REST, 2026-11-25).
- https://europepmc.org/article/MED/32698896 -- Panaroo citation count (1,254, same date).
- https://europepmc.org/article/MED/32191703 -- PPanGGOLiN citation count (230, same date).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7376924 -- Panaroo paper: gene graph model, collection sizes, triplet structural variants, Cytoscape.
- https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/gettingstarted/output.md -- Panaroo outputs and final_graph.gml.
- https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/cytoscape.md -- Panaroo Cytoscape guide: layout, genome-count color, band selection, metadata join.
- https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/layout.md -- Panaroo reference-based layout with cut edges.
- https://raw.githubusercontent.com/gtonkinhill/panaroo/master/docs/vis/metadata.md -- Panaroo metadata page, under construction.
- https://github.com/gtonkinhill/panaroo/blob/master/panaroo/__main__.py -- Panaroo GML node and edge attributes.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7108747 -- PPanGGOLiN paper: partitions, 3,117 A. baumannii genomes, Gephi figure settings.
- https://ppanggolin.readthedocs.io/en/latest/user/PangenomeAnalyses/pangenomeGraphOut.html -- PPanGGOLiN GEXF outputs and attributes.
- https://ppanggolin.readthedocs.io/en/latest/user/RGP/rgpAnalyses.html -- regions of genome plasticity and spots.
- https://ppanggolin.readthedocs.io/en/latest/user/RGP/rgpOutputs.html -- spot graphs and draw_spots output.
- https://sanger-pathogens.github.io/Roary/ -- Roary DOT gene graphs viewed in Gephi.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9548110 -- Harling-Lee et al. 2022: gene and genome networks in Graphia, sizes, tool limits.
- https://cambiotraining.github.io/bacterial-genomics/materials/24-panaroo.html -- training course that uses only the core alignment.
