import { redirect } from "next/navigation";

/** Old Sources tab → Source Search file finder. */
export default function SourcesRedirect() {
  redirect("/search");
}
