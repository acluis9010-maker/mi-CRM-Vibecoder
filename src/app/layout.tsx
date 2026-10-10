import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Vibe CRM",
  description: "CRM simple para negocios pequeños — clientes, seguimientos y ventas.",
};

/**
 * El orden importa: ConvexProviderWithClerk usa el hook `useAuth` de Clerk, así
 * que necesita un <ClerkProvider> por encima.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
