import { Button, Flex, Text } from "@radix-ui/themes";
import { Fragment, useEffect, useState, type Key, type ReactNode } from "react";

const PAGE_SIZE = 30;

export const PagedList = <T,>({ items, getKey, renderItem }: {
  items: readonly T[];
  getKey: (item: T) => Key;
  renderItem: (item: T) => ReactNode;
}) => {
  const [requestedPage, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
  useEffect(() => { setPage(current => Math.min(current, lastPage)); }, [lastPage]);
  const page = Math.min(requestedPage, lastPage);
  const start = page * PAGE_SIZE;
  if (!items.length) return null;

  return (
    <>
      {items.length > PAGE_SIZE && (
        <Flex as="div" role="navigation" aria-label="Pull request pages" align="center" justify="between" gap="2" wrap="wrap">
          <Text size="1" color="gray" role="status">
            {start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length} pull requests
          </Text>
          <Flex gap="2">
            <Button size="1" color="gray" variant="soft" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="1" color="gray" variant="soft" disabled={page === lastPage} onClick={() => setPage(page + 1)}>Next</Button>
          </Flex>
        </Flex>
      )}
      {items.slice(start, start + PAGE_SIZE).map(item => (
        <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
      ))}
    </>
  );
};
