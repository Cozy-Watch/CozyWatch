import { useMemo } from "react";
import { Repository } from "src/mainProcess/safeStorage/safeStorage.types";
import { useRepositoriesQuery } from "../../api/useRepositoriesQuery";

export const useRepositories = () => {
  const queryInfo = useRepositoriesQuery();

  const data = useMemo(() => {
    if (!queryInfo.data) {
      return null;
    }

    const { repositories, activeRepositories } = queryInfo.data;

    const groupByOwner = repositories.reduce<Record<string, Repository[]>>(
      (acc, repo) => {
        return {
          ...acc,
          [repo.owner]: [...(acc[repo.owner] || []), repo],
        };
      },
      {}
    );

    return { repositories, activeRepositories, groupByOwner };
  }, [queryInfo.data]);

  return {
    ...queryInfo,
    data,
  };
};
