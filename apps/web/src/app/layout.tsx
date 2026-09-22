import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Digital Heroes — Play. Win. Give.",
  description:
    "Track your golf scores, enter monthly prize draws, and give back to charities you choose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {/* pt-14 clears the fixed 56px navbar */}
          <main className="min-h-[85vh] pt-14">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
