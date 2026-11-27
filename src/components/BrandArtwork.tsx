"use client";

import React from "react";

export function CieloraLogo({
  darkText = false,
  compact = false,
  iconOnly = false,
}: {
  darkText?: boolean;
  showTagline?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  if (darkText) {
    return (
      <div className="inline-flex items-center justify-center select-none">
        <img
          src="/images/cielora-logo-full.png"
          alt="Cielora AI — Your Business. Beyond the Sky."
          className="h-14 w-auto max-w-[260px] object-contain mix-blend-multiply"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex w-full items-center justify-center select-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        iconOnly
          ? "min-h-[54px] py-1"
          : compact
            ? "min-h-[68px] py-1.5"
            : "min-h-[76px] py-2"
      }`}
    >
      <img
        src="/images/cielora-mark.png"
        alt="Cielora AI mark"
        className={`shrink-0 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.34)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 ${
          iconOnly
            ? "h-10 w-10"
            : compact
              ? "h-12 w-12"
              : "h-14 w-14"
        }`}
      />
      <div
        aria-hidden={iconOnly}
        className={`flex items-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          iconOnly
            ? "ml-0 max-w-0 -translate-x-2 opacity-0 pointer-events-none"
            : "ml-2.5 max-w-[190px] translate-x-0 opacity-100"
        }`}
      >
        <span
          className={`mr-2.5 w-px shrink-0 bg-white/30 transition-all duration-300 ${
            compact ? "h-9" : "h-10"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 text-left leading-tight">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span
              className={`font-extrabold tracking-tight text-white ${
                compact ? "text-[21px]" : "text-[24px]"
              }`}
            >
              Cielora
            </span>
            <span
              className={`bg-gradient-to-r from-[#F5D0FE] via-[#F9A8D4] to-[#93C5FD] bg-clip-text font-extrabold tracking-tight text-transparent ${
                compact ? "text-[21px]" : "text-[24px]"
              }`}
            >
              AI
            </span>
          </div>
          <p
            className={`mt-0.5 font-medium tracking-tight whitespace-nowrap text-white/85 ${
              compact ? "text-[9.5px]" : "text-[11px]"
            }`}
          >
            Your Business. Beyond the Sky.
          </p>
        </div>
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
        className="h-9 w-9 shrink-0 object-contain"
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
      className="h-9 w-10 object-contain drop-shadow-[0_8px_16px_rgba(245,158,11,0.45)]"
    />
  );
}
