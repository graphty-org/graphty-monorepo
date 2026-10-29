# Prototype data

Small files with the shapes real data has, for the data management prototype
(`design/ui/data-prototype/spec.md`, section 6). They are written by
`graphty/scripts/make-prototype-data.mjs` from fixed lists and a seeded random stream, so the
counts below hold on every run. Run it from `graphty/` with `npm run samples:prototype`; with
`-- --check` it writes nothing and fails when a file differs from what the script would write.

Every value is synthetic. Names of genes and countries are real; every number, person, company,
account and address is made up.

| File                                | Shape                                                   | Where the shape comes from                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proteins/tp53-interactions.tsv`    | `bait, prey, confidence, evidence`; 60 genes, 120 edges | A protein interaction export (BioGRID, IntAct): the bait protein a lab pulled down, the prey it caught, a score and the experiment type. The 60 symbols are TP53 and genes from its published interaction neighborhood.         |
| `proteins/tumor-expression.tsv`     | `symbol, log2fc, padj, tissue`; 70 rows                 | A differential expression table (DESeq2, limma) keyed by gene symbol. Against the network: 52 match, 10 are not in it, 8 nodes get no value, TP53 is there twice, 6 match only ignoring case, 1 only ignoring a trailing space. |
| `supply-chain/suppliers.csv`        | `id, name, country, tier`; 40 suppliers                 | A supplier master list from an ERP export; one name, `Acme `, keeps the trailing space a hand-typed sheet leaves.                                                                                                               |
| `supply-chain/ships-to-2024-09.csv` | `from, to, volume, lead_days`; 150 edges                | A month of shipments between suppliers.                                                                                                                                                                                         |
| `supply-chain/ships-to-2024-10.csv` | the same columns in another order; 159 edges            | The next month's export: 3 shipments gone, 12 new, 40 volumes changed.                                                                                                                                                          |
| `fraud/accounts.csv`                | `account, holder, opened, flagged`; 300 rows            | A bank's account list; 2 rows repeat an earlier account id, and `flagged` is `yes`/`no` text.                                                                                                                                   |
| `fraud/transfers.csv`               | `from, to, amount, time`; 450 rows                      | Transfers between accounts: 18 go to accounts the list does not hold, 5 repeat an earlier pair, 3 amounts use a decimal comma, 1 is `N/A`, and line 412 has one field too many.                                                 |
| `events/auth-log.csv`               | `time, user, host, ip, result`; 400 rows over 14 days   | A sign-in log (a SIEM or `auth.log` export). `admin` is both a user and a host.                                                                                                                                                 |
