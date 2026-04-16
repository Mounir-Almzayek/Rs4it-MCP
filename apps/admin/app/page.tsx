import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/** Root `/` → default locale dashboard (see `app/[locale]/page.tsx`). */
export default function RootRedirect() {
  redirect(`/${routing.defaultLocale}`);
}
