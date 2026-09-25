import { Box, Card, Flex, Switch, Text } from "@radix-ui/themes";
import Logger from "electron-log";
import { useNotificationsMutation } from "../AppSettings/api/useNotificationsMutation";
import { useNotificationQuery } from "../AppSettings/api/useNotificationsQuery";
import { useToggleAllNotificationsMutation } from "../AppSettings/api/useToggleAllNotificationsMutation";
import { SettingsSection } from "./SettingsSection";

export const NotificationsSettings = () => {
  const { isPending, data: notifications } = useNotificationQuery();
  const { mutateAsync: toggleNotification } = useNotificationsMutation();
  const { mutateAsync: toggleAllNotifications } =
    useToggleAllNotificationsMutation();
  const areAllNotificationsEnabled = Object.values(notifications || {}).every(
    ({ value }) => value === true,
  );

  return (
    <SettingsSection>
      <Card
        className="accent-shadow-low"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-1))",
        }}
      >
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="2">
            <Text weight="medium">Notifications</Text>
            <Text size="2" weight="light">
              What notifications do you want to receive?
            </Text>
          </Flex>

          <Flex direction="column" gap="2">
            <Flex gap="2" justify="between">
              <Text size="2">Enable All:</Text>
              <Switch
                size="1"
                checked={areAllNotificationsEnabled}
                onCheckedChange={async (checked) => {
                  try {
                    await toggleAllNotifications(checked);
                  } catch (error) {
                    Logger.error("[NotificationsSettings] Error toggling all", {
                      error,
                    });
                  }
                }}
              />
            </Flex>

            <Flex direction="column" gap="1">
              {Object.entries(notifications || {}).map(([key, notification]) => (
                <Box key={key}>
                  <Text as="label" size="2">
                    <Flex gap="2" justify="between">
                      <Text>{notification.title}</Text>
                      <Switch
                        size="1"
                        checked={notification.value}
                        onCheckedChange={async (checked) => {
                          try {
                            await toggleNotification({ checked, key });
                          } catch (error) {
                            Logger.error(
                              "[NotificationsSettings] Error toggling notification",
                              { error },
                            );
                          }
                        }}
                        disabled={isPending}
                      />
                    </Flex>
                  </Text>
                </Box>
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </SettingsSection>
  );
};
