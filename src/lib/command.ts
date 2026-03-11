import { execFile } from "node:child_process";

export interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  notFound: boolean;
  timedOut: boolean;
  errorMessage?: string;
}

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
  maxBufferBytes?: number;
}

export async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        encoding: "utf8",
        timeout: options.timeoutMs ?? 5_000,
        maxBuffer: options.maxBufferBytes ?? 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({
            ok: true,
            stdout,
            stderr,
            exitCode: 0,
            notFound: false,
            timedOut: false,
          });
          return;
        }

        const execError = error as NodeJS.ErrnoException & {
          code?: string | number;
          killed?: boolean;
          signal?: NodeJS.Signals;
        };

        resolve({
          ok: false,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode: typeof execError.code === "number" ? execError.code : null,
          notFound: execError.code === "ENOENT",
          timedOut: Boolean(execError.killed && execError.signal === "SIGTERM"),
          errorMessage: execError.message,
        });
      },
    );
  });
}

export function describeCommandFailure(
  label: string,
  result: CommandResult,
): string {
  if (result.notFound) {
    return `${label} is not installed or not on PATH.`;
  }

  const stderr = result.stderr.trim();
  if (stderr.length > 0) {
    return stderr;
  }

  if (result.timedOut) {
    return `${label} timed out.`;
  }

  return result.errorMessage ?? `${label} failed.`;
}
