import { redirect } from "next/navigation";

/** New Document removed from IA — residual markup lives in Document after accepts. */
export default function NewRedirect() {
  redirect("/document");
}
