import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calqity- AI document assistant",
  description: "A Perplexity clone with Generative UI and Citations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col min-h-screen">
          {/*Header*/}
          <header className="bg-white border-3">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-slate-900"></h1>
              <p className = "text-sm text-slate-500">AI Document Assistant</p>
            </div>
          </header>
          
          {/*Main content*/}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            {children}
          </main>

          {/*Footer*/}
          <footer className="border-t bg-white mt-12">
            <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-slate-600">
              &copy; {new Date().getFullYear()} Calqity. All rights reserved.
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
