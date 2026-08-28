import { Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface Props {
  message: string;
}

export const ErrorMessage = ({ message }: Props) => {
  return (
    <Callout.Root>
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
};
