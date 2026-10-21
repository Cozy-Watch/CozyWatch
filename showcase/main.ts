// Development-only preview entry. Not imported by the desktop build.
// All identities, pull requests, notifications, and licenses below are synthetic.
import type { LicenseState } from "../src/mainProcess/licensing/licenseState.types";
import { NOTIFICATION_DEFAULT_SETTINGS } from "../src/mainProcess/notifications/notifications.meta";
import type { CacheData } from "../src/mainProcess/api/PullRequests/utils/getDefaultData";
const parameters = new URLSearchParams(location.search);
// Render at twice the pixel density for crisp static exports, keeping the
// same logical app layout. This affects only this synthetic preview entry.
const captureScale = parameters.get("scale") === "2" ? 2 : 1;
if (captureScale === 2) {
  const root = document.getElementById("app");
  if (root) Object.assign(root.style, {
    width: "50%", height: "50%", transform: "scale(2)", transformOrigin: "top left",
  });
}
const appearance = parameters.get("theme") ?? "light";
const status = parameters.get("state") ?? "licensed";
const now = new Date();
let state: LicenseState = {
  schemaVersion: 2,
  status: "licensed",
  entitlement: "lifetime",
  licenseInstanceId: "synthetic-preview-device",
  licenseProductId: 400,
  lastValidatedAt: now.toISOString(),
};
if (status === "trial")
  state = {
    schemaVersion: 2,
    status: "trial",
    trialKind: "new",
    trialStartedAt: now.toISOString(),
    trialEndsAt: new Date(now.getTime() + 14 * 86400000).toISOString(),
  };
if (status === "new") state = { schemaVersion: 2, status: "unconfigured" };
if (status === "transition")
  state = {
    schemaVersion: 2,
    status: "trial",
    trialKind: "transition",
    transitionPending: true,
  };
