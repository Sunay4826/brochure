import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brochure Studio — Web to printable brochure",
  description:
    "Generate a print-ready brochure from any public website using server-side extraction and optional AI copy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
