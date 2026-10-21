/** Base-repository identity; fork heads must never select a different cache. */
export const repositoryKey = (repo: { name: string; full_name?: string; owner?: string | { login?: string } }) => {
  if (repo.full_name) return repo.full_name.toLowerCase();
  const owner = typeof repo.owner === "string" ? repo.owner : repo.owner?.login;
  return owner ? `${owner}/${repo.name}`.toLowerCase() : repo.name;
};
