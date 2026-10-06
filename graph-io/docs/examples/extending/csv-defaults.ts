import { createRegistry, type GraphImporter } from "@graphty/graph-io";
import { csvImporter, type CsvImportOptions } from "@graphty/graph-io/csv";

// Our partner's files always use semicolons, and their ids are codes such as "007", not numbers
const partnerCsv: GraphImporter<CsvImportOptions> = {
    ...csvImporter,
    import: (input, sink, options) => csvImporter.import(input, sink, { delimiter: ";", ids: "string", ...options }),
};

// A registry of your own: same formats, but "csv" now means the partner's dialect
const partner = createRegistry().registerImporter(partnerCsv);

const { snapshot } = await partner.importGraph("source;target\n007;008\n008;010\n", { filename: "partner.csv" });
console.log([0, 1, 2].map((i) => JSON.stringify(snapshot.ids.idOf(i))).join(" "));
