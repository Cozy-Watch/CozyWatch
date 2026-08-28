import { Badge, Flex, Tabs } from "@radix-ui/themes";
import { BuyLicenseButton } from "../../components/BuyLicenseButton/BuyLicenseButton";
import { AppSettings } from "../AppSettings/AppSettings";
import { Repositories } from "../Repositories/Repositories";
import { useSearch } from "@tanstack/react-router";

export const Settings = () => {
  const { tab } = useSearch({ from: "/settings" });

  return (
    <Flex direction="column" width="100%" overflow="hidden">
      <Flex px="4" pt="4">
        <Badge
          size="1"
          color="bronze"
          className="bright-background-text-shadow"
        >
          Settings
        </Badge>
      </Flex>

      <Tabs.Root defaultValue={tab || "application"} asChild>
        <Flex direction="column" overflow="auto" minHeight="0">
          <Tabs.List>
            <Tabs.Trigger value="application">Application</Tabs.Trigger>
            <Tabs.Trigger value="repositories">Repositories</Tabs.Trigger>

            <Flex justify="end" flexGrow="1" px="4">
              <BuyLicenseButton showImage />
            </Flex>
          </Tabs.List>

          <Tabs.Content value="application" asChild>
            <AppSettings />
          </Tabs.Content>

          <Tabs.Content value="repositories" asChild>
            <Repositories />
          </Tabs.Content>
        </Flex>
      </Tabs.Root>
    </Flex>
  );
};
