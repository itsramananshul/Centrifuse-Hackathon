import type { Metadata } from "next";
import { APP_NAME } from "@trialpulse/config";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "AI-powered clinical trial monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