if (status === "ended") state = { schemaVersion: 2, status: "trial-ended" };
if (status === "revoked") state = { schemaVersion: 2, status: "revoked" };
const listeners = new Set<(state: LicenseState) => void>();
const user = {
  id: 7,
  login: "alex-river",
  name: "Alex River",
  avatarUrl: "/images/catSittingAvatar.png",
  company: "Example Studio",
};
const reviewer = {
  id: 8,
  login: "sam-park",
  avatar_url: "/images/catSittingAvatar.png",
  type: "User",
};
const repo = {
  id: 100,
  name: "cozy-studio",
  full_name: "example/cozy-studio",
  owner: { login: "example" },
  html_url: "https://github.com/example/cozy-studio",
};
const pulls = [
  "Fix checkout totals for discounted orders",
  "Add keyboard navigation to search",
  "Refresh account settings",
  "Add retry handling for background sync",
  "Tighten session expiry handling",
  "Improve search result ranking",
].map((title, i) => ({
  id: i + 1,
  number: 128 + i,
  title,
  state: "open",
  draft: false,
  html_url: `https://github.com/example/cozy-studio/pull/${128 + i}`,
  user: i < 3 ? { ...user, avatar_url: user.avatarUrl } : { ...reviewer, name: "Sam Park" },
  assignees: [],
  requested_reviewers: i === 1 ? [reviewer] : i === 3 ? [{ ...user, avatar_url: user.avatarUrl }] : [],
  created_at: now.toISOString(),
  updated_at: new Date(now.getTime() - (i === 3 ? 3 * 60000 : i * 3600000)).toISOString(),
  labels: [
    {
      id: i,
      name: i === 1 ? "design" : "enhancement",
      color: "b4a2ed",
      description: "Sample label",
    },
  ],
  base: { repo, ref: "main" },
  head: { repo, ref: `feature/focus-${i}`, sha: `synthetic-${i}` },
  body: "A small improvement to keep the team in flow.",
  mergeable: true,
  mergeable_state: "clean",
}));
const cache = {
  etagPerRepo: {},
  pullRequestsPerRepo: { "cozy-studio": { "1": pulls } },
  reviewPerRepoPerPullNumber: {
    "cozy-studio": Object.fromEntries(
      pulls.map((pr, i) => [
        pr.number,
        (i === 1 || i === 4)
          ? []
          : [
              {
                id: i + 100,
                state: i === 2 ? "CHANGES_REQUESTED" : i === 3 ? "COMMENTED" : "APPROVED",
                user: i === 5 ? { ...user, avatar_url: user.avatarUrl } : reviewer,
                submitted_at: new Date(now.getTime() - (i === 3 ? 2 : i === 2 ? 18 : 45) * 60000).toISOString(),
                body: i === 2 ? "Please handle the empty email field before this goes out. The validation test is failing." : i === 3 ? "Retry handling is ready for a first review. Tests are green." : "Looks great. Ready to ship.",
                html_url: pr.html_url,
              },
            ],
      ]),
    ),
  },
  actionsPerRepo: {
    "cozy-studio": pulls.map((pr, i) => ({
      id: i + 1,
      name: "Build & test",
      head_sha: pr.head.sha,
      conclusion: i === 2 ? "failure" : "success",
      status: "completed",
      html_url: pr.html_url,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      pull_requests: [pr],
    })),
  },
  pullRequestAddedOrRemoved: { added: [], removed: [] },
  reviewUpdateList: { newReview: [], reviewChanged: [] },
  CIStatusUpdatePerRepo: {},
  mentions: {
    "cozy-studio": { "1": [
      { id: 501, pullNumber: 132, body: "@alex-river could you check the session expiry edge case before we merge?", user: reviewer,
        issue_url: "https://api.github.com/repos/example/cozy-studio/issues/132",
        html_url: "https://github.com/example/cozy-studio/pull/132#issuecomment-501",
        created_at: new Date(now.getTime() - 8 * 60000).toISOString(), updated_at: new Date(now.getTime() - 8 * 60000).toISOString() },
      { id: 502, pullNumber: 130, body: "@alex-river the empty email case still fails. Could you take another look?", user: reviewer,
        issue_url: "https://api.github.com/repos/example/cozy-studio/issues/130",
        html_url: "https://github.com/example/cozy-studio/pull/130#issuecomment-502",
        created_at: new Date(now.getTime() - 12 * 60000).toISOString(), updated_at: new Date(now.getTime() - 12 * 60000).toISOString() },
    ] },
  },
  reviewCommentsPerRepo: {},
  flatPullRequests: pulls,
} as unknown as CacheData;
const noEvents = new Proxy(
  {},
  {
    get: (_, key) =>
      String(key).startsWith("on")
        ? (callback: unknown) => callback
        : () => undefined,
  },
);
const application = new Proxy(
  {
    getApplicationAppearance: async () => appearance,
    getAccentColor: async () => "iris",
    getApplicationAccentColor: async () => "iris",
    getMenubarDensity: async () => parameters.get("density") === "compact" ? "compact" : "standard",
    getNotificationHistory: async () => [
      { id: "n1", type: "mention", title: "Sam mentioned you", body: "Could you check the session expiry edge case before we merge?", createdAt: new Date(now.getTime()-8*60000).toISOString(), read: true, url: "https://github.com/example/cozy-studio/pull/132#issuecomment-501", source: { repository: "example/cozy-studio", pullNumber: 132 } },
      { id: "n2", type: "ci", tone: "danger", title: "A check needs attention", body: "Build & test failed on Refresh account settings.", createdAt: new Date(now.getTime()-15*60000).toISOString(), read: true, url: "https://github.com/example/cozy-studio/pull/130", source: { repository: "example/cozy-studio", pullNumber: 130, branch: "feature/focus-2" } },
      { id: "n3", type: "review", tone: "danger", title: "Changes requested", body: "Sam requested changes on Refresh account settings.", createdAt: new Date(now.getTime()-18*60000).toISOString(), read: true, url: "https://github.com/example/cozy-studio/pull/130", source: { repository: "example/cozy-studio", pullNumber: 130 } },
      { id: "n4", type: "review", tone: "success", title: "Your PR was approved", body: "Sam approved Fix checkout totals for discounted orders.", createdAt: new Date(now.getTime()-45*60000).toISOString(), read: true, url: "https://github.com/example/cozy-studio/pull/128", source: { repository: "example/cozy-studio", pullNumber: 128 } },
      { id: "n5", type: "pullRequest", title: "A teammate requested your review", body: "Sam requested your review on Add retry handling for background sync.", createdAt: new Date(now.getTime()-60*60000).toISOString(), read: true, url: "https://github.com/example/cozy-studio/pull/131", source: { repository: "example/cozy-studio", pullNumber: 131 } },
    ],
    markAllNotificationsRead: async () => undefined,
    getDiagnosticsStatus: async () => ({ enabled: false }),
    getStartAtLogin: async () => true,
    reportRendererReady: async () => undefined,
    navigateToRoute: (route: string) => {
      location.hash = route === "signIn" ? "/" : `/${route}`;
    },
    getNotificationsSettings: async () => ({
      ...NOTIFICATION_DEFAULT_SETTINGS,
      pullRequestsAddedNotification: { ...NOTIFICATION_DEFAULT_SETTINGS.pullRequestsAddedNotification, value: false },
      ciStatusNotification: { ...NOTIFICATION_DEFAULT_SETTINGS.ciStatusNotification, value: true },
      mentionsNotification: { ...NOTIFICATION_DEFAULT_SETTINGS.mentionsNotification, value: true },
    }),
  },
  {
    get: (target, key) =>
      key in target
        ? target[key as keyof typeof target]
        : Reflect.get(noEvents, key),
  },
);
Object.assign(window, {
  electronAPI: {
    application,
    authentication: {
      ...Object.fromEntries(
        ["onInvalidPATaccess", "onAuthenticationCode"].map((key) => [
          key,
          (cb: unknown) => {
            if (key === "onAuthenticationCode" && parameters.get("screen") === "auth-code") {
              queueMicrotask(() => (cb as (data: { user_code: string; verification_uri: string }) => void)({ user_code: "ABCD-EFGH", verification_uri: "https://github.com/login/device" }));
            }
            return cb;
          },
        ]),
      ),
      removeOnInvalidPATaccess: () => undefined,
      removeAuthenticationCode: () => undefined,
      isStored: async () => !["welcome", "auth-code"].includes(parameters.get("screen") ?? ""),
      getUser: async () => user,
      getNotice: async () => null,
    },
    license: {
      getStatus: async () => state,
      validate: async () => state,
      onUpdate: (cb: (state: LicenseState) => void) => {
        listeners.add(cb);
        return cb;
      },
      removeOnUpdate: (cb: (state: LicenseState) => void) =>
        listeners.delete(cb),
      activate: async () => {
        state = { ...state, status: "licensed" };
        listeners.forEach((cb) => cb(state));
        return state;
      },
      acceptTransition: async () => {
        state = {
          schemaVersion: 2,
          status: "trial",
          trialKind: "transition",
          trialStartedAt: now.toISOString(),
          trialEndsAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
        };
        listeners.forEach((cb) => cb(state));
        return state;
      },
      quit: async () => undefined,
    },
    repository: {
      query: async () => ({
        repositoriesByPage: {
          "1": [
            {
              id: 100,
              name: "cozy-studio",
              owner: "example",
              avatar: user.avatarUrl,
            },
          ],
        },
        activeRepositories: { 100: true },
      }),
      onUpdate: (cb: unknown) => cb,
      removeOnUpdate: () => undefined,
    },
    pullRequest: {
      query: async () => cache,
      onUpdate: (cb: unknown) => cb,
      removeOnUpdate: () => undefined,
    },
    weeklyRecap: {
      personal: async (weekStart: string) => ({
        weekStart,
        weekEnd: "2026-10-18",
        mergedCount: 7,
        reviewedCount: 12,
        repositoryCount: 3,
        previousMergedCount: 5,
        fetchedAt: now.toISOString(),
      }),
    },
    openExternalLink: async () => undefined,
  },
});
void import("../src/app");
