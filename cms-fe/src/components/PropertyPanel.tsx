"use client";

import React, { useMemo } from "react";
import { Box, Heading, Select, Input, Textarea, FormControl, FormLabel } from "@chakra-ui/react";
import { MdxJsxNode, getAttr, setAttr } from "../lib/mdx/ast";

type PanelProps = {
  node: MdxJsxNode | null;
  onChange: (mutate: (node: MdxJsxNode) => void) => void;
  overrides: Record<string, { css: any }> | undefined;
  onChangeOverrides: (id: string, raw: string) => void;
};

export function PropertyPanel({ node, onChange, overrides, onChangeOverrides }: PanelProps) {
  if (!node) return <Box p={4} color="gray.500">Select a block to edit its properties.</Box>;
  const id = getAttr(node, "data-id");
  const name = node.name;

  const currentText = useMemo(() => {
    const child = (node.children || []).find((c: any) => c.type === "text");
    return child?.value ?? "";
  }, [node]);

  const currentOverrides = JSON.stringify(overrides?.[id ?? ""]?.css ?? {}, null, 2);

  return (
    <Box p={4} borderLeft="1px solid" borderColor="gray.200" minW="320px" maxW="380px">
      <Heading size="sm" mb={3}>Properties ({name})</Heading>

      {name === "Heading" && (
        <>
          <FormControl mb={3}>
            <FormLabel>Variant</FormLabel>
            <Select
              value={getAttr(node, "variant") || "section"}
              onChange={(e) => onChange(n => setAttr(n, "variant", e.target.value))}
            >
              <option value="lessonTitle">lessonTitle</option>
              <option value="section">section</option>
            </Select>
          </FormControl>
          <FormControl mb={3}>
            <FormLabel>Text</FormLabel>
            <Input
              value={currentText}
              onChange={(e) => onChange(n => { n.children = [{ type: "text", value: e.target.value }]; })}
            />
          </FormControl>
        </>
      )}

      {name === "Text" && (
        <FormControl mb={3}>
          <FormLabel>Text</FormLabel>
          <Textarea
            rows={4}
            value={currentText}
            onChange={(e) => onChange(n => { n.children = [{ type: "text", value: e.target.value }]; })}
          />
        </FormControl>
      )}

      {name === "Callout" && (
        <>
          <FormControl mb={3}>
            <FormLabel>Variant</FormLabel>
            <Select
              value={getAttr(node, "variant") || "info"}
              onChange={(e) => onChange(n => setAttr(n, "variant", e.target.value))}
            >
              <option value="info">info</option>
              <option value="success">success</option>
              <option value="warning">warning</option>
              <option value="danger">danger</option>
            </Select>
          </FormControl>
          <FormControl mb={3}>
            <FormLabel>Text</FormLabel>
            <Textarea
              rows={3}
              value={currentText}
              onChange={(e) => onChange(n => { n.children = [{ type: "text", value: e.target.value }]; })}
            />
          </FormControl>
        </>
      )}

      {name === "Img" && (
        <>
          <FormControl mb={3}>
            <FormLabel>Src</FormLabel>
            <Input
              value={getAttr(node, "src") || ""}
              onChange={(e) => onChange(n => setAttr(n, "src", e.target.value))}
            />
          </FormControl>
          <FormControl mb={3}>
            <FormLabel>Alt</FormLabel>
            <Input
              value={getAttr(node, "alt") || ""}
              onChange={(e) => onChange(n => setAttr(n, "alt", e.target.value))}
            />
          </FormControl>
        </>
      )}

      <FormControl>
        <FormLabel>Advanced overrides (CSS JSON)</FormLabel>
        <Textarea
          rows={8}
          value={currentOverrides}
          onChange={(e) => onChangeOverrides(id, e.target.value)}
          placeholder={`{ "borderRadius": "{radii.md}" }`}
        />
      </FormControl>
    </Box>
  );
}
