"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  useCallback,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewView, setReviewView] = useState<"full" | "section">("full");
  const [sectionId, setSectionId] = useState(() => state.sections[0]?.id ?? "");
  const [sectionNavigation, setSectionNavigation] = useState<{
    sectionId: string;
    requestId: number;
  } | null>(null);
  const navigateSection = useCallback(
    (id: string) => {
      if (!state.sections.some((s) => s.id === id)) return;
      setSectionId(id);
      setSelectedId(
        reviewView === "section"
          ? (state.changes.find((c) => c.sectionId === id)?.id ?? null)
          : null,
      );
      setSectionNavigation((prev) => ({
        sectionId: id,
        requestId: (prev?.requestId ?? 0) + 1,
      }));
    },
    [state.sections, state.changes, reviewView],
  );
  const [editors, setEditors] = useState<Record<string, string>>({});
  /** Optional business-impact triage — cleared when review set reloads. */
  const [impacts, setImpacts] = useState<Record<string, ImpactJudgement>>({});

  const selectChange = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      const change = state.changes.find((c) => c.id === id);
      if (change) setSectionId(change.sectionId);
    },
    [state.changes],
  );

  const setEditor = useCallback((id: string, text: string) => {
    setEditors((prev) => ({ ...prev, [id]: text }));
  }, []);

  const clearEditor = useCallback((id: string) => {
    setEditors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

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
    setSelectedId(null);
    setSectionNavigation(null);
    setImpacts({});
    setEditors({});
    setSectionId(pack.sections[0]?.id ?? "");
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
    reviewView,
    setReviewView,
    sectionNavigation,
    navigateSection,
    sectionId,
    setSectionId,
    editors,
    setEditor,
    clearEditor,
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
