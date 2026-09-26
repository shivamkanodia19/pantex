"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import {
  initialReviewState,
  reviewReducer,
  type ReviewAction,
} from "@/lib/review-state";
import { resolveReviewPack } from "@/lib/review-packs";
import type { ImpactJudgement } from "@/lib/impact";

function useDocumentState() {
  const [state, dispatch] = useReducer(
    reviewReducer,
    undefined,
    initialReviewState,
  );
  const [mode, setMode] = useState<"view" | "write">("view");
  const [selectedId, selectChange] = useState<string | null>(null);
  /** Optional business-impact triage — cleared when review set reloads. */
  const [impacts, setImpacts] = useState<Record<string, ImpactJudgement>>({});

  function act(
    type: Exclude<ReviewAction["type"], "loadPack">,
    label: string,
    extra: Partial<ReviewAction> = {},
  ) {
    dispatch({
      ...extra,
      type,
      label,
      snapshotId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    } as ReviewAction);
  }

  function loadReviewPack(siteId: string, doeFromId: string, doeToId: string) {
    const pack = resolveReviewPack(siteId, doeFromId, doeToId);
    selectChange(null);
    setImpacts({});
    dispatch({
      type: "loadPack",
      label: `Loaded ${pack.meta.docId} · ${pack.doeFromId}→${pack.doeToId}`,
      snapshotId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      siteId: pack.siteId,
      doeFromId: pack.doeFromId,
      doeToId: pack.doeToId,
      meta: pack.meta,
      sections: pack.sections,
      changes: pack.changes,
      packNote: pack.note,
      diffHref: pack.diffHref,
      sitePdfHref: pack.sitePdfHref,
      doeFromPdfHref: pack.doeFromPdfHref,
      doeToPdfHref: pack.doeToPdfHref,
    });
  }

  return {
    ...state,
    mode,
    setMode,
    selectedId,
    selectChange,
    closeOverlay: () => selectChange(null),
    approveChange: (id: string) => act("approve", `Approved ${id}`, { id }),
    rejectChange: (id: string) => act("reject", `Reverted ${id}`, { id }),
    editChange: (id: string, text: string) =>
      act("edit", `Edited proposal — ${id}`, { id, text }),
    rewriteChange: (id: string, text: string, expectedRevision: number) =>
      act("rewrite", `Reworded proposal — ${id}`, {
        id,
        text,
        expectedRevision,
      }),
    undo: () => act("undo", "Undo last change"),
    canUndo: state.undoStack.length > 0,
    restoreSnapshot: (id: string) =>
      act("restore", "Restored snapshot", { id }),
    pushNamedSnapshot: (label: string) => act("snapshot", label),
    getChange: (id: string) => state.changes.find((c) => c.id === id),
    loadReviewPack,
    impacts,
    setImpacts,
    clearImpacts: () => setImpacts({}),
    getImpact: (id: string) => impacts[id],
  };
}

const Ctx = createContext<ReturnType<typeof useDocumentState> | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useDocumentState()}>{children}</Ctx.Provider>;
}

export function useDocStore() {
  const value = useContext(Ctx);
  if (!value)
    throw new Error("useDocStore must be used within DocumentProvider");
  return value;
}
