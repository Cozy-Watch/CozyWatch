import { MarkGithubIcon } from "@primer/octicons-react";
import { Box, Button, Callout, Flex, Spinner } from "@radix-ui/themes";
import { useState } from "react";
import { useIsAuthenticatedQuery } from "../../api/useIsAuthenticatedQuery";
import { Header } from "./components/Header/Header";
import { HeaderEmpty } from "./components/Header/Header.empty";
import { My } from "./Tabs/My/My";
import { Team } from "./Tabs/Team/Team";
import { useMenubar } from "./useMenubar";
import { useMenubarDensityQuery } from "../AppSettings/api/useMenubarDensityQuery";

export const Menubar = () => {
  const [selectedTab, setSelectedTab] = useState<"mine" | "team">("mine");
  const { error, data, isPending } = useMenubar();
  const { data: isAuthenticated } = useIsAuthenticatedQuery();
  const { data: menubarDensity } = useMenubarDensityQuery();

  const isCompact = menubarDensity === "compact";

  if (isPending || isAuthenticated === false) {
    return (
      <Flex direction="column" height="100%" flexGrow="1">
        <Flex
          direction="column"
          justify="between"
          flexGrow="1"
          height={isCompact ? "90px" : "130px"}
          pt={isCompact ? "2" : "3"}
          px={isCompact ? "2" : "3"}
        >
          <HeaderEmpty isCompact={isCompact} />
        </Flex>

        <Flex
          direction="column"
          flexGrow="1"
          height="100%"
          align="center"
          justify="center"
        >
          {isAuthenticated === false ? (
            <Button
              variant="soft"
              className="inverse-accent-text-shadow"
              onClick={() => {
                window.electronAPI.application.navigateToRoute("signIn");
              }}
            >
              <MarkGithubIcon size={16} />
              Sign In to Github
            </Button>
          ) : (
            <Spinner size="3" />
          )}
        </Flex>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" height="100%" width="100%" flexGrow="1">
        <Flex
          direction="column"
          justify="between"
          height="130px"
          flexGrow="1"
          pt="5"
          px="5"
        >
          <HeaderEmpty isCompact={false} />
        </Flex>

        <Flex
          direction="column"
          flexGrow="1"
          height="100%"
          width="100%"
          align="center"
          justify="center"
        >
          <Callout.Root>
            <Callout.Text>{error.message}</Callout.Text>
          </Callout.Root>
        </Flex>
      </Flex>
    );
  }

  if (!data) {
    return null;
  }

  const { headerData, myPullRequests, teamPullRequests } = data;
  const { avatarUrl, name, login } = headerData;

  return (
    <Flex direction="column" flexGrow="1" overflow="hidden">
      <Flex
        direction="column"
        justify="between"
        flexGrow="1"
        height={isCompact ? "90px" : "130px"}
        pt={isCompact ? "2" : "3"}
        px={isCompact ? "2" : "3"}
      >
        <Header
          avatarUrl={avatarUrl}
          name={name}
          login={login}
          isCompact={isCompact}
        />

        <Flex direction="column" gap="4">
          <Flex justify="center" gap="1" width="100%">
            <Box width="100%">
              <Button
                size={isCompact ? "1" : "2"}
                variant={selectedTab == "mine" ? "soft" : "outline"}
                onClick={() => {
                  setSelectedTab("mine");
                }}
                className="mb-text-color-heading"
                style={{
                  ...(selectedTab === "mine" ? {} : { boxShadow: "none" }),
                  width: "100%",

                  fontWeight: "medium",
                }}
              >
                My Pull Requests (
                {myPullRequests.length > 99 ? "99+" : myPullRequests.length})
              </Button>
            </Box>

            <Box width="100%">
              <Button
                size={isCompact ? "1" : "2"}
                variant={selectedTab == "team" ? "soft" : "outline"}
                className="mb-text-color-heading"
                onClick={() => {
                  setSelectedTab("team");
                }}
                style={{
                  ...(selectedTab === "team" ? {} : { boxShadow: "none" }),
                  width: "100%",

                  fontWeight: "medium",
                }}
              >
                Team's Pull Requests (
                {teamPullRequests.length > 99 ? "99+" : teamPullRequests.length}
                )
              </Button>
            </Box>
          </Flex>

          <Box>
            <Flex
              style={{
                width: "100vw",
                height: "1px",
                background: "var(--gray-a3)",
              }}
            />
          </Box>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        flexGrow="1"
        height={isCompact ? "540px" : "500px"}
        overflowX="auto"
      >
        {selectedTab === "mine" ? (
          <My pullRequests={myPullRequests} isCompact={isCompact} />
        ) : (
          <Team pullRequests={teamPullRequests} isCompact={isCompact} />
        )}
      </Flex>
    </Flex>
  );
};
