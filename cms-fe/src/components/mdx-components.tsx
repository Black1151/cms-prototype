"use client";

import React from "react";
import {
  Heading as CHeading,
  Text as CText,
  Alert, AlertIcon, SimpleGrid, Image, Box
} from "@chakra-ui/react";

export type RegistryProps = { overrides?: Record<string, { css: any }>; };

function withOverrides<T extends { "data-id"?: string }>(
  Comp: React.ComponentType<any>,
  overrides?: RegistryProps["overrides"]
) {
  return (props: T) => {
    const id = (props as any)["data-id"];
    const extra = id && overrides?.[id]?.css ? { sx: overrides[id].css } : {};
    return <Comp {...props} {...extra} />;
  };
}

export function createRegistry({ overrides }: RegistryProps = {}) {
  return {
    Heading: withOverrides((props: any) => (
      <CHeading as="h2" variant={props.variant ?? "section"} {...props} />
    ), overrides),

    Text: withOverrides((props: any) => <CText mb={4} {...props} />, overrides),

    Callout: withOverrides(
      (props: { variant?: "info" | "success" | "warning" | "danger"; children: React.ReactNode; }) => {
        const map = { info: "info", success: "success", warning: "warning", danger: "error" } as const;
        const status = map[props.variant ?? "info"];
        return (
          <Alert status={status as any} borderRadius="md" mb={4}>
            <AlertIcon />
            <Box as="span">{props.children}</Box>
          </Alert>
        );
      }, overrides
    ),

    TwoColumn: withOverrides((props: any) => (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={4} {...props} />
    ), overrides),

    Img: withOverrides((props: { src: string; alt: string }) => (
      <Image {...props} borderRadius="md" />
    ), overrides),
  };
}
