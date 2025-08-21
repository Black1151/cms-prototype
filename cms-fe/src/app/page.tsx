import Link from "next/link";
import { Box, Container, Heading, Text, VStack, List, ListItem, Button } from "@chakra-ui/react";

export default function HomePage() {
  return (
    <Box as="main" p={6}>
      <Container maxW="container.lg">
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="2xl" color="brand.700">
            Insight FE — MDX + Chakra (App Router) Starter
          </Heading>
          
          <List spacing={3}>
            <ListItem>
              <Button as={Link} href="/lesson/forces" variant="outline" size="lg" w="full" justifyContent="flex-start">
                View Lesson: Forces & Motion
              </Button>
            </ListItem>
            <ListItem>
              <Button as={Link} href="/editor/forces" variant="outline" size="lg" w="full" justifyContent="flex-start">
                Edit Lesson: Forces & Motion
              </Button>
            </ListItem>
            <ListItem>
              <Button as={Link} href="/themes" variant="outline" size="lg" w="full" justifyContent="flex-start">
                Theme Builder
              </Button>
            </ListItem>
          </List>
        </VStack>
      </Container>
    </Box>
  );
}
