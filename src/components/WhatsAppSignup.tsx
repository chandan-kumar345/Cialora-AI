"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Config = { appId: string; configId: string; solutionId: string; version: string };
type Facebook = {
  init(options: { appId: string; version: string; xfbml: boolean }): void;
  login(callback: (response: { authResponse?: { code?: string } }) => void, options: object): void;
};
type Attempt = { code?: string; wabaId?: string; phoneNumberId?: string; timer?: number };

export default function WhatsAppSignup({ onConnected }: { onConnected: () => void }) {
  const [config, setConfig] = useState<Config>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sdk = useRef<Facebook | undefined>(undefined);
  const active = useRef<Attempt | undefined>(undefined);
  const connected = useRef(onConnected);
  connected.current = onConnected;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/integrations/whatsapp/signup", { signal: controller.signal, cache: "no-store" })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setConfig(data);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message || "Unable to load Facebook signup."); });

    function receive(event: MessageEvent) {
      const attempt = active.current;
      if (!attempt || !["https://www.facebook.com", "https://web.facebook.com"].includes(event.origin)) return;
      let message;
      try { message = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (message?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (message.event === "FINISH") {
        attempt.wabaId = message.data?.waba_id;
        attempt.phoneNumberId = message.data?.phone_number_id;
        if (!attempt.wabaId || !attempt.phoneNumberId) fail("Complete signup with a WhatsApp phone number.");
        else void finish(attempt);
      } else if (message.event === "CANCEL" || message.event === "ERROR") {
        fail("Facebook signup did not complete. You can try again.");
      }
    }
    window.addEventListener("message", receive);
    return () => {
      controller.abort();
      window.removeEventListener("message", receive);
      clearTimeout(active.current?.timer);
      active.current = undefined;
    };
  }, []);

  function fail(message: string) {
    clearTimeout(active.current?.timer);
    active.current = undefined;
    setBusy(false);
    setError(message);
  }

  async function finish(attempt: Attempt) {
    if (active.current !== attempt || !attempt.code || !attempt.wabaId || !attempt.phoneNumberId) return;
    clearTimeout(attempt.timer);
    active.current = undefined;
    try {
      const { code, wabaId, phoneNumberId } = attempt;
      const res = await fetch("/api/integrations/whatsapp/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, wabaId, phoneNumberId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      connected.current();
    } catch (err) {
      fail(err instanceof Error ? err.message : "Unable to save the connection.");
    }
  }

  function launch() {
    if (!config || !sdk.current || busy) return;
    const attempt: Attempt = {};
    active.current = attempt;
    setBusy(true);
    setError("");
    attempt.timer = window.setTimeout(() => fail("Signup timed out. Please try again."), 15 * 60_000);
    try {
      sdk.current.login(response => {
        if (active.current !== attempt) return;
        attempt.code = response.authResponse?.code;
        if (!attempt.code) return fail("Facebook login was closed before authorization.");
        clearTimeout(attempt.timer);
        attempt.timer = window.setTimeout(() => fail("Facebook did not return the phone number. Retry signup."), 15000);
        void finish(attempt);
      }, {
        config_id: config.configId, response_type: "code", override_default_response_type: true,
        extras: { version: "v4", sessionInfoVersion: "3", setup: { solutionID: config.solutionId } },
      });
    } catch {
      fail("Unable to open Facebook login. Allow pop-ups and try again.");
    }
  }

  return <div className="mt-4 space-y-2">
    {config && <Script src="https://connect.facebook.net/en_US/sdk.js"
      onReady={() => {
        sdk.current = (window as Window & { FB?: Facebook }).FB;
        sdk.current?.init({ appId: config.appId, version: config.version, xfbml: false });
        setReady(Boolean(sdk.current));
      }} onError={() => setError("Facebook login could not load. Check your browser settings and reopen this dialog.")} />}
    <button type="button" disabled={!ready || busy} onClick={launch}
      className="cielora-gradient-btn rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
      {busy ? "Connecting…" : "Continue with Facebook"}
    </button>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
  </div>;
}
