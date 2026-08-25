import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fibonacciai.github.io/piksel/"),
  title: "Piksel",
  description: "Pick a loop. Draw. Drop it on the wall.",
  alternates: { canonical: "https://fibonacciai.github.io/piksel/" },
  openGraph: {
    title: "Piksel",
    description: "Pick a loop. Draw. Drop it on the wall.",
    images: ["https://fibonacciai.github.io/piksel/assets/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Piksel",
    description: "Pick a loop. Draw. Drop it on the wall.",
    images: ["https://fibonacciai.github.io/piksel/assets/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
