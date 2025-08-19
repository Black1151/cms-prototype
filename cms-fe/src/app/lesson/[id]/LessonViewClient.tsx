"use client";

import { ChakraProvider, Box } from "@chakra-ui/react";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { MDXRemote } from "next-mdx-remote";
import { createChakraThemeFromTokens } from "../../../src/lib/theme/createTheme";
import { createRegistry } from "../../../src/components/mdx-components";

type Props = {
  id: string;
  mdxSource: MDXRemoteSerializeResult;
  tokens: unknown;
  overrides?: Record<string, { css: any }>;
};

export default function LessonViewClient({ id, mdxSource, tokens, overrides }: Props) {
  const rootId = `lesson-${id}`;
  const theme = createChakraThemeFromTokens(tokens);
  const components = createRegistry({ overrides });

  return (
    <Box p={6} id={rootId}>
      {/* Scoped provider: theme variables apply only under #lesson-ID */}
      <ChakraProvider theme={theme} cssVarsRoot={`#${rootId}`}>
        <Box maxW="840px" mx="auto">
          <MDXRemote {...mdxSource} components={components as any} />
        </Box>
      </ChakraProvider>
    </Box>
  );
}
