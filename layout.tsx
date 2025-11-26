import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Match24 Sport",
    description: "Trova la tua prossima partita di padel o calcetto.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="it">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
