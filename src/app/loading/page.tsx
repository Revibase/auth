"use client";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const loadingVariants = cva(
  "flex flex-col items-center justify-center gap-3 p-6 transition-all",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        subtle: "bg-background/50",
        solid: "bg-background",
      },
      position: {
        fullscreen: "fixed inset-0 z-50",
        container: "absolute inset-0 z-10",
        inline: "",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "inline",
    },
  }
);

export default function LoadingOverlay() {
  const message = "Loading...";
  const showLogo = false;
  const spinnerSize = "lg";

  // For backward compatibility
  const positionProp = "fullscreen";

  const spinnerSizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  }[spinnerSize];

  return (
    <div
      className={cn(
        loadingVariants({ variant: "default", position: positionProp }),
        "backdrop-blur-sm",
        positionProp === "fullscreen" && "backdrop-blur-sm"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {showLogo && (
          <div className="mb-2">
            <Image
              width={10}
              height={10}
              src={"/placeholder.svg"}
              alt="Logo"
              className="h-12 w-auto"
            />
          </div>
        )}

        <div className={cn("text-primary", spinnerSizeClass)}>
          <Loader2 className="h-full w-full animate-spin" />
        </div>

        {message && (
          <p className="text-center font-medium text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
