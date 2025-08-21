"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ApolloProvider } from "@apollo/client";
import { getApolloClient } from "@/lib/graphql/apolloClient";
import { mainTheme } from "@/lib/theme/mainTheme";

export default function Providers({ children }: { children: React.ReactNode }) {
  const client = getApolloClient();
  return (
    <ApolloProvider client={client}>
      <ChakraProvider theme={mainTheme}>{children}</ChakraProvider>
    </ApolloProvider>
  );
}
