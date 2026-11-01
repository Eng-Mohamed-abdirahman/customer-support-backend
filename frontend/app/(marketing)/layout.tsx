import { Inter } from "next/font/google";

import "./landing.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-landing",
  weight: ["400", "500", "600", "700"],
});

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
      />
      <div className={`landing-page ${inter.className} scroll-smooth`}>{children}</div>
    </>
  );
}
