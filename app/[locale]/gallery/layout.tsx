import type { Metadata } from "next";
import "./gallery.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "The Wall Academy Gallery",
  description: "Gallery application for The Wall Academy camps",
};

export default function GalleryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header isConnected={false} />
      {children}
    </>
  );
}
