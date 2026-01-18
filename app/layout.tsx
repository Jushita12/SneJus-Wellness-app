import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sister Goals",
  description: "Shared wellness journey for sisters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 dark:bg-black transition-colors duration-300`}
        suppressHydrationWarning
      >
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: 'transparent',
              boxShadow: 'none',
              border: 'none',
              padding: 0,
            },
          }}
        />
      </body>
    </html>
  );
}
