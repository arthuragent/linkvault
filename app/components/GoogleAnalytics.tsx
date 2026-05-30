"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,}$/;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasSkippedInitialPageView = useRef(false);

  const isEnabled =
    Boolean(GA_MEASUREMENT_ID) &&
    GA_MEASUREMENT_ID_PATTERN.test(GA_MEASUREMENT_ID ?? "");

  useEffect(() => {
    if (!isEnabled || !GA_MEASUREMENT_ID) return;

    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    if (typeof window.gtag !== "function") return;

    const queryString = searchParams.toString();
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: queryString ? `${pathname}?${queryString}` : pathname,
    });
  }, [isEnabled, pathname, searchParams]);

  if (!isEnabled || !GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
