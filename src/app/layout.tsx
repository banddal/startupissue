import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Issues",
  description: "매일 확인하는 스타트업 인텔리전스 아카이브",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
