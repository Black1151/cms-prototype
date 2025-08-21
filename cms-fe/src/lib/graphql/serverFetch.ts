const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_API_GRAPHQL_URL || "http://localhost:3000/graphql";

export async function serverGraphQL<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // If auth: include cookies or headers here
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join("; "));
  }
  return json.data as T;
}
