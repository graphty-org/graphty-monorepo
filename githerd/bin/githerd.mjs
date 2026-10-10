#!/usr/bin/env node
/**
 * The githerd command line (design section 12): `githerd help` lists the commands. It talks to
 * the repository's daemon over HTTP and reads its state directory.
 */

import { runCli } from "../lib/cli.mjs";

process.exitCode = await runCli(process.argv.slice(2));
