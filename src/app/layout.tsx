import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Issues",
  description: "스타트업 정보를 매일 확인하고 묶어두는 곳",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
