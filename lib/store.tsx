"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  cloneChanges,
  SEED_CHANGES,
  type ChangeStatus,
  type DocChange,
  type DocumentSnapshot,
} from "@/lib/document-data";

interface DocStore {
  mode: "view" | "write";
  setMode: (mode: "view" | "write") => void;
  changes: DocChange[];
  selectedId: string | null;
  selectChange: (id: string | null) => void;
  confirmAcceptId: string | null;
  requestAccept: (id: string) => void;
  cancelAccept: () => void;
  confirmAccept: () => void;
  closeOverlay: () => void;
  undo: () => void;
  canUndo: boolean;
  editChange: (id: string, text: string) => void;
  histories: DocumentSnapshot[];
  restoreSnapshot: (id: string) => void;
  pushNamedSnapshot: (label: string) => void;
  getChange: (id: string) => DocChange | undefined;
}

const Ctx = createContext<DocStore | null>(null);

type HistoryEntry = { changes: DocChange[]; label: string };

function stamp(): string {
  return new Date().toISOString();
}

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"view" | "write">("view");
  const [changes, setChanges] = useState<DocChange[]>(() => cloneChanges(SEED_CHANGES));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [histories, setHistories] = useState<DocumentSnapshot[]>(() => [
    {
      id: "snap-baseline",
      label: "Baseline — Rev. C (imported)",
      createdAt: stamp(),
      changes: cloneChanges(SEED_CHANGES),
    },
  ]);

  const pushUndo = useCallback((label: string, prev: DocChange[]) => {
    setUndoStack((stack) => [...stack, { changes: cloneChanges(prev), label }].slice(-40));
  }, []);

  const commitSnapshot = useCallback((label: string, next: DocChange[]) => {
    setHistories((h) => [
      {
        id: `snap-${Date.now()}`,
        label,
        createdAt: stamp(),
        changes: cloneChanges(next),
      },
      ...h,
    ]);
  }, []);

  const selectChange = useCallback((id: string | null) => {
    setSelectedId(id);
    setConfirmAcceptId(null);
  }, []);

  const closeOverlay = useCallback(() => {
    setSelectedId(null);
    setConfirmAcceptId(null);
  }, []);

  const requestAccept = useCallback((id: string) => {
    setConfirmAcceptId(id);
  }, []);

  const cancelAccept = useCallback(() => {
    setConfirmAcceptId(null);
  }, []);

  const applyStatus = useCallback(
    (id: string, status: ChangeStatus, label: string, workingText?: string) => {
      setChanges((prev) => {
        pushUndo(label, prev);
        const next = prev.map((ch) =>
          ch.id === id
            ? {
                ...ch,
                status,
                workingText: workingText ?? ch.workingText,
              }
            : ch,
        );
        commitSnapshot(label, next);
        return next;
      });
    },
    [commitSnapshot, pushUndo],
  );

  const confirmAccept = useCallback(() => {
    if (!confirmAcceptId) return;
    applyStatus(confirmAcceptId, "accepted", `Accepted ${confirmAcceptId}`);
    setConfirmAcceptId(null);
  }, [applyStatus, confirmAcceptId]);

  const editChange = useCallback(
    (id: string, text: string) => {
      setChanges((prev) => {
        pushUndo(`Edited ${id}`, prev);
        const next = prev.map((ch) =>
          ch.id === id ? { ...ch, workingText: text, status: "edited" as const } : ch,
        );
        commitSnapshot(`Edited proposed text — ${id}`, next);
        return next;
      });
    },
    [commitSnapshot, pushUndo],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      setChanges(cloneChanges(last.changes));
      commitSnapshot(`Undo — ${last.label}`, last.changes);
      return stack.slice(0, -1);
    });
  }, [commitSnapshot]);

  const restoreSnapshot = useCallback(
    (id: string) => {
      setHistories((h) => {
        const snap = h.find((s) => s.id === id);
        if (!snap) return h;
        setChanges((prev) => {
          pushUndo(`Restore ${snap.label}`, prev);
          return cloneChanges(snap.changes);
        });
        commitSnapshot(`Restored — ${snap.label}`, snap.changes);
        return h;
      });
    },
    [commitSnapshot, pushUndo],
  );

  const pushNamedSnapshot = useCallback(
    (label: string) => {
      commitSnapshot(label, changes);
    },
    [changes, commitSnapshot],
  );

  const getChange = useCallback((id: string) => changes.find((c) => c.id === id), [changes]);

  const value = useMemo<DocStore>(
    () => ({
      mode,
      setMode,
      changes,
      selectedId,
      selectChange,
      confirmAcceptId,
      requestAccept,
      cancelAccept,
      confirmAccept,
      closeOverlay,
      undo,
      canUndo: undoStack.length > 0,
      editChange,
      histories,
      restoreSnapshot,
      pushNamedSnapshot,
      getChange,
    }),
    [
      mode,
      changes,
      selectedId,
      selectChange,
      confirmAcceptId,
      requestAccept,
      cancelAccept,
      confirmAccept,
      closeOverlay,
      undo,
      undoStack.length,
      editChange,
      histories,
      restoreSnapshot,
      pushNamedSnapshot,
      getChange,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocStore must be used within DocumentProvider");
  return ctx;
}
