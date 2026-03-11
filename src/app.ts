import type { CliRenderer, KeyEvent } from "@opentui/core";

import {
  deleteDockerContainer,
  fetchDockerContainers,
  restartDockerContainer,
  stopDockerContainer,
} from "./providers/docker";
import { fetchListeningPorts, killPortProcess } from "./providers/ports";
import type {
  DashboardTab,
  DockerContainer,
  PortProcess,
  ResourceSnapshot,
} from "./types";
import {
  buildDefaultStatus,
  buildDetailView,
  buildFooterText,
  buildRows,
  getCurrentSnapshot,
  getHeaderLayout,
  type SelectValue,
  type SnapshotMap,
} from "./ui/presentation";
import { getPalette } from "./ui/theme";
import { SweepurView } from "./ui/view";

type ActionKind = "kill" | "delete";

interface PendingConfirmation {
  action: ActionKind;
  targetId: string;
  timer: ReturnType<typeof setTimeout>;
}

export class SweepurApp {
  private readonly view: SweepurView;

  private activeTab: DashboardTab = "ports";
  private selectedIndexByTab: Record<DashboardTab, number> = {
    ports: 0,
    docker: 0,
  };
  private snapshots: SnapshotMap = {
    ports: { items: [], checkedAt: new Date(0) },
    docker: { items: [], checkedAt: new Date(0) },
  };
  private statusMessage = "Refreshing local state...";
  private refreshInterval?: ReturnType<typeof setInterval>;
  private refreshInFlight?: Promise<void>;
  private actionInFlight = false;
  private destroyed = false;
  private pendingConfirmation?: PendingConfirmation;

  constructor(private readonly renderer: CliRenderer) {
    this.view = new SweepurView(renderer);
  }

  async start(): Promise<void> {
    this.renderer.setTerminalTitle("Sweepur");
    this.view.mount();
    this.renderer.keyInput.on("keypress", this.handleKeyPress);
    this.renderer.on("destroy", this.dispose);
    this.render();
    await this.refreshAll("initial");
    this.refreshInterval = setInterval(() => {
      void this.refreshAll("poll");
    }, 5_000);
  }

  private readonly handleKeyPress = (key: KeyEvent): void => {
    if (key.ctrl && key.name === "c") {
      this.quit();
      return;
    }

    if (this.actionInFlight) {
      return;
    }

    switch (key.name) {
      case "q":
        this.quit();
        return;
      case "left":
        this.switchTab(-1);
        return;
      case "right":
        this.switchTab(1);
        return;
      case "tab":
        this.switchTab(key.shift ? -1 : 1);
        return;
      case "up":
        this.moveSelection(-1);
        return;
      case "down":
        this.moveSelection(1);
        return;
      case "pageup":
        this.moveSelection(-5);
        return;
      case "pagedown":
        this.moveSelection(5);
        return;
      case "g":
        void this.refreshAll("manual");
        return;
      case "k":
        if (this.activeTab === "ports") {
          void this.confirmOrRunKill();
        }
        return;
      case "s":
        if (this.activeTab === "docker") {
          void this.runDockerAction("stop");
        }
        return;
      case "r":
        if (this.activeTab === "docker") {
          void this.runDockerAction("restart");
        }
        return;
      case "d":
        if (this.activeTab === "docker") {
          void this.confirmOrRunDelete();
        }
        return;
      default:
        return;
    }
  };

  private render(): void {
    const rows = buildRows(this.activeTab, this.snapshots);
    const selectedIndex = clamp(
      this.selectedIndexByTab[this.activeTab],
      0,
      Math.max(0, rows.length - 1),
    );
    const snapshot = getCurrentSnapshot(this.activeTab, this.snapshots);
    const palette = getPalette(this.renderer.themeMode);
    const selected = rows[selectedIndex]?.value ?? null;

    this.selectedIndexByTab[this.activeTab] = selectedIndex;

    this.view.update({
      activeTab: this.activeTab,
      rows,
      selectedIndex,
      detail: buildDetailView(this.activeTab, snapshot, selected, palette),
      statusMessage: this.statusMessage,
      footerText: buildFooterText(this.activeTab),
      hasError: Boolean(snapshot.error),
      pendingConfirmation: Boolean(this.pendingConfirmation),
      headerLayout: getHeaderLayout(this.activeTab),
    });
  }

  private moveSelection(delta: number): void {
    const nextIndex = clamp(
      this.selectedIndexByTab[this.activeTab] + delta,
      0,
      Math.max(0, buildRows(this.activeTab, this.snapshots).length - 1),
    );

    this.clearConfirmation();
    this.selectedIndexByTab[this.activeTab] = nextIndex;
    this.render();
    this.view.alignListToSelection(nextIndex);
  }

