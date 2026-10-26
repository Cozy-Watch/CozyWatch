/** @jest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useAuthentication } from "./useGithubAuthentication";
const navigate = jest.fn(), start = jest.fn(), invalidateQueries = jest.fn();
jest.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries }) }));
jest.mock("../../api/useGithubAuthenticationMutation", () => ({ useGitHubAuthenticationMutation: () => ({ mutateAsync: start }) }));
jest.mock("../../api/useGitHubAppAuthenticationMutation", () => ({ useGitHubAppAuthenticationMutation: () => ({ mutateAsync: start }) }));
jest.mock("electron-log", () => ({ warn: jest.fn() }));
const Probe = () => { const { data, action } = useAuthentication(); return <><button onClick={action.authenticate}>Connect</button><span>{data.error}</span></>; };
it("shows failed OAuth completion instead of navigating, then allows retry", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { electronAPI: { authentication: { onAuthenticationCode: jest.fn(), removeAuthenticationCode: jest.fn() } } });
  const container = document.createElement("div"); const root = createRoot(container);
  try {
    start.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => root.render(<Probe />));
    await act(async () => container.querySelector("button")!.click());
    expect(navigate).not.toHaveBeenCalled(); expect(container.textContent).toContain("wasn’t completed");
    await act(async () => container.querySelector("button")!.click());
    expect(navigate).toHaveBeenCalledWith({ to: "/settings", search: { tab: "repositories" } });
  } finally { await act(async () => root.unmount()); }
});
