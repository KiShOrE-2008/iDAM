import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IDAM | இடம் - Smart Parking Discovery & Reservation",
  description: "Location-based parking discovery and reservation platform in Madurai. Discover, book, and pay for parking spaces near Meenakshi Temple and city hotspots.",
  keywords: ["IDAM", "Parking Madurai", "Meenakshi Temple Parking", "Book Parking Spot", "Smart Parking India"],
  icons: {
    icon: "/idam-logo.png",
    shortcut: "/idam-logo.png",
    apple: "/idam-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Mukta+Malar:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
