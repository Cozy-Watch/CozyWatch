import { ChatBubbleIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Card,
  DropdownMenu,
  Flex,
  Grid,
  Switch,
  Text,
} from "@radix-ui/themes";
import Logger from "electron-log";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Appearance } from "../../../state/appState";
import { LicenseModal } from "../../components/LicenseModal/LicenseModal";
import { LicenseStatusCard } from "../../components/LicenseStatus/LicenseStatusCard";
import {
  licenseStatusQueryKey,
  useLicenseStatusQuery,
} from "../../api/useLicenseStatusQuery";

import { useAppearanceMutation } from "./api/useAppearanceMutation";
import { useAppearanceQuery } from "./api/useAppearanceQuery";
import { useNotificationsMutation } from "./api/useNotificationsMutation";
import { useNotificationQuery } from "./api/useNotificationsQuery";
import { useOpenAtLoginMutation } from "./api/useOpenAtLoginMutation";
import { useOpenAtLoginQuery } from "./api/useOpenAtLoginQuery";
import { useToggleAllNotificationsMutation } from "./api/useToggleAllNotificationsMutation";
import { useMenubarDensityQuery } from "./api/useMenubarDensityQuery";
import { useMenubarDensityMutation } from "./api/useMenubarDensityMutation";
import {
  LinkExternalIcon,
  MarkGithubIcon,
  SignOutIcon,
} from "@primer/octicons-react";

