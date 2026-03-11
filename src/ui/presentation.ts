import type {
  DashboardTab,
  DockerContainer,
  PortProcess,
  ResourceSnapshot,
} from "../types";
import type { Palette } from "./theme";

export type SelectValue =
  | { kind: "port"; item: PortProcess }
  | { kind: "docker"; item: DockerContainer }
  | null;

export interface DetailView {
  label: string;
  title: string;
  meta: string;
  body: string;
  actions: string;
  accent: string;
  actionsColor: string;
}

export interface RegistryRow {
  id: string;
  value: SelectValue;
  start: string;
  middle: string;
  end: string;
  secondary: string;
}

export interface HeaderLayout {
  startWidth: `${number}%`;
  endWidth: `${number}%`;
  startLabel: string;
  middleLabel: string;
  endLabel: string;
}

export type SnapshotMap = Record<
  DashboardTab,
  ResourceSnapshot<PortProcess> | ResourceSnapshot<DockerContainer>
>;

export function buildRows(activeTab: DashboardTab, snapshots: SnapshotMap): RegistryRow[] {
  if (activeTab === "ports") {
    const snapshot = snapshots.ports as ResourceSnapshot<PortProcess>;

    if (snapshot.error) {
      return [
        {
          id: "ports-error",
          value: null,
          start: "Port",
          middle: "discovery unavailable",
          end: "",
          secondary: snapshot.error,
        },
      ];
    }

    if (snapshot.items.length === 0) {
      return [
        {
          id: "ports-empty",
          value: null,
          start: "Quiet",
          middle: "Nothing is listening",
          end: "",
          secondary: "Refresh or switch tabs.",
        },
      ];
    }

    return snapshot.items.map((item) => ({
      id: item.id,
      value: { kind: "port", item },
      start: String(item.port),
      middle: item.processName,
      end: String(item.pid),
      secondary: `bound to ${item.addresses.join(", ")}`,
    }));
  }

  const snapshot = snapshots.docker as ResourceSnapshot<DockerContainer>;

  if (snapshot.error) {
    return [
      {
        id: "docker-error",
        value: null,
        start: "Docker",
        middle: "unavailable",
        end: "",
        secondary: snapshot.error,
      },
    ];
  }

  if (snapshot.items.length === 0) {
    return [
      {
        id: "docker-empty",
        value: null,
        start: "Empty",
        middle: "No containers found",
        end: "",
        secondary: "Docker is reachable.",
      },
    ];
  }

  return snapshot.items.map((item) => ({
    id: item.id,
    value: { kind: "docker", item },
    start: item.shortId,
    middle: item.name,
    end: item.state,
    secondary: `${item.image} / ${item.ports}`,
  }));
}

export function getCurrentSnapshot(
  activeTab: DashboardTab,
  snapshots: SnapshotMap,
): ResourceSnapshot<PortProcess> | ResourceSnapshot<DockerContainer> {
  return activeTab === "ports"
    ? (snapshots.ports as ResourceSnapshot<PortProcess>)
    : (snapshots.docker as ResourceSnapshot<DockerContainer>);
}

