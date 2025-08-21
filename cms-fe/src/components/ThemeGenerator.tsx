"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useThemeToast } from "@/app/themes/page";
import {
  GENERATE_THEME,
  UPDATE_THEME,
  GET_THEMES,
  DELETE_THEME,
  AMEND_THEME,
} from "@/lib/graphql/documents";
import { ThemeTokens } from "@/lib/schemas";
import { z } from "zod";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  TagLabel,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useToast,
  Collapse,
  Badge,
  Divider,
  Spacer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  SimpleGrid,
  useDisclosure,
} from "@chakra-ui/react";
import { 
  DeleteIcon, 
  ChevronDownIcon, 
  CheckIcon, 
  AddIcon, 
  ViewIcon, 
  ChatIcon,
  EditIcon,
  RepeatIcon
} from "@chakra-ui/icons";

type ThemeTokensType = z.infer<typeof ThemeTokens>;

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  content: string | React.ReactNode;
  meta?: {
    action?: string;
    preview?: boolean;
    instruction?: string;
  };
};

interface GeneratedTheme {
  id: string;
  name: string;
  tokens: ThemeTokensType;
  notes: string;
  _preview?: boolean; // when AMEND_THEME dry-run returns a preview
}

type AmendMode = "auto" | "regen" | "patch";

function uid(prefix = "m") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const quickChips = [
  { label: "List themes", text: "/list" },
  { label: "Load last", text: "/load last" },
  { label: "Save as…", text: '/save "New Theme Name"' },
  { label: "Warmer brand colors", text: "make brand colors warmer and richer" },
  { label: "Increase spacing", text: "increase spacing slightly across the scale" },
  { label: "Add purple accent", text: "introduce a subtle purple accent palette" },
];

