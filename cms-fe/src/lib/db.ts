type ThemeTokens = {
    colors: {
      brand: Record<string, string>;
      accent?: Record<string, string>;
    };
    radii?: { md?: string };
    fonts?: { heading?: string; body?: string };
  };
  
  type Lesson = {
    id: string;
    title: string;
    mdx: string;
    themeId: string;
    overrides?: Record<string, { css: Record<string, any> }>;
  };
  
  const themes: Record<string, ThemeTokens> = {
    "biology-v1": {
      colors: {
        brand: {
          "50": "#f0fdf4","100": "#dcfce7","200": "#bbf7d0","300": "#86efac","400": "#4ade80",
          "500": "#22c55e","600": "#16a34a","700": "#15803d","800": "#166534","900": "#14532d"
        },
        accent: {
          "50": "#ecfeff","100": "#cffafe","200": "#a5f3fc","300": "#67e8f9","400": "#22d3ee",
          "500": "#06b6d4","600": "#0891b2","700": "#0e7490","800": "#155e75","900": "#164e63"
        }
      },
      radii: { md: "12px" },
      fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" }
    }
  };
  
  const lessons: Record<string, Lesson> = {
    forces: {
      id: "forces",
      title: "Forces & Motion",
      themeId: "biology-v1",
      mdx: `
  <Heading data-id="h1" variant="lessonTitle">Forces & Motion</Heading>
  
  <Callout data-id="c1" variant="info">
  Today we’ll explore how forces change motion.
  </Callout>
  
  <Text data-id="t1">
    Newton’s First Law states that an object remains at rest or in uniform motion unless acted on by a net external force.
  </Text>
  
  <Img data-id="img1" src="/images/cart.png" alt="Cart on a track" />
  
  <TwoColumn data-id="col1">
    <Text data-id="t2">Left column content...</Text>
    <Text data-id="t3">Right column content...</Text>
  </TwoColumn>
  `.trim(),
      overrides: {
        img1: { css: { borderRadius: "{radii.md}", boxShadow: "lg" } }
      }
    }
  };
  
  export const db = {
    getLesson(id: string) { return lessons[id]; },
    saveLesson(id: string, data: Partial<Lesson>) {
      lessons[id] = { ...lessons[id], ...data } as Lesson;
      return lessons[id];
    },
    getTheme(id: string) { return themes[id]; },
    saveTheme(id: string, tokens: ThemeTokens) { themes[id] = tokens; return themes[id]; }
  };
  