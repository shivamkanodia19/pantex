import {
  cloneChanges,
  type DocChange,
  type DocumentSnapshot,
} from "./document-data";
import { defaultReviewPack, type DocumentMeta } from "./review-packs";
import type { DocSection } from "./document-data";

export interface ReviewState {
  changes: DocChange[];
  histories: DocumentSnapshot[];
  undoStack: { changes: DocChange[]; label: string }[];
  revision: number;
  meta: DocumentMeta;
  sections: DocSection[];
  siteId: string;
  doeFromId: string;
  doeToId: string;
  packNote: string;
  diffHref?: string;
  sitePdfHref?: string;
  doeFromPdfHref?: string;
  doeToPdfHref?: string;
}

export type ReviewAction =
  | {
      type: "approve" | "reject" | "edit" | "rewrite" | "undo" | "restore" | "snapshot";
      id?: string;
      text?: string;
      label: string;
      snapshotId: string;
      createdAt: string;
      expectedRevision?: number;
    }
  | {
      type: "mergeChanges";
      label: string;
      snapshotId: string;
      createdAt: string;
      changes: DocChange[];
    }
  | {
      type: "loadPack";
      label: string;
      snapshotId: string;
      createdAt: string;
      siteId: string;
      doeFromId: string;
      doeToId: string;
      meta: DocumentMeta;
      sections: DocSection[];
      changes: DocChange[];
      packNote: string;
      diffHref?: string;
      sitePdfHref?: string;
      doeFromPdfHref?: string;
      doeToPdfHref?: string;
    };

export function initialReviewState(): ReviewState {
  const pack = defaultReviewPack();
  return {
    changes: cloneChanges(pack.changes),
    histories: [
      {
        id: "baseline",
        label: `Loaded ${pack.meta.docId}`,
        createdAt: "",
        changes: cloneChanges(pack.changes),
      },
    ],
    undoStack: [],
    revision: 0,
    meta: pack.meta,
    sections: pack.sections,
    siteId: pack.siteId,
    doeFromId: pack.doeFromId,
    doeToId: pack.doeToId,
    packNote: pack.note,
    diffHref: pack.diffHref,
    sitePdfHref: pack.sitePdfHref,
    doeFromPdfHref: pack.doeFromPdfHref,
    doeToPdfHref: pack.doeToPdfHref,
  };
}

export function reviewReducer(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  if (action.type === "loadPack") {
    return {
      changes: cloneChanges(action.changes),
      undoStack: [],
      revision: state.revision + 1,
      histories: [
        {
          id: action.snapshotId,
          label: action.label,
          createdAt: action.createdAt,
          changes: cloneChanges(action.changes),
        },
        ...state.histories,
      ],
      meta: action.meta,
      sections: action.sections,
      siteId: action.siteId,
      doeFromId: action.doeFromId,
      doeToId: action.doeToId,
      packNote: action.packNote,
      diffHref: action.diffHref,
      sitePdfHref: action.sitePdfHref,
      doeFromPdfHref: action.doeFromPdfHref,
      doeToPdfHref: action.doeToPdfHref,
    };
  }

  if (
    action.type !== "mergeChanges" &&
    action.expectedRevision !== undefined &&
    action.expectedRevision !== state.revision
  )
    return state;

  let changes = state.changes;
  let undoStack = state.undoStack;

  if (action.type === "mergeChanges") {
    if (action.changes.length === 0) return state;
    const byId = new Map(changes.map((c) => [c.id, c]));
    for (const incoming of action.changes) {
      byId.set(incoming.id, { ...incoming });
    }
    // Preserve existing order; append newly seen ids at the end.
    const merged: DocChange[] = [];
    const seen = new Set<string>();
    for (const c of changes) {
      const next = byId.get(c.id)!;
      merged.push(next);
      seen.add(c.id);
    }
    for (const incoming of action.changes) {
      if (seen.has(incoming.id)) continue;
      merged.push(byId.get(incoming.id)!);
      seen.add(incoming.id);
    }
    changes = merged;

    // Attach highlights onto matching paragraphs (first para in section if needed).
    const sections = state.sections.map((sec) => {
      const forSec = changes.filter((c) => c.sectionId === sec.id);
      if (forSec.length === 0) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          const hit = forSec.find(
            (c) =>
              p.changeId === c.id ||
              p.text.includes(c.oldText.slice(0, 48)) ||
              c.oldText.includes(p.text.slice(0, 48)),
          );
          if (hit) return { ...p, changeId: hit.id };
          return p;
        }),
      };
    });
    // If a section has a change but no paragraph matched, pin to first paragraph.
    const pinned = sections.map((sec) => {
      const forSec = changes.filter((c) => c.sectionId === sec.id);
      if (forSec.length === 0) return sec;
      if (sec.paragraphs.some((p) => forSec.some((c) => p.changeId === c.id)))
        return sec;
      const [first, ...rest] = sec.paragraphs;
      if (!first) return sec;
      return {
        ...sec,
        paragraphs: [{ ...first, changeId: forSec[0].id }, ...rest],
      };
    });

    undoStack = [
      ...undoStack,
      { changes: cloneChanges(state.changes), label: action.label },
    ].slice(-40);
    return {
      ...state,
      changes: cloneChanges(changes),
      sections: pinned,
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
  } else if (action.type === "undo") {
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
        // Decline proposal: document keeps original text; recommendation stays (red).
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
    ...state,
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
