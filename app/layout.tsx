import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cah Kalcer Coach — AI Running Coach",
  description: "A simple running tracker and training companion for beginner runners.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
