"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ApolloProvider } from "@apollo/client";
import { getApolloClient } from "@/lib/graphql/apolloClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  const client = getApolloClient();
  return (
    <ApolloProvider client={client}>
      <ChakraProvider>{children}</ChakraProvider>
    </ApolloProvider>
  );
}
