"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { SECTIONS } from "@/lib/document-data";

import {
  initialReviewState,
  reviewReducer,
  type ReviewAction,
} from "@/lib/review-state";

function useDocumentState() {
  const [state, dispatch] = useReducer(
    reviewReducer,
    undefined,
    initialReviewState,
  );
  const [mode, setMode] = useState<"view" | "write">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewView, setReviewView] = useState<"full" | "section">("full");
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  const [editors, setEditors] = useState<Record<string, string>>({});
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
    type: ReviewAction["type"],
    label: string,
    extra: Partial<ReviewAction> = {},
  ) {
    dispatch({
      ...extra,
      type,
      label,
      snapshotId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
  }

  return {
    ...state,
    reviewView,
    setReviewView,
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
