import { describeCommandFailure, runCommand } from "../lib/command";
import type { PortProcess, ResourceSnapshot } from "../types";

interface MutablePortProcess {
  pid: number;
  processName: string;
  port: number;
  addresses: Set<string>;
  endpoints: Set<string>;
}

export function parseLsofListeningPorts(output: string): PortProcess[] {
  const items = new Map<string, MutablePortProcess>();
  let currentPid: number | null = null;
  let currentProcessName = "";

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    const kind = line[0];
    const value = line.slice(1).trim();

    if (kind === "p") {
      const pid = Number.parseInt(value, 10);
      currentPid = Number.isFinite(pid) ? pid : null;
      currentProcessName = "";
      continue;
    }

    if (kind === "c") {
      currentProcessName = value;
      continue;
    }

    if (kind !== "n" || currentPid === null) {
      continue;
    }

    const binding = parseListeningBinding(value);
    if (!binding) {
      continue;
    }

    const id = `${currentPid}:${binding.port}`;
    const existing = items.get(id);
    if (existing) {
      existing.addresses.add(binding.address);
      existing.endpoints.add(value);
      continue;
    }

    items.set(id, {
      pid: currentPid,
      processName: currentProcessName || "unknown",
      port: binding.port,
      addresses: new Set([binding.address]),
      endpoints: new Set([value]),
    });
  }

  return [...items.values()]
    .map((item) => ({
      id: `${item.pid}:${item.port}`,
      pid: item.pid,
      processName: item.processName,
      port: item.port,
      addresses: [...item.addresses].sort(),
      endpoints: [...item.endpoints].sort(),
    }))
    .sort((left, right) => left.port - right.port || left.pid - right.pid);
}

export async function fetchListeningPorts(): Promise<ResourceSnapshot<PortProcess>> {
  const result = await runCommand("lsof", [
    "-nP",
    "-iTCP",
    "-sTCP:LISTEN",
    "-Fpcn",
  ]);

  if (!result.ok) {
    return {
      items: [],
      checkedAt: new Date(),
      error: describeCommandFailure("lsof", result),
    };
  }

  return {
    items: parseLsofListeningPorts(result.stdout),
    checkedAt: new Date(),
  };
}

export async function killPortProcess(pid: number): Promise<string> {
  const result = await runCommand("kill", ["-TERM", String(pid)]);
  if (!result.ok) {
    return describeCommandFailure(`kill ${pid}`, result);
  }

  return `Sent SIGTERM to PID ${pid}.`;
}

function parseListeningBinding(value: string): { address: string; port: number } | null {
  const separatorIndex = value.lastIndexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const address = normalizeAddress(value.slice(0, separatorIndex));
  const portText = value.slice(separatorIndex + 1);
  const port = Number.parseInt(portText, 10);

  if (!Number.isFinite(port)) {
    return null;
  }

  return { address, port };
}

function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed === "*") {
    return "all interfaces";
  }

  return trimmed.replace(/^\[(.*)\]$/, "$1");
}
