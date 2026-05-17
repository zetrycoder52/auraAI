"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Coins,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Gem,
  KeyRound,
  Landmark,
  Loader2,
  PlusCircle,
  Search,
  Send,
  ShieldCheck,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Locale, getCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DashboardStats = {
  tokenBalance: number;
  totalRequests7d: number;
  totalTokens7d: number;
  estimatedOpenAIDollar: number;
  apiKey: {
    id: string;
    name: string;
    maskedKey: string;
    lastUsedAt: string | null;
  } | null;
};

type ApiKeyRow = {
  id: string;
  name: string;
  maskedKey: string;
  status: string;
  lastUsedAt: string | null;
  totalRequests: number;
  totalTokens: number;
};

type LogRow = {
  id: string;
  time: string;
  model: string;
  transport: string;
  status: number;
  tokens: number;
  error: string | null;
  endpoint: string;
  latency: number;
  cost: number;
};

type LogPagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PaymentProvider = {
  id: "yoomoney" | "sbp" | "cryptobot" | "heleket" | "lzt";
  name: string;
  description: string;
  enabled: boolean;
};

type AdminUser = {
  id: string;
  email: string;
};

type DashboardClientProps = {
  locale: Locale;
  isAdmin: boolean;
  currentUserId: string;
};

function formatNumber(value: number, locale: Locale) {
  return value.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}

