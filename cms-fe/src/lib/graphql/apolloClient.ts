"use client";

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_API_GRAPHQL_URL || "http://localhost:3000/graphql";

let apollo: ApolloClient<any> | null = null;

export function getApolloClient() {
  if (apollo) return apollo;
  apollo = new ApolloClient({
    link: new HttpLink({
      uri: GRAPHQL_URL,
      // If you need cookies/session: credentials: "include"
    }),
    cache: new InMemoryCache(),
    // defaultOptions could go here
  });
  return apollo;
}
