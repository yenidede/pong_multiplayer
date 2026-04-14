import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multiplayer Pong",
  description: "Simple 2-player Pong school project with Next.js and Socket.IO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
