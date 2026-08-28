import { AlertFillIcon } from "@primer/octicons-react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  onSave: () => void;
}

export const Modal = ({ isOpen, onClose, onSave, loading }: Props) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content
        maxWidth="450px"
        style={{
          background:
            "linear-gradient(180deg,var(--accent-2) 70%, var(--accent-1) 100%)",
        }}
      >
        <Dialog.Title>
          <Text color="red">
            <Flex gap="2" align="center">
              <AlertFillIcon size={22} />
              Caution
            </Flex>
          </Text>
        </Dialog.Title>
        <Flex direction="column" gap="2" mt="4">
          <Text weight="light" size="2" className="inverse-accent-text-shadow">
            Activating many repositories may exceed GitHub's API rate limits.
          </Text>
          <Text weight="light" size="2" className="inverse-accent-text-shadow">
            Cozy Watch minimizes requests, but issues may still occur.
          </Text>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>

          <Button onClick={onSave} loading={loading}>
            Continue
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