  private switchTab(delta: number): void {
    this.clearConfirmation();
    const currentIndex = this.activeTab === "ports" ? 0 : 1;
    const tabIndex = (currentIndex + delta + 2) % 2;
    this.activeTab = tabIndex === 0 ? "ports" : "docker";
    this.statusMessage = buildDefaultStatus(this.snapshots);
    this.render();
    this.view.alignListToSelection(this.selectedIndexByTab[this.activeTab]);
  }

  private getSelectedValue(): SelectValue {
    const rows = buildRows(this.activeTab, this.snapshots);
    return rows[this.selectedIndexByTab[this.activeTab]]?.value ?? null;
  }

  private async refreshAll(reason: "initial" | "manual" | "poll" | "action"): Promise<void> {
    if (this.destroyed) {
      return;
    }

    if (this.refreshInFlight) {
      await this.refreshInFlight;
      return;
    }

    if (reason !== "poll") {
      this.statusMessage = "Refreshing local state...";
      this.render();
    }

    this.refreshInFlight = (async () => {
      const [ports, docker] = await Promise.all([
        fetchListeningPorts(),
        fetchDockerContainers(),
      ]);

      this.snapshots.ports = ports;
      this.snapshots.docker = docker;

      if (reason !== "action") {
        this.statusMessage = buildDefaultStatus(this.snapshots);
      }

      this.render();
    })().finally(() => {
      this.refreshInFlight = undefined;
    });

    await this.refreshInFlight;
  }

  private async confirmOrRunKill(): Promise<void> {
    const selected = this.getSelectedValue();
    if (!selected || selected.kind !== "port") {
      return;
    }

    const label = `${selected.item.processName} (${selected.item.pid})`;
    if (this.isConfirmationMatch("kill", selected.item.id)) {
      this.clearConfirmation();
      await this.runAction(async () => killPortProcess(selected.item.pid), true);
      return;
    }

    this.setConfirmation(
      "kill",
      selected.item.id,
      `Press K again to terminate ${label}.`,
    );
  }

  private async confirmOrRunDelete(): Promise<void> {
    const selected = this.getSelectedValue();
    if (!selected || selected.kind !== "docker") {
      return;
    }

    const label = `${selected.item.name} (${selected.item.shortId})`;
    if (this.isConfirmationMatch("delete", selected.item.id)) {
      this.clearConfirmation();
      await this.runAction(async () => deleteDockerContainer(selected.item.id), true);
      return;
    }

    this.setConfirmation(
      "delete",
      selected.item.id,
      `Press D again to delete ${label}.`,
    );
  }

  private async runDockerAction(action: "stop" | "restart"): Promise<void> {
    const selected = this.getSelectedValue();
    if (!selected || selected.kind !== "docker") {
      return;
    }

    this.clearConfirmation();
    await this.runAction(
      action === "stop"
        ? () => stopDockerContainer(selected.item.id)
        : () => restartDockerContainer(selected.item.id),
      true,
    );
  }

  private async runAction(
    runner: () => Promise<string>,
    refreshAfter: boolean,
  ): Promise<string | undefined> {
    this.actionInFlight = true;
    this.statusMessage = "Running action...";
    this.render();

    try {
      const message = await runner();
      this.statusMessage = message;
      this.render();

      if (refreshAfter) {
        await this.refreshAll("action");
        this.statusMessage = message;
        this.render();
      }

      return message;
    } finally {
      this.actionInFlight = false;
    }
  }

  private setConfirmation(
    action: ActionKind,
    targetId: string,
    message: string,
  ): void {
    this.clearConfirmation();
    this.statusMessage = message;
    this.pendingConfirmation = {
      action,
      targetId,
      timer: setTimeout(() => {
        if (
          this.pendingConfirmation?.action === action &&
          this.pendingConfirmation.targetId === targetId
        ) {
          this.pendingConfirmation = undefined;
          this.statusMessage = buildDefaultStatus(this.snapshots);
          this.render();
        }
      }, 4_000),
    };
    this.render();
  }

  private clearConfirmation(): void {
    if (!this.pendingConfirmation) {
      return;
    }

    clearTimeout(this.pendingConfirmation.timer);
    this.pendingConfirmation = undefined;
  }

  private isConfirmationMatch(action: ActionKind, targetId: string): boolean {
    return (
      this.pendingConfirmation?.action === action &&
      this.pendingConfirmation.targetId === targetId
    );
  }

  private quit(): void {
    this.dispose();
    this.renderer.destroy();
    process.exit(0);
  }

  private readonly dispose = (): void => {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.clearConfirmation();

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }

    this.view.dispose();
    this.renderer.keyInput.off("keypress", this.handleKeyPress);
    this.renderer.off("destroy", this.dispose);
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
