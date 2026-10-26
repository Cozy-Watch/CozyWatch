import type { ManagedNotification } from "../../../notifications/notificationManager";
import type { CacheData } from "./getDefaultData";

export const getInlineMentionNotifications = (initial: CacheData, final: CacheData, user: { id: number; login: string }): ManagedNotification[] => {
  const pattern = new RegExp(`@${user.login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-zA-Z0-9_-])`, "i");
  const alerts: ManagedNotification[] = [];
  for (const [repository, comments] of Object.entries(final.reviewCommentsPerRepo ?? {})) {
    const previous = initial.reviewCommentsPerRepo?.[repository];
    if (!previous) continue; // First sync establishes a baseline, not historical alerts.
    const oldMentions = new Set(previous.filter(comment => pattern.test(comment.body ?? "")).map(comment => comment.html_url));
    for (const comment of comments) {
      if (!pattern.test(comment.body ?? "") || oldMentions.has(comment.html_url) || comment.user?.id === user.id) continue;
      let pullNumber: number;
      try {
        const url = new URL(comment.pull_request_url);
        if (url.origin !== "https://api.github.com" || !url.pathname.startsWith(`/repos/${repository}/pulls/`)) continue;
        pullNumber = Number(url.pathname.split("/").at(-1));
        if (!Number.isSafeInteger(pullNumber) || pullNumber < 1) continue;
      } catch { continue; }
      alerts.push({
        title: "You have been mentioned", body: `${comment.user?.login ?? "Someone"} mentioned you in a review comment on #${pullNumber}.`,
        type: "mention", setting: "mentionsNotification", url: comment.html_url, source: { repository, pullNumber },
      });
    }
  }
  return alerts;
};
