import { compareDocuments, type DiffSource } from "../lib/document-diff";
self.onmessage = (
  event: MessageEvent<{ older: DiffSource; newer: DiffSource }>,
) => {
  try {
    self.postMessage({
      result: compareDocuments(event.data.older, event.data.newer),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Comparison failed.",
    });
  }
};
