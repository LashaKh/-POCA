"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-motion-reveal]";

export function StorefrontMotion() {
  useEffect(() => {
    let runtimeCleanup: (() => void) | undefined;
    let innerFrame = 0;

    const setup = () => {
      const root = document.documentElement;
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      const observed = new WeakSet<Element>();

      const reveal = (element: Element) => {
        element.setAttribute("data-motion-state", "visible");
      };

      if (!("IntersectionObserver" in window)) {
        document.querySelectorAll(REVEAL_SELECTOR).forEach(reveal);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
      );

      const register = (scope: ParentNode) => {
        const targets = [
          ...(scope instanceof Element && scope.matches(REVEAL_SELECTOR)
            ? [scope]
            : []),
          ...scope.querySelectorAll(REVEAL_SELECTOR),
        ];

        targets.forEach((target) => {
          if (preference.matches) {
            reveal(target);
            return;
          }
          if (observed.has(target)) return;
          observed.add(target);
          observer.observe(target);
        });
      };

      const applyPreference = () => {
        if (preference.matches) {
          root.removeAttribute("data-storefront-motion");
          document.querySelectorAll(REVEAL_SELECTOR).forEach(reveal);
          return;
        }

        root.setAttribute("data-storefront-motion", "ready");
        register(document);
      };

      const mutations = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node instanceof Element) register(node);
          });
        });
      });

      applyPreference();
      preference.addEventListener("change", applyPreference);
      mutations.observe(document.body, { childList: true, subtree: true });

      return () => {
        root.removeAttribute("data-storefront-motion");
        preference.removeEventListener("change", applyPreference);
        mutations.disconnect();
        observer.disconnect();
      };
    };

    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        runtimeCleanup = setup();
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
      runtimeCleanup?.();
    };
  }, []);

  return null;
}