export const AppSettings = () => {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseActionError, setLicenseActionError] = useState<string | null>(
    null,
  );
  const [isLicenseActionPending, setIsLicenseActionPending] = useState(false);

  const { data: licenseState, isPending: isLicenseStatusPending } =
    useLicenseStatusQuery();
  const { isPending, data: notifications } = useNotificationQuery();
  const { mutateAsync: toggleNotification } = useNotificationsMutation();

  const { data: hasOpenAtLogin } = useOpenAtLoginQuery();
  const { mutateAsync: saveIsOpenAtLogin } = useOpenAtLoginMutation();
  const { mutateAsync: toggleAllNotifications } =
    useToggleAllNotificationsMutation();

  const { data: appearance } = useAppearanceQuery();
  const { mutateAsync: saveAppearance } = useAppearanceMutation();

  const areAllNotificationsEnabled = Object.values(notifications || {}).every(
    ({ value }) => value === true,
  );

  const { data: menubarDensity } = useMenubarDensityQuery();
  const { mutateAsync: setMenubarDensity } = useMenubarDensityMutation();
  const isMenubarCompact = menubarDensity === "compact";

  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const runLicenseAction = async (action: () => Promise<unknown>) => {
    setLicenseActionError(null);
    setIsLicenseActionPending(true);

    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: licenseStatusQueryKey });
    } catch (error) {
      setLicenseActionError(
        error instanceof Error
          ? error.message
          : "Unable to update license status. Please try again.",
      );
    } finally {
      setIsLicenseActionPending(false);
    }
  };

  const onSignOut = async () => {
    try {
      await window.electronAPI.application.signUser(false);
      await queryClient.invalidateQueries();
      await router.invalidate();
      navigate({ to: "/" });
    } catch (error) {
      Logger.error("[AppSettings] Error signing out", { error });
    }
  };

  return (
    <Flex direction={"column"} gap="4" height="50%" px="4" py="4">
      <LicenseStatusCard
        state={licenseState}
        isPending={isLicenseStatusPending || isLicenseActionPending}
        error={licenseActionError}
        onChoosePersonalUse={() =>
          runLicenseAction(() =>
            window.electronAPI.license.setUsage("personal"),
          )
        }
        onStartCommercialTrial={() =>
          runLicenseAction(() =>
            window.electronAPI.license.setUsage("commercial"),
          )
        }
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        onDeactivate={() => {
          if (
            window.confirm(
              "Deactivate this Mac? You can then activate the license on another device.",
            )
          ) {
            return runLicenseAction(() =>
              window.electronAPI.license.deactivate(),
            );
          }
        }}
      />

      <Card>
        <Flex justify={"between"} align={"center"}>
          <Text weight="medium">Menu Bar compact view:</Text>
          <Flex gap="2" justify={"between"} align={"center"}>
            <Switch
              size="1"
              checked={isMenubarCompact}
              onCheckedChange={async (checked) => {
                try {
                  await setMenubarDensity(checked ? "compact" : "default");
                } catch (error) {
                  Logger.error("[AppSettings] Error toggling MenuBar Density", {
                    error,
                  });
                }
              }}
            />
          </Flex>
        </Flex>
      </Card>

      <Grid columns="1fr 1fr" gap="4">
        <Card>
          <Flex justify={"between"} align={"center"}>
            <Text weight="medium">Open at login:</Text>
            <Flex gap="2" justify={"between"} align={"center"}>
              <Switch
                size="1"
                checked={hasOpenAtLogin}
                onCheckedChange={async (checked) => {
                  try {
                    await saveIsOpenAtLogin(checked);
                  } catch (error) {
                    Logger.error("[AppSettings] Error toggling Open At login", {
                      error,
                    });
                  }
                }}
              />
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex align="center" justify="between">
            <Text weight="medium">Appearance:</Text>

            <Flex direction="column">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="surface" style={{ width: 180 }}>
                    {appearance === Appearance.Light
                      ? "Light"
                      : appearance === Appearance.Dark
                        ? "Dark"
                        : "System"}
                    <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item
                    onClick={() => {
                      saveAppearance(Appearance.Light);
                    }}
                  >
                    Light
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => {
                      saveAppearance(Appearance.Dark);
                    }}
                  >
                    Dark
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onClick={() => {
                      saveAppearance(null);
                    }}
                  >
                    System
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          </Flex>
        </Card>
      </Grid>

      <Card>
        <Flex direction="column" justify="between">
          <Flex>
            <Flex direction="column" gap="2">
              <Text weight="medium">Notifications:</Text>

              <Text size="2" weight="light">
                What notifications do you want to receive?
              </Text>
            </Flex>
          </Flex>

          <Flex justify={"end"}>
            <Flex direction="column" gap="2" justify={"between"}>
              <Flex gap="2" justify={"between"}>
                <Text size="2">Enable All:</Text>
                <Switch
                  size="1"
                  checked={areAllNotificationsEnabled}
                  onCheckedChange={async (checked) => {
                    try {
                      await toggleAllNotifications(checked);
                    } catch (error) {
                      Logger.error(
                        "[AppSettings] Error toggling notification",
                        { error },
                      );
                    }
                  }}
                />
              </Flex>

              <Flex direction="column" gap="1" justify={"between"}>
                {Object.entries(notifications || {}).map(
                  ([key, notification]) => {
                    return (
                      <Box key={key}>
                        <Text as="label" size="2">
                          <Flex gap="2" justify={"between"}>
                            <Text>{notification.title}</Text>

                            <Box>
                              <Switch
                                size="1"
                                checked={notification.value}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await toggleNotification({
                                      checked,
                                      key,
                                    });
                                  } catch (error) {
                                    Logger.error(
                                      "[AppSettings] Error toggling notification",
                                      { error },
                                    );
                                  }
                                }}
                                disabled={isPending}
                              />
                            </Box>
                          </Flex>
                        </Text>
                      </Box>
                    );
                  },
                )}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Grid columns="1fr 1fr" gap="4">
        <Card>
          <Flex align="center" justify="between">
            <Text weight="medium">Feedback:</Text>

            <Button
              variant="outline"
              style={{ width: 180 }}
              onClick={() => {
                window.electronAPI.openExternalLink(
                  "mailto:tiago@cozywatch.com",
                );
              }}
            >
              Let's chat
              <ChatBubbleIcon />
            </Button>
          </Flex>
        </Card>

        <Card>
          <Flex align="center" justify="between">
            <Text weight="medium">See what's new:</Text>

            <Button
              onClick={() => {
                window.electronAPI.openExternalLink(
                  "https://www.cozywatch.com/changelog/",
                );
              }}
              variant="outline"
            >
              Open Release Notes
              <LinkExternalIcon size={12} />
            </Button>
          </Flex>
        </Card>
      </Grid>

      <Card>
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <MarkGithubIcon size={16} />
            <Text weight="medium">GitHub</Text>
          </Flex>
          <Flex align="center" gap="3">
            <Button variant="soft" color="red" size="1" onClick={onSignOut}>
              <SignOutIcon size={12} />
              Disconnect
            </Button>
          </Flex>
        </Flex>
      </Card>
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
      />
    </Flex>
  );
};
