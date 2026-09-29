# Persona: Dr. Min-ji Kim, Knowledge Graph Engineer

Expert. Knowledge engineer, ontologist and data architect for an enterprise knowledge graph.
Composite persona: built from the graphty persona and workflow definitions and from the public
forums, issue trackers, talks and job postings listed under Sources. No real person's identity,
handle or story is used. Quoted lines are paraphrases attributed to a source link, except where
a line is marked as her own opinion. Every count in an example (triples, entities, classes) is
illustrative, not taken from a real dataset.

## Portrait

Min-ji is 41, holds a PhD from a university ontology lab, and has spent six years at a large
financial-services company building its corporate knowledge graph: about 40 million triples
covering funds, legal entities, instruments, people, systems and policies, fed from 30-odd source
systems. She owns the ontology (OWL 2, SKOS for vocabularies), the SHACL shapes that police data
quality, the mapping pipelines from relational tables to RDF, and the governance reports that tell
data owners what is broken. She does not need to be convinced that graphs matter -- she needs a
tool that does not misrepresent her graph. Her default posture toward any new graph viewer is
polite suspicion: she has watched WebVOWL turn a mid-sized ontology into overlapping labels,
Neo4j Browser hang on a query whose display she had "limited", and Gephi's RDF plugin stop
installing after an upgrade. She will give a new tool one honest, focused session. If it cannot
tell a class from an instance, or it draws every `rdf:type` and literal as an edge, she closes it
and goes back to SPARQL and a spreadsheet.

## Background and tools

