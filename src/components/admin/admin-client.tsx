"use client";

import { useEffect, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type AdminStats = {
  usersCount: number;
  activeKeys: number;
  requestsLast7d: number;
  errorsLast7d: number;
  revenueTokens: number;
};

export function AdminClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState(100000);

  async function loadData() {
    setStatus(null);
    const [statsRes, usersRes, reqRes, keysRes, modelsRes, providersRes] = await Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/requests", { cache: "no-store" }),
      fetch("/api/admin/keys", { cache: "no-store" }),
      fetch("/api/admin/models", { cache: "no-store" }),
      fetch("/api/admin/providers", { cache: "no-store" })
    ]);

    if ([statsRes, usersRes, reqRes, keysRes, modelsRes, providersRes].some((response) => !response.ok)) {
      setStatus("Failed to load admin data");
      return;
    }

    const statsJson = await statsRes.json();
    const usersJson = await usersRes.json();
    const requestsJson = await reqRes.json();
    const keysJson = await keysRes.json();
    const modelsJson = await modelsRes.json();
    const providersJson = await providersRes.json();

    setStats(statsJson.stats);
    setUsers(usersJson.users ?? []);
    setRequests(requestsJson.requests ?? []);
    setKeys(keysJson.keys ?? []);
    setModels(modelsJson.models ?? []);
    setProviders(providersJson.providers ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function grantTokens(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}/grant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: Number(grantAmount), reason: "Manual admin grant" })
    });

    if (!response.ok) {
      setStatus("Failed to grant tokens");
      return;
    }

    await loadData();
  }

  async function toggleBan(userId: string, banned: boolean) {
    const response = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ banned: !banned, reason: !banned ? "Banned by admin" : null })
    });

    if (!response.ok) {
      setStatus("Failed to update ban");
      return;
    }

    await loadData();
  }

  async function revokeKey(keyId: string) {
    const response = await fetch(`/api/admin/keys/${keyId}/revoke`, { method: "POST" });
    if (!response.ok) {
      setStatus("Failed to revoke key");
      return;
    }

    await loadData();
  }

  return (
    <div className="space-y-6 pb-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin panel</h1>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={grantAmount}
            onChange={(event) => setGrantAmount(Number(event.target.value))}
            className="w-40"
          />
          <Badge variant="outline">Grant amount</Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-sm">Users</CardTitle>
            <p className="text-2xl font-semibold">{stats?.usersCount ?? 0}</p>
          </CardHeader>
        </Card>
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-sm">Active keys</CardTitle>
            <p className="text-2xl font-semibold">{stats?.activeKeys ?? 0}</p>
          </CardHeader>
        </Card>
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-sm">Requests 7d</CardTitle>
            <p className="text-2xl font-semibold">{stats?.requestsLast7d ?? 0}</p>
          </CardHeader>
        </Card>
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-sm">Errors 7d</CardTitle>
            <p className="text-2xl font-semibold">{stats?.errorsLast7d ?? 0}</p>
          </CardHeader>
        </Card>
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-sm">Revenue tokens</CardTitle>
            <p className="text-2xl font-semibold">{stats?.revenueTokens ?? 0}</p>
          </CardHeader>
        </Card>
      </section>

      {status ? <p className="text-sm text-destructive">{status}</p> : null}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.tokenBalance}</TableCell>
                  <TableCell>
                    <Badge variant={user.isBanned ? "destructive" : "default"}>
                      {user.isBanned ? "BANNED" : "ACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => grantTokens(user.id)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Grant
                    </Button>
                    <Button size="sm" variant={user.isBanned ? "secondary" : "destructive"} onClick={() => toggleBan(user.id, user.isBanned)}>
                      {user.isBanned ? "Unban" : "Ban"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.userEmail}</TableCell>
                  <TableCell className="font-mono text-xs">{key.maskedKey}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{key.status}</Badge>
                  </TableCell>
                  <TableCell>{key.totalRequests}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => revokeKey(key.id)}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Model configs</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model ID</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>{model.alias}</TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell>{model.providerModelId}</TableCell>
                    <TableCell>{model.priceMultiplier}</TableCell>
                    <TableCell>{String(model.enabled)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Providers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>{provider.type}</TableCell>
                    <TableCell className="font-mono text-xs">{provider.baseUrl}</TableCell>
                    <TableCell>
                      <Badge variant={provider.enabled ? "default" : "secondary"}>
                        {provider.enabled ? "ON" : "OFF"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Requests log
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{new Date(request.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{request.userEmail ?? "-"}</TableCell>
                  <TableCell>{request.model}</TableCell>
                  <TableCell className="font-mono text-xs">{request.endpoint}</TableCell>
                  <TableCell>{request.statusCode}</TableCell>
                  <TableCell>{request.totalTokens}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
