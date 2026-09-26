"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceDoc } from "./sources";
import {
  validateAsset,
  type Comparison,
  type DiffSource,
} from "./document-diff";
export type ComparisonState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; result: Comparison }
  | null;
export function useComparison() {
  const [state, setState] = useState<ComparisonState>(null);
  const generation = useRef(0),
    worker = useRef<Worker | null>(null),
    controller = useRef<AbortController | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    controller.current?.abort();
  }, []);
  const clear = useCallback(() => {
    stop();
    setState(null);
  }, [stop]);
  useEffect(() => stop, [stop]);
  async function run(older: SourceDoc, newer: SourceDoc) {
    stop();
    const id = generation.current;
    if (older.id === newer.id) {
      setState({ status: "error", error: "Choose two different versions." });
      return;
    }
    setState({ status: "loading" });
    const abort = new AbortController();
    controller.current = abort;
    try {
      async function load(source: SourceDoc): Promise<DiffSource> {
        if (!source.comparisonTextHref)
          throw new Error("This source does not support comparison.");
        const [extract, pdf] = await Promise.all([
          fetch(source.comparisonTextHref, { signal: abort.signal }),
          fetch(source.href, { signal: abort.signal }),
        ]);
        if (!extract.ok || !pdf.ok)
          throw new Error(
            "Unable to load bundled comparison files. Retry when the files are available.",
          );
        const asset: unknown = await extract.json();
        validateAsset(asset);
        const digest = await crypto.subtle.digest(
          "SHA-256",
          await pdf.arrayBuffer(),
        );
        const hash = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        if (hash !== asset.sha256)
          throw new Error(
            "The text extract does not match its PDF. Regenerate comparison assets before retrying.",
          );
        return {
          id: source.id,
          title: source.shortTitle,
          href: new URL(source.href, window.location.href).href,
          asset,
        };
      }
      const [a, b] = await Promise.all([load(older), load(newer)]);
      if (id !== generation.current) return;
      const task = new Worker(
        new URL("../workers/document-diff.worker.ts", import.meta.url),
      );
      worker.current = task;
      task.onmessage = (event) => {
        if (id !== generation.current) return;
        task.terminate();
        worker.current = null;
        setState(
          event.data.error
            ? { status: "error", error: event.data.error }
            : { status: "ready", result: event.data.result },
        );
      };
      task.onerror = () => {
        if (id === generation.current) {
          task.terminate();
          worker.current = null;
          setState({
            status: "error",
            error: "Comparison worker failed. Please retry.",
          });
        }
      };
      task.postMessage({ older: a, newer: b });
    } catch (error) {
      if (id === generation.current && !abort.signal.aborted)
        setState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Comparison failed. Please retry.",
        });
    }
  }
  return { state, run, clear };
}
