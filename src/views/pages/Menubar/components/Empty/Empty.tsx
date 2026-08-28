import { Flex, Text } from "@radix-ui/themes";

interface Props {
  children?: React.ReactNode;
}

export const Empty = ({ children }: Props) => {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      height="100%"
      flexGrow="1"
      gap="2"
    >
      <img
        className="imageStroke"
        src={`./images/catSitting.png`}
        width="140"
        height="140"
        style={{
          borderRadius: 10,
        }}
      />

      <Text style={{ color: "var(--white-a11)" }} weight="bold">
        All Caught up!
      </Text>

      {children}
    </Flex>
  );
};