export default function ThemeGenerator() {
  const toast = useToast();
  const { showSuccess, showError, showInfo } = useThemeToast();

  // === Data state ===
  const [generatedTheme, setGeneratedTheme] = useState<GeneratedTheme | null>(null);
  const [originalTheme, setOriginalTheme] = useState<GeneratedTheme | null>(null); // Store original theme for preview restoration
  const [themeName, setThemeName] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);
  const [lastInstruction, setLastInstruction] = useState<string>("");
  const [amendMode, setAmendMode] = useState<AmendMode>("auto");
  const [previewChoiceMade, setPreviewChoiceMade] = useState<boolean>(false); // Track if preview choice was made

  const {
    data: themesData,
    loading: themesLoading,
    error: themesError,
    refetch: refetchThemes,
  } = useQuery(GET_THEMES, { fetchPolicy: "cache-and-network" });

  const [generateTheme, { loading: generating }] = useMutation(GENERATE_THEME, {
    onCompleted: (data) => {
      const next = data.generateTheme as GeneratedTheme;
      setGeneratedTheme(next);
      setThemeName(next?.name ?? "");
      pushAssistant(`Generated theme **${next?.name || "Untitled"}**. You can /save it or ask for changes (e.g., “make buttons bolder”).`, {
        action: "generate",
      });
      showSuccess("Theme Generated", `Successfully generated theme: ${next?.name || "Untitled"}`);
    },
    onError: (err) => {
      pushAssistant(`Generation failed: ${err.message}`, { action: "error" });
      showError("Generation Failed", err.message);
    },
  });

  const [amendTheme, { loading: amending }] = useMutation(AMEND_THEME, {
    onCompleted: (data) => {
      const next = data.amendTheme as GeneratedTheme;
      
      // If this is a preview, store the original theme for potential restoration
      if (next._preview && generatedTheme && !generatedTheme._preview) {
        setOriginalTheme(generatedTheme);
      }
      
      setGeneratedTheme(next);
      
      if (next._preview) {
        console.log('🔍 [DEBUG] Rendering preview dialog, previewChoiceMade:', previewChoiceMade);
        pushAssistant(
          <Box>
            <Text fontWeight="semibold">Preview ready.</Text>
            <Text fontSize="sm" color="gray.600">
              {previewChoiceMade 
                ? "Choice made. Processing..." 
                : "Review the preview in the right pane. If it looks good, click Accept to apply and save, or Decline to discard."
              }
            </Text>
            <HStack mt={3}>
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<CheckIcon />}
                onClick={() => handleAcceptPreview(lastInstruction)}
                isDisabled={previewChoiceMade}
              >
                {previewChoiceMade ? "Processing..." : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => handleDeclinePreview()}
                isDisabled={previewChoiceMade}
              >
                {previewChoiceMade ? "Processing..." : "Decline"}
              </Button>
            </HStack>
          </Box>,
          { action: "amend-preview", preview: true, instruction: lastInstruction }
        );
      } else {
        pushAssistant("Changes applied and theme updated.", { action: "amend-apply" });
        showSuccess("Theme Updated", "Changes applied and theme updated successfully");
        // refresh list so Load/List reflect the new version
        refetchThemes();
      }
    },
    onError: (err) => {
      pushAssistant(`Amendment failed: ${err.message}`, { action: "error" });
      showError("Amendment Failed", err.message);
    },
  });

  const [updateTheme, { loading: saving }] = useMutation(UPDATE_THEME, {
    onCompleted: () => {
      pushAssistant("Saved. Your theme is now persisted.", { action: "save" });
      showSuccess("Theme Saved", "Your theme has been saved successfully");
      refetchThemes();
    },
    onError: (err) => {
      pushAssistant(`Save failed: ${err.message}`, { action: "error" });
      showError("Save Failed", err.message);
    },
  });

  const [deleteTheme, { loading: deleting }] = useMutation(DELETE_THEME, {
    onCompleted: () => {
      pushAssistant("Theme deleted.", { action: "delete" });
      showSuccess("Theme Deleted", "Theme has been deleted successfully");
      refetchThemes();
    },
    onError: (err) => {
      pushAssistant(`Delete failed: ${err.message}`, { action: "error" });
      showError("Delete Failed", err.message);
    },
  });

  // === Chat state ===
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: "assistant",
      content:
        "Hi! Describe a theme and I’ll generate it, or say what to change if a theme is loaded. Try `/help` for commands.",
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, []);
  useEffect(scrollToBottom, [messages, generating, amending, saving]);

  // === Chat helpers ===
  const pushUser = (content: string) =>
    setMessages((m) => [...m, { id: uid(), role: "user", content }]);
  const pushAssistant = (content: React.ReactNode, meta?: ChatMessage["meta"]) =>
    setMessages((m) => [...m, { id: uid(), role: "assistant", content, meta }]);

  // === Intent parsing ===
  type Intent =
    | { kind: "help" }
    | { kind: "list" }
    | { kind: "load"; key: string }
    | { kind: "delete"; key: string }
    | { kind: "name"; name: string }
    | { kind: "mode"; mode: AmendMode }
    | { kind: "json"; val: boolean }
    | { kind: "save"; name?: string }
    | { kind: "generate"; description: string; name?: string }
    | { kind: "preview"; instruction: string }
    | { kind: "apply" }
    | { kind: "amend-or-generate"; text: string }; // NL fallback

  function unquote(s?: string) {
    if (!s) return s;
    const t = s.trim();
    return t.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }

  function parseIntent(text: string): Intent {
    const raw = text.trim();

    // Slash commands
    if (raw.startsWith("/")) {
      const [cmd, ...rest] = raw.slice(1).split(" ");
      const arg = rest.join(" ").trim();

      switch (cmd.toLowerCase()) {
        case "help":
          return { kind: "help" };
        case "list":
          return { kind: "list" };
        case "load":
          return { kind: "load", key: unquote(arg) || "last" };
        case "delete":
          return { kind: "delete", key: unquote(arg) || "" };
        case "name":
          return { kind: "name", name: unquote(arg) || "" };
        case "mode": {
          const m = arg.toLowerCase() as AmendMode;
          if (m === "auto" || m === "regen" || m === "patch") return { kind: "mode", mode: m };
          return { kind: "mode", mode: "auto" };
        }
        case "json":
          return { kind: "json", val: ["on", "true", "1", "yes"].includes(arg.toLowerCase()) };
        case "save": {
          const name = unquote(arg);
          return { kind: "save", name: name || undefined };
        }
        case "gen":
        case "generate": {
          // allow optional name syntax: generate "Name": description...
          const nameMatch = arg.match(/^"([^"]+)"\s*:\s*(.*)$/);
          if (nameMatch) {
            return { kind: "generate", name: nameMatch[1], description: nameMatch[2] || "" };
          }
          return { kind: "generate", description: arg, name: undefined };
        }
        case "preview":
          return { kind: "preview", instruction: arg };
        case "apply":
          return { kind: "apply" };
        default:
          return { kind: "help" };
      }
    }

    // Natural language defaults
    return { kind: "amend-or-generate", text: raw };
  }

  // === Command handlers ===

  const handleGenerate = async (description: string, forcedName?: string) => {
    if (!description.trim()) {
      pushAssistant("Please describe the theme to generate.");
      return;
    }
    await generateTheme({
      variables: { input: { description: description.trim() } },
    });
    if (forcedName) setThemeName(forcedName);
    setOriginalTheme(null); // Clear any stored original theme when generating new theme
    setPreviewChoiceMade(false); // Reset preview choice flag when generating new theme
  };

  const handlePreview = async (instruction: string) => {
    if (!generatedTheme) {
      pushAssistant("No theme loaded yet. Generate or load one first.");
      return;
    }
    setLastInstruction(instruction);
    
    console.log('🔍 [DEBUG] handlePreview called, resetting previewChoiceMade to false');
    
    // Reset the preview choice flag for new previews
    setPreviewChoiceMade(false);
    
    // Store the current theme as original before applying preview changes
    if (!generatedTheme._preview) {
      setOriginalTheme(generatedTheme);
    }
    
    await amendTheme({
      variables: {
        input: {
          id: generatedTheme.id,
          instruction: instruction.trim(),
          scope: undefined,
          mode: amendMode,
          dryRun: true,
        },
      },
    });
  };

  const handleAcceptPreview = async (instruction?: string) => {
    if (!generatedTheme) {
      pushAssistant("No theme loaded yet.");
      return;
    }
    const toApply = (instruction || lastInstruction || "").trim();
    if (!toApply) {
      pushAssistant("There is no pending preview to apply.");
      return;
    }
    
    // Mark that a choice has been made
    setPreviewChoiceMade(true);
    
    // Apply the preview changes
    await amendTheme({
      variables: {
        input: {
          id: generatedTheme.id,
          instruction: toApply,
          scope: undefined,
          mode: amendMode,
          dryRun: false,
        },
      },
    });
    
    // Clear the preview state and original theme
    setLastInstruction("");
    setOriginalTheme(null); // Clear the stored original theme since we're accepting
    
    // Auto-save the theme if it has a name
    if (themeName.trim()) {
      await handleSave();
      pushAssistant("Preview accepted and theme saved automatically!", { action: "accept-and-save" });
    } else {
      pushAssistant("Preview accepted! Use `/save \"Theme Name\"` to save your changes.", { action: "accept-only" });
    }
  };

  const handleDeclinePreview = () => {
    console.log('🔍 [DEBUG] handleDeclinePreview called, setting previewChoiceMade to true');
    
    // Mark that a choice has been made
    setPreviewChoiceMade(true);
    
    // Clear the preview state
    setLastInstruction("");
    
    // Restore the original theme if we have one stored
    if (originalTheme) {
      setGeneratedTheme(originalTheme);
      setOriginalTheme(null); // Clear the stored original theme
    } else if (generatedTheme?._preview) {
      // Fallback: just remove the preview flag
      setGeneratedTheme(prev => prev ? { ...prev, _preview: false } : prev);
    }
    
    pushAssistant("Preview declined. Changes have been discarded.", { action: "decline-preview" });
  };

  const handleSave = async (name?: string) => {
    if (!generatedTheme) {
      pushAssistant("Nothing to save yet.");
      return;
    }
    const finalName = (name ?? themeName).trim();
    if (!finalName) {
      pushAssistant('Provide a name first. Tip: `/save "My Theme"` or `/name "My Theme"` then `/save`.');
      return;
    }
    const id = generatedTheme.id.startsWith("generated-")
      ? `theme-${Date.now()}`
      : generatedTheme.id;

    await updateTheme({
      variables: {
        input: {
          id,
          name: finalName,
          tokens: generatedTheme.tokens,
          notes: generatedTheme.notes || `Theme: ${finalName}`,
          basedOnThemeId: null,
        },
      },
    });

    setGeneratedTheme((prev) => (prev ? { ...prev, id, name: finalName } : prev));
    setThemeName(finalName);
  };

  const handleList = () => {
    if (themesLoading) {
      pushAssistant(
        <HStack><Spinner size="sm" /><Text>Fetching themes…</Text></HStack>
      );
      return;
    }
    const list = themesData?.themes ?? [];
    if (!list.length) {
      pushAssistant("No saved themes yet. Try `/save \"Name\"` after you generate one.");
      return;
    }
    pushAssistant(
      <Box>
        <Text fontWeight="semibold" mb={2}>Saved themes</Text>
        <VStack align="stretch" spacing={2}>
          {list.map((t: any) => (
            <HStack key={t.id} spacing={3}>
              <Tag size="sm" colorScheme="blue"><TagLabel>{t.name || "Unnamed"}</TagLabel></Tag>
              <Text fontSize="xs" color="gray.500">{t.id}</Text>
              <Spacer />
              <Button size="xs" variant="outline" onClick={() => handleLoad(t.id)}>Load</Button>
              <Button size="xs" variant="ghost" colorScheme="red" onClick={() => confirmDelete(t.id, t.name || t.id)}>
                Delete
              </Button>
            </HStack>
          ))}
        </VStack>
      </Box>,
      { action: "list" }
    );
    showInfo("Themes Listed", `Found ${list.length} saved theme${list.length === 1 ? '' : 's'}`);
  };

  const handleLoad = (key: string) => {
    const all = themesData?.themes ?? [];
    if (!all.length) {
      pushAssistant("You have no saved themes to load.");
      return;
    }
    let selected =
      (key === "last" ? all[all.length - 1] : undefined) ||
      all.find((t: any) => t.id === key) ||
      all.find((t: any) => (t.name || "").toLowerCase() === key.toLowerCase());

    if (!selected && key !== "last") {
      // fuzzy try: partial id
      selected = all.find((t: any) => t.id.includes(key));
    }

    if (!selected) {
      pushAssistant(`Couldn’t find a theme matching “${key}”. Use /list to see all.`);
      return;
    }

    const next: GeneratedTheme = {
      id: selected.id,
      name: selected.name || "",
      tokens: selected.tokens,
      notes: selected.notes || "",
    };
    setGeneratedTheme(next);
    setThemeName(next.name || "");
    setShowRaw(false);
    setLastInstruction("");
    setOriginalTheme(null); // Clear any stored original theme when loading new theme
    setPreviewChoiceMade(false); // Reset preview choice flag when loading new theme
    pushAssistant(
      <>
        Loaded <strong>{next.name || next.id}</strong>.  
        Suggest a change or try <Kbd>/preview</Kbd> or <Kbd>/apply</Kbd>.
      </>,
      { action: "load" }
    );
    showSuccess("Theme Loaded", `Successfully loaded theme: ${next.name || next.id}`);
  };

  const confirmDelete = (key: string, humanName: string) => {
    pushAssistant(
      <Box>
        <Text>Delete <strong>{humanName}</strong>?</Text>
        <HStack mt={2}>
          <Button
            size="sm"
            colorScheme="red"
            leftIcon={<DeleteIcon />}
            isLoading={deleting}
            onClick={async () => {
              await deleteTheme({ variables: { id: key } });
            }}
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost">Cancel</Button>
        </HStack>
      </Box>,
      { action: "confirm-delete" }
    );
  };

  const handleDeleteByKey = (key: string) => {
    const all = themesData?.themes ?? [];
    if (!all.length) {
      pushAssistant("No saved themes.");
      return;
    }
    const target =
      all.find((t: any) => t.id === key) ||
      all.find((t: any) => (t.name || "").toLowerCase() === key.toLowerCase()) ||
      all.find((t: any) => t.id.includes(key));

    if (!target) {
      pushAssistant(`Couldn’t find a theme matching “${key}”. Use /list to see all.`);
      return;
    }
    confirmDelete(target.id, target.name || target.id);
  };

  // === Incoming user submission ===
  const onSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    setInput("");
    pushUser(text);

    const intent = parseIntent(text);

    switch (intent.kind) {
      case "help":
        pushAssistant(
          <Box>
            <Text fontWeight="semibold">Commands</Text>
            <VStack align="stretch" spacing={1} mt={2} fontSize="sm">
              <Text><Kbd>/generate</Kbd> or <Kbd>/gen</Kbd> <em>description</em></Text>
              <Text><Kbd>/preview</Kbd> <em>instruction</em> — dry‑run amendment</Text>
              <Text><Kbd>/apply</Kbd> — apply last preview</Text>
              <Text><Kbd>/save</Kbd> <em>"Name"</em> — or <Kbd>/save</Kbd> to reuse name</Text>
              <Text><Kbd>/name</Kbd> <em>"New Name"</em></Text>
              <Text><Kbd>/mode</Kbd> <em>auto</em>|<em>regen</em>|<em>patch</em></Text>
              <Text><Kbd>/list</Kbd>, <Kbd>/load</Kbd> <em>"Name"</em>|<em>id</em>|<em>last</em>, <Kbd>/delete</Kbd> <em>…</em></Text>
              <Text><Kbd>/json</Kbd> on|off</Text>
            </VStack>
          </Box>,
          { action: "help" }
        );
        break;

      case "list":
        handleList();
        break;

      case "load":
        handleLoad(intent.key);
        break;

      case "delete":
        handleDeleteByKey(intent.key);
        break;

      case "name":
        if (!intent.name) {
          pushAssistant("Provide a name in quotes, e.g., /name \"Oceanic Blue\".");
        } else {
          setThemeName(intent.name);
          pushAssistant(`Okay, I’ll use **${intent.name}** as the theme name.`);
        }
        break;

      case "mode":
        setAmendMode(intent.mode);
        pushAssistant(`Amend mode set to **${intent.mode}**.`);
        break;

      case "json":
        setShowRaw(intent.val);
        pushAssistant(`Raw JSON ${intent.val ? "enabled" : "hidden"}.`);
        break;

      case "save":
        await handleSave(intent.name);
        break;

      case "generate":
        await handleGenerate(intent.description, intent.name);
        break;

      case "preview":
        await handlePreview(intent.instruction);
        break;

      case "apply":
        await handleAcceptPreview();
        break;

      case "amend-or-generate": {
        if (generatedTheme) {
          await handlePreview(intent.text);
        } else {
          await handleGenerate(intent.text);
        }
        break;
      }
    }
  };

  // === UI ===
  const leftBusy = generating || amending || saving || deleting;

  return (
    <Box display="flex" flexDir="column" h="100%" overflow="hidden" position="relative">
      <Grid templateColumns={{ base: "1fr", lg: "380px 1fr" }} h="100%" overflow="hidden" minH="0">
        {/* LEFT: conversational sidebar */}
        <GridItem
          bg="neutral.50"
          borderRight={{ lg: "1px solid" }}
          borderColor="neutral.200"
          display="flex"
          flexDir="column"
          h="100%"
          minH="0"
        >
        <Flex px={4} py={3} align="center" gap={2} borderBottom="1px solid" borderColor="neutral.200">
          <ChatIcon />
          <Text fontWeight="semibold">Theme Chat</Text>
          <Spacer />
          {leftBusy && (
            <HStack spacing={2} color="neutral.600">
              <Spinner size="sm" />
              <Text fontSize="sm">Working…</Text>
            </HStack>
          )}
        </Flex>

        {/* Quick chips */}
        <HStack px={3} pt={3} pb={2} wrap="wrap" spacing={2}>
          {quickChips.map((c) => (
            <Tag
              key={c.label}
              size="sm"
              py={1}
              variant="subtle"
              colorScheme="blue"
              _hover={{ cursor: "pointer", bg: "blue.100" }}
              onClick={() => setInput(c.text)}
            >
              <TagLabel>{c.label}</TagLabel>
            </Tag>
          ))}
        </HStack>

        {/* Messages */}
        <Box ref={listRef} flex="1" overflowY="auto" px={3} py={3}>
          <VStack align="stretch" spacing={3}>
            {messages.map((m) => (
              <ChatBubble key={m.id} role={m.role}>
                {m.content}
              </ChatBubble>
            ))}
          </VStack>
        </Box>

        {/* Composer */}
        <Box borderTop="1px solid" borderColor="neutral.200" p={3}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              generatedTheme
                ? "Describe an adjustment (or try /preview …, /apply, /save \"Name\")"
                : "Describe a theme to generate (or /gen …)"
            }
            size="sm"
            rows={3}
            isDisabled={leftBusy}
          />
          <HStack justify="space-between" mt={2}>
            <Text fontSize="xs" color="neutral.600">
              Tip: <Kbd>/help</Kbd> for commands
            </Text>
            <Button
              size="sm"
              colorScheme="blue"
              rightIcon={<ChatIcon />}
              onClick={onSubmit}
              isDisabled={!input.trim() || leftBusy}
            >
              Send
            </Button>
          </HStack>
        </Box>
      </GridItem>

        {/* RIGHT: live preview */}
        <GridItem h="100%" overflow="hidden" display="flex" flexDir="column" minH="0">
        <Box flex="1" overflowY="auto" p={6}>
          <PreviewHeader
            themeName={themeName}
            setThemeName={setThemeName}
            onSave={() => handleSave()}
            saving={saving}
            generatedTheme={generatedTheme}
            amendMode={amendMode}
            setAmendMode={setAmendMode}
            onList={handleList}
          />

          <Divider my={4} />

          {!generatedTheme && (
            <EmptyState />
          )}

          {generatedTheme && (
            <VStack spacing={8} align="stretch">
              <Box>
                <Text fontSize="sm" color="gray.600">{generatedTheme.notes}</Text>
              </Box>

              {/* Color Palette */}
              <Box>
                <SectionTitle>Color Palette</SectionTitle>
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  <ColorScale title="Brand Colors" scale={generatedTheme.tokens?.colors?.brand} />
                  {generatedTheme.tokens?.colors?.accent && (
                    <ColorScale title="Accent Colors" scale={generatedTheme.tokens.colors.accent} />
                  )}
                </SimpleGrid>

                {generatedTheme.tokens?.colors?.neutral && (
                  <Box mt={6}>
                    <SubTitle>Neutral Colors</SubTitle>
                    <SwatchGrid scale={generatedTheme.tokens.colors.neutral} columns={5} size="md" />
                  </Box>
                )}

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={6}>
                  {generatedTheme.tokens?.colors?.success && (
                    <SemanticScale title="Success" scale={generatedTheme.tokens.colors.success} />
                  )}
                  {generatedTheme.tokens?.colors?.warning && (
                    <SemanticScale title="Warning" scale={generatedTheme.tokens.colors.warning} />
                  )}
                  {generatedTheme.tokens?.colors?.error && (
                    <SemanticScale title="Error" scale={generatedTheme.tokens.colors.error} />
                  )}
                </SimpleGrid>
              </Box>

              {/* Typography */}
              {generatedTheme.tokens?.fonts && (
                <Box>
                  <SectionTitle>Typography</SectionTitle>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <Box>
                      <SubTitle>Fonts</SubTitle>
                      <VStack spacing={2} align="stretch">
                        {Object.entries(generatedTheme.tokens.fonts).map(([k, v]) => (
                          <KV key={k} k={k} v={String(v)} />
                        ))}
                      </VStack>
                    </Box>
                    <Box>
                      <SubTitle>Font Sizes</SubTitle>
                      <VStack spacing={2} align="stretch">
                        {generatedTheme.tokens?.fontSizes &&
                          Object.entries(generatedTheme.tokens.fontSizes)
                            .slice(0, 6)
                            .map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
              )}

              {/* Spacing & Layout */}
              <Box>
                <SectionTitle>Spacing & Layout</SectionTitle>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  {generatedTheme.tokens?.spacing && (
                    <ScaleList title="Spacing Scale" scale={generatedTheme.tokens.spacing} />
                  )}
                  {generatedTheme.tokens?.radii && (
                    <ScaleList title="Border Radius" scale={generatedTheme.tokens.radii} />
                  )}
                  {generatedTheme.tokens?.breakpoints && (
                    <ScaleList title="Breakpoints" scale={generatedTheme.tokens.breakpoints} />
                  )}
                </SimpleGrid>
              </Box>

              {/* Effects */}
              {(generatedTheme.tokens?.shadows || generatedTheme.tokens?.gradients) && (
                <Box>
                  <SectionTitle>Effects &amp; Animations</SectionTitle>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    {generatedTheme.tokens?.shadows && (
                      <Box>
                        <SubTitle>Shadows</SubTitle>
                        <VStack align="stretch" spacing={3}>
                          {Object.entries(generatedTheme.tokens.shadows)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <Box key={k} p={3} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" textTransform="capitalize">{k}</Text>
                                <Text fontSize="xs" color="gray.600" fontFamily="mono">{String(v)}</Text>
                              </Box>
                            ))}
                        </VStack>
                      </Box>
                    )}
                    {generatedTheme.tokens?.gradients && (
                      <Box>
                        <SubTitle>Gradients</SubTitle>
                        <VStack align="stretch" spacing={3}>
                          {Object.entries(generatedTheme.tokens.gradients).map(([k, v]) => (
                            <Box key={k} p={3} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md">
                              <Text fontSize="sm" fontWeight="medium" textTransform="capitalize">{k}</Text>
                              <Text fontSize="xs" color="gray.600" fontFamily="mono">{String(v)}</Text>
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </SimpleGrid>
                </Box>
              )}

              {/* Raw JSON toggle (driven from chat /json) */}
              <Box>
                <Collapse in={showRaw} animateOpacity>
                  <Box mt={2} p={4} bg="gray.50" borderRadius="md" overflow="auto" border="1px solid" borderColor="gray.200">
                    <Text as="pre" fontSize="xs" fontFamily="mono" whiteSpace="pre-wrap">
                      {JSON.stringify(generatedTheme, null, 2)}
                    </Text>
                  </Box>
                </Collapse>
              </Box>
            </VStack>
          )}
        </Box>
      </GridItem>
      </Grid>
    </Box>
  );
}

/** ---------- Small UI pieces ---------- */

function ChatBubble({ role, children }: { role: Role; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"}>
      <Box
        maxW="85%"
        bg={isUser ? "brand.600" : "white"}
        color={isUser ? "white" : "neutral.800"}
        border="1px solid"
        borderColor={isUser ? "brand.700" : "neutral.200"}
        px={3}
        py={2}
        borderRadius="lg"
        shadow="sm"
      >
        <Box fontSize="sm">{children}</Box>
      </Box>
    </Flex>
  );
}

function EmptyState() {
  return (
    <Box
      border="1px dashed"
      borderColor="neutral.300"
      bg="neutral.50"
      borderRadius="md"
      p={8}
      textAlign="center"
    >
      <VStack spacing={3}>
        <AddIcon boxSize={6} color="brand.600" />
        <Text fontWeight="semibold">Start by describing a theme</Text>
        <Text fontSize="sm" color="neutral.600">
          Type in the chat: <Kbd>/gen</Kbd> <em>dark minimal theme with blue accents</em>
        </Text>
      </VStack>
    </Box>
  );
}

function PreviewHeader({
  themeName,
  setThemeName,
  onSave,
  saving,
  generatedTheme,
  amendMode,
  setAmendMode,
  onList,
}: {
  themeName: string;
  setThemeName: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  generatedTheme: GeneratedTheme | null;
  amendMode: AmendMode;
  setAmendMode: (m: AmendMode) => void;
  onList: () => void;
}) {
  return (
    <HStack>
      <Text fontWeight="bold" fontSize="lg">Theme Preview</Text>
      <Spacer />
      <HStack spacing={3}>
        <Tooltip label="Amendment strategy">
          <Menu>
            <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />} variant="ghost">
              Mode: {amendMode}
            </MenuButton>
            <MenuList>
              {(["auto", "regen", "patch"] as AmendMode[]).map((m) => (
                <MenuItem key={m} onClick={() => setAmendMode(m)}>
                  {m}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Tooltip>

        <Tooltip label="Saved themes">
          <Button leftIcon={<ViewIcon />} size="sm" variant="outline" onClick={onList}>
            List
          </Button>
        </Tooltip>

        <Input
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          size="sm"
          placeholder="Theme name…"
          maxW="320px"
          isDisabled={!generatedTheme}
        />
        <Button
          size="sm"
          colorScheme="green"
          onClick={onSave}
          isDisabled={!generatedTheme || !themeName.trim()}
          isLoading={saving}
          leftIcon={<CheckIcon />}
        >
          Save
        </Button>
      </HStack>
    </HStack>
  );
}

/** --- Preview helpers --- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text as="h3" fontSize="xl" fontWeight="bold" color="gray.800" mb={3}>{children}</Text>;
}
function SubTitle({ children }: { children: React.ReactNode }) {
  return <Text as="h4" fontSize="md" fontWeight="semibold" color="gray.700" mb={2}>{children}</Text>;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <Flex justify="space-between">
      <Text fontWeight="medium" textTransform="capitalize">{k}:</Text>
      <Text color="gray.600" fontFamily="mono" fontSize="sm">{v}</Text>
    </Flex>
  );
}

function ColorScale({ title, scale }: { title: string; scale?: Record<string, string> }) {
  if (!scale) return null;
  return (
    <Box>
      <SubTitle>{title}</SubTitle>
      <SwatchGrid scale={scale} columns={5} size="lg" />
    </Box>
  );
}
function SemanticScale({ title, scale }: { title: string; scale?: Record<string, string> }) {
  if (!scale) return null;
  return (
    <Box>
      <SubTitle>{title}</SubTitle>
      <SwatchGrid scale={scale} columns={3} size="sm" limit={3} />
    </Box>
  );
}
function SwatchGrid({
  scale,
  columns = 5,
  size = "md",
  limit,
}: {
  scale: Record<string, string>;
  columns?: number;
  size?: "sm" | "md" | "lg";
  limit?: number;
}) {
  const sizes = { sm: 8, md: 12, lg: 12 };
  const entries = Object.entries(scale).slice(0, limit ?? 100);
  return (
    <SimpleGrid columns={columns} gap={2}>
      {entries.map(([shade, color]) => (
        <VStack key={shade} spacing={1}>
          <Box
            w={`${sizes[size]}`}
            h={`${sizes[size]}`}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.300"
            bg={String(color)}
            shadow="sm"
          />
          <Text fontSize="xs" color="gray.600">{shade}</Text>
        </VStack>
      ))}
    </SimpleGrid>
  );
}
function ScaleList({ title, scale }: { title: string; scale?: Record<string, string | number> }) {
  if (!scale) return null;
  return (
    <Box>
      <SubTitle>{title}</SubTitle>
      <VStack spacing={2} align="stretch">
        {Object.entries(scale).map(([k, v]) => (
          <KV key={k} k={k} v={String(v)} />
        ))}
      </VStack>
    </Box>
  );
}
