"use client";

import dynamic from "next/dynamic";

const ReaderClient = dynamic(() => import("./ReaderClient"), { ssr: false });

type Book = {
  id: string;
  title: string;
  mimeType: string;
};

export default function ReaderPage({ book, fileUrl }: { book: Book; fileUrl: string }) {
  return <ReaderClient book={book} fileUrl={fileUrl} />;
}
