import { useQuery } from "@tanstack/react-query";
import { Callout } from "@radix-ui/themes";

export const AuthenticationNotice = () => {
  const { data: notice } = useQuery({
    queryKey: ["authenticationNotice"],
    queryFn: () => window.electronAPI.authentication.getNotice(),
  });

  if (!notice) return null;

  return (
    <Callout.Root color="amber" size="1" role="alert" style={{ maxWidth: 370 }}>
      <Callout.Text>{notice}</Callout.Text>
    </Callout.Root>
  );
};