function formatCurrency(value: number, locale: Locale) {
  return value.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function getStatusVariant(status: number) {
  if (status >= 500) return "destructive";
  if (status >= 400) return "secondary";
  return "default";
}

function quoteFromAmount(amountRubRaw: number) {
  const amountRub = Math.max(100, Math.floor(amountRubRaw));
  const bonusPercent = amountRub >= 3000 ? 19 : amountRub >= 600 ? 12 : amountRub >= 150 ? 6 : 0;
  const baseTokens = amountRub * 340_000;
  const bonusTokens = Math.floor(baseTokens * (bonusPercent / 100));
  const totalTokens = baseTokens + bonusTokens;
  const effectiveRubPerMillion = Number((amountRub / (totalTokens / 1_000_000)).toFixed(2));

  return {
    amountRub,
    bonusPercent,
    bonusTokens,
    totalTokens,
    effectiveRubPerMillion
  };
}

const paymentProviderIcon = {
  yoomoney: Wallet,
  sbp: Landmark,
  cryptobot: Coins,
  heleket: ShieldCheck,
  lzt: Gem
} as const;

export function DashboardClient({ locale, isAdmin, currentUserId }: DashboardClientProps) {
  const t = getCopy(locale);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [graph, setGraph] = useState<Array<{ date: string; tokens: number }>>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logPagination, setLogPagination] = useState<LogPagination>({
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [loadingGrant, setLoadingGrant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);

  const [newKeyName, setNewKeyName] = useState("Primary key");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const [query, setQuery] = useState("");
  const [transport, setTransport] = useState<"all" | "HTTP" | "WS">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [topupOpen, setTopupOpen] = useState(false);
  const [providers, setProviders] = useState<PaymentProvider[]>([
    { id: "yoomoney", name: "YooMoney", description: "Fallback provider", enabled: true }
  ]);
  const [providerId, setProviderId] = useState<PaymentProvider["id"]>("yoomoney");
  const [amountRub, setAmountRub] = useState(500);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTopupMode, setAdminTopupMode] = useState<"self" | "other">("self");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [grantTokens, setGrantTokens] = useState(100_000);
  const [grantReason, setGrantReason] = useState("Manual grant");

  const quote = useMemo(() => quoteFromAmount(amountRub), [amountRub]);

  const loadStatsAndKeys = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsRes, keysRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }),
        fetch("/api/keys", { cache: "no-store" })
      ]);

      if (!statsRes.ok || !keysRes.ok) {
        throw new Error("Failed to load dashboard");
      }

      const statsJson = await statsRes.json();
      const keysJson = await keysRes.json();

      setStats(statsJson.stats);
      setGraph(statsJson.graph ?? []);
      setKeys(keysJson.keys ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (query.trim()) params.set("query", query.trim());
      if (transport !== "all") params.set("transport", transport);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/dashboard/logs?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load logs");

      const json = await response.json();
      setLogs(json.logs ?? []);
      setLogPagination(
        json.pagination ?? {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1
        }
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  }, [page, pageSize, query, transport, statusFilter]);

  const loadPaymentProviders = useCallback(async () => {
    const response = await fetch("/api/payments/create", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json();
    const rows: PaymentProvider[] = json.providers ?? [];
    setProviders(rows);
    setProviderId((prev) => (rows.length && !rows.find((item) => item.id === prev) ? rows[0].id : prev));
  }, []);

  const loadAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json();
    const users = (json.users ?? []).map((item: any) => ({ id: item.id, email: item.email }));
    setAdminUsers(users);
    setTargetUserId((prev) => {
      if (prev) return prev;
      return users[0]?.id ?? "";
    });
  }, [isAdmin]);

  useEffect(() => {
    void loadStatsAndKeys();
    void loadPaymentProviders();
    void loadAdminUsers();
  }, [loadAdminUsers, loadPaymentProviders, loadStatsAndKeys]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, 220);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadStatsAndKeys();
      void loadLogs();
    }, 20_000);

    return () => clearInterval(interval);
  }, [loadLogs, loadStatsAndKeys]);

  async function onCreateKey() {
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newKeyName })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? "Failed to create key");
      return;
    }

    const data = await response.json();
    setNewRawKey(data.rawKey ?? null);
    setShowRaw(true);
    await loadStatsAndKeys();
  }

  async function onCopy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function onCreatePayment() {
    setTopupError(null);
    setTopupSuccess(null);
    setLoadingTopup(true);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          amountRub
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? t.dashboard.topupModal.createError);
      }

      const paymentUrl = json?.paymentUrl as string | undefined;
      if (!paymentUrl) {
        throw new Error(t.dashboard.topupModal.createError);
      }

      window.open(paymentUrl, "_blank", "noopener,noreferrer");
      setTopupSuccess(providerId === "yoomoney" ? "YooMoney opened" : "Payment created");
    } catch (createError) {
      setTopupError(createError instanceof Error ? createError.message : t.dashboard.topupModal.createError);
    } finally {
      setLoadingTopup(false);
    }
  }

  async function onGrantTokens() {
    if (!isAdmin) return;
    if (!targetUserId && adminTopupMode === "other") {
      setTopupError(t.dashboard.topupModal.grantError);
      return;
    }

    const resolvedUserId = adminTopupMode === "self" ? currentUserId : targetUserId;
    setTopupError(null);
    setTopupSuccess(null);
    setLoadingGrant(true);

    try {
      if (!resolvedUserId) {
        throw new Error(t.dashboard.topupModal.grantError);
      }

      const response = await fetch(`/api/admin/users/${resolvedUserId}/grant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: Math.max(1, Math.floor(grantTokens)),
          reason: grantReason || "Manual grant"
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? t.dashboard.topupModal.grantError);
      }

      setTopupSuccess(t.dashboard.topupModal.grantSuccess);
      await loadStatsAndKeys();
    } catch (grantError) {
      setTopupError(grantError instanceof Error ? grantError.message : t.dashboard.topupModal.grantError);
    } finally {
      setLoadingGrant(false);
    }
  }

  const chartData = useMemo(
    () =>
      graph.map((item) => ({
        ...item,
        label: new Date(item.date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
          day: "2-digit",
          month: "2-digit"
        })
      })),
    [graph, locale]
  );

  const selectedProvider = providers.find((item) => item.id === providerId);

  return (
    <div className="space-y-6 pb-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.logsSubtitle}</p>
        </div>
        <Button className="rounded-full px-6" onClick={() => setTopupOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          {t.dashboard.topup}
        </Button>
      </section>

      <div className="surface-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <p className="text-sm font-medium">{t.dashboard.bonusBanner}</p>
        <Button variant="secondary" size="sm" className="rounded-full">
          <Send className="mr-2 h-4 w-4" />
          {t.dashboard.bonusAction}
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loadingStats ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card className="premium-card">
              <CardHeader>
                <CardDescription>{t.dashboard.stats.tokens}</CardDescription>
                <CardTitle className="text-3xl">{formatNumber(stats?.tokenBalance ?? 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="premium-card">
              <CardHeader>
                <CardDescription>{t.dashboard.stats.requests7d}</CardDescription>
                <CardTitle className="text-3xl">{formatNumber(stats?.totalRequests7d ?? 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="premium-card">
              <CardHeader>
                <CardDescription>{t.dashboard.stats.tokens7d}</CardDescription>
                <CardTitle className="text-3xl">{formatNumber(stats?.totalTokens7d ?? 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="premium-card">
              <CardHeader>
                <CardDescription>{t.dashboard.stats.openaiSpend}</CardDescription>
                <CardTitle className="text-3xl">${formatCurrency(stats?.estimatedOpenAIDollar ?? 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <Card className="premium-card min-h-[340px]">
          <CardHeader>
            <CardTitle>{t.dashboard.usageChart}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] min-w-0">
            {loadingStats ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="aura-usage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" fill="url(#aura-usage)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>{t.dashboard.keyTitle}</CardTitle>
              <CardDescription>{stats?.apiKey?.name ?? "Primary key"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 font-mono text-xs">
                {showRaw && newRawKey ? newRawKey : stats?.apiKey?.maskedKey ?? t.dashboard.keyPlaceholder}
              </div>

              <div className="flex flex-wrap gap-2">
                {newRawKey ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowRaw((value) => !value)}>
                      {showRaw ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                      {showRaw ? t.dashboard.hideKey : t.dashboard.revealKey}
                    </Button>
                    <Button size="sm" onClick={() => onCopy(newRawKey)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {t.dashboard.copyKey}
                    </Button>
                  </>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Input value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} />
                <Button onClick={onCreateKey}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {t.dashboard.createKey}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle>{t.dashboard.billingRules}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center justify-between">
                <span>GPT-5.4 low / medium / high / xhigh</span>
                <strong className="text-foreground">x1</strong>
              </p>
              <p className="flex items-center justify-between">
                <span>GPT-5.5 low / medium / high / xhigh</span>
                <strong className="text-foreground">x4.5</strong>
              </p>
              <p className="flex items-center justify-between">
                <span>Codex 5.3 / GPT-5.4 mini</span>
                <strong className="text-foreground">x0.9</strong>
              </p>
              <p className="flex items-center justify-between">
                <span>Fast speed / priority</span>
                <strong className="text-foreground">x2</strong>
              </p>
              <p className="text-xs">{t.dashboard.billingHint}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="premium-card">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>{t.dashboard.logs}</CardTitle>
            <CardDescription>{t.dashboard.logsSubtitle}</CardDescription>
          </div>
          <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.6fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder={t.dashboard.filters.query}
                className="pl-9"
              />
            </div>

            <select
              value={transport}
              onChange={(event) => {
                setPage(1);
                setTransport(event.target.value as "all" | "HTTP" | "WS");
              }}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">{`${t.dashboard.filters.transport}: ${t.common.all}`}</option>
              <option value="HTTP">HTTP</option>
              <option value="WS">WS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">{`${t.dashboard.filters.status}: ${t.common.all}`}</option>
              <option value="200">200</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="402">402</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="429">429</option>
              <option value="500">500</option>
              <option value="502">502</option>
              <option value="503">503</option>
            </select>

            <select
              value={String(pageSize)}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="10">{t.dashboard.filters.pageSize}: 10</option>
              <option value="25">{t.dashboard.filters.pageSize}: 25</option>
              <option value="50">{t.dashboard.filters.pageSize}: 50</option>
              <option value="100">{t.dashboard.filters.pageSize}: 100</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.table.time}</TableHead>
                  <TableHead>{t.dashboard.table.model}</TableHead>
                  <TableHead>{t.dashboard.table.transport}</TableHead>
                  <TableHead>{t.dashboard.table.status}</TableHead>
                  <TableHead>{t.dashboard.table.tokens}</TableHead>
                  <TableHead>{t.dashboard.table.error}</TableHead>
                  <TableHead>{t.dashboard.table.endpoint}</TableHead>
                  <TableHead>{t.dashboard.table.latency}</TableHead>
                  <TableHead>{t.dashboard.table.cost}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLogs ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-6 w-full rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      {t.common.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.time).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{log.model}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.transport}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>{formatNumber(log.tokens, locale)}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-destructive">
                        {log.error ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">{log.endpoint}</TableCell>
                      <TableCell>{log.latency} ms</TableCell>
                      <TableCell>{formatNumber(log.cost, locale)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              {formatNumber(logPagination.total, locale)} / {formatNumber(logPagination.totalPages, locale)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loadingLogs}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </Button>
              <span className="rounded-lg border border-border/70 px-3 py-1">{page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= logPagination.totalPages || loadingLogs}
                onClick={() => setPage((prev) => Math.min(logPagination.totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="grid gap-0 md:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-5 p-6">
              <DialogHeader>
                <DialogTitle>{t.dashboard.topupModal.title}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t.dashboard.topupModal.provider}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setProviderId(provider.id)}
                      className={cn(
                        "rounded-2xl border p-3 text-left text-sm transition",
                        providerId === provider.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/70 bg-card/60",
                        !provider.enabled && "opacity-50"
                      )}
                    >
                      <div className="inline-flex items-center gap-2">
                        {(() => {
                          const Icon = paymentProviderIcon[provider.id];
                          return <Icon className="h-4 w-4 text-primary" />;
                        })()}
                        <p className="font-semibold">{provider.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t.dashboard.topupModal.amount}
                </p>
                <Input
                  value={amountRub}
                  min={100}
                  max={1_000_000}
                  type="number"
                  onChange={(event) => setAmountRub(Number(event.target.value))}
                />
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={50}
                  value={Math.max(100, Math.min(5000, amountRub))}
                  onChange={(event) => setAmountRub(Number(event.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {isAdmin ? (
                <div className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t.dashboard.topupModal.adminMode}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={adminTopupMode === "self" ? "secondary" : "outline"}
                      onClick={() => setAdminTopupMode("self")}
                    >
                      {t.dashboard.topupModal.self}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={adminTopupMode === "other" ? "secondary" : "outline"}
                      onClick={() => setAdminTopupMode("other")}
                    >
                      {t.dashboard.topupModal.other}
                    </Button>
                  </div>

                  {adminTopupMode === "other" ? (
                    <select
                      value={targetUserId}
                      onChange={(event) => setTargetUserId(event.target.value)}
                      className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {adminUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      type="number"
                      min={1}
                      value={grantTokens}
                      onChange={(event) => setGrantTokens(Number(event.target.value))}
                      placeholder={t.dashboard.topupModal.grantAmount}
                    />
                    <Input
                      value={grantReason}
                      onChange={(event) => setGrantReason(event.target.value)}
                      placeholder={t.dashboard.topupModal.grantReason}
                    />
                  </div>

                  <Button onClick={onGrantTokens} disabled={loadingGrant}>
                    {loadingGrant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {t.dashboard.topupModal.grantAction}
                  </Button>
                </div>
              ) : null}

              {topupError ? <p className="text-sm text-destructive">{topupError}</p> : null}
              {topupSuccess ? (
                <p className="inline-flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {topupSuccess}
                </p>
              ) : null}
            </div>

            <aside className="border-l border-border/70 bg-muted/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t.dashboard.topupModal.total}</p>
              <p className="mt-3 text-5xl font-black">{formatNumber(quote.amountRub, locale)} ₽</p>

              <div className="mt-5 space-y-3 text-sm">
                <p className="flex items-center justify-between">
                  <span>{t.dashboard.topupModal.bonus}</span>
                  <strong>+{quote.bonusPercent}%</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.dashboard.table.tokens}</span>
                  <strong>{formatNumber(quote.totalTokens, locale)}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.dashboard.topupModal.effective}</span>
                  <strong>~{quote.effectiveRubPerMillion} ₽ / 1M</strong>
                </p>
              </div>

              <Button
                className="mt-7 w-full rounded-full"
                disabled={loadingTopup || !selectedProvider?.enabled}
                onClick={onCreatePayment}
              >
                {loadingTopup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t.dashboard.topupModal.next}
              </Button>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
