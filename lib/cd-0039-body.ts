import raw from "@/lib/generated/cd-0039-body.json";

type RawBody = {
  meta: {
    title: string;
    revision: string;
    docId: string;
    owner: string;
    totalPages: number;
  };
  sections: {
    id: string;
    number: string;
    title: string;
    pages: number[];
    paragraphs: { id: string; text: string; changeId?: string }[];
  }[];
};

const data = raw as RawBody;

export const CD0039_META = data.meta;

/** Full CD-0039 body extracted from the in-repo PDF (54 pages / TOC sections). */
export const CD0039_SECTIONS = data.sections.map((s) => ({
  id: s.id,
  number: s.number,
  title: s.title,
  pages: [...s.pages],
  paragraphs: s.paragraphs.map((p) => ({
    id: p.id,
    text: p.text,
    ...(p.changeId ? { changeId: p.changeId } : {}),
  })),
}));
