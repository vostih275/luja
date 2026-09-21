"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs, Outline } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomOut,
  ZoomIn,
  BookOpen,
  Maximize,
  Minimize,
  X,
  Loader2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type Book = {
  id: string;
  title: string;
  mimeType: string;
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 text-indigo-500">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function ReaderClient({ book, fileUrl }: { book: Book; fileUrl: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateWidth() {
      setContainerWidth(canvasRef.current?.clientWidth ?? Math.min(window.innerWidth - 64, 960));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!mainRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      mainRef.current.requestFullscreen?.();
    }
  }

  const isPdf = book.mimeType === "application/pdf";

  return (
    <main
      ref={mainRef}
      className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 text-slate-100"
    >
      <div className="z-50 mx-auto my-4 flex w-[92%] max-w-4xl items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-3 shadow-xl backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Library
          </Link>
          <h1 className="max-w-[12rem] truncate text-sm font-semibold text-slate-100 md:max-w-sm md:text-base">
            {book.title}
          </h1>
        </div>

        {isPdf && (
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-slate-300">
              Page {pageNumber}{numPages ? ` of ${numPages}` : ""}
            </span>
            <button
              onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))}
              disabled={!numPages || pageNumber >= numPages}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {isPdf && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTocOpen((v) => !v)}
                className={`rounded-md p-2 transition ${tocOpen ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}
                aria-label="Toggle table of contents"
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 py-6">
        <div
          ref={canvasRef}
          className="w-[92%] max-w-4xl overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)]"
        >
          {isPdf ? (
            <Document
              file={fileUrl}
              onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
              onLoadError={(err) => setError(err.message ?? "Failed to load PDF")}
              loading={<Spinner />}
              error={
                <p className="p-6 text-center text-red-400">
                  {error ?? "Could not load PDF"}
                </p>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={Math.max(240, Math.floor(containerWidth * zoom))}
                renderTextLayer
                renderAnnotationLayer
                className="flex justify-center"
              />
              <motion.aside
                initial={false}
                animate={{ x: tocOpen ? 0 : -320 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 h-full w-80 border-r border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-lg z-40"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Contents</h2>
                  <button
                    onClick={() => setTocOpen(false)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-slate-300">
                  <Outline
                    onItemClick={(item) => {
                      if (typeof item.pageNumber === "number") {
                        setPageNumber(item.pageNumber);
                        setTocOpen(false);
                      }
                    }}
                    className="space-y-1 [&_a]:block [&_a]:rounded-md [&_a]:p-2 [&_a]:transition-colors [&_a]:hover:bg-slate-800/60"
                  />
                </div>
              </motion.aside>
            </Document>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-slate-300">
                This book format is not previewable in the browser. Use the download link to open it.
              </p>
              <Link
                href={fileUrl}
                target="_blank"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
              >
                Open / Download
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
