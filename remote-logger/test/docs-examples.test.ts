// Runs every documentation example in docs/examples/ and checks what it prints (tools/docs-examples.mjs).
import { fileURLToPath } from "node:url";

import { describeDocsExamples } from "../../tools/docs-examples.mjs";

describeDocsExamples(fileURLToPath(new URL("../docs/examples/", import.meta.url)));
