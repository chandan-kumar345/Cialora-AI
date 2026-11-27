"use client";

import React from "react";

export function InstagramBrandBadge({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "xs"
      ? "h-5 w-5 rounded-md p-1"
      : size === "sm"
        ? "h-7 w-7 rounded-lg p-1.5"
        : size === "lg"
          ? "h-14 w-14 rounded-2xl p-3"
          : "h-9 w-9 rounded-xl p-1.5";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#7C3AED] text-white shadow-xs ${dim} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5.2"
          stroke="currentColor"
          strokeWidth="2.1"
        />
        <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="2.1" />
        <circle cx="17.3" cy="6.7" r="1.25" fill="currentColor" />
      </svg>
    </span>
  );
}

export function FacebookBrandBadge({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "xs"
      ? "h-5 w-5 rounded-md"
      : size === "sm"
        ? "h-7 w-7 rounded-lg"
        : size === "lg"
          ? "h-14 w-14 rounded-2xl"
          : "h-9 w-9 rounded-xl";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-[#1877F2] text-white shadow-xs ${dim} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[68%] w-[68%]">
        <path d="M13.8 21v-7.6h2.55l.38-2.96H13.8V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46c-.27-.04-1.2-.12-2.29-.12-2.27 0-3.82 1.38-3.82 3.92v2.18H8.15v2.96h2.58V21h3.07Z" />
      </svg>
    </span>
  );
}

export function MetaBrandEmblem({
  className = "h-12 w-16",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 38"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="metaLoopGrad" x1="4" y1="6" x2="60" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M17.5 8C10.5 8 5.5 14.5 5.5 21.8C5.5 27.6 9.2 31.2 13.9 31.2C18.8 31.2 22.8 26.2 28.4 17.5L31.4 12.9C35.2 7.4 39.2 5.2 44.3 5.2C51.9 5.2 58.5 12.1 58.5 20.6C58.5 27.2 54.4 31.4 49.1 31.4C44.2 31.4 40.3 27.2 35.6 19.6L32.8 15.1"
        stroke="url(#metaLoopGrad)"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 18.8C27.2 26.6 22.8 31.2 16.5 31.2"
        stroke="url(#metaLoopGrad)"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
