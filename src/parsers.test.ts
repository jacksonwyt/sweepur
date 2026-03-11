import { describe, expect, test } from "bun:test";

import { parseDockerPsOutput } from "./providers/docker";
import { parseLsofListeningPorts } from "./providers/ports";

describe("parseLsofListeningPorts", () => {
  test("groups multiple bindings for the same pid and port", () => {
    const output = [
      "p43120",
      "cnode",
      "n*:3000",
      "n127.0.0.1:3000",
      "n[::1]:3000",
      "p51000",
      "cpython3",
      "n127.0.0.1:8000",
    ].join("\n");

    expect(parseLsofListeningPorts(output)).toEqual([
      {
        id: "43120:3000",
        pid: 43120,
        processName: "node",
        port: 3000,
        addresses: ["127.0.0.1", "::1", "all interfaces"],
        endpoints: ["*:3000", "127.0.0.1:3000", "[::1]:3000"],
      },
      {
        id: "51000:8000",
        pid: 51000,
        processName: "python3",
        port: 8000,
        addresses: ["127.0.0.1"],
        endpoints: ["127.0.0.1:8000"],
      },
    ]);
  });
});

describe("parseDockerPsOutput", () => {
  test("parses line-delimited docker json output", () => {
    const output = [
      JSON.stringify({
        ID: "34f02cd4a41a8be45009",
        Image: "postgres:16",
        Command: '"docker-entrypoint.s…"',
        Status: "Up 2 hours",
        State: "running",
        Ports: "0.0.0.0:5432->5432/tcp",
        Names: "dev-postgres",
      }),
      JSON.stringify({
        ID: "4b3d7d314f9cc77f9911",
        Image: "redis:7",
        Status: "Exited (0) 10 minutes ago",
        Ports: "",
        Names: "dev-redis",
      }),
    ].join("\n");

    expect(parseDockerPsOutput(output)).toEqual([
      {
        id: "34f02cd4a41a8be45009",
        shortId: "34f02cd4a41a",
        name: "dev-postgres",
        image: "postgres:16",
        status: "Up 2 hours",
        state: "running",
        ports: "0.0.0.0:5432->5432/tcp",
        command: '"docker-entrypoint.s…"',
      },
      {
        id: "4b3d7d314f9cc77f9911",
        shortId: "4b3d7d314f9c",
        name: "dev-redis",
        image: "redis:7",
        status: "Exited (0) 10 minutes ago",
        state: "exited",
        ports: "no published ports",
        command: undefined,
      },
    ]);
  });
});
