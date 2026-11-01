## 0.1.42 (2026-10-31)

### 🩹 Fixes

- **graph-samples:** let Rolldown drop the dataset metadata a page never reads ([91b6abf8c3](https://github.com/graphty-org/graphty-monorepo/commit/91b6abf8c3))

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.10

## 0.1.41 (2026-10-29)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.9

## 0.1.40 (2026-10-28)

### 🚀 Features

- **graphty-element:** read place names as node locations through a hosted gazetteer ([#3299](https://github.com/graphty-org/graphty-monorepo/issues/3299))
- **graph-samples:** rebuild hosted datasets from a sources release, refreshed by hand ([#3302](https://github.com/graphty-org/graphty-monorepo/issues/3302))
- **graph-samples:** add venice-transit, a city-scale network with stop coordinates ([b6fba7ab50](https://github.com/graphty-org/graphty-monorepo/commit/b6fba7ab50))

### 🩹 Fixes

- **ci:** preset FC_FONTATIONS for every Chromium launch; one shared vitest base ([#3787](https://github.com/graphty-org/graphty-monorepo/issues/3787))
- **graph-samples:** clear the SonarQube findings of the hosted sources scripts ([#3302](https://github.com/graphty-org/graphty-monorepo/issues/3302))
- **graph-samples:** deploy reuses the published hosted datasets instead of third-party hosts ([#3302](https://github.com/graphty-org/graphty-monorepo/issues/3302))
- **graph-samples:** draw the Venice sample card with darker edges and outlined nodes ([fae8b93659](https://github.com/graphty-org/graphty-monorepo/commit/fae8b93659))
- **graph-samples:** read a dataset the server already unzipped ([5433eda0dc](https://github.com/graphty-org/graphty-monorepo/commit/5433eda0dc))
- **graph-samples:** read a dataset the server already unzipped ([701b618a87](https://github.com/graphty-org/graphty-monorepo/commit/701b618a87))

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.8

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent

## 0.1.39 (2026-10-21)

### 🚀 Features

- **graph-samples:** publish a picture of every large dataset and every generator ([a895fb9b3](https://github.com/graphty-org/graphty-monorepo/commit/a895fb9b3))
- **graph-samples:** a catalogue of every generator, and generateGraph to run one by name ([b51fa5053](https://github.com/graphty-org/graphty-monorepo/commit/b51fa5053))
- **graph-samples:** a picture of each small dataset, published beside its file ([cd843173e](https://github.com/graphty-org/graphty-monorepo/commit/cd843173e))

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.7

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.38 (2026-10-20)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.6

## 0.1.37 (2026-10-18)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.5

## 0.1.36 (2026-10-17)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.4

## 0.1.35 (2026-10-17)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.3

## 0.1.34 (2026-10-15)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.2

## 0.1.33 (2026-10-15)

### 🚀 Features

- **graph-samples:** load every dataset from graphty.app instead of bundling it ([11d72b864](https://github.com/graphty-org/graphty-monorepo/commit/11d72b864))

### 🩹 Fixes

- **graph-samples:** pack hosted datasets without a commit stamp ([#2709](https://github.com/graphty-org/graphty-monorepo/issues/2709))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.32 (2026-10-14)

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.1

## 0.1.31 (2026-10-14)

### 🩹 Fixes

- **graph-samples:** use graph-format's engine-independent log and exp ([#2440](https://github.com/graphty-org/graphty-monorepo/issues/2440))

### 🧱 Updated Dependencies

- Updated graph-format to 1.4.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.30 (2026-10-13)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.15

## 0.1.29 (2026-10-13)

### 🩹 Fixes

- **tools:** cap each test slot's Node workers at its share of the cores ([9daf98f16](https://github.com/graphty-org/graphty-monorepo/commit/9daf98f16))
- **graph-samples:** use American spelling in the dataset descriptions ([#2105](https://github.com/graphty-org/graphty-monorepo/issues/2105))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.14

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.28 (2026-10-12)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.13

## 0.1.27 (2026-10-11)

### 🚀 Features

- **tools:** fail a CI test that uses more than 25% of its time limit ([#1602](https://github.com/graphty-org/graphty-monorepo/issues/1602))

### 🔥 Performance

- **graph-samples:** unroll threefry and skip most Waxman logarithms ([#1805](https://github.com/graphty-org/graphty-monorepo/issues/1805))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.12

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.26 (2026-10-09)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.11

## 0.1.25 (2026-10-09)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.10

## 0.1.24 (2026-10-08)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.9

## 0.1.23 (2026-10-07)

### 🚀 Features

- **graph-samples:** export the dataset names without their metadata ([b8027edff](https://github.com/graphty-org/graphty-monorepo/commit/b8027edff))

### 🩹 Fixes

- **graph-samples:** build DATASET_NAMES from the lists DATASETS is built from ([b03a2599c](https://github.com/graphty-org/graphty-monorepo/commit/b03a2599c))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.8

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.22 (2026-10-07)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.7

## 0.1.21 (2026-10-06)

### 🩹 Fixes

- **graph-samples:** return a fresh empty array for k = 0 neighbours ([#714](https://github.com/graphty-org/graphty-monorepo/issues/714))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.6

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.20 (2026-10-05)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.5

## 0.1.19 (2026-10-05)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.4

## 0.1.18 (2026-10-04)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.3

## 0.1.17 (2026-10-04)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.2

## 0.1.16 (2026-10-04)

### 🚀 Features

- **graph-samples:** host the Gene Ontology, Disease Ontology and BioPlex 3 datasets ([066457dc0](https://github.com/graphty-org/graphty-monorepo/commit/066457dc0))
- **graph-samples:** add the yeast, Stelzl, WikiPathways and GO slim datasets read by graph-io ([311ea3256](https://github.com/graphty-org/graphty-monorepo/commit/311ea3256))

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.1

### ❤️ Thank You

- Adam Powers @apowers313

## 0.1.15 (2026-10-03)

### 🧱 Updated Dependencies

- Updated graph-format to 1.3.0

## 0.1.14 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.6

## 0.1.13 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.5

## 0.1.12 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.4

## 0.1.11 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.3

## 0.1.10 (2026-09-30)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.2

## 0.1.9 (2026-09-30)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.1

## 0.1.8 (2026-09-29)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.0

## 0.1.7 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.2

## 0.1.6 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.1

## 0.1.5 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.0

## 0.1.4 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.7

## 0.1.3 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.6

## 0.1.2 (2026-09-26)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.5

## 0.1.1 (2026-09-24)

### 🚀 Features

- **graph-samples:** the full generator catalogue, structural variants and more datasets ([d3ea8633](https://github.com/graphty-org/graphty-monorepo/commit/d3ea8633))
- **graph-samples:** generators and bundled sample graphs with reproducible seeds ([6043744e](https://github.com/graphty-org/graphty-monorepo/commit/6043744e))

### 🩹 Fixes

- **graph-samples:** pass the published-dependency check ([81aeadcd](https://github.com/graphty-org/graphty-monorepo/commit/81aeadcd))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.4

### ❤️ Thank You

- Adam Powers @apowers313
