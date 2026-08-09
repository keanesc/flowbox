export async function graphql<T>(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
  const endpoint = process.env.NHOST_GRAPHQL_URL;
  if (!endpoint) throw new Error("NHOST_GRAPHQL_URL is not configured");
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ query, variables }) });
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? "GraphQL request failed");
  return payload.data as T;
}
