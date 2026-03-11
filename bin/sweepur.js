#!/usr/bin/env bun

import { main } from "../src/index.ts";

await main().catch((error) => {
  console.error("Sweepur failed to start.");
  console.error(error);
  process.exit(1);
});
