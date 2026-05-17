const http = require("http");
const next = require("next");
const { loadEnvConfig } = require("@next/env");
const { WebSocketServer } = require("ws");
const { URL } = require("url");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

if (dev) {
  if (process.env.AURAAI_DEV_USE_DATABASE_URL !== "1") {
    const devDbPath = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
    process.env.DATABASE_URL = `file:${devDbPath}`;
  }
  process.env.JWT_ACCESS_SECRET ||= "auraai_dev_access_secret_32_chars_min";
  process.env.JWT_REFRESH_SECRET ||= "auraai_dev_refresh_secret_32_chars_min";
  process.env.NEXT_PUBLIC_APP_URL ||= `http://localhost:${port}`;
}

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

function parseApiKeyFromRequest(request) {
  const auth = request.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const apiKey = url.searchParams.get("api_key");

  if (apiKey) {
    return `Bearer ${apiKey}`;
  }

  return null;
}

function applyCorsHeaders(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (!url.pathname.startsWith("/v1") && !url.pathname.startsWith("/backend-api")) {
    return false;
  }

  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Api-Key,X-Request-Id,X-Aura-Transport");
  res.setHeader("Access-Control-Expose-Headers", "x-request-id");
  res.setHeader("Vary", "Origin");

  return true;
}

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const corsApplied = applyCorsHeaders(req, res);

      if (corsApplied && req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      handle(req, res);
    });
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket, request) => {
      const authHeader = parseApiKeyFromRequest(request);
      const baseUrl = `http://127.0.0.1:${port}`;

      async function validateConnection() {
        if (!authHeader) {
          socket.send(JSON.stringify({ type: "error", error: "Missing API key" }));
          socket.close(4401, "Unauthorized");
          return false;
        }

        const response = await fetch(`${baseUrl}/backend-api/codex`, {
          method: "GET",
          headers: { Authorization: authHeader }
        });

        if (!response.ok) {
          socket.send(JSON.stringify({ type: "error", error: "API key validation failed" }));
          socket.close(4401, "Unauthorized");
          return false;
        }

        socket.send(JSON.stringify({ type: "ready", transport: "ws", provider: "AuraAI" }));
        return true;
      }

      validateConnection().catch((error) => {
        socket.send(JSON.stringify({ type: "error", error: error.message }));
        socket.close(1011, "Validation error");
      });

      socket.on("message", async (buffer) => {
        try {
          const parsed = JSON.parse(buffer.toString());

          if (parsed?.type === "ping") {
            socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
            return;
          }

          const endpoint =
            parsed?.endpoint ||
            parsed?.data?.endpoint ||
            parsed?.path ||
            "/v1/responses";

          const payload = parsed?.payload || parsed?.data?.payload || parsed?.body || parsed?.input || {};

          const response = await fetch(`${baseUrl}/backend-api/codex`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: authHeader || "",
              "x-aura-transport": "ws"
            },
            body: JSON.stringify({ endpoint, payload })
          });

          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("text/event-stream")) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let remainder = "";

            if (!reader) {
              socket.send(JSON.stringify({ type: "error", error: "Empty stream body" }));
              return;
            }

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              remainder += decoder.decode(value, { stream: true });
              const parts = remainder.split("\n\n");
              remainder = parts.pop() || "";

              for (const part of parts) {
                const dataLine = part
                  .split("\n")
                  .find((line) => line.startsWith("data:"));

                if (!dataLine) {
                  continue;
                }

                const data = dataLine.slice(5).trim();
                socket.send(JSON.stringify({ type: "sse", data }));
              }
            }

            socket.send(JSON.stringify({ type: "done" }));
            return;
          }

          const json = await response.json().catch(() => ({
            error: { message: "Invalid upstream response" }
          }));

          socket.send(
            JSON.stringify({
              type: "response",
              status: response.status,
              data: json
            })
          );
        } catch (error) {
          socket.send(
            JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown websocket error"
            })
          );
        }
      });
    });

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);

      if (url.pathname === "/backend-api/codex/ws") {
        wss.handleUpgrade(request, socket, head, (client) => {
          wss.emit("connection", client, request);
        });
        return;
      }

      socket.destroy();
    });

    server.listen(port, host, () => {
      console.log(`> AuraAI server ready on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start AuraAI server", error);
    process.exit(1);
  });

