import {
  BoxRenderable,
  type CliRenderer,
  ScrollBoxRenderable,
  TextAttributes,
  TextRenderable,
} from "@opentui/core";

import type { DashboardTab } from "../types";
import {
  type DetailView,
  type HeaderLayout,
  type RegistryRow,
  getRowEndColor,
  getRowStartColor,
} from "./presentation";
import {
  PRODUCT_LINES,
  type Palette,
  getActiveAccent,
  getAnimatedProductLineColors,
  getPalette,
  getSelectedRowBackground,
} from "./theme";

export interface SweepurFrame {
  activeTab: DashboardTab;
  rows: RegistryRow[];
  selectedIndex: number;
  detail: DetailView;
  statusMessage: string;
  footerText: string;
  hasError: boolean;
  pendingConfirmation: boolean;
  headerLayout: HeaderLayout;
}

export class SweepurView {
  private static readonly ROW_HEIGHT = 3;

  private readonly root: BoxRenderable;
  private readonly masthead: BoxRenderable;
  private readonly productLines: TextRenderable[];
  private readonly tabs: BoxRenderable;
  private readonly portsTab: BoxRenderable;
  private readonly portsTabLabel: TextRenderable;
  private readonly dockerTab: BoxRenderable;
  private readonly dockerTabLabel: TextRenderable;
  private readonly workspace: BoxRenderable;
  private readonly listShell: BoxRenderable;
  private readonly listHeader: BoxRenderable;
  private readonly listHeaderStart: TextRenderable;
  private readonly listHeaderMiddle: TextRenderable;
  private readonly listHeaderEnd: TextRenderable;
  private readonly list: ScrollBoxRenderable;
  private readonly detailShell: BoxRenderable;
  private readonly detailLabel: TextRenderable;
  private readonly detailTitle: TextRenderable;
  private readonly detailMeta: TextRenderable;
  private readonly detailBody: TextRenderable;
  private readonly detailActions: TextRenderable;
  private readonly footer: TextRenderable;
  private readonly status: TextRenderable;

  private motionTick = 0;
  private motionInterval?: ReturnType<typeof setInterval>;
  private rowIds: string[] = [];
  private frame?: SweepurFrame;

