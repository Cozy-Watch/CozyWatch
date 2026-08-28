import log from "electron-log";

import { getPullRequests } from "../api/PullRequests/getPullRequests";

let pollTimeout: NodeJS.Timeout | null = null;
const POLLING_INTERVAL = 1000 * 60 * 5; // 5 minutes
const REFRESH_COOLDOWN = 10000; // 10 seconds minimum between refreshes
let lastRefreshTime = 0;

const poll = async () => {
  try {
    await getPullRequests();
    scheduleNextPoll(POLLING_INTERVAL);
  } catch (err: any) {
    if (
      err.status === 401 ||
      (err.message && err.message.includes("Bad credentials"))
    ) {
      // Token is invalid — stop polling; signOut is handled by the Octokit error hook
      log.error("[Polling] Bad credentials (401), stopping poll", {
        error: err,
      });
      stopPolling();
    } else if (
      err.status === 403 &&
      err.response?.headers["x-ratelimit-remaining"] === "0"
    ) {
      const reset = err.response.headers["x-ratelimit-reset"];
      const delay = reset
        ? +reset * 1000 - Date.now() + 1000
        : POLLING_INTERVAL;

      log.warn("[Polling] Rate limited, delaying next poll", {
        delaySec: delay / 1000,
      });

      scheduleNextPoll(delay);
    } else {
      log.error("[Polling Error]", { error: err });
      scheduleNextPoll(POLLING_INTERVAL);
    }
  }
};

function scheduleNextPoll(delay: number) {
  log.info("[Polling]-scheduleNextPoll");
  if (pollTimeout) {
    log.info("[Polling]-scheduleNextPoll pollTimeout cleared");
    clearTimeout(pollTimeout);
  }

  log.info("[Polling]-scheduleNextPoll setting new timeout");
  pollTimeout = setTimeout(poll, delay);
}

export const startPolling = () => {
  log.info("[Polling]-startPolling Starting");
  if (pollTimeout) {
    log.info("[Polling]-startPolling Starting aborted, already started");
    return;
  }
  log.info("[Polling]-startPolling Started");
  poll();
};

export const stopPolling = () => {
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    log.info("[Polling]-stopPolling Stopped Timer");
  }
  log.info("[Polling]-stopPolling pollTimeout reset to null");
  pollTimeout = null;
};

export const refreshPoll = () => {
  if (Date.now() - lastRefreshTime < REFRESH_COOLDOWN) {
    log.info("[Polling]-refresh Cooldown active, skipping");
    return;
  }
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    log.info("[Polling]-refresh Triggered manual refresh");
    lastRefreshTime = Date.now();
    poll();
  }
};
