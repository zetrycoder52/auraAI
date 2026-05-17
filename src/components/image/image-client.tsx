"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ImagePlus, Loader2, MessageCircleMore, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type Locale, getCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ChatItem = {
  id: string;
  title: string;
  expiresAt: string;
  updatedAt: string;
  preview?: string | null;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  prompt: string | null;
  imageUrl: string | null;
  tokensCharged: number;
  createdAt: string;
};

type ImageClientProps = {
  locale: Locale;
};

type CapabilityStatus = {
  ready: boolean;
  modelAlias: string | null;
  provider: string | null;
  message: string;
};

type ProviderStatusResponse = {
  ai?: {
    chat?: CapabilityStatus;
    image?: CapabilityStatus;
  };
};

const roleMap = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system"
} as const;

export function ImageClient({ locale }: ImageClientProps) {
  const t = getCopy(locale);

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isImageMode, setIsImageMode] = useState(true);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<{
    chat: CapabilityStatus | null;
    image: CapabilityStatus | null;
  }>({
    chat: null,
    image: null
  });
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const totalTokens = useMemo(
    () => messages.reduce((acc, msg) => acc + (msg.tokensCharged ?? 0), 0),
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const response = await fetch("/api/image/chats", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load chats");
      const json = await response.json();
      const items = json.chats ?? [];
      setChats(items);

      if (!activeChat && items.length > 0) {
        setActiveChat(items[0].id);
      }

      if (!activeChat && items.length === 0) {
        const created = await fetch("/api/image/chats", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "AI chat" })
        });
        if (!created.ok) throw new Error("Failed to create chat");
        const createdJson = await created.json();
        setChats([createdJson.chat]);
        setActiveChat(createdJson.chat.id);
      }
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load error");
    } finally {
      setLoadingChats(false);
    }
  }, [activeChat]);

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/image/chats/${chatId}/messages`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load messages");
      const json = await response.json();
      setMessages(json.chat.messages ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load error");
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 40);
    }
  }, [scrollToBottom]);

  const loadProviderStatus = useCallback(async () => {
    setProviderStatusLoading(true);
    try {
      const response = await fetch("/api/providers/status", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load provider status");
      }

      const json = (await response.json()) as ProviderStatusResponse;
      setProviderStatus({
        chat: json.ai?.chat ?? null,
        image: json.ai?.image ?? null
      });
    } catch {
      setProviderStatus({
        chat: null,
        image: null
      });
    } finally {
      setProviderStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    void loadProviderStatus();
  }, [loadProviderStatus]);

  useEffect(() => {
    if (!activeChat) return;
    void loadMessages(activeChat);
  }, [activeChat, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const currentCapability = isImageMode ? providerStatus.image : providerStatus.chat;
  const modeReady = currentCapability?.ready ?? false;

  async function onCreateChat() {
    const response = await fetch("/api/image/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: `Chat ${new Date().toLocaleString()}` })
    });

    if (!response.ok) {
      setError("Failed to create chat");
      return;
    }

    const json = await response.json();
    setChats((prev) => [json.chat, ...prev]);
    setActiveChat(json.chat.id);
    setMessages([]);
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!activeChat || !prompt.trim()) return;
    if (!modeReady) {
      setError(currentCapability?.message ?? "Selected mode is not available");
      return;
    }

    setSubmitting(true);
    setTyping(true);
    setError(null);

    const localUserMessage: Message = {
      id: `local-${Date.now()}`,
      role: "USER",
      prompt,
      imageUrl: null,
      tokensCharged: 0,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, localUserMessage]);
    const sendPrompt = prompt;
    setPrompt("");

    try {
      const response = await fetch(`/api/image/chats/${activeChat}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: sendPrompt,
          image: imageBase64,
          mode: isImageMode ? "image" : "chat"
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Request failed");
      }

      setImageBase64(undefined);
      await Promise.all([loadMessages(activeChat), loadChats()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
      setMessages((prev) => prev.filter((msg) => msg.id !== localUserMessage.id));
    } finally {
      setSubmitting(false);
      setTyping(false);
    }
  }

  return (
    <section className="space-y-4 pb-4">
      <header>
        <h1 className="text-4xl font-black tracking-tight">{t.image.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.image.subtitle}</p>
      </header>

      <div className="premium-card grid min-h-[72vh] overflow-hidden border lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-border/70 bg-card/40 p-3">
          <Button className="w-full justify-start rounded-2xl" variant="secondary" onClick={onCreateChat}>
            <Plus className="mr-2 h-4 w-4" />
            {t.image.newChat}
          </Button>

          <p className="mt-5 px-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t.image.history}
          </p>

          <div className="mt-2 space-y-2">
            {loadingChats ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setActiveChat(chat.id)}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2 text-left transition",
                    activeChat === chat.id
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-card/70 hover:bg-muted/40"
                  )}
                >
                  <p className="truncate text-sm font-semibold">{chat.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{chat.preview ?? "-"}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2">
              <Switch checked={isImageMode} onCheckedChange={setIsImageMode} />
              <p className="text-sm font-medium">
                {isImageMode ? t.image.imageMode : t.image.chatMode}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {t.image.tokens}: <span className="font-semibold text-foreground">{totalTokens.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}</span>
            </p>
          </div>

          {!providerStatusLoading && !modeReady ? (
            <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {currentCapability?.message ?? "Selected mode is not available"}
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="soft-grid min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {loadingMessages ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-border/70 bg-card/70 p-3">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="mt-2 h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-4 w-2/3 rounded-md" />
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 text-3xl font-black">{t.image.empty}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isImageMode ? t.image.modeHelpImage : t.image.modeHelpChat}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-2xl border p-3 md:max-w-[80%]",
                    message.role === "USER"
                      ? "ml-auto border-primary/25 bg-primary/10"
                      : "border-border/70 bg-card/80"
                  )}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t.image.role[roleMap[message.role]]}
                  </p>
                  {message.prompt ? <p className="whitespace-pre-wrap text-sm">{message.prompt}</p> : null}
                  {message.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.imageUrl} alt="Generated" className="mt-3 max-h-[400px] w-auto rounded-xl border border-border/70" />
                  ) : null}
                  {message.tokensCharged > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.image.tokens}: {message.tokensCharged.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
                    </p>
                  ) : null}
                </article>
              ))
            )}

            {typing ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/75 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.image.typing}
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border/70 bg-card/50 p-4">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t.image.placeholder}
              required
              className="min-h-[96px] resize-none rounded-2xl"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-card/75 px-3 py-2 text-sm transition hover:bg-muted/40">
                  <ImagePlus className="h-4 w-4" />
                  {t.image.upload}
                  <Input type="file" accept="image/*" onChange={onUpload} className="hidden" />
                </label>
                {imageBase64 ? (
                  <span className="text-xs text-muted-foreground">{t.image.uploaded}</span>
                ) : null}
              </div>

              <Button type="submit" className="rounded-full px-6" disabled={submitting || !modeReady || providerStatusLoading}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-2 h-4 w-4" />}
                {t.image.send}
              </Button>
            </div>

            {error ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-destructive">
                <MessageCircleMore className="h-4 w-4" />
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
