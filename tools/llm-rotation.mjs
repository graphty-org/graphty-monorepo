#!/usr/bin/env node
// release.yml's LLM job calls the rotation by this name; the rotation, its rules and reasons are tools/test-rotation.mjs.
import { main } from "./test-rotation.mjs";

main("llm", process.argv.slice(2));
