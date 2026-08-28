import { Badge, Flex, Text } from "@radix-ui/themes";

interface Props {
  items: {
    id: number;
    node_id: string;
    url: string;
    name: string;
    description: string;
    color: string;
    default: boolean;
  }[];
}

export const Labels = ({ items }: Props) => {
  return (
    <Flex align="center" gap="2">
      {items.map(({ id, color, name }) => {
        return (
          <Badge size="1" key={id} style={{ backgroundColor: `#${color}` }}>
            <Text className="appearance-text">{name}</Text>
          </Badge>
        );
      })}
    </Flex>
  );
};