  constructor(private readonly renderer: CliRenderer) {
    this.root = new BoxRenderable(this.renderer, {
      width: "100%",
      height: "100%",
      flexDirection: "column",
      padding: 1,
      gap: 1,
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.masthead = new BoxRenderable(this.renderer, {
      width: "100%",
      height: PRODUCT_LINES.length,
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.productLines = PRODUCT_LINES.map(
      (line) =>
        new TextRenderable(this.renderer, {
          content: line,
          fg: getPalette(this.renderer.themeMode).product,
          attributes: TextAttributes.BOLD,
        }),
    );

    this.tabs = new BoxRenderable(this.renderer, {
      width: "100%",
      height: 1,
      flexDirection: "row",
      gap: 3,
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.portsTab = new BoxRenderable(this.renderer, {
      width: 14,
      height: 1,
      flexDirection: "row",
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.portsTabLabel = new TextRenderable(this.renderer, {
      content: "PORTS",
      fg: getPalette(this.renderer.themeMode).tabText,
      attributes: TextAttributes.BOLD,
    });

    this.dockerTab = new BoxRenderable(this.renderer, {
      width: 16,
      height: 1,
      flexDirection: "row",
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.dockerTabLabel = new TextRenderable(this.renderer, {
      content: "DOCKER",
      fg: getPalette(this.renderer.themeMode).tabText,
      attributes: TextAttributes.BOLD,
    });

    this.workspace = new BoxRenderable(this.renderer, {
      width: "100%",
      flexGrow: 1,
      flexDirection: "row",
      gap: 1,
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.listShell = new BoxRenderable(this.renderer, {
      width: "46%",
      height: "100%",
      flexDirection: "column",
      padding: 1,
      border: true,
      backgroundColor: "transparent",
      shouldFill: false,
      title: "Registry",
    });

    this.listHeader = new BoxRenderable(this.renderer, {
      width: "100%",
      flexDirection: "row",
      gap: 1,
      backgroundColor: "transparent",
      shouldFill: false,
    });

    this.listHeaderStart = new TextRenderable(this.renderer, {
      width: "20%",
      content: "",
      attributes: TextAttributes.BOLD,
      truncate: true,
    });

    this.listHeaderMiddle = new TextRenderable(this.renderer, {
      flexGrow: 1,
      content: "",
      attributes: TextAttributes.BOLD,
      truncate: true,
    });

    this.listHeaderEnd = new TextRenderable(this.renderer, {
      width: "16%",
      content: "",
      attributes: TextAttributes.BOLD,
      truncate: true,
    });

    this.list = new ScrollBoxRenderable(this.renderer, {
      width: "100%",
      flexGrow: 1,
      backgroundColor: "transparent",
      shouldFill: false,
      scrollY: true,
      scrollX: false,
      viewportOptions: {
        backgroundColor: "transparent",
        shouldFill: false,
      },
      contentOptions: {
        flexDirection: "column",
        gap: 1,
        backgroundColor: "transparent",
        shouldFill: false,
      },
      verticalScrollbarOptions: {
        visible: false,
      },
    });

    this.detailShell = new BoxRenderable(this.renderer, {
      width: "54%",
      height: "100%",
      flexDirection: "column",
      padding: 1,
      border: true,
      backgroundColor: "transparent",
      shouldFill: false,
      title: "Inspector",
    });

    this.detailLabel = new TextRenderable(this.renderer, {
      content: "",
      attributes: TextAttributes.BOLD,
      wrapMode: "word",
    });

    this.detailTitle = new TextRenderable(this.renderer, {
      content: "",
      attributes: TextAttributes.BOLD,
      wrapMode: "word",
    });

    this.detailMeta = new TextRenderable(this.renderer, {
      content: "",
      wrapMode: "word",
    });

    this.detailBody = new TextRenderable(this.renderer, {
      content: "",
      wrapMode: "word",
    });

    this.detailActions = new TextRenderable(this.renderer, {
      content: "",
      wrapMode: "word",
    });

    this.footer = new TextRenderable(this.renderer, {
      content: "",
      wrapMode: "word",
    });

    this.status = new TextRenderable(this.renderer, {
      content: "",
      wrapMode: "word",
    });

    for (const line of this.productLines) {
      this.masthead.add(line);
    }

    this.portsTab.add(this.portsTabLabel);
    this.dockerTab.add(this.dockerTabLabel);
    this.tabs.add(this.portsTab);
    this.tabs.add(this.dockerTab);

    this.listHeader.add(this.listHeaderStart);
    this.listHeader.add(this.listHeaderMiddle);
    this.listHeader.add(this.listHeaderEnd);

    this.listShell.add(this.listHeader);
    this.listShell.add(this.list);

    this.detailShell.add(this.detailLabel);
    this.detailShell.add(this.detailTitle);
    this.detailShell.add(this.detailMeta);
    this.detailShell.add(this.detailBody);
    this.detailShell.add(this.detailActions);

    this.workspace.add(this.listShell);
    this.workspace.add(this.detailShell);

    this.root.add(this.masthead);
    this.root.add(this.tabs);
    this.root.add(this.workspace);
    this.root.add(this.footer);
    this.root.add(this.status);
  }

  mount(): void {
    this.renderer.root.add(this.root);
    this.motionInterval = setInterval(() => {
      this.motionTick += 0.14;
      this.applyFrame();
    }, 34);
  }

  update(frame: SweepurFrame): void {
    this.frame = frame;
    this.applyFrame();
  }

  alignListToSelection(selectedIndex: number): void {
    const viewportHeight = Math.max(1, this.list.viewport.height);
    const rowTop = selectedIndex * SweepurView.ROW_HEIGHT;
    const rowBottom = rowTop + SweepurView.ROW_HEIGHT - 1;
    const viewportTop = this.list.scrollTop;
    const viewportBottom = viewportTop + viewportHeight - 1;

    if (rowTop < viewportTop) {
      this.list.scrollTop = rowTop;
      this.renderer.requestRender();
      return;
    }

    if (rowBottom > viewportBottom) {
      this.list.scrollTop = rowBottom - viewportHeight + 1;
      this.renderer.requestRender();
    }
  }

  dispose(): void {
    if (this.motionInterval) {
      clearInterval(this.motionInterval);
      this.motionInterval = undefined;
    }
  }

  private applyFrame(): void {
    if (!this.frame) {
      return;
    }

    const palette = getPalette(this.renderer.themeMode);
    const activeAccent = getActiveAccent(this.frame.activeTab, palette);
    const selectedRowBackground = getSelectedRowBackground(
      this.renderer.themeMode,
      palette,
      activeAccent,
    );
    const lineColors = getAnimatedProductLineColors(
      palette,
      activeAccent,
      this.motionTick,
    );

    this.productLines.forEach((line, index) => {
      line.fg = lineColors[index];
    });

    this.portsTabLabel.fg =
      this.frame.activeTab === "ports" ? palette.info : palette.tabText;
    this.dockerTabLabel.fg =
      this.frame.activeTab === "docker" ? palette.product : palette.tabText;

    this.listShell.title =
      this.frame.activeTab === "ports" ? "Port Registry" : "Container Registry";
    this.listHeaderStart.width = this.frame.headerLayout.startWidth;
    this.listHeaderStart.content = this.frame.headerLayout.startLabel;
    this.listHeaderStart.fg = activeAccent;
    this.listHeaderMiddle.content = this.frame.headerLayout.middleLabel;
    this.listHeaderMiddle.fg = activeAccent;
    this.listHeaderEnd.width = this.frame.headerLayout.endWidth;
    this.listHeaderEnd.content = this.frame.headerLayout.endLabel;
    this.listHeaderEnd.fg = activeAccent;

    this.detailLabel.content = this.frame.detail.label;
    this.detailLabel.fg = this.frame.detail.accent;
    this.detailTitle.content = this.frame.detail.title;
    this.detailTitle.fg = palette.ink;
    this.detailMeta.content = this.frame.detail.meta;
    this.detailMeta.fg = palette.muted;
    this.detailBody.content = this.frame.detail.body;
    this.detailBody.fg = palette.ink;
    this.detailActions.content = this.frame.detail.actions;
    this.detailActions.fg = this.frame.detail.actionsColor;

    this.footer.content = this.frame.footerText;
    this.footer.fg = palette.muted;
    this.status.content = this.frame.statusMessage;
    this.status.fg = this.frame.pendingConfirmation ? palette.danger : activeAccent;

    this.listShell.borderColor = this.frame.hasError ? palette.danger : palette.border;
    this.detailShell.borderColor = this.frame.hasError ? palette.danger : palette.border;

    this.renderRows(
      this.frame.rows,
      this.frame.selectedIndex,
      this.frame.activeTab,
      this.frame.headerLayout,
      palette,
      selectedRowBackground,
    );

    this.renderer.requestRender();
  }

  private renderRows(
    rows: RegistryRow[],
    selectedIndex: number,
    activeTab: DashboardTab,
    headerLayout: HeaderLayout,
    palette: Palette,
    selectedRowBackground: string,
  ): void {
    for (const id of this.rowIds) {
      this.list.remove(id);
    }
    this.rowIds = [];

    rows.forEach((row, index) => {
      const selected = index === selectedIndex;
      const rowId = `row-${index}-${row.id}`;
      const shell = new BoxRenderable(this.renderer, {
        id: rowId,
        width: "100%",
        flexDirection: "column",
        gap: 0,
        backgroundColor: "transparent",
        shouldFill: false,
      });

      const main = new BoxRenderable(this.renderer, {
        width: "100%",
        flexDirection: "row",
        gap: 1,
        backgroundColor: selected ? selectedRowBackground : "transparent",
        shouldFill: selected,
      });

      const subline = new BoxRenderable(this.renderer, {
        width: "100%",
        flexDirection: "row",
        gap: 1,
        backgroundColor: selected ? selectedRowBackground : "transparent",
        shouldFill: selected,
      });

      const start = new TextRenderable(this.renderer, {
        width: headerLayout.startWidth,
        content: row.start,
        fg: getRowStartColor(row.value, activeTab, palette),
        truncate: true,
      });

      const middle = new TextRenderable(this.renderer, {
        flexGrow: 1,
        content: row.middle,
        fg: palette.ink,
        truncate: true,
      });

      const end = new TextRenderable(this.renderer, {
        width: headerLayout.endWidth,
        content: row.end,
        fg: selected ? palette.ink : getRowEndColor(row.value, palette),
        truncate: true,
      });

      const secondary = new TextRenderable(this.renderer, {
        flexGrow: 1,
        content: row.secondary,
        fg: palette.muted,
        truncate: true,
      });

      main.add(start);
      main.add(middle);
      main.add(end);
      subline.add(secondary);
      shell.add(main);
      shell.add(subline);
      this.list.add(shell);
      this.rowIds.push(rowId);
    });
  }
}