export function buildDetailView(
  activeTab: DashboardTab,
  snapshot: ResourceSnapshot<PortProcess> | ResourceSnapshot<DockerContainer>,
  selected: SelectValue,
  palette: Palette,
): DetailView {
  if (snapshot.error) {
    return {
      label: "SOURCE OFFLINE",
      title: activeTab === "ports" ? "Port inspection failed" : "Docker inspection failed",
      meta: "The data source for this tab is not currently available.",
      body: snapshot.error,
      actions:
        activeTab === "ports"
          ? "Try installing lsof or checking your shell PATH, then press G to refresh."
          : "Make sure Docker is installed and the daemon is running, then press G to refresh.",
      accent: palette.accent,
      actionsColor: palette.warning,
    };
  }

  if (!selected) {
    return activeTab === "ports"
      ? {
          label: "QUIET MACHINE",
          title: "No listening ports",
          meta: "Nothing is currently accepting TCP connections.",
          body:
            "This view will populate when local servers, databases, or other listeners bind to a port.",
          actions: "Press G to refresh or switch tabs to inspect Docker.",
          accent: palette.accentAlt,
          actionsColor: palette.info,
        }
      : {
          label: "EMPTY DOCKET",
          title: "No containers to inspect",
          meta: "Docker is available, but nothing is running or stopped here.",
          body:
            "Once a container exists, this panel will show its image, ports, state, and command details.",
          actions: "Press G to refresh or switch tabs to inspect ports.",
          accent: palette.accentAlt,
          actionsColor: palette.product,
        };
  }

  if (selected.kind === "port") {
    const { item } = selected;
    return {
      label: "LISTENING PORT",
      title: `:${item.port}  ${item.processName}`,
      meta: `PID ${item.pid} / ${item.addresses.join(" / ")}`,
      body: [
        "Bound endpoints",
        item.endpoints.map((endpoint) => `- ${endpoint}`).join("\n"),
      ].join("\n\n"),
      actions: "K terminates this process. Press K twice within four seconds to confirm.",
      accent: palette.info,
      actionsColor: palette.danger,
    };
  }

  const { item } = selected;
  return {
    label: item.state.toUpperCase(),
    title: item.name,
    meta: `${item.image} / ${item.shortId}`,
    body: [
      `Status  ${item.status}`,
      `Ports   ${item.ports}`,
      `Command ${item.command ?? "not reported by docker ps"}`,
    ].join("\n"),
    actions: "S stop / R restart / D delete. Delete is confirmation-gated.",
    accent: getDockerStateColor(item.state, palette),
    actionsColor: item.state === "running" ? palette.success : palette.product,
  };
}

export function buildDefaultStatus(snapshots: SnapshotMap): string {
  const portSnapshot = snapshots.ports as ResourceSnapshot<PortProcess>;
  const dockerSnapshot = snapshots.docker as ResourceSnapshot<DockerContainer>;

  const portLabel = portSnapshot.error ? "ports offline" : `${portSnapshot.items.length} ports`;
  const dockerLabel = dockerSnapshot.error
    ? "docker offline"
    : `${dockerSnapshot.items.length} containers`;

  return `${portLabel} / ${dockerLabel} / ${formatTime(maxDate(portSnapshot.checkedAt, dockerSnapshot.checkedAt))}`;
}

export function buildFooterText(activeTab: DashboardTab): string {
  return activeTab === "ports"
    ? "tab / arrows / g refresh / k terminate / q quit"
    : "tab / arrows / g refresh / s stop / r restart / d delete / q quit";
}

export function getHeaderLayout(activeTab: DashboardTab): HeaderLayout {
  return activeTab === "ports"
    ? {
        startWidth: "20%",
        endWidth: "16%",
        startLabel: "Port",
        middleLabel: "Process",
        endLabel: "PID",
      }
    : {
        startWidth: "24%",
        endWidth: "20%",
        startLabel: "ID",
        middleLabel: "Name",
        endLabel: "State",
      };
}

export function getRowStartColor(
  value: SelectValue,
  activeTab: DashboardTab,
  palette: Palette,
): string {
  if (!value) {
    return activeTab === "ports" ? palette.info : palette.product;
  }

  return value.kind === "port" ? palette.info : palette.product;
}

export function getRowEndColor(value: SelectValue, palette: Palette): string {
  if (!value) {
    return palette.soft;
  }

  if (value.kind === "port") {
    return palette.soft;
  }

  return getDockerStateColor(value.item.state, palette);
}

function getDockerStateColor(state: string, palette: Palette): string {
  switch (state.toLowerCase()) {
    case "running":
      return palette.success;
    case "paused":
    case "restarting":
      return palette.warning;
    case "exited":
    case "dead":
      return palette.danger;
    default:
      return palette.soft;
  }
}

function formatTime(date: Date): string {
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "never";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function maxDate(left: Date, right: Date): Date {
  return new Date(Math.max(left.getTime(), right.getTime()));
}
