import * as React from "react";
import { SkeletonCard, SkeletonDetail, SkeletonList } from "./Skeleton";

export type LoadingStateVariant = "list" | "detail" | "card";

interface LoadingStateProps {
  variant?: LoadingStateVariant;
  count?: number;
}

/**
 * Content placeholder shown while data loads. Renders shimmering skeletons
 * shaped like the screen's real content instead of a spinner.
 */
export function LoadingState({ variant = "list", count }: LoadingStateProps) {
  if (variant === "detail") {
    return <SkeletonDetail />;
  }
  if (variant === "card") {
    return <SkeletonCard />;
  }
  return <SkeletonList count={count} />;
}
