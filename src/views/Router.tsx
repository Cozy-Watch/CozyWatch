import { Spinner, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import {
  RouterProvider,
  createHashHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { StrictMode, useEffect } from "react";
import { Appearance } from "../state/appState";
import { useIsAuthenticatedQuery } from "./api/useIsAuthenticatedQuery";
import { AuthContext } from "./context/Auth/Context";
import { useAppearanceMutation } from "./pages/AppSettings/api/useAppearanceMutation";
import { useAppearanceQuery } from "./pages/AppSettings/api/useAppearanceQuery";
import { GithubAuthentication } from "./pages/GithubAuthentication/GithubAuthentication";
import { Mentions } from "./pages/Mentions/Mentions";
import { Menubar } from "./pages/Menubar/Menubar";
import { Overview } from "./pages/Overview/Overview";
import { PendingReviews } from "./pages/PendingReviews/PendingReviews";
import { PullRequests } from "./pages/PullRequests/PullRequests";
import { Repositories } from "./pages/Repositories/Repositories";
import { Reviewed } from "./pages/Reviewed/Reviewed";
import { Root } from "./pages/Root/Root";
import { Settings } from "./pages/Settings/Settings";
import { FullyApproved } from "./pages/FullyApproved/FullyApproved";

const LoadingComponent = () => {
  return (
    <div id="loading-fallback">
      <img id="sofa" src="./images/catSitting.png" width="150" />
    </div>
  );
};

const NothingComponent = () => {
  return (
    <div>
      <img id="sofa" src="./images/catSitting.png" width="150" />
      Nothing to see here
    </div>
  );
};

interface RouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: {
    isAuthenticated: boolean | undefined;
  };
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Root />,
  errorComponent: ({ error }) => (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
    </div>
  ),
  pendingComponent: () => LoadingComponent,
  notFoundComponent: () => NothingComponent,
});

// // --- Github Authentication Route ---
const githubAuthenticationRoute = createRoute({
  beforeLoad: async ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: "/overview",
      });
    }
  },
  getParentRoute: () => rootRoute,
  path: "/",
  component: GithubAuthentication,
});

// --- Other Routes ---
const overview = createRoute({
  getParentRoute: () => rootRoute,
  path: "/overview",
  component: Overview,
});

const pendingReviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "myPullRequests/pendingReviews",
  component: PendingReviews,
});

const reviewedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "myPullRequests/reviewed",
  component: Reviewed,
});

const mentionsInMyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "myPullRequests/mentions",
  component: Mentions,
});

const fullyApprovedInMyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "myPullRequests/fullyApproved",
  component: FullyApproved,
});

const pendingMyReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "teamPullRequest/pendingReviews",
  component: PendingReviews,
});

const reviewsByMeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "teamPullRequest/reviewed",
  component: Reviewed,
});

const mentionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "teamPullRequest/mentions",
  component: Mentions,
});

const teamFullyApprovedInMyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "teamPullRequest/fullyApproved",
  component: FullyApproved,
});

const pullRequestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pullRequests",
  component: PullRequests,
});

const repositoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repositories",
  component: Repositories,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const menubarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/menubar",
  component: Menubar,
});

// --- Router Setup ---
const routeTree = rootRoute.addChildren([
  settingsRoute,
  githubAuthenticationRoute,
  pullRequestRoute,
  repositoriesRoute,
  menubarRoute,
  overview,
  pendingReviewsRoute,
  reviewedRoute,
  pendingMyReviewRoute,
  reviewsByMeRoute,
  mentionsRoute,
  mentionsInMyRoute,
  fullyApprovedInMyRoute,
  teamFullyApprovedInMyRoute,
]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: {
    auth: undefined!,
  },
});

export const Router = () => {
  const { data: isAuthenticated, isPending } = useIsAuthenticatedQuery();

  if (isPending) {
    return <Spinner />;
  }

  return <RouterContent isAuthenticated={!!isAuthenticated} />;
};
const RouterContent = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const { data: stateAppearance } = useAppearanceQuery();
  const { mutateAsync: saveAppearance } = useAppearanceMutation();

  const appearance =
    stateAppearance ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? Appearance.Dark
      : Appearance.Light);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      saveAppearance(event.matches ? Appearance.Dark : Appearance.Light);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [saveAppearance]);

  useEffect(() => {
    const handleNavigateToSettings = (route: "settings" | "signIn") => {
      if (route === "signIn") {
        router.navigate({ to: "/" });
      } else {
        router.navigate({ to: "/settings" });
      }
    };

    const handler = window.electronAPI.application.onNavigateToRoute(
      handleNavigateToSettings
    );

    return () => {
      window.electronAPI.application.removeOnNavigateToRoute(handler);
    };
  }, []);

  return (
    <StrictMode>
      <Theme
        accentColor="violet"
        radius="large"
        appearance={appearance}
        style={{ background: "none" }}
      >
        <AuthContext.Provider value={{ isAuthenticated: !!isAuthenticated }}>
          <RouterProvider
            router={router}
            context={{ auth: { isAuthenticated } }}
          />
        </AuthContext.Provider>
      </Theme>
    </StrictMode>
  );
};
