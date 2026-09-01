import { app, dialog } from "electron";
import type { BrowserWindow, WebContents } from "electron";
import log from "electron-log/main";
import { writeFile } from "node:fs/promises";
import { isDiagnosticsEnabled } from "./config";
import {
  type DiagnosticValue,
  sanitizeDiagnosticAttributes,
} from "./sanitize";

const MAX_DIAGNOSTIC_EVENTS = 500;
const METRICS_INTERVAL_MS = 60_000;

type DiagnosticEvent = {
  attributes?: Record<string, DiagnosticValue>;
  name: string;
  timestamp: string;
};

export class PerformanceDiagnostics {
  private events: DiagnosticEvent[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(private readonly enabled: boolean) {}

  public isEnabled = () => this.enabled;

  public record = (name: string, attributes?: Record<string, unknown>) => {
    if (!this.enabled) {
      return;
    }

    const event: DiagnosticEvent = {
      name,
      timestamp: new Date().toISOString(),
      ...(attributes
        ? { attributes: sanitizeDiagnosticAttributes(attributes) }
        : {}),
    };

    this.events.push(event);
    if (this.events.length > MAX_DIAGNOSTIC_EVENTS) {
      this.events.shift();
    }
    log.info("[Diagnostics]", event);
  };

  public attachWebContents = (webContents: WebContents, label: string) => {
    if (!this.enabled) {
      return;
    }

    webContents.on("render-process-gone", (_event, details) => {
      this.record("renderer-process-gone", { label, reason: details.reason });
    });
    webContents.on("responsive", () =>
      this.record("renderer-responsive", { label }),
    );
    webContents.on("unresponsive", () =>
      this.record("renderer-unresponsive", { label }),
    );
  };

  public startMetricsCollection = () => {
    if (!this.enabled || this.metricsInterval) {
      return;
    }

    void this.recordMetrics();
    this.metricsInterval = setInterval(() => {
      void this.recordMetrics();
    }, METRICS_INTERVAL_MS);
  };

  public stopMetricsCollection = () => {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  };

  public exportBundle = async (parentWindow: BrowserWindow | null) => {
    if (!this.enabled) {
      throw new Error("Performance diagnostics are not enabled in this build.");
    }

    await this.recordMetrics();
    const saveDialogOptions = {
      defaultPath: `cozy-watch-diagnostics-${Date.now()}.json`,
      filters: [{ extensions: ["json"], name: "JSON" }],
      title: "Save Cozy Watch diagnostics",
    };
    const { canceled, filePath } = parentWindow
      ? await dialog.showSaveDialog(parentWindow, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions);

    if (canceled || !filePath) {
      return { saved: false };
    }

    await writeFile(
      filePath,
      `${JSON.stringify(
        {
          app: {
            architecture: process.arch,
            platform: process.platform,
            version: app.getVersion(),
          },
          events: this.events,
          generatedAt: new Date().toISOString(),
          schemaVersion: 1,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    this.record("diagnostic-bundle-exported", {
      eventCount: this.events.length,
    });
    return { saved: true };
  };

  private recordMetrics = async () => {
    if (!this.enabled) {
      return;
    }

    const metrics = app.getAppMetrics().map((metric) => ({
      cpuPercent: metric.cpu.percentCPUUsage,
      pid: metric.pid,
      privateBytes: metric.memory.privateBytes,
      type: metric.type,
      workingSetSize: metric.memory.workingSetSize,
    }));
    const memory = await process.getProcessMemoryInfo();
    this.record("process-metrics", { mainMemory: memory, processes: metrics });
  };
}

export const performanceDiagnostics = new PerformanceDiagnostics(
  isDiagnosticsEnabled({
    isPackaged: app.isPackaged,
    isReleaseCandidateBuild:
      typeof __COZYWATCH_DIAGNOSTICS_BUILD__ !== "undefined" &&
      __COZYWATCH_DIAGNOSTICS_BUILD__,
  }),
);
