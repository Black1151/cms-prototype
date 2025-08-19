import type { ReactNode } from "react";
import Providers from "./providers";

export const metadata = { title: "Insight FE — MDX CMS Starter" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}