"use client";

import { useLocale as useNextIntlLocale } from "next-intl";

export function useDir() {
  const locale = useNextIntlLocale();
  return locale === "ar" ? "rtl" : "ltr";
}

export function useIsRtl() {
  const locale = useNextIntlLocale();
  return locale === "ar";
}
