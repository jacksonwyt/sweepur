import { describeCommandFailure, runCommand } from "../lib/command";
import type { DockerContainer, ResourceSnapshot } from "../types";

interface DockerPsRow {
  ID?: string;
  Image?: string;
  Command?: string;
  Status?: string;
  State?: string;
  Ports?: string;
  Names?: string;
}

export function parseDockerPsOutput(output: string): DockerContainer[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as DockerPsRow;
        const id = parsed.ID?.trim();
        if (!id) {
          return [];
        }

        const status = parsed.Status?.trim() || "unknown";
        const state = parsed.State?.trim() || inferState(status);

        return [
          {
            id,
            shortId: id.slice(0, 12),
            name: parsed.Names?.trim() || id.slice(0, 12),
            image: parsed.Image?.trim() || "unknown",
            status,
            state,
            ports: parsed.Ports?.trim() || "no published ports",
            command: parsed.Command?.trim(),
          } satisfies DockerContainer,
        ];
      } catch {
        return [];
      }
    });
}

export async function fetchDockerContainers(): Promise<ResourceSnapshot<DockerContainer>> {
  const result = await runCommand("docker", [
    "ps",
    "-a",
    "--format",
    "{{json .}}",
  ]);

  if (!result.ok) {
    return {
      items: [],
      checkedAt: new Date(),
      error: describeCommandFailure("docker", result),
    };
  }

  return {
    items: parseDockerPsOutput(result.stdout),
    checkedAt: new Date(),
  };
}

export async function stopDockerContainer(id: string): Promise<string> {
  const result = await runCommand("docker", ["stop", id]);
  if (!result.ok) {
    return describeCommandFailure(`docker stop ${id}`, result);
  }

  return `Stopped container ${id.slice(0, 12)}.`;
}

export async function restartDockerContainer(id: string): Promise<string> {
  const result = await runCommand("docker", ["restart", id]);
  if (!result.ok) {
    return describeCommandFailure(`docker restart ${id}`, result);
  }

  return `Restarted container ${id.slice(0, 12)}.`;
}

export async function deleteDockerContainer(id: string): Promise<string> {
  const result = await runCommand("docker", ["rm", "-f", id]);
  if (!result.ok) {
    return describeCommandFailure(`docker rm -f ${id}`, result);
  }

  return `Deleted container ${id.slice(0, 12)}.`;
}

function inferState(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.startsWith("up")) {
    return "running";
  }
  if (normalized.startsWith("exited")) {
    return "exited";
  }
  if (normalized.startsWith("created")) {
    return "created";
  }

  return "unknown";
}
