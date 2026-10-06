## 0.3.26 (2026-10-06)

### 🚀 Features

- **graph-io:** refuse prose in detection, report misspelled options, add edgeWeights ([0c4ea36a1](https://github.com/graphty-org/graphty-monorepo/commit/0c4ea36a1))
- **graph-io:** fix the API defects blind implementers hit ([a5fc42bef](https://github.com/graphty-org/graphty-monorepo/commit/a5fc42bef))
- **graph-io:** fix what blind readers of the guide ran into ([7c3cf193b](https://github.com/graphty-org/graphty-monorepo/commit/7c3cf193b))
- **graph-io:** honor graph choice everywhere, refuse plain text, report what policies drop ([bdd6f043d](https://github.com/graphty-org/graphty-monorepo/commit/bdd6f043d))
- **graph-io:** write OBO and OBO Graphs ([e15e0691f](https://github.com/graphty-org/graphty-monorepo/commit/e15e0691f))
- **graph-io:** write CX version 1 ([d3edc0db5](https://github.com/graphty-org/graphty-monorepo/commit/d3edc0db5))
- **graph-io:** write Cytoscape sessions (.cys) ([9da294f82](https://github.com/graphty-org/graphty-monorepo/commit/9da294f82))
- **graph-io:** add loadFromUrl, loadFromFile, byte/Blob export, downloadGraph and listFormats ([930a2f03a](https://github.com/graphty-org/graphty-monorepo/commit/930a2f03a))

### 🩹 Fixes

- **graph-format:** refuse an oversized vertex count before building it ([#769](https://github.com/graphty-org/graphty-monorepo/issues/769))
- **graph-io:** write the rewritten number patterns with \d ([#713](https://github.com/graphty-org/graphty-monorepo/issues/713))
- **graph-io:** parse DOT points and XGMML reals in linear time ([#713](https://github.com/graphty-org/graphty-monorepo/issues/713))
- **graph-io:** count line breaks in a quoted CSV cell with indexOf, and link the samples list ([2ac58c131](https://github.com/graphty-org/graphty-monorepo/commit/2ac58c131))
- **graph-io:** fix the library defects readers of the guide hit ([3c41139f8](https://github.com/graphty-org/graphty-monorepo/commit/3c41139f8))
- **graph-io:** warn W_MULTIPLE_GRAPHS only when the first graph was read by default ([a807b7e5b](https://github.com/graphty-org/graphty-monorepo/commit/a807b7e5b))
- **graph-io:** refuse mistyped DOT options and say how to fix refused saves ([54999ad54](https://github.com/graphty-org/graphty-monorepo/commit/54999ad54))
- **graph-io:** reconcile the new exporters and the simple API with the hardened importers ([4bd3d92a0](https://github.com/graphty-org/graphty-monorepo/commit/4bd3d92a0))
- **graph-io:** close JSON robustness gaps a review found ([4615ea8c1](https://github.com/graphty-org/graphty-monorepo/commit/4615ea8c1))
- **graph-io:** read a fully quoted Neo4j header as a header ([153b4ae66](https://github.com/graphty-org/graphty-monorepo/commit/153b4ae66))
- **graph-io:** close the gaps review found in the GML, DOT and Pajek fixes ([30253c328](https://github.com/graphty-org/graphty-monorepo/commit/30253c328))
- **graph-io:** chunk-independent binary check, stray BOM and sniffer warnings ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2))
- **graph-io:** close the gaps review found in the GraphML and GEXF robustness work ([001ae1536](https://github.com/graphty-org/graphty-monorepo/commit/001ae1536))
- **graph-io:** report merged and refused edges with shared codes ([dcd5e1d4f](https://github.com/graphty-org/graphty-monorepo/commit/dcd5e1d4f))
- **graph-io:** give each Cytoscape network its own report for zip and table failures ([e2ac5c5be](https://github.com/graphty-org/graphty-monorepo/commit/e2ac5c5be))
- **graph-io:** repair CX element keys, read multi-aspect members in any order ([73ce67727](https://github.com/graphty-org/graphty-monorepo/commit/73ce67727))
- **graph-io:** relay the decoder warnings of a Cytoscape session's XML entries ([c8d754f21](https://github.com/graphty-org/graphty-monorepo/commit/c8d754f21))
- **graph-io:** check registry options before peeking, abort a stalled peek, refuse non-graph files ([121b49a9c](https://github.com/graphty-org/graphty-monorepo/commit/121b49a9c))
- **graph-io:** sniff URLs, survive a throwing plugin sniffer, see past leading comments ([94edac9cc](https://github.com/graphty-org/graphty-monorepo/commit/94edac9cc))
- **graph-io:** read JSON through the shared size guard and name JSON Lines ([ce1624f4a](https://github.com/graphty-org/graphty-monorepo/commit/ce1624f4a))
- **graph-io:** read DOT's charset only from a graph-level attribute, 64 KiB deep ([a0216d0ed](https://github.com/graphty-org/graphty-monorepo/commit/a0216d0ed))
- **graph-io:** refuse an XML declaration that does not start the document ([2430ceba2](https://github.com/graphty-org/graphty-monorepo/commit/2430ceba2))
- **graph-io:** harden the shared byte decoder and check every decoded text once ([37e85ba0e](https://github.com/graphty-org/graphty-monorepo/commit/37e85ba0e))
- **graph-io:** stop at a full sink, keep truncated for the error limit, cap repeated warnings ([ebb0b60e1](https://github.com/graphty-org/graphty-monorepo/commit/ebb0b60e1))
- **graph-io:** define the input-layer issue codes once and spread them into every table ([2c1dc3454](https://github.com/graphty-org/graphty-monorepo/commit/2c1dc3454))
- **graph-io:** report vis.js arrows the undirected reading ignores ([82e79f4b1](https://github.com/graphty-org/graphty-monorepo/commit/82e79f4b1))
- **graph-io:** stop the GEXF importer dropping or misreading data silently ([2a182eec4](https://github.com/graphty-org/graphty-monorepo/commit/2a182eec4))
- **graph-io:** stop the GraphML importer dropping or misreading data silently ([93e80a266](https://github.com/graphty-org/graphty-monorepo/commit/93e80a266))
- **graph-io:** enforce XML well-formedness and report encoding problems precisely ([22426316f](https://github.com/graphty-org/graphty-monorepo/commit/22426316f))
- **graph-io:** make the Neo4j importer count, report and recover per row ([585075e28](https://github.com/graphty-org/graphty-monorepo/commit/585075e28))
- **graph-io:** report what the OBO Graphs reader used to drop silently ([25b7c4fc1](https://github.com/graphty-org/graphty-monorepo/commit/25b7c4fc1))
- **graph-io:** refuse other formats before parsing CSV records and report silent CSV recoveries ([d1d97dfd7](https://github.com/graphty-org/graphty-monorepo/commit/d1d97dfd7))
- **graph-io:** keep a Cytoscape session readable past damaged or odd entries ([cc26915df](https://github.com/graphty-org/graphty-monorepo/commit/cc26915df))
- **graph-io:** refuse lying zip directories and decode CP437 entry names ([3fa0cf508](https://github.com/graphty-org/graphty-monorepo/commit/3fa0cf508))
- **graph-io:** make the Pajek importer report what it silently changed ([584ac87cf](https://github.com/graphty-org/graphty-monorepo/commit/584ac87cf))
- **graph-io:** resolve XGMML namespaces in scope and stop dropping data silently ([ad3dcc3c6](https://github.com/graphty-org/graphty-monorepo/commit/ad3dcc3c6))
- **graph-io:** make the DOT importer report what it silently changed ([05c641189](https://github.com/graphty-org/graphty-monorepo/commit/05c641189))
- **graph-io:** enforce more XML well-formedness in the shared tokenizer ([8c6f3fd3a](https://github.com/graphty-org/graphty-monorepo/commit/8c6f3fd3a))
- **graph-io:** make the GML importer keep or report what it used to lose ([f4cf41a79](https://github.com/graphty-org/graphty-monorepo/commit/f4cf41a79))
- **graph-io:** report freeze-time policy errors and the failing graph ([225a51855](https://github.com/graphty-org/graphty-monorepo/commit/225a51855))
- **graph-io:** locate and explain undecodable bytes precisely ([fbaf07c2c](https://github.com/graphty-org/graphty-monorepo/commit/fbaf07c2c))
- **graph-io:** name binary, truncated and UTF-16 input in the shared byte decoder ([769afafb2](https://github.com/graphty-org/graphty-monorepo/commit/769afafb2))
- **graph-io:** make the CX2 importer report what it dropped and stop raw exceptions ([49c77ebe1](https://github.com/graphty-org/graphty-monorepo/commit/49c77ebe1))
- **graph-io:** stop the CX importer dropping data silently and report what it skips ([a2c053c17](https://github.com/graphty-org/graphty-monorepo/commit/a2c053c17))
- **graph-io:** make the shared CX scanner and byte decoder recover or name the cause ([40065b86d](https://github.com/graphty-org/graphty-monorepo/commit/40065b86d))
- **graph-io:** report what the OBO Graphs reader skips ([54acb766b](https://github.com/graphty-org/graphty-monorepo/commit/54acb766b))
- **graph-io:** report adjacency_data lists that are missing or disagree ([9e2c1553b](https://github.com/graphty-org/graphty-monorepo/commit/9e2c1553b))
- **graph-io:** bound and deduplicate JGF hyperedge expansion ([46f17ab74](https://github.com/graphty-org/graphty-monorepo/commit/46f17ab74))
- **graph-io:** report graphology edges that contradict the declared options ([1f8143790](https://github.com/graphty-org/graphty-monorepo/commit/1f8143790))
- **graph-io:** make the OBO importer recover from damaged and foreign input ([0c7a8b25b](https://github.com/graphty-org/graphty-monorepo/commit/0c7a8b25b))
- **graph-io:** linear, prototype-safe OBO qualifier blocks ([b84572d15](https://github.com/graphty-org/graphty-monorepo/commit/b84572d15))
- **graph-io:** report a refused freeze as ImportError with the report ([acfa157b2](https://github.com/graphty-org/graphty-monorepo/commit/acfa157b2))
- **graph-io:** report unread vis, graphology and JGF keys; keep importAll going past a bad graph ([754063836](https://github.com/graphty-org/graphty-monorepo/commit/754063836))
- **graph-io:** read Cytoscape z, refuse parent cycles and report bad elements ([2e3ea24b8](https://github.com/graphty-org/graphty-monorepo/commit/2e3ea24b8))
- **graph-io:** flag only JSON literals whose written digits a double cannot keep ([00e4ca46b](https://github.com/graphty-org/graphty-monorepo/commit/00e4ca46b))
- **graph-io:** report JSON endpoints, index links and edge keys the reader guessed at ([a5d162523](https://github.com/graphty-org/graphty-monorepo/commit/a5d162523))
- **graph-io:** let nodesPath and edgesPath index arrays ([5ac7db397](https://github.com/graphty-org/graphty-monorepo/commit/5ac7db397))
- **graph-io:** keep NetworkX node-link documents out of the vis and graphology readers ([2f0fc638a](https://github.com/graphty-org/graphty-monorepo/commit/2f0fc638a))
- **graph-io:** refuse other formats and report silent CSV guesses ([2c962df5f](https://github.com/graphty-org/graphty-monorepo/commit/2c962df5f))
- **graph-io:** read the CSV whitespace dialect, Excel sep= lines and comment-heavy previews ([48124b155](https://github.com/graphty-org/graphty-monorepo/commit/48124b155))
- **graph-io:** report JSON keys that are null on every element ([64bbc6da1](https://github.com/graphty-org/graphty-monorepo/commit/64bbc6da1))
- **graph-io:** keep the other JSON attributes when the sink refuses one ([b4c07c14b](https://github.com/graphty-org/graphty-monorepo/commit/b4c07c14b))
- **graph-io:** locate JSON syntax errors and report what JSON.parse drops ([1db09a0a2](https://github.com/graphty-org/graphty-monorepo/commit/1db09a0a2))
- **graph-io:** sniff a UTF-16 JSON head with a BOM ([934c7fe96](https://github.com/graphty-org/graphty-monorepo/commit/934c7fe96))
- **graph-io:** read BOM-less UTF-16 and name binary input in the decoder ([c2b9aa44e](https://github.com/graphty-org/graphty-monorepo/commit/c2b9aa44e))
- **graph-io:** report truncated UTF-8, NUL bytes and exact byte offsets when decoding ([013fa0603](https://github.com/graphty-org/graphty-monorepo/commit/013fa0603))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.6

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.25 (2026-10-05)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.5

## 0.3.24 (2026-10-05)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.4

## 0.3.23 (2026-10-04)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.3

## 0.3.22 (2026-10-04)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.2

## 0.3.21 (2026-10-04)

### 🩹 Fixes

- **graph-io:** find CX layout, group, weight and link entries under every ids option ([bccf4fefe](https://github.com/graphty-org/graphty-monorepo/commit/bccf4fefe))
- **graph-io:** keep a CX subnetwork's members when the ids option coerces them ([985c7d91a](https://github.com/graphty-org/graphty-monorepo/commit/985c7d91a))
- **graph-io:** store Cytoscape.js positions y-up and write them back flipped ([229ae98ad](https://github.com/graphty-org/graphty-monorepo/commit/229ae98ad))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.1

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.20 (2026-10-03)

### 🚀 Features

- **graph-io:** read Cytoscape sessions (@graphty/graph-io/cys) ([#706](https://github.com/graphty-org/graphty-monorepo/issues/706))
- **graph-io:** a zip reader with no dependency, and readBytes for binary input ([0a5fa5e7](https://github.com/graphty-org/graphty-monorepo/commit/0a5fa5e7))
- **graph-io:** note DOT parents that read back marked as clusters ([c4bdf035](https://github.com/graphty-org/graphty-monorepo/commit/c4bdf035))
- **graph-io:** write XGMML columns back the way the source declared them ([87e2ffd9](https://github.com/graphty-org/graphty-monorepo/commit/87e2ffd9))
- **graph-io:** read and write XGMML (@graphty/graph-io/xgmml) ([0accf71c](https://github.com/graphty-org/graphty-monorepo/commit/0accf71c))
- **graph-io:** report a repeated GEXF attribute declaration as the shared W_DUPLICATE_ATTRIBUTE ([09e818f5](https://github.com/graphty-org/graphty-monorepo/commit/09e818f5))
- **graph-io:** opt-in bare-ampersand and surrogate-pair repairs in the XML tokenizer ([61063047](https://github.com/graphty-org/graphty-monorepo/commit/61063047))

### 🩹 Fixes

- **graph-io:** stop an import whose attributes are too sparse before it exhausts memory ([#768](https://github.com/graphty-org/graphty-monorepo/issues/768))
- **graph-io:** refused ids, Integer overflow and prefixed atts in the XGMML and session readers ([b7894a27](https://github.com/graphty-org/graphty-monorepo/commit/b7894a27))
- **graph-io:** type DOT graph attributes by their text, as node attributes are ([29e8cb30](https://github.com/graphty-org/graphty-monorepo/commit/29e8cb30))
- **graph-io:** read an XGMML NaN without a precision warning ([4cf2d18a](https://github.com/graphty-org/graphty-monorepo/commit/4cf2d18a))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.19 (2026-10-03)

### 🚀 Features

- **graph-io:** read CX version 1, collections included ([605d8d61](https://github.com/graphty-org/graphty-monorepo/commit/605d8d61))
- **graph-io:** read and write CX2, the NDEx and Cytoscape exchange format ([#307](https://github.com/graphty-org/graphty-monorepo/issues/307))
- **graph-io:** report a repeated GEXF attribute as the shared W_DUPLICATE_ATTRIBUTE ([b7b43759](https://github.com/graphty-org/graphty-monorepo/commit/b7b43759))
- **graph-io:** read CX documents element by element ([6af50573](https://github.com/graphty-org/graphty-monorepo/commit/6af50573))

### 🩹 Fixes

- **graph-io:** defects in the CX and CX2 readers found in review ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2))
- **graph-io:** a CX2 visual property never overwrites the attribute of its name ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2))
- **graph-io:** reserve the GML edge key directed and note numeric GEXF edge ids ([f9e8691c](https://github.com/graphty-org/graphty-monorepo/commit/f9e8691c))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.18 (2026-10-03)

### 🚀 Features

- **graph-io:** keep OBO frames of an unknown type as metadata ([1fb5f317](https://github.com/graphty-org/graphty-monorepo/commit/1fb5f317))
- **graph-io:** read OBO Graphs JSON as the obographs dialect ([305c11bc](https://github.com/graphty-org/graphty-monorepo/commit/305c11bc))
- **graph-io:** read the OBO flat file format of the Gene Ontology ([3e6b0da0](https://github.com/graphty-org/graphty-monorepo/commit/3e6b0da0))

### 🩹 Fixes

- **graph-io:** keep every OBO qualifier and read quotes, comments and language tags as the guides do ([b900d96a](https://github.com/graphty-org/graphty-monorepo/commit/b900d96a))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.17 (2026-10-02)

### 🚀 Features

- **graph-io:** list the graphs of an input and choose one ([00ac9052](https://github.com/graphty-org/graphty-monorepo/commit/00ac9052))
- **graph-io:** decode zip entry names in the shared input module ([29e314fe](https://github.com/graphty-org/graphty-monorepo/commit/29e314fe))
- **graph-io:** shared issue codes for the Cytoscape and OBO importers ([83684a9f](https://github.com/graphty-org/graphty-monorepo/commit/83684a9f))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.16 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.6

## 0.3.15 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.5

## 0.3.14 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.4

## 0.3.13 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.3

## 0.3.12 (2026-09-30)

### 🚀 Features

- **graph-io:** read quoted gml flags and keep dot pos as text on request ([743aa6aa](https://github.com/graphty-org/graphty-monorepo/commit/743aa6aa))
- **graph-io:** record a gml file's directed key as written ([dc1ad686](https://github.com/graphty-org/graphty-monorepo/commit/dc1ad686))

### 🩹 Fixes

- **graphty-element:** record how dot, gml and pajek loads differ from 2.x ([b1891017](https://github.com/graphty-org/graphty-monorepo/commit/b1891017))
- **graph-io:** recognise gexf and graphml only in a document that starts as markup ([6e01ce08](https://github.com/graphty-org/graphty-monorepo/commit/6e01ce08))
- **graph-io:** recognise a dot header followed by a quoted id or a comment ([8d1d04ce](https://github.com/graphty-org/graphty-monorepo/commit/8d1d04ce))
- **graphty-element:** detect any delimited table as csv and never space-split text ([044281fd](https://github.com/graphty-org/graphty-monorepo/commit/044281fd))

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.2

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.11 (2026-09-30)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.1

## 0.3.10 (2026-09-29)

### 🚀 Features

- **graph-io:** keep open GEXF spell bounds and the defaultedgetype the file wrote ([8a4a34d8](https://github.com/graphty-org/graphty-monorepo/commit/8a4a34d8))
- **graph-io:** read json node and edge arrays through dotted paths ([d9870e67](https://github.com/graphty-org/graphty-monorepo/commit/d9870e67))
- **graph-io:** read and write csv adjacency tables and number node rows without ids ([9ac6f760](https://github.com/graphty-org/graphty-monorepo/commit/9ac6f760))
- **graph-io:** read yfiles graphics into columns and key name and type ([1ad6ecb5](https://github.com/graphty-org/graphty-monorepo/commit/1ad6ecb5))
- **graph-io:** keep string gml node ids with one warning ([21cf0082](https://github.com/graphty-org/graphty-monorepo/commit/21cf0082))

### 🩹 Fixes

- **graph-io:** read gexf edge type keywords in any case ([0c7be1e1](https://github.com/graphty-org/graphty-monorepo/commit/0c7be1e1))
- **graph-io:** read a graphml key id declared once for each kind of element ([7c7307cd](https://github.com/graphty-org/graphty-monorepo/commit/7c7307cd))
- **graph-io:** keep csv quote errors fatal and scope rowNumberIds to the node table ([d9a6b1dc](https://github.com/graphty-org/graphty-monorepo/commit/d9a6b1dc))
- **graph-io:** check yfiles graphics against every tree and document gaps ([77534e52](https://github.com/graphty-org/graphty-monorepo/commit/77534e52))
- **graph-io:** make csv adjacency exports re-import and json edge paths read every dialect ([7bb78f9b](https://github.com/graphty-org/graphty-monorepo/commit/7bb78f9b))
- **graph-io:** report edited yfiles graphics columns as an export loss ([89c9cc5d](https://github.com/graphty-org/graphty-monorepo/commit/89c9cc5d))
- **graph-io:** resolve gml endpoints by the id rule under every nodeIdFrom ([5c2b1d39](https://github.com/graphty-org/graphty-monorepo/commit/5c2b1d39))

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.9 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.2

## 0.3.8 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.1

## 0.3.7 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.0

## 0.3.6 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.7

## 0.3.5 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.6

## 0.3.4 (2026-09-26)

### 🩹 Fixes

- **graph-io:** neo4j import keeps nodes from different id spaces apart ([#305](https://github.com/graphty-org/graphty-monorepo/issues/305))
- **graph-io:** pajek import reads partitions, vectors, two-mode matrices and more forms ([#103](https://github.com/graphty-org/graphty-monorepo/issues/103), [#104](https://github.com/graphty-org/graphty-monorepo/issues/104), [#105](https://github.com/graphty-org/graphty-monorepo/issues/105), [#106](https://github.com/graphty-org/graphty-monorepo/issues/106))
- **graph-io:** json import reads NaN, big ids, and networkx adjacency and tree data ([#66](https://github.com/graphty-org/graphty-monorepo/issues/66), [#67](https://github.com/graphty-org/graphty-monorepo/issues/67), [#68](https://github.com/graphty-org/graphty-monorepo/issues/68))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.3 (2026-09-26)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.5

## 0.3.2 (2026-09-25)

### 🩹 Fixes

- **graph-io:** importers report what they drop instead of losing it silently ([#62](https://github.com/graphty-org/graphty-monorepo/issues/62), [#63](https://github.com/graphty-org/graphty-monorepo/issues/63), [#64](https://github.com/graphty-org/graphty-monorepo/issues/64), [#65](https://github.com/graphty-org/graphty-monorepo/issues/65))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.1 (2026-09-24)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.4

## 0.3.0 (2026-09-24)

### 🚀 Features

- ⚠️ **graph-io:** decode any encoding once, and read every graph in a file ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))

### 🩹 Fixes

- **graph-io:** exporters round-trip -0, DOT line continuations and GEXF 1.2 timestamps ([72292b6c](https://github.com/graphty-org/graphty-monorepo/commit/72292b6c))

### ⚠️ Breaking Changes

- **graph-io:** decode any encoding once, and read every graph in a file ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))
  GML_ISSUE.SECOND_GRAPH is now MULTIPLE_GRAPHS and
  PAJEK_ISSUE.MULTIPLE_NETWORKS is now MULTIPLE_GRAPHS; both carry the new
  W_MULTIPLE_GRAPHS warning code, since a second graph is no longer an error.

### ❤️ Thank You

- Adam Powers @apowers313

## 0.2.5 (2026-09-24)

### 🩹 Fixes

- **deps:** stop publishing build caches and test configuration ([b7537fef](https://github.com/graphty-org/graphty-monorepo/commit/b7537fef))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.3

### ❤️ Thank You

- Adam Powers @apowers313

## 0.2.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.2

## 0.2.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.1
