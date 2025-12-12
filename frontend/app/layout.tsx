import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AIProvider } from "./providers/ai-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Calquity RAG",
  description: "PDF Analysis with AI Visualizations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AIProvider>{children}</AIProvider>
      </body>
    </html>
  );
}
