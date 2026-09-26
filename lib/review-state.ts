import {
  cloneChanges,
  SEED_CHANGES,
  type DocChange,
  type DocumentSnapshot,
} from "./document-data";

export interface ReviewState {
  changes: DocChange[];
  histories: DocumentSnapshot[];
  undoStack: { changes: DocChange[]; label: string }[];
  revision: number;
}
export type ReviewAction = {
  type:
    "approve" | "reject" | "edit" | "rewrite" | "undo" | "restore" | "snapshot";
  id?: string;
  text?: string;
  label: string;
  snapshotId: string;
  createdAt: string;
  expectedRevision?: number;
};
export function initialReviewState(): ReviewState {
  return {
    changes: cloneChanges(SEED_CHANGES),
    histories: [
      {
        id: "baseline",
        label: "Demo baseline — Rev. C",
        createdAt: "",
        changes: cloneChanges(SEED_CHANGES),
      },
    ],
    undoStack: [],
    revision: 0,
  };
}
export function reviewReducer(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  if (
    action.expectedRevision !== undefined &&
    action.expectedRevision !== state.revision
  )
    return state;
  let changes = state.changes;
  let undoStack = state.undoStack;
  if (action.type === "undo") {
    const last = undoStack.at(-1);
    if (!last) return state;
    changes = cloneChanges(last.changes);
    undoStack = undoStack.slice(0, -1);
  } else if (action.type === "restore") {
    const snapshot = state.histories.find((s) => s.id === action.id);
    if (!snapshot) return state;
    changes = cloneChanges(snapshot.changes);
  } else if (action.type !== "snapshot") {
    if (!changes.some((c) => c.id === action.id)) return state;
    if (
      (action.type === "edit" || action.type === "rewrite") &&
      !action.text?.trim()
    )
      return state;
    changes = changes.map((c) => {
      if (c.id !== action.id) return c;
      if (action.type === "approve")
        return { ...c, approvedText: c.workingText, status: "accepted" };
      if (action.type === "reject")
        return { ...c, approvedText: undefined, status: "rejected" };
      return { ...c, workingText: action.text!.trim(), status: "edited" };
    });
  }
  if (action.type !== "undo" && action.type !== "snapshot") {
    undoStack = [
      ...undoStack,
      { changes: cloneChanges(state.changes), label: action.label },
    ].slice(-40);
  }
  return {
    changes,
    undoStack,
    revision: state.revision + 1,
    histories: [
      {
        id: action.snapshotId,
        label: action.label,
        createdAt: action.createdAt,
        changes: cloneChanges(changes),
      },
      ...state.histories,
    ],
  };
}
