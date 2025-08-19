"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChakraProvider, Box, Flex, Button, Heading, List, ListItem,
  HStack, Spacer, useToast
} from "@chakra-ui/react";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { createRegistry } from "@/components/mdx-components";
import { getTopLevelBlocks, findNodeById, MdxJsxNode, moveTopLevel } from "@/lib/mdx/ast";
import { stringifyAst } from "@/lib/mdx/serialize";
import { createChakraThemeFromTokens } from "@/lib/theme/createtheme";
import { MDXRemoteSerializeResult, MDXRemote } from "next-mdx-remote";
import { PropertyPanel } from "@/components/PropertyPanel";


type Props = {
  id: string;
  mdx: string;
  tokens: any;
  overrides: Record<string, { css: any }>;
  mdxSourceInitial: MDXRemoteSerializeResult;
};

export default function EditorClient({ id, mdx: mdxInitial, tokens, overrides: overridesInitial, mdxSourceInitial }: Props) {
  const [mdx, setMdx] = useState(mdxInitial);
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult>(mdxSourceInitial);
  const [overrides, setOverrides] = useState<Record<string, { css: any }>>(overridesInitial ?? {});
  const toast = useToast();

  // Parse to AST in the client for DnD & prop editing
  const { tree, blocks } = useMemo(() => {
    const parse = require("unified").unified().use(remarkParse).use(remarkMdx);
    const t = parse.parse(mdx);
    return { tree: t, blocks: getTopLevelBlocks(t) };
  }, [mdx]);

  const [selectedId, setSelectedId] = useState<string | null>(
    blocks[0] ? (blocks[0].attributes.find((a:any)=>a.name==="data-id")?.value ?? null) : null
  );
  const selectedNode = selectedId ? (findNodeById(tree, selectedId) as MdxJsxNode | null) : null;

  // Debounced server compile for live preview
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/mdx/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mdx }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok) setMdxSource(json.mdxSource);
      } catch {
        /* ignore typing interruptions */
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [mdx]);

  async function reorder(from: number, to: number) {
    moveTopLevel(tree, from, to);
    setMdx(await stringifyAst(tree));
  }

  async function mutateSelected(mut: (n: MdxJsxNode) => void) {
    if (!selectedNode) return;
    mut(selectedNode);
    const next = await stringifyAst(tree);
    setMdx(next);
  }

  function onChangeOverrides(id: string | null, raw: string) {
    if (!id) return;
    try {
      const parsed = JSON.parse(raw);
      setOverrides(prev => ({ ...prev, [id]: { css: parsed } }));
    } catch {
      // keep typing; JSON might be incomplete
    }
  }

  async function save() {
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mdx, overrides })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMdx(json.mdx);
      setOverrides(json.overrides ?? {});
      toast({ title: "Saved", status: "success" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, status: "error", duration: 6000 });
    }
  }

  const theme = createChakraThemeFromTokens(tokens);
  const components = createRegistry({ overrides });

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Left: block list (swap to Atlaskit DnD when ready) */}
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
