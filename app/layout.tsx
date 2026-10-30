import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Cah Kalcer Run | Your AI Running Coach",
  description: "Track your runs, understand your progress, and get personalized running recommendations with Cah Kalcer Run.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
