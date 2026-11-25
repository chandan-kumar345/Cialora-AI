"use client";

import React, { createContext, useContext, useState } from "react";

export interface ClientAuthUser {
  id: string;
  email: string;
  fullName: string;
  workspaceName: string;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  language: string;
  planTier: string;
  createdAt: string;
}

interface WorkspaceContextValue {
  user: ClientAuthUser;
  setUser: React.Dispatch<React.SetStateAction<ClientAuthUser>>;
  aiOpen: boolean;
  openAiAssistant: (prompt?: string) => void;
  closeAiAssistant: () => void;
  aiInitialPrompt: string;
  upgradeOpen: boolean;
  setUpgradeOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  initialUser,
  children,
}: {
  initialUser: ClientAuthUser;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<ClientAuthUser>(initialUser);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const openAiAssistant = (prompt?: string) => {
    if (prompt) setAiInitialPrompt(prompt);
    setAiOpen(true);
  };

  const closeAiAssistant = () => setAiOpen(false);

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        setUser,
        aiOpen,
        openAiAssistant,
        closeAiAssistant,
        aiInitialPrompt,
        upgradeOpen,
        setUpgradeOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return ctx;
}
