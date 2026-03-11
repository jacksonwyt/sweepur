#!/usr/bin/env bun

import { createCliRenderer } from "@opentui/core";

import { SweepurApp } from "./app";

export async function main(): Promise<void> {
  const renderer = await createCliRenderer({
    useAlternateScreen: true,
    useMouse: false,
    useConsole: false,
    exitOnCtrlC: true,
  });

  const app = new SweepurApp(renderer);
  renderer.start();
  await app.start();
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Sweepur failed to start.");
    console.error(error);
    process.exit(1);
  });
}
