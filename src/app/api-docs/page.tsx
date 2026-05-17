
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">AuraAI API docs</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-slate-100 px-2 py-1">{appUrl}/v1</code>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Available endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm">
          <p>GET /v1/models</p>
          <p>POST /v1/chat/completions</p>
          <p>POST /v1/responses</p>
          <p>POST /v1/embeddings</p>
          <p>POST /v1/images/generations</p>
          <p>GET /backend-api/codex</p>
          <p>POST /backend-api/codex</p>
          <p>WS /backend-api/codex/ws</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Quick test</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{`curl ${appUrl}/v1/models \\
  -H "Authorization: Bearer aura_live_xxx"`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Codex bootstrap</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{`$env:AURAAI_API_KEY='aura_live_xxx'; iex(irm '${appUrl}/icw')`}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}


