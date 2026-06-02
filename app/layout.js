import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import "./landing.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata = {
  title: "BIMAHEADQUARTER",
  description: "Unified insurance operations landing, CRM and consumer portal",
  icons: {
    icon: { url: "/favicon.png", type: "image/png" },
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
