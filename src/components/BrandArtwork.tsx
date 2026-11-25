"use client";

import React from "react";

export function CieloraLogo({
  darkText = false,
  showTagline = true,
  compact = false,
}: {
  darkText?: boolean;
  showTagline?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <img
        src="/images/cielora-mark.png"
        alt="Cielora AI mark"
        className={`shrink-0 object-contain drop-shadow-sm ${
          compact ? "h-9 w-11" : "h-11 w-14"
        }`}
      />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-extrabold tracking-tight ${
              compact ? "text-[18px]" : "text-[22px]"
            } ${darkText ? "text-[#0D0824]" : "text-white"}`}
          >
            Cielora
          </span>
          <span
            className={`font-extrabold tracking-tight ${
              compact ? "text-[18px]" : "text-[22px]"
            } ${
              darkText
                ? "bg-gradient-to-r from-[#7C3AED] to-[#9333EA] bg-clip-text text-transparent"
                : "bg-gradient-to-r from-[#C084FC] to-[#F472B6] bg-clip-text text-transparent"
            }`}
          >
            AI
          </span>
        </div>
        {showTagline && (
          <p
            className={`font-medium tracking-tight ${
              compact ? "text-[10px]" : "text-[11px]"
            } ${darkText ? "text-slate-600" : "text-purple-200/75"}`}
          >
            Your Business. Beyond the Sky.
          </p>
        )}
      </div>
    </div>
  );
}

export function AuthShowcaseArt() {
  return (
    <div className="relative w-full max-w-[495px] select-none">
      <img
        src="/images/auth-showcase-3d.png"
        alt="Cielora AI omnichannel marketing suite preview"
        className="w-full h-auto object-contain drop-shadow-[0_24px_45px_rgba(79,70,229,0.16)]"
      />
    </div>
  );
}

export function BotEmblem({ size = "md" }: { size?: "sm" | "md" }) {
  if (size === "sm") {
    return (
      <img
        src="/images/ai-bot-3d.png"
        alt="Cielora AI bot"
        className="h-7 w-7 shrink-0 object-contain"
      />
    );
  }
  return (
    <img
      src="/images/ai-bot-3d.png"
      alt="Cielora AI assistant mascot"
      className="h-20 w-16 shrink-0 object-contain drop-shadow-[0_10px_18px_rgba(124,58,237,0.22)]"
    />
  );
}

export function CrownEmblem() {
  return (
    <img
      src="/images/crown-3d.png"
      alt="Pro upgrade crown"
      className="h-11 w-12 object-contain drop-shadow-[0_8px_16px_rgba(245,158,11,0.45)]"
    />
  );
}
