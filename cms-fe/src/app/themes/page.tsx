import ThemeGenerator from '@/components/ThemeGenerator';
import { Box, Container, VStack, Heading, Text } from '@chakra-ui/react';

export default function ThemesPage() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200">
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
      
      <ThemeGenerator />
    </Box>
  );
}
