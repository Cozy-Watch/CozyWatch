import {
  ClockIcon,
  CheckIcon,
  AlertIcon,
  PersonIcon,
  CommentDiscussionIcon,
  HomeIcon,
} from "@primer/octicons-react";
import { Flex, Button, Badge, Separator, Text } from "@radix-ui/themes";

export const SidebarLoading = () => {
  return (
    <Flex position="sticky" direction="column" minWidth="260px" width="260px">
      <Flex position="absolute" top="0" left="0" width="100%" height="100%">
        <Flex direction="column" gap="3" justify="between" flexGrow="1" p="4">
          <Flex direction="column" gap="3">
            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              OVERVIEW
            </Text>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <HomeIcon size={16} />
                  <Text className="inverse-accent-text-shadow">Home</Text>
                </Flex>
              </Flex>
            </Button>

            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              MY PULL REQUESTS
            </Text>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <AlertIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Fully Approved
                  </Text>
                </Flex>
                <Badge variant="soft">0</Badge>
              </Flex>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <ClockIcon size={16} />
                  <Text className="inverse-accent-text-shadow">
                    Pending Review
                  </Text>
                </Flex>
                <Badge variant="soft">0</Badge>
              </Flex>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CheckIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Reviewed</Text>
                </Flex>
                <Badge variant="soft">0</Badge>
              </Flex>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CommentDiscussionIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Mentions</Text>
                </Flex>
              </Flex>
              <Badge variant="soft">0</Badge>
            </Button>

            <Separator size="4" />

            <Text size="1" className="inverse-accent-text-shadow" weight="bold">
              TEAM'S PULL REQUESTS
            </Text>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <AlertIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Fully Approved
                  </Text>
                </Flex>
                <Badge variant="soft">0</Badge>
              </Flex>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <AlertIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Awaiting My Review
                  </Text>
                </Flex>
                <Badge variant="soft">0</Badge>
              </Flex>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <PersonIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">
                    Reviewed by me
                  </Text>
                </Flex>
              </Flex>
              <Badge variant="soft">0</Badge>
            </Button>

            <Button variant="soft" disabled>
              <Flex justify="between" align="center" width="100%">
                <Flex justify="start" gap="2" align="center" width="100%">
                  <CommentDiscussionIcon size={16} />{" "}
                  <Text className="inverse-accent-text-shadow">Mentions</Text>
                </Flex>
              </Flex>
              <Badge variant="soft">0</Badge>
            </Button>
          </Flex>

          <Flex direction="column" gap="3">
            <Separator size="4" />

            <Button variant="soft" disabled>
              Settings
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
