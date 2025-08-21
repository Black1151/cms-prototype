"use client"

import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { GENERATE_THEME, UPDATE_THEME, GET_THEMES, DELETE_THEME, AMEND_THEME } from '@/lib/graphql/documents';
import { ThemeTokens } from '@/lib/schemas';
import { z } from 'zod';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Textarea,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Badge,
  Divider,
  useToast,
  Flex,
  Grid as ChakraGrid,
  GridItem as ChakraGridItem,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  Tr,
  Td,
  Table,
  Thead,
  Th,
  Tbody,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';


type ThemeTokensType = z.infer<typeof ThemeTokens>;

interface GeneratedTheme {
  id: string;
  name: string;
  tokens: ThemeTokensType;
  notes: string;
}

export default function ThemeGenerator() {
  const [description, setDescription] = useState('');
  const [generatedTheme, setGeneratedTheme] = useState<GeneratedTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [themeName, setThemeName] = useState<string>('');
  const [themeToDelete, setThemeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [amendmentScope, setAmendmentScope] = useState<Array<'notifications' | 'spacing' | 'radii' | 'brandColors' | 'accentColors' | 'typography' | 'layout' | 'shadows' | 'borders' | 'animations'>>([]);
  const [amendmentMode, setAmendmentMode] = useState<'auto' | 'regen' | 'patch'>('auto');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const toast = useToast();

  // Query to get all saved themes
  const { data: themesData, loading: themesLoading, refetch: refetchThemes, error: themesError } = useQuery(GET_THEMES);

  const [generateTheme, { loading }] = useMutation(GENERATE_THEME, {
    onCompleted: (data) => {
      setGeneratedTheme(data.generateTheme);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setGeneratedTheme(null);
    },
  });

  const [updateTheme, { loading: saving }] = useMutation(UPDATE_THEME, {
    onCompleted: () => {
      toast({
        title: 'Theme Saved Successfully!',
        description: `Theme "${themeName.trim()}" has been saved to the database.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Refetch themes after saving
      refetchThemes();
    },
    onError: (err) => {
      toast({
        title: 'Save Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const [deleteTheme, { loading: deleting }] = useMutation(DELETE_THEME, {
    onCompleted: () => {
      toast({
        title: 'Theme Deleted Successfully!',
        description: `Theme "${themeToDelete?.name}" has been deleted.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Refetch themes after deleting
      refetchThemes();
      // Close modal and reset state
      onDeleteModalClose();
      setThemeToDelete(null);
    },
    onError: (err) => {
      toast({
        title: 'Delete Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const [amendTheme, { loading: amending }] = useMutation(AMEND_THEME, {
    onCompleted: (data) => {
      if (data.amendTheme._preview) {
        // This is a preview - show the diff
        setGeneratedTheme(data.amendTheme);
        setIsPreviewMode(true);
        toast({
          title: 'Preview Generated!',
          description: 'Review the changes below. Click "Apply Changes" to save them.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // This is the actual amendment
        setGeneratedTheme(data.amendTheme);
        setIsPreviewMode(false);
        setAmendmentInstruction('');
        toast({
          title: 'Theme Amended Successfully!',
          description: 'Your theme has been updated with the new changes.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        // Refetch themes to show updated version
        refetchThemes();
      }
    },
    onError: (err) => {
      toast({
        title: 'Amendment Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleLoadTheme = () => {
    if (!selectedThemeId) return;
    
    const selectedTheme = themesData?.themes?.find((t: { id: string; name: string; tokens: ThemeTokensType; notes?: string }) => t.id === selectedThemeId);
    if (selectedTheme) {
      setGeneratedTheme({
        id: selectedTheme.id,
        name: selectedTheme.name,
        tokens: selectedTheme.tokens,
        notes: selectedTheme.notes || ''
      });
      // Set the theme name in the input field but keep description for reference
      setThemeName(selectedTheme.name || '');
      // Don't clear description - keep it for reference when switching themes
      // Don't reset saved theme ID - allow seamless theme switching
      setSelectedThemeId('');
      
      // Reset amendment state when loading a new theme
      setAmendmentInstruction('');
      setAmendmentMode('auto');
      setIsPreviewMode(false);
      
      toast({
        title: 'Theme Loaded!',
        description: `Theme "${selectedTheme.name}" has been loaded.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter a theme description');
      return;
    }

    // Reset saved state when generating new theme
    
    // Auto-suggest a theme name based on description
    const suggestedName = description.trim().length > 30 
      ? `${description.trim().substring(0, 30)}...`
      : description.trim();
    setThemeName(suggestedName);
    
    // Reset amendment state when generating new theme
    setAmendmentInstruction('');
    setAmendmentMode('auto');
    setIsPreviewMode(false);

    try {
      await generateTheme({
        variables: { 
          input: { description: description.trim() } 
        }
      });
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleSave = async () => {
    if (!generatedTheme) return;
    
    // Validate theme name
    if (!themeName.trim()) {
      toast({
        title: 'Theme Name Required',
        description: 'Please enter a name for your theme before saving.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    try {
      // Generate a proper theme ID if it's a temporary one
      const themeId = generatedTheme.id.startsWith('generated-') 
        ? `theme-${Date.now()}` 
        : generatedTheme.id;
      
      await updateTheme({
        variables: {
          input: {
            id: themeId,
            name: themeName.trim(),
            tokens: generatedTheme.tokens,
            notes: generatedTheme.notes || `Theme: ${themeName.trim()}`,
            basedOnThemeId: null
          }
        }
      });

      // Update the local state with the saved theme
      setGeneratedTheme(prev => prev ? { ...prev, id: themeId, name: themeName.trim() } : null);
      
    } catch {
      // Error is handled by onError callback in the mutation
    }
  };

  const handleDeleteTheme = (theme: { id: string; name: string }) => {
    setThemeToDelete(theme);
    onDeleteModalOpen();
  };

  const confirmDelete = async () => {
    if (!themeToDelete) return;
    
    try {
      await deleteTheme({
        variables: { id: themeToDelete.id }
      });
    } catch {
      // Error is handled by onError callback in the mutation
    }
  };

  const handlePreviewAmendment = async () => {
    if (!generatedTheme || !amendmentInstruction.trim()) return;
    
    try {
      await amendTheme({
        variables: {
          input: {
            id: generatedTheme.id,
            instruction: amendmentInstruction.trim(),
            scope: undefined, // Let AI auto-detect
            mode: amendmentMode,
            dryRun: true
          }
        }
      });
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleApplyAmendment = async () => {
    if (!generatedTheme || !amendmentInstruction.trim()) return;
    
    try {
      await amendTheme({
        variables: {
          input: {
            id: generatedTheme.id,
            instruction: amendmentInstruction.trim(),
            scope: undefined, // Let AI auto-detect
            mode: amendmentMode,
            dryRun: false
          }
        }
      });
    } catch {
      // Error is handled by onError callback
    }
  };

  return (
    <Container maxW="4xl" p={6}>
      <VStack spacing={6} align="stretch">
        <Heading as="h2" size="xl" mb={6}>
          AI Theme Generator
        </Heading>
        
        {/* Status Bar */}
        {/* Removed the "Theme Loaded" status bar box */}

        {/* Theme Loader */}
        <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
          <HStack justify="space-between" align="center" mb={3}>
            <Heading as="h3" size="md" color="blue.800">
              Saved Themes
            </Heading>
            {themesData?.themes && (
              <Badge colorScheme="blue" variant="subtle">
                {themesData.themes.length} theme{themesData.themes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </HStack>
          
          {/* Status Messages */}
          {themesLoading && (
            <Text fontSize="sm" color="blue.600" mt={2}>
              Loading themes...
            </Text>
          )}
          {themesError && (
            <Text fontSize="sm" color="red.600" mt={2}>
              Error loading themes: {themesError.message}
            </Text>
          )}
          {themesData?.themes?.length === 0 && !themesLoading && !themesError && (
            <Text fontSize="sm" color="blue.600" mt={2}>
              No saved themes found. Generate and save a theme first!
            </Text>
          )}
          
          {/* Theme Table */}
          {themesData?.themes && themesData.themes.length > 0 && (
            <Box mt={4}>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Theme Name</Th>
                    <Th>ID</Th>
                    <Th>Notes</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {themesData.themes.map((theme: { id: string; name?: string; notes?: string }) => (
                    <Tr key={theme.id}>
                      <Td fontWeight="medium">{theme.name || 'Unnamed Theme'}</Td>
                      <Td fontFamily="mono" fontSize="xs">{theme.id}</Td>
                      <Td fontSize="sm" color="gray.600" maxW="200px" isTruncated>
                        {theme.notes || 'No notes'}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={() => {
                              setSelectedThemeId(theme.id);
                              handleLoadTheme();
                            }}
                          >
                            Load
                          </Button>
                          <IconButton
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            aria-label={`Delete theme ${theme.name || theme.id}`}
                            icon={<DeleteIcon />}
                            onClick={() => handleDeleteTheme({ id: theme.id, name: theme.name || theme.id })}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
        
        <Divider />
        
        {/* Create New Theme Section */}
        <Box>
          <Heading as="h3" size="lg" mb={4} color="gray.800">
            Create New Theme
          </Heading>

          <VStack spacing={4} align="stretch">

          <FormControl isRequired>
              <FormLabel htmlFor="theme-name" fontSize="sm" fontWeight="medium" mb={2}>
                Theme Name *
              </FormLabel>
              <Textarea
                id="theme-name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Enter a descriptive name for your theme..."
                size="md"
                rows={1}
                isInvalid={!themeName.trim()}
              />
              {!themeName.trim() && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  Theme name is required
                </Text>
              )}
            </FormControl>
          
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel htmlFor="description" fontSize="sm" fontWeight="medium" mb={2}>
                Generate theme with Cortex AI
              </FormLabel>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., high contrast red and blue theme, modern dark theme with purple accents, minimalist light theme..."
                size="md"
                rows={3}
              />
            </FormControl>
            </VStack>



            <HStack spacing={3} pt={2}>
              <Button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                colorScheme="blue"
                size="md"
                isLoading={loading}
                loadingText="Generating..."
              >
                Generate Theme
              </Button>
              {generatedTheme && (
                <Button
                  onClick={handleSave}
                  disabled={saving || !themeName.trim()}
                  colorScheme="green"
                  size="md"
                  isLoading={saving}
                  loadingText="Saving..."
                  title={!themeName.trim() ? "Please enter a theme name first" : ""}
                >
                  Save Theme
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generated Theme Display */}
        {generatedTheme && (
          <VStack spacing={6} align="stretch">
            {/* Theme Amendment Section */}
            <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
              <Heading as="h4" size="md" mb={4} color="green.800">
                🎨 Amend Theme
              </Heading>
              <Text fontSize="sm" color="green.700" mb={4}>
                Make follow-up adjustments to your theme without regenerating everything.
              </Text>
              
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">
                    Amendment Instruction
                  </FormLabel>
                  <Textarea
                    value={amendmentInstruction}
                    onChange={(e) => setAmendmentInstruction(e.target.value)}
                    placeholder="e.g., 'deeper colors for notifications', 'increase spacing slightly', 'make brand colors warmer'..."
                    size="md"
                    rows={2}
                  />
                </FormControl>

                {/* Show detected sections */}
                {amendmentInstruction.trim() && (
                  <Box p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                    <Text fontSize="sm" color="blue.700" fontWeight="medium">
                      🔍 Detected sections to modify:
                    </Text>
                    <Text fontSize="sm" color="blue.600" mt={1}>
                      {amendmentInstruction.trim().length > 0 ? 'Analyzing your instruction...' : 'Enter an instruction to see detected sections'}
                    </Text>
                  </Box>
                )}

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">
                    Approach (optional)
                  </FormLabel>
                  <Select
                    value={amendmentMode}
                    onChange={(e) => setAmendmentMode(e.target.value as any)}
                    size="sm"
                  >
                    <option value="auto">Auto-detect (recommended)</option>
                    <option value="regen">Regenerate specific area</option>
                    <option value="patch">Modify existing theme</option>
                  </Select>
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    We'll automatically detect which parts of your theme need to be changed based on your instruction.
                  </Text>
                </FormControl>

                <HStack spacing={3}>
                  <Button
                    onClick={handlePreviewAmendment}
                    disabled={!amendmentInstruction.trim() || amending}
                    colorScheme="blue"
                    size="md"
                    isLoading={amending}
                    loadingText="Previewing..."
                    variant="outline"
                  >
                    Preview Changes
                  </Button>
                  
                  {isPreviewMode && (
                    <Button
                      onClick={handleApplyAmendment}
                      disabled={!amendmentInstruction.trim() || amending}
                      colorScheme="green"
                      size="md"
                      isLoading={amending}
                      loadingText="Applying..."
                    >
                      Apply Changes
                    </Button>
                  )}
                </HStack>

                {isPreviewMode && (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Preview Mode</AlertTitle>
                      <AlertDescription>
                        This is a preview of your changes. Click "Apply Changes" to save them permanently.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </Box>

            <Box>
              <Heading as="h3" size="lg" mb={4} color="gray.800">
                Theme Preview: {generatedTheme.name}
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={4}>
                {generatedTheme.notes}
              </Text>
            </Box>

            <VStack spacing={8} align="stretch">
              {/* Colors Section */}
              <Box>
                <Heading as="h4" size="lg" mb={4} color="gray.800">
                  Color Palette
                </Heading>
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  {/* Brand Colors */}
                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Brand Colors
                    </Heading>
                    <ChakraGrid templateColumns="repeat(5, 1fr)" gap={2}>
                      {Object.entries(generatedTheme.tokens.colors.brand).map(([shade, color]) => (
                        <ChakraGridItem key={shade} textAlign="center">
                          <Box 
                            w="12"
                            h="12"
                            borderRadius="md"
                            border="1px"
                            borderColor="gray.300"
                            mb={1}
                            shadow="sm"
                            bg={color as string}
                          />
                          <Text fontSize="xs" color="gray.600">{shade}</Text>
                        </ChakraGridItem>
                      ))}
                    </ChakraGrid>
                  </Box>

                  {/* Accent Colors */}
                  {generatedTheme.tokens.colors.accent && (
                    <Box>
                      <Heading as="h5" size="md" mb={3} color="gray.700">
                        Accent Colors
                      </Heading>
                      <ChakraGrid templateColumns="repeat(5, 1fr)" gap={2}>
                        {Object.entries(generatedTheme.tokens.colors.accent).map(([shade, color]) => (
                          <ChakraGridItem key={shade} textAlign="center">
                            <Box 
                              w="12"
                              h="12"
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.300"
                              mb={1}
                              shadow="sm"
                              bg={color as string}
                            />
                            <Text fontSize="xs" color="gray.600">{shade}</Text>
                          </ChakraGridItem>
                        ))}
                      </ChakraGrid>
                    </Box>
                  )}
                </SimpleGrid>

                {/* Additional Color Scales */}
                {generatedTheme.tokens.colors.neutral && (
                  <Box mt={6}>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Neutral Colors
                    </Heading>
                    <ChakraGrid templateColumns="repeat(5, 1fr)" gap={2}>
                      {Object.entries(generatedTheme.tokens.colors.neutral).map(([shade, color]) => (
                        <ChakraGridItem key={shade} textAlign="center">
                          <Box 
                            w="12"
                            h="12"
                            borderRadius="md"
                            border="1px"
                            borderColor="gray.300"
                            mb={1}
                            shadow="sm"
                            bg={color as string}
                          />
                          <Text fontSize="xs" color="gray.600">{shade}</Text>
                        </ChakraGridItem>
                      ))}
                    </ChakraGrid>
                  </Box>
                )}

                {/* Semantic Colors */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={6}>
                  {generatedTheme.tokens.colors.success && (
                    <Box>
                      <Heading as="h6" size="sm" mb={2} color="gray.700">
                        Success
                      </Heading>
                      <ChakraGrid templateColumns="repeat(3, 1fr)" gap={1}>
                        {Object.entries(generatedTheme.tokens.colors.success).slice(0, 3).map(([shade, color]) => (
                          <ChakraGridItem key={shade} textAlign="center">
                            <Box 
                              w="8"
                              h="8"
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.300"
                              mb={1}
                              shadow="sm"
                              bg={color as string}
                            />
                            <Text fontSize="xs" color="gray.500">{shade}</Text>
                          </ChakraGridItem>
                        ))}
                      </ChakraGrid>
                    </Box>
                  )}

                  {generatedTheme.tokens.colors.warning && (
                    <Box>
                      <Heading as="h6" size="sm" mb={2} color="gray.700">
                        Warning
                      </Heading>
                      <ChakraGrid templateColumns="repeat(3, 1fr)" gap={1}>
                        {Object.entries(generatedTheme.tokens.colors.warning).slice(0, 3).map(([shade, color]) => (
                          <ChakraGridItem key={shade} textAlign="center">
                            <Box 
                              w="8"
                              h="8"
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.300"
                              mb={1}
                              shadow="sm"
                              bg={color as string}
                            />
                            <Text fontSize="xs" color="gray.500">{shade}</Text>
                          </ChakraGridItem>
                        ))}
                      </ChakraGrid>
                    </Box>
                  )}

                  {generatedTheme.tokens.colors.error && (
                    <Box>
                      <Heading as="h6" size="sm" mb={2} color="gray.700">
                        Error
                      </Heading>
                      <ChakraGrid templateColumns="repeat(3, 1fr)" gap={1}>
                        {Object.entries(generatedTheme.tokens.colors.error).slice(0, 3).map(([shade, color]) => (
                          <ChakraGridItem key={shade} textAlign="center">
                            <Box 
                              w="8"
                              h="8"
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.300"
                              mb={1}
                              shadow="sm"
                              bg={color as string}
                            />
                            <Text fontSize="xs" color="gray.500">{shade}</Text>
                          </ChakraGridItem>
                        ))}
                      </ChakraGrid>
                    </Box>
                  )}
                </SimpleGrid>
              </Box>

              {/* Typography Section */}
              <Box>
                <Heading as="h4" size="lg" mb={4} color="gray.800">
                  Typography
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Fonts
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {generatedTheme.tokens.fonts && Object.entries(generatedTheme.tokens.fonts).map(([type, font]) => (
                        <Flex key={type} justify="space-between">
                          <Text fontWeight="medium" textTransform="capitalize">{type}:</Text>
                          <Text color="gray.600" fontFamily="mono" fontSize="sm">{font}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>

                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Font Sizes
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {generatedTheme.tokens.fontSizes && Object.entries(generatedTheme.tokens.fontSizes).slice(0, 6).map(([size, value]) => (
                        <Flex key={size} justify="space-between">
                          <Text fontWeight="medium">{size}:</Text>
                          <Text color="gray.600" fontFamily="mono" fontSize="sm">{value}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                </SimpleGrid>
              </Box>

              {/* Spacing & Layout Section */}
              <Box>
                <Heading as="h4" size="lg" mb={4} color="gray.800">
                  Spacing & Layout
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Spacing Scale
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {generatedTheme.tokens.spacing && Object.entries(generatedTheme.tokens.spacing).map(([size, value]) => (
                        <Flex key={size} justify="space-between">
                          <Text fontWeight="medium">{size}:</Text>
                          <Text color="gray.600" fontFamily="mono" fontSize="sm">{value}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>

                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Border Radius
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {generatedTheme.tokens.radii && Object.entries(generatedTheme.tokens.radii).map(([size, value]) => (
                        <Flex key={size} justify="space-between">
                          <Text fontWeight="medium">{size}:</Text>
                          <Text color="gray.600" fontFamily="mono" fontSize="sm">{value}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>

                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Breakpoints
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {generatedTheme.tokens.breakpoints && Object.entries(generatedTheme.tokens.breakpoints).map(([size, value]) => (
                        <Flex key={size} justify="space-between">
                          <Text fontWeight="medium">{size}:</Text>
                          <Text color="gray.600" fontFamily="mono" fontSize="sm">{value}</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                </SimpleGrid>
              </Box>

              {/* Effects Section */}
              <Box>
                <Heading as="h4" size="lg" mb={4} color="gray.800">
                  Effects & Animations
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Shadows
                    </Heading>
                    <VStack spacing={3} align="stretch">
                      {generatedTheme.tokens.shadows && Object.entries(generatedTheme.tokens.shadows).slice(0, 4).map(([size, shadow]) => (
                        <Box key={size} p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" fontWeight="medium" mb={1} textTransform="capitalize">{size}</Text>
                          <Text fontSize="xs" color="gray.600" fontFamily="mono" wordBreak="break-all">{shadow}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>

                  <Box>
                    <Heading as="h5" size="md" mb={3} color="gray.700">
                      Gradients
                    </Heading>
                    <VStack spacing={3} align="stretch">
                      {generatedTheme.tokens.gradients && Object.entries(generatedTheme.tokens.gradients).map(([type, gradient]) => (
                        <Box key={type} p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" fontWeight="medium" mb={1} textTransform="capitalize">{type}</Text>
                          <Text fontSize="xs" color="gray.600" fontFamily="mono" wordBreak="break-all">{gradient}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                </SimpleGrid>
              </Box>
            </VStack>

            {/* Raw JSON */}
            <Box>
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  View Raw Theme Data
                </summary>
                <Box mt={2} p={4} bg="gray.50" borderRadius="md" overflow="auto">
                  <Text as="pre" fontSize="xs" fontFamily="mono">
                    {JSON.stringify(generatedTheme, null, 2)}
                  </Text>
                </Box>
              </details>
            </Box>

            <HStack spacing={3} pt={4}>
              <Button
                onClick={() => {
                  setGeneratedTheme(null);
                  setDescription('');
                  setSelectedThemeId('');
                  setThemeName('');
                }}
                colorScheme="gray"
                size="md"
              >
                Generate Another
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Theme</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete the theme "{themeToDelete?.name}"? 
              This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={confirmDelete}
              isLoading={deleting}
              loadingText="Deleting..."
            >
              Delete Theme
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