- **Path in.** Philosophy and computer science undergrad, a PhD in description logics and
  ontology alignment, a postdoc on a biomedical ontology, then industry when the enterprise
  "knowledge graph" wave made her skills marketable. Job postings for her role now ask for 5+ years
  of production RDF/OWL, SHACL, SPARQL 1.1 with property paths and federated queries, SKOS,
  R2RML or rdflib mapping, and one of TopBraid, GraphDB, Stardog, RDFox or Neptune
  ([Vanguard posting](https://builtin.com/job/knowledge-graph-engineer-investment-data-ontology/9850474),
  [Siemens posting](https://jobs.siemens.com/en_US/externaljobs/JobDetail/471392)).
- **Daily stack.** Protege for the ontology; a commercial triple store (GraphDB) with its
  workbench; SPARQL in the workbench and in Python notebooks (rdflib, pandas); SHACL validation in
  CI; Git for the ontology files in Turtle; Jira for data-quality tickets; Confluence for schema
  docs. Neo4j with the neosemantics plugin on one team she supports, so she also reads Cypher.
- **Visualization tools she has tried and why each disappointed.** WebVOWL and OntoGraf for the
  schema (overlap, duplicated nodes, one-at-a-time expansion
  ([OntView paper, section 2](https://arxiv.org/html/2507.13759v1))); Gephi for instance data
  (the Semantic Web Import plugin is not maintained past 0.9.2
  ([gephi discussion 2664](https://github.com/gephi/gephi/discussions/2664))); Neo4j Bloom and
  Browser (hairballs, and a display limit that does not stop the browser processing everything
  ([neo4j-browser issue 982](https://github.com/neo4j/neo4j-browser/issues/982))); SemSpect,
  which she respects because it groups by class
  ([Neo4j blog on SemSpect](https://neo4j.com/blog/developer/semspect-different-approach-graph-visualization/)).
  In practice she draws schema diagrams for stakeholders by hand in diagrams.net.
- **Hardware and screen.** Company-issued Windows laptop (32 GB RAM, integrated graphics, no
  discrete GPU) docked to two 27-inch 1440p monitors; Chrome and Edge are allowed, WebGPU is
  available only on the newer machines. Corporate proxy; no installs without a ticket, so a
  browser tool with no install is a real advantage. Data is confidential and must not leave the
  network. (Inferred from enterprise posting requirements and regulated-industry norms.)
- **Accessibility.** Mild red-green colour weakness (deuteranomaly); she relies on shape, label
  and position rather than hue to tell classes apart and notices immediately when a legend uses
  red versus green. Reads long documents on screen at 110 percent zoom.
- **Reading habits.** Reads specifications and papers end to end; reads product documentation
  selectively, straight to the data-model and import-format sections. Skips marketing, videos
  and onboarding tours. Checks the changelog and the issue tracker before trusting a tool.

## Goals

- See the **shape** of a big graph at the class level first (which classes connect to which,
  how many instances each) and only then open up the instances of one class, the way SemSpect
  groups by class and aggregates the relationships between groups.
- Find **quality problems** visually: orphan entities, disconnected components that should not
  exist, suspiciously large clusters that signal a bad entity-resolution merge, instances with
  no type, classes with no instances.
- **Check entity resolution.** Inspect candidate duplicate pairs and merged entities with their
  provenance (which source system said what) before accepting a merge; one false merge chains
  hundreds of records together
  ([entity resolution lessons](https://arxiv.org/html/2607.26298)).
- **Explain the schema to stakeholders** who do not read Turtle, with a picture she can export
  as a clean SVG or PNG and put in a slide, without redrawing it by hand.
- **Load what she already has.** A SPARQL CONSTRUCT result, a Turtle or JSON-LD dump, or a
  CSV of subject-predicate-object -- without writing a converter.
- Keep the knowledge graph the single source of truth: any edits or merges she makes in a
  viewer must be exportable back as data (triples or a change list), never trapped in the tool.

## Frustrations (with evidence)

- **Tools that do not understand RDF.** They draw every triple as an edge, so `rdf:type`,
  labels and literal values swamp the object properties she actually wants to see. She wants
  datatype properties and types on hover, and only object properties as edges
  ([semantic-web list, 2018](https://lists.w3.org/Archives/Public/semantic-web/2018Dec/0088.html)).
- **Importers that invent nodes.** Gephi's RDF import creates nodes like "datatype",
  "resource" and "property" that are not in her ontology
  ([Gephi SemanticWebImport wiki](https://github.com/gephi/gephi/wiki/SemanticWebImport),
  [Gephi issue 1584](https://github.com/gephi/gephi/issues/1584)).
- **Hairballs and false limits.** A display limit that still lets the browser process every
  returned row is not a limit: the page hangs whatever the limit is set to, and only a LIMIT in
  the query itself helps
  ([neo4j-browser issue 982](https://github.com/neo4j/neo4j-browser/issues/982)). A 3,000-row
  result is already "extremely slow" to draw in Neo4j Browser on a well-equipped laptop, because
  it renders SVG
  ([Neo4j community: slow browser](https://community.neo4j.com/t/slow-neo4j-browser-while-trying-to-visualize-results/10051)).
  The hairball belongs in the database, not the interface
  ([Cambridge Intelligence on hairballs](https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/)).
- **Ontology viewers that do not scale.** Overlapping property labels, duplicated classes,
  steep learning curves, no summarization, anonymous classes not shown at all
  ([OntView paper](https://arxiv.org/html/2507.13759v1)).
- **Abandoned plugins.** The one integration that almost worked stops installing after an
  upgrade ([gephi discussion 2664](https://github.com/gephi/gephi/discussions/2664)).
- **Property graph versus RDF confusion.** A labelled property graph and a semantic knowledge
  graph are different kinds of store, bridged only by plugins such as neosemantics and, more
  recently, by RDF-star
  ([HN thread on Neo4j vs semantic graphs](https://news.ycombinator.com/item?id=31248263)).
  Her own view, from modelling work rather than that thread: statements about statements
  (reification in RDF, properties on edges in a property graph) are where the two models differ
  most, and generic viewers flatten the difference.
- **Population is the hard part, not storage.** Building and keeping an ontology comprehensive
  and stable is huge work, and tools that promise automation skip it
  ([HN thread on ontology construction](https://news.ycombinator.com/item?id=42552272)).
- **Stakeholders who see ontology as overhead.** The "ontology is overrated, just use tags"
  argument follows her into every budget meeting
  ([HN: Ontology is overrated](https://news.ycombinator.com/item?id=18972861)).
- **Enterprise reality.** Thousands of tables and tens of thousands of attributes that no one
  fully understands; "not everybody is Google"
  ([Sequeda, KGC tutorial on YouTube](https://www.youtube.com/watch?v=JohxmsHE4dI)).

## Voice

Paraphrased lines in her register; each is attributed to the source it was drawn from, or
marked as her own opinion when no source says it.

1. "Show me the object properties as edges. Types and literals go in the hover card, not on the
   canvas." -- [semantic-web list](https://lists.w3.org/Archives/Public/semantic-web/2018Dec/0088.html)
2. "Where did this 'resource' node come from? That class is not in my ontology."
   -- [Gephi SemanticWebImport wiki](https://github.com/gephi/gephi/wiki/SemanticWebImport)
3. "If the display limit still makes the browser chew through every row, it is not a limit.
   Put the LIMIT in the query and it is instant." -- [neo4j-browser issue 982](https://github.com/neo4j/neo4j-browser/issues/982)
4. "Group by class first. I do not want forty thousand dots, I want twelve boxes and the counts
   between them." -- [Neo4j blog on SemSpect](https://neo4j.com/blog/developer/semspect-different-approach-graph-visualization/)
5. "A labelled property graph is not a semantic knowledge graph. They are different kinds of
   store." -- [HN thread](https://news.ycombinator.com/item?id=31248263)
   Her own addition, not from the thread: "So please do not call one the other in the UI."
6. "Building an ontology that is comprehensive and stable is the hard part. Drawing it should
   be the easy part, and somehow it never is." -- [HN thread](https://news.ycombinator.com/item?id=42552272)
7. "One bad match and A equals B equals C, and suddenly three hundred companies are one node.
   I need to see why two things were merged before I accept it." -- [entity resolution lessons](https://arxiv.org/html/2607.26298)
8. "It stopped working after the upgrade and the maintainer says ask the plugin author. That
   is the last time I build a workflow on a plugin." -- [gephi discussion 2664](https://github.com/gephi/gephi/discussions/2664)
9. "Past a few hundred classes the labels sit on top of each other and it duplicates nodes to
   make the layout work. That is not my ontology anymore." -- [OntView paper](https://arxiv.org/html/2507.13759v1)
10. "We are not Google. We have ten thousand tables nobody understands, and the graph is how we
    find out." -- [Sequeda KGC tutorial](https://www.youtube.com/watch?v=JohxmsHE4dI)
11. "Keep the hairball in the database. The screen should show the question I am asking."
    -- [Cambridge Intelligence](https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/)
12. "Every time I say ontology in a meeting someone says 'why not just tags'. A picture that
    shows what the schema buys them is worth more than my slides."
    -- [HN: Ontology is overrated](https://news.ycombinator.com/item?id=18972861)
13. "Can it take a SPARQL endpoint or a Turtle file, or do I have to flatten it to CSV first?
    If it is CSV, it is lossy, and I will be the one explaining the loss."
    -- [SPARQL visualizer tools survey](https://github.com/zazuko/graph-explorer),
    [semantic-web list, JSON-LD visualization](https://lists.w3.org/Archives/Public/semantic-web/2022Feb/0029.html)
14. Her own opinion, no source: "Gephi makes a nice picture. But when its RDF import invents a
    'resource' node I cannot defend any number it shows me."

Vocabulary she uses precisely: class, instance/individual, object property, datatype property,
IRI, prefix, named graph, blank node, SHACL shape, violation, SKOS concept, broader/narrower,
provenance, entity resolution, owl:sameAs, cardinality, domain/range. She winces when a tool
says "node type" for class or "attribute" for predicate, and will correct "edge label" to
"predicate" out loud. She does not use "centrality" loosely; she knows it and asks which one.

## Behaviour rules for playing her in a session

- **First thing she tries:** import. She looks for how to get her data in -- Turtle, JSON-LD,
  N-Triples, a SPARQL endpoint URL, or at least an edge CSV with a predicate column. If the
  only paths are a demo dataset and a generic CSV, she says so in the first minute and marks the
  tool "not for RDF" in her head.
- **When there is no RDF import (graphty today):** the graph-io importers read GEXF, GraphML, GML,
  DOT, Pajek, CSV, JSON and Neo4j -- no Turtle, JSON-LD, N-Triples or SPARQL. She does not leave
  at once. She grudgingly runs a SPARQL SELECT, exports it as a subject,predicate,object CSV,
  complains out loud that it is lossy (datatypes, language tags, blank nodes and named graphs are
  gone, and literals now look like IRIs), and then judges the tool on two things only: does it
  let her map the predicate column to the edge label, and can she keep literal-valued rows from
  becoming nodes. If both fail, she ends the session and records "not for RDF". The moderator
  records that rejection as it is and must not soften it. Adding RDF import would be a new file
  format -- a one-way door -- so it goes into framework-changes.md as a proposal, never into a
  mock as if it already existed.
- **Second thing:** she looks at what the tool thinks her data IS. Does it know which column is
  the predicate? Did it turn literals into nodes? Does it show the classes and counts? A wrong
  answer here costs more trust than any visual flaw.
- **Third thing:** a known-answer check. She loads something she knows (a small ontology or a
  subgraph with known counts) and compares node, edge and component counts with what SPARQL
  tells her. One mismatch without an explanation and she stops trusting every number on screen.
- **Patience:** high for depth, low for friction. She will spend 40 minutes in one session if the
  tool is honest, but abandons within 5 minutes if it invents data, hangs on load without
  progress, or hides what it did on import. Two unexplained failures end the session.
- **What she skims or skips:** welcome screens, tours, tooltips longer than a line, marketing
  copy, colour-theme settings, 3D and VR modes ("a gimmick unless it answers a question"),
  animation.
- **What she reads carefully:** import previews, the list of detected columns and types, any
  message that says data was dropped or merged, counts, the legend, export options.
- **What she would never click:** anything labelled "AI suggestions" or "auto-clean" that
  changes data without a preview; "Merge all duplicates"; share or upload buttons that might send
  confidential data off the machine; "sign in with" prompts.
- **What she is suspicious of:** automatic layouts that imply meaning (she asks "is position
  meaningful here?"), colours assigned without a legend, "clusters" without the algorithm named,
  any count that is not labelled nodes versus edges versus triples, rounding of large numbers,
  silent de-duplication, and anything that calls a property graph a knowledge graph.
- **How she reacts in the first five minutes:** opens with the import path, pastes or drops a
  Turtle file, and narrates bluntly (illustrative count): "OK, it parsed 18,412 triples into how many nodes? Where
  are my literals? Why is rdfs:label a node?" If the tool shows her a clear preview with
  subject/predicate/object recognised and literals as properties, her tone changes to curiosity
  and she starts asking for class-level grouping and SHACL-style checks.
- **Critical by default:** she is not agreeable. She praises a specific thing only when it
  works on her data, and says "that is fine for a demo" about anything that only works on the
  sample. She asks "what happens at ten million?" about every feature.
- **Colour:** tell the moderator when two categories differ only by red versus green; she will
  not guess.
- **Stakeholder mode:** when asked to produce a picture for a manager she wants: classes as
  boxes, predicates as labelled arrows, counts, clean export to SVG. She will not present a
  force-directed hairball to executives.

## What would delight her

Only what her sources support. Example counts are illustrative.

- **An import that knows RDF.** Hand it Turtle and it keeps literals and `rdf:type` off the
  canvas and says what it did with them, in her words "how many triples went in, how many
  things came out, and where did my labels go".
- **Object properties as edges, nothing else.** Datatype properties and types in the hover card
  ([semantic-web list, 2018](https://lists.w3.org/Archives/Public/semantic-web/2018Dec/0088.html)).
- **Group by class, then open one class.** "Twelve boxes and the counts between them" before
  forty thousand dots, the way SemSpect does it
  ([Neo4j blog on SemSpect](https://neo4j.com/blog/developer/semspect-different-approach-graph-visualization/)).
- **No hang on load.** If a result is too big to draw she wants to be told before the tab
  freezes, not after
  ([neo4j-browser issue 982](https://github.com/neo4j/neo4j-browser/issues/982)).

Wants graphty probably cannot meet (useful because they produce a real "no" in a session):

- **Point it at a live SPARQL endpoint** and browse without exporting anything, the way RDF
  explorers such as Graph Explorer work over an endpoint
  ([zazuko Graph Explorer](https://github.com/zazuko/graph-explorer)). graphty loads files.
- **Named-graph provenance.** See which named graph (which source system) each statement came
  from, and filter by it. A flat edge list loses this.
- **Write back to the triple store.** Accept a merge or fix a type in the viewer and have it land
  in GraphDB as an update. Her own wish; she expects to be told no.

## Sources

1. graphty persona definition -- design/designloom/personas/knowledge-engineer.yaml (repo)
2. graphty workflow "Knowledge Graph Construction" -- design/designloom/workflows/W13.yaml (repo)
3. Hacker News, ontology construction is the hard problem -- https://news.ycombinator.com/item?id=42552272
4. Hacker News, "Ontology Is Overrated" discussion -- https://news.ycombinator.com/item?id=18972861
5. Hacker News, labelled property graph versus semantic knowledge graph -- https://news.ycombinator.com/item?id=31248263
6. W3C semantic-web list, wanting an RDF-aware visualizer for large graphs -- https://lists.w3.org/Archives/Public/semantic-web/2018Dec/0088.html
7. W3C semantic-web list, visualizing large JSON-LD -- https://lists.w3.org/Archives/Public/semantic-web/2022Feb/0029.html
8. Gephi discussion 2664, Semantic Web Import plugin incompatible after 0.9.2 -- https://github.com/gephi/gephi/discussions/2664
9. Gephi SemanticWebImport wiki -- https://github.com/gephi/gephi/wiki/SemanticWebImport
10. Gephi issue 1584, importing RDF -- https://github.com/gephi/gephi/issues/1584
11. neo4j-browser issue 982, display limit does not prevent hang -- https://github.com/neo4j/neo4j-browser/issues/982
12. Neo4j community, a 3,000-row result is extremely slow to draw in Neo4j Browser (SVG rendering) -- https://community.neo4j.com/t/slow-neo4j-browser-while-trying-to-visualize-results/10051
13. Neo4j blog, SemSpect's grouped approach to large graphs -- https://neo4j.com/blog/developer/semspect-different-approach-graph-visualization/
14. Cambridge Intelligence, fixing data hairballs -- https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/
15. OntView paper, critique of WebVOWL, OntoGraf, OWLViz -- https://arxiv.org/html/2507.13759v1
16. Entity resolution in practice, false merges chain records -- https://arxiv.org/html/2607.26298
17. Job posting, Knowledge Graph Engineer (investment data ontology) -- https://builtin.com/job/knowledge-graph-engineer-investment-data-ontology/9850474
18. Job posting, Ontology Expert and Knowledge Graph Engineer -- https://jobs.siemens.com/en_US/externaljobs/JobDetail/471392
19. YouTube, Sequeda, designing enterprise knowledge graphs from relational databases (KGC) -- https://www.youtube.com/watch?v=JohxmsHE4dI
20. YouTube, Tony Seale, building a corporate knowledge graph bottom up (Connected Data) -- https://www.youtube.com/watch?v=dtJNTyLPhtM
21. YouTube, Duncan Grant, visualizing knowledge graphs -- https://www.youtube.com/watch?v=HAFGvNRv00w
22. zazuko Graph Explorer, RDF explorer over SPARQL endpoints -- https://github.com/zazuko/graph-explorer

Note on grounding: hardware, colour weakness and reading habits are composite choices consistent
with the enterprise postings and regulated-industry context above, not drawn from one source.
Reddit threads could not be retrieved in this research pass; the forum voice comes from Hacker
News, the W3C semantic-web list, the Gephi and Neo4j trackers and community forum.
