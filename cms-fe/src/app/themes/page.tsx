"use client";

import ThemeGenerator from '@/components/ThemeGenerator';
import { Box, Container, VStack, Heading, Text, useToast } from '@chakra-ui/react';
import { createContext, useContext } from 'react';

// Toast context for theme operations
const ToastContext = createContext<{
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}>({
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
});

export const useThemeToast = () => useContext(ToastContext);

export default function ThemesPage() {
  const toast = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: 'success',
      duration: 5000,
      isClosable: true,
      position: 'top-right',
    });
  };

  const showError = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: 'error',
      duration: 7000,
      isClosable: true,
      position: 'top-right',
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: 'info',
      duration: 4000,
      isClosable: true,
      position: 'top-right',
    });
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
      <Box h="100vh" bg="gray.50" display="flex" flexDir="column" overflow="hidden">
        <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200" flexShrink={0}>
          <Container maxW="7xl" py={6}>
            <VStack spacing={2} align="stretch">
              <Heading as="h1" size="2xl" color="gray.900">
                Theme Builder
              </Heading>
              <Text color="gray.600" fontSize="lg">
                Create AI-powered design systems with comprehensive styling options
              </Text>
            </VStack>
          </Container>
        </Box>
        
        <Box flex="1" minH="0">
          <ThemeGenerator />
        </Box>
      </Box>
    </ToastContext.Provider>
  );
}
