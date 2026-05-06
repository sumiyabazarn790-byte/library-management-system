import type { SyntheticEvent } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StaticAsset = string | { src: string };

export const resolveAssetSrc = (asset: StaticAsset) => (typeof asset === "string" ? asset : asset.src);

export const applyImageFallback = (
  event: SyntheticEvent<HTMLImageElement, Event>,
  fallbacks: string[],
) => {
  const image = event.currentTarget;
  const nextIndex = Number(image.dataset.fallbackIndex ?? 0);
  const nextSrc = fallbacks[nextIndex];

  if (!nextSrc) {
    image.onerror = null;
    return;
  }

  image.dataset.fallbackIndex = String(nextIndex + 1);
  image.src = nextSrc;
};
