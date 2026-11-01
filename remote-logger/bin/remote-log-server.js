#!/usr/bin/env node
import process from "node:process";

import { main } from "../dist/server/index.js";

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
