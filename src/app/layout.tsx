import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cielora AI — Global AI-Powered Marketing Suite",
  description:
    "Create, automate, and track global omnichannel campaigns across WhatsApp, SMS, Email, Social Media, and Paid Ads with strict user-wise isolation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
