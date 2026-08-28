import { Box, Flex } from "@radix-ui/themes";
import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { Header } from "../Header/Header";
import { Sidebar } from "./components/Sidebar/Sidebar";

const titlebarSize = "30px";

export const Root = () => {
  const matchRoute = useMatchRoute();

  const isAuthenticationRoute = !!matchRoute({ to: "/" });
  const isMenubar = !!matchRoute({ to: "/menubar" });

  const isAuthenticated = !isAuthenticationRoute;

  if (isMenubar) {
    return (
      <Box width="480px" height="640px" className="menubar-bg">
        <Outlet />
      </Box>
    );
  }

  return (
    <Flex
      direction="column"
      height="100dvh"
      style={{
        borderRadius: "10px",
        border: "4px solid var(--accent-5)",
        overflow: "hidden",
        background: "var(--accent-a1)",
      }}
    >
      <Flex direction="column" height="100vh" overflowY="auto">
        {!isAuthenticated && (
          <Box
            id="toolbar"
            // toolbar needed for drag the app
            style={{
              height: `${titlebarSize}`,
              background: "var(--accent-a12)",
              marginBottom: `-${titlebarSize}`,
            }}
          />
        )}

        {isAuthenticated && (
          <Box position="sticky" style={{ top: 0, zIndex: 1 }}>
            <Box
              style={{
                width: "100%",
                position: "absolute",
                top: 0,
                inset: 0,
                height: "100%",
                backdropFilter: "blur(5px)",
                maskImage: `linear-gradient(to bottom,black 0% 100%,red 0% 100%)`,
              }}
            />

            <Box
              id="toolbar"
              // toolbar needed for drag the app
              style={{
                height: `${titlebarSize}`,
              }}
            />

            <Header />
          </Box>
        )}

        <Flex height="100%" width="100%" overflow="hidden">
          <Sidebar />
          <Flex
            position="relative"
            direction="column"
            flexGrow="1"
            style={{
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, var(--accent-a2) 0%,  var(--accent-a1) 50%, var(--accent-a1) 90%)",
            }}
            overflow="auto"
            width="100%"
          >
            <Outlet />
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
