"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  Code2,
  Copy,
  Globe,
  Laptop,
  Monitor,
  MousePointer2,
  Server,
  SquareTerminal
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { type Locale, getCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type InstructionIdeId =
  | "vscode"
  | "codex"
  | "codex_cli"
  | "cursor"
  | "jetbrains"
  | "zed"
  | "opencode"
  | "openclaw";

type InstructionOsId = "windows" | "linux" | "macos" | "any";

type InstructionsClientProps = {
  locale: Locale;
  appUrl: string;
  providerId: string;
  providerName: string;
  apiKeyMasked: string;
  models: string[];
};

const ideList: Array<{ id: InstructionIdeId; label: string; note: string }> = [
  { id: "vscode", label: "VS Code", note: "Codex Extension" },
  { id: "codex", label: "Codex Desktop", note: "Standalone app" },
  { id: "codex_cli", label: "Codex CLI", note: "Terminal workflow" },
  { id: "cursor", label: "Cursor", note: "Manual setup" },
  { id: "jetbrains", label: "JetBrains", note: "AI Assistant BYOK" },
  { id: "zed", label: "Zed", note: "OpenAI-compatible" },
  { id: "opencode", label: "OpenCode", note: "Provider config" },
  { id: "openclaw", label: "OpenClaw", note: "Gateway provider" }
];

const osList: Array<{ id: InstructionOsId; label: string; note: string }> = [
  { id: "windows", label: "Windows", note: "PowerShell setup" },
  { id: "linux", label: "Linux", note: "Server / local shell" },
  { id: "macos", label: "macOS", note: "Terminal profile" },
  { id: "any", label: "Any OS", note: "Manual config" }
];

const ideOsMap: Record<InstructionIdeId, InstructionOsId[]> = {
  vscode: ["windows", "linux", "macos", "any"],
  codex: ["windows", "linux", "macos"],
  codex_cli: ["windows", "linux", "macos"],
  cursor: ["any"],
  jetbrains: ["any"],
  zed: ["any"],
  opencode: ["any"],
  openclaw: ["any"]
};

function ideTitle(ide: InstructionIdeId) {
  switch (ide) {
    case "vscode":
      return "VS Code";
    case "codex":
      return "Codex App";
    case "codex_cli":
      return "Codex CLI";
    case "cursor":
      return "Cursor";
    case "jetbrains":
      return "JetBrains";
    case "zed":
      return "Zed";
    case "opencode":
      return "OpenCode";
    case "openclaw":
      return "OpenClaw";
  }
}

const ideIconMap = {
  vscode: Code2,
  codex: Bot,
  codex_cli: SquareTerminal,
  cursor: MousePointer2,
  jetbrains: Braces,
  zed: Monitor,
  opencode: Code2,
  openclaw: Globe
} as const;

const osIconMap = {
  windows: Monitor,
  linux: Server,
  macos: Laptop,
  any: Globe
} as const;

function buildShortScript(appUrl: string, rawApiKey: string | null, ide: InstructionIdeId, os: InstructionOsId) {
  const keyHint = rawApiKey ?? "<YOUR_API_KEY>";

  if (ide === "cursor") {
    return [
      "Cursor Settings -> Models",
      `OpenAI API Key: ${keyHint}`,
      `Override Base URL: ${appUrl}/v1`,
      "Custom model: gpt-5.4",
      "Save and Verify"
    ].join("\n");
  }

  if (os === "windows") {
    return `$env:AURAAI_API_KEY='${keyHint}'; iex(irm '${appUrl}/icw')`;
  }

  return `AURAAI_API_KEY='${keyHint}' bash <(curl -fsSL '${appUrl}/icw')`;
}

function buildFullScript(appUrl: string, os: InstructionOsId, rawApiKey: string | null) {
  const keyHint = rawApiKey ?? "<YOUR_API_KEY>";
  const scriptBase = os === "windows"
    ? [
        `$env:AURAAI_API_KEY='${keyHint}'`,
        `$script='${appUrl}/icw'`,
        "iex (irm $script)"
      ]
    : [
        `export AURAAI_API_KEY='${keyHint}'`,
        `curl -fsSL '${appUrl}/icw' | bash`
      ];

  return scriptBase.join("\n");
}

function buildRestoreScript(appUrl: string, os: InstructionOsId, rawApiKey: string | null) {
  const keyHint = rawApiKey ?? "<YOUR_API_KEY>";
  if (os === "windows") {
    return `$env:AURAAI_API_KEY='${keyHint}'; iex(irm '${appUrl}/icw'); auraai-restore`;
  }

  return `AURAAI_API_KEY='${keyHint}' bash <(curl -fsSL '${appUrl}/icw') -- --restore`;
}

export function InstructionsClient({
  locale,
  appUrl,
  providerId,
  providerName,
  apiKeyMasked,
  models
}: InstructionsClientProps) {
  const t = getCopy(locale);
  const [ide, setIde] = useState<InstructionIdeId>("vscode");
  const [os, setOs] = useState<InstructionOsId>("windows");
  const [copied, setCopied] = useState<string | null>(null);
  const [scriptApiKey, setScriptApiKey] = useState<string | null>(null);
  const [loadingScriptKey, setLoadingScriptKey] = useState(true);

  const availableOs = ideOsMap[ide];
  const safeOs = availableOs.includes(os) ? os : availableOs[0];
  const storageKey = useMemo(
    () => `auraai.instructions.rawKey:${appUrl}:${apiKeyMasked.slice(-4)}`,
    [apiKeyMasked, appUrl]
  );

  const shortScript = useMemo(() => buildShortScript(appUrl, scriptApiKey, ide, safeOs), [appUrl, scriptApiKey, ide, safeOs]);
  const fullScript = useMemo(() => buildFullScript(appUrl, safeOs, scriptApiKey), [appUrl, safeOs, scriptApiKey]);
  const restoreScript = useMemo(() => buildRestoreScript(appUrl, safeOs, scriptApiKey), [appUrl, safeOs, scriptApiKey]);

  useEffect(() => {
    let cancelled = false;

    async function ensureScriptKey() {
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(storageKey);
        if (cached) {
          setScriptApiKey(cached);
          setLoadingScriptKey(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/instructions/bootstrap-key", {
          method: "POST",
          headers: { "content-type": "application/json" }
        });

        if (!response.ok) {
          return;
        }

        const json = await response.json();
        if (typeof json?.rawKey === "string" && json.rawKey) {
          if (!cancelled) {
            setScriptApiKey(json.rawKey);
          }
          if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, json.rawKey);
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingScriptKey(false);
        }
      }
    }

    void ensureScriptKey();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  function onCopy(value: string, key: string) {
    navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <section className="space-y-6 pb-6">
      <header className="space-y-3">
        <h1 className="text-4xl font-black tracking-tight">{t.instructions.title}</h1>
        <p className="text-muted-foreground">{t.instructions.subtitle}</p>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mr-2 inline-block h-4 w-4" />
          {t.instructions.warn}
        </div>
      </header>

      <article className="premium-card p-5">
        <h2 className="text-lg font-bold">{t.instructions.providerInfo}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.providerId}</p>
            <p className="mt-2 font-mono text-sm">{providerId}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.providerName}</p>
            <p className="mt-2 text-sm">{providerName}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.apiKey}</p>
            <p className="mt-2 font-mono text-sm">{apiKeyMasked}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.baseUrl}</p>
            <p className="mt-2 font-mono text-sm">{appUrl}/v1</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.modelsEndpoint}</p>
            <p className="mt-2 font-mono text-sm">{appUrl}/v1/models</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.chatEndpoint}</p>
            <p className="mt-2 font-mono text-sm">{appUrl}/v1/chat/completions</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.responsesEndpoint}</p>
            <p className="mt-2 font-mono text-sm">{appUrl}/v1/responses</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.codexEndpoint}</p>
            <p className="mt-2 font-mono text-sm">{appUrl}/backend-api/codex</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.wsEndpoint}</p>
            <p className="mt-2 font-mono text-sm">{appUrl.replace("http", "ws")}/backend-api/codex/ws</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.modelsAllowed}</p>
            <p className="mt-2 text-sm">{models.join(", ")}</p>
          </div>
        </div>
      </article>

      <article className="premium-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.choose}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ideList.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIde(item.id)}
              className={cn(
                "rounded-2xl border p-3 text-left transition",
                ide === item.id ? "border-primary bg-primary/10" : "border-border/70 bg-card/65 hover:bg-muted/40"
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/70">
                {(() => {
                  const Icon = ideIconMap[item.id];
                  return <Icon className="h-4 w-4 text-primary" />;
                })()}
              </span>
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.instructions.os}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {osList
            .filter((item) => availableOs.includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOs(item.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  safeOs === item.id ? "border-primary bg-primary/10" : "border-border/70 bg-card/65 hover:bg-muted/40"
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/70">
                  {(() => {
                    const Icon = osIconMap[item.id];
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                </span>
                <p className="font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </button>
            ))}
        </div>
      </article>

      <article className="premium-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{ideTitle(ide)}</p>
        <h3 className="mt-2 text-3xl font-black">{ideTitle(ide)} + {safeOs}</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 1</p>
            <p className="mt-2 text-sm">
              {safeOs === "windows"
                ? "Open PowerShell on the same machine where the client runs."
                : "Open terminal on the same machine/server where the client runs."}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 2</p>
            <p className="mt-2 text-sm">Run short script once and wait for provider setup confirmation.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 3</p>
            <p className="mt-2 text-sm">Restart client app/extension and verify model list.</p>
          </div>
        </div>
      </article>

      <article className="premium-card p-5">
        <h3 className="text-2xl font-bold">{t.instructions.shortScript}</h3>
        {!loadingScriptKey && scriptApiKey ? (
          <p className="mt-2 text-xs text-muted-foreground">API key was inserted automatically into this command.</p>
        ) : null}
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
          <code>{shortScript}</code>
        </pre>
        <Button className="mt-3" variant="outline" onClick={() => onCopy(shortScript, "short")}>
          {copied === "short" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied === "short" ? t.common.copied : t.common.copy}
        </Button>
      </article>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="full-script">
          <AccordionTrigger>{t.instructions.fullScript}</AccordionTrigger>
          <AccordionContent>
            <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
              <code>{fullScript}</code>
            </pre>
            <Button className="mt-3" variant="outline" onClick={() => onCopy(fullScript, "full")}>
              {copied === "full" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === "full" ? t.common.copied : t.common.copy}
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="restore">
          <AccordionTrigger>{t.instructions.restoreTitle}</AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-sm text-muted-foreground">{t.instructions.restoreText}</p>
            <pre className="overflow-x-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <code>{restoreScript}</code>
            </pre>
            <Button className="mt-3" variant="outline" onClick={() => onCopy(restoreScript, "restore")}>
              {copied === "restore" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === "restore" ? t.common.copied : t.common.copy}
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <article className="premium-card p-5">
        <h3 className="text-2xl font-bold">{t.instructions.troubleshoot}</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <Monitor className="h-4 w-4 text-primary" />
              401 at api.openai.com
            </div>
            <p className="text-sm text-muted-foreground">
              Client still uses direct OpenAI config. Re-run short script on the same machine and restart IDE/client.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <SquareTerminal className="h-4 w-4 text-primary" />
              Missing API key env
            </div>
            <p className="text-sm text-muted-foreground">
              Ensure `AURAAI_API_KEY` is set in user environment. On remote workspace run script on remote host.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <Server className="h-4 w-4 text-primary" />
              No custom base URL field
            </div>
            <p className="text-sm text-muted-foreground">
              Some client builds hide override URL. Use VS Code extension or Codex App fallback flow.
            </p>
          </div>
        </div>
      </article>

      <article className="premium-card p-5">
        <h3 className="text-2xl font-bold">{t.instructions.manualTitle}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">OpenAI Base URL</p>
            <p className="mt-2 font-mono">{appUrl}/v1</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Responses API</p>
            <p className="mt-2 font-mono">{appUrl}/v1/responses</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">WebSocket</p>
            <p className="mt-2 font-mono">{appUrl.replace("http", "ws")}/backend-api/codex/ws</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">API Key</p>
            <p className="mt-2 font-mono">{apiKeyMasked}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Default Model</p>
            <p className="mt-2 font-mono">{models[0] ?? "gpt-5.4"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alternative Models</p>
            <p className="mt-2">{models.slice(1).join(", ") || "-"}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
