import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "أسعار المنتجات",
  description: "أداة خاصة لعرض أسعار المنتجات والبحث عنها بسرعة",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="ar" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
