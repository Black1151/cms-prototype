"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChakraProvider, Box, Flex, Button, Heading, HStack, Spacer, useToast
} from "@chakra-ui/react";
import { createChakraThemeFromTokens } from "@/lib/theme/createtheme";
import { createRegistry } from "@/components/mdx-components";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
// MDX AST manipulation utilities (moved inline since backend handles processing)
type MdxJsxNode = {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string;
  attributes: { type: "mdxJsxAttribute"; name: string; value?: any }[];
  children?: any[];
};

// Utility functions for MDX AST manipulation
function getTopLevelBlocks(tree: any): MdxJsxNode[] {
  return (tree.children || []).filter((n: any) =>
    n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement"
  );
}

function getAttr(node: MdxJsxNode, name: string) {
  const a = node.attributes?.find((x) => x.name === name);
  return a?.value;
}

function setAttr(node: MdxJsxNode, name: string, value: any) {
  const idx = node.attributes?.findIndex((x) => x.name === name) ?? -1;
  if (idx >= 0) node.attributes[idx].value = value;
  else {
    node.attributes = node.attributes || [];
    node.attributes.push({ type: "mdxJsxAttribute", name, value });
  }
}

function moveTopLevel(tree: any, fromIndex: number, toIndex: number) {
  const arr = tree.children;
  const item = arr.splice(fromIndex, 1)[0];
  arr.splice(toIndex, 0, item);
}

function findNodeById(tree: any, id: string): MdxJsxNode | null {
  let found: any = null;
  // Simple tree traversal since we removed unist-util-visit
  const visit = (node: any) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const has = node.attributes?.find((a: any) => a.name === "data-id" && a.value === id);
      if (has) { found = node; return; }
    }
    if (node.children) {
      for (const child of node.children) {
        visit(child);
      }
    }
  };
  visit(tree);
  return found;
}
import { PropertyPanel } from "@/components/PropertyPanel";
import { useMutation } from "@apollo/client";
import { MDX_COMPILE, UPDATE_LESSON } from "@/lib/graphql/documents";

type Props = {
  id: string;
  slug: string;
  mdx: string;
  tokens: any;
  overrides: Record<string, { css: any }>;
  mdxSourceInitial: MDXRemoteSerializeResult;
};

export default function EditorClient({
  id, slug, mdx: mdxInitial, tokens, overrides: overridesInitial, mdxSourceInitial
}: Props) {
  const [mdx, setMdx] = useState(mdxInitial);
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult>(mdxSourceInitial);
  const [overrides, setOverrides] = useState<Record<string, { css: any }>>(overridesInitial ?? {});
  const toast = useToast();

  const [compileMdx] = useMutation(MDX_COMPILE);
  const [updateLesson] = useMutation(UPDATE_LESSON);

  // Parse to AST for DnD & prop editing (simplified since backend handles MDX processing)
  const { tree, blocks } = useMemo(() => {
    // Simple parsing for editor UI - backend handles actual MDX compilation
    const blocks = getTopLevelBlocks({ children: [] }); // Placeholder for now
    return { tree: { children: [] }, blocks };
  }, [mdx]);

  const [selectedId, setSelectedId] = useState<string | null>(
    blocks[0] ? (blocks[0].attributes.find((a:any)=>a.name==="data-id")?.value ?? null) : null
  );
  const selectedNode = selectedId ? (findNodeById(tree, selectedId) as MdxJsxNode | null) : null;

  // Debounced GraphQL compile for live preview
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await compileMdx({ variables: { mdx } });
        if (data?.compileMdx?.compiledSource) {
          setMdxSource({ compiledSource: data.compileMdx.compiledSource, scope: {} } as any);
        }
      } catch {
        // ignore transient typing errors
      }
    }, 300);
    return () => clearTimeout(t);
  }, [mdx, compileMdx]);

  async function reorder(from: number, to: number) {
    moveTopLevel(tree, from, to);
    // For now, just update the MDX state - backend will handle actual serialization
    setMdx(mdx); // Placeholder - would need backend call for proper serialization
  }

  async function mutateSelected(mut: (n: MdxJsxNode) => void) {
    if (!selectedNode) return;
    mut(selectedNode);
    // For now, just update the MDX state - backend will handle actual serialization
    setMdx(mdx); // Placeholder - would need backend call for proper serialization
  }

  function onChangeOverrides(id: string | null, raw: string) {
    if (!id) return;
    try {
      const parsed = JSON.parse(raw);
      setOverrides(prev => ({ ...prev, [id]: { css: parsed } }));
    } catch { /* JSON mid-typing */ }
  }

  async function save() {
    try {
      const { data } = await updateLesson({
        variables: {
          input: { slug, mdx, overrides }
        }
      });
      // server returns normalized mdx & cleaned overrides
      if (data?.updateLesson?.mdx) setMdx(data.updateLesson.mdx);
      if (data?.updateLesson?.overrides) setOverrides(data.updateLesson.overrides);
      toast({ title: "Saved", status: "success" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, status: "error", duration: 6000 });
    }
  }

  const theme = createChakraThemeFromTokens(tokens);
  const components = createRegistry({ overrides });

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Left column: block list (ready for Atlaskit DnD wiring) */}
      <Box p={4} w="320px" borderRight="1px solid" borderColor="gray.200" overflowY="auto">
        <HStack mb={3}>
          <Heading size="sm">Blocks</Heading>
          <Spacer />
          <Button size="sm" onClick={save} colorScheme="green">Save</Button>
        </HStack>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {blocks.map((b: any, idx: number) => {
            const idAttr = b.attributes.find((a: any) => a.name === "data-id")?.value ?? "(no-id)";
            const name = b.name;
            return (
              <li key={idAttr} style={{ marginBottom: 8 }}>
                <div
                  onClick={() => setSelectedId(idAttr)}
                  style={{
                    padding: 8,
                    border: "1px solid",
                    borderColor: selectedId === idAttr ? "#22c55e" : "#e2e8f0",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <span style={{ fontSize: 12, background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>{name}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{idAttr}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {/* Replace with Atlaskit drag handles later */}
                    <button onClick={(e) => { e.stopPropagation(); if (idx>0) reorder(idx, idx-1); }}>↑</button>
                    <button onClick={(e) => { e.stopPropagation(); if (idx<blocks.length-1) reorder(idx, idx+1); }}>↓</button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Box>

      {/* Right: preview + property panel */}
      <Flex flex="1" overflow="hidden">
        <Box flex="1" p={6} overflowY="auto" id={`lesson-edit-${id}`}>
          <ChakraProvider theme={theme} cssVarsRoot={`#${`lesson-edit-${id}`}`}>
            <Box maxW="840px" mx="auto">
              <MDXRemote {...mdxSource} components={components as any} />
            </Box>
          </ChakraProvider>
        </Box>

        <PropertyPanel
          node={selectedNode}
          onChange={mutateSelected}
          overrides={overrides}
          onChangeOverrides={onChangeOverrides}
        />
      </Flex>
    </Flex>
  );
}
