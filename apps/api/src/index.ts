/**
 * Grounded API Server — Entry Point
 *
 * Sets up Express with:
 *  - Helmet (security headers)
 *  - CORS (configured via ALLOWED_ORIGINS env var)
 *  - tRPC Express adapter at /api/trpc
 *  - Health check endpoint at /health
 *
 * Graceful shutdown:
 * On SIGTERM (Railway/Render send this on deploy), we close the HTTP server
 * and disconnect Prisma cleanly. This prevents "connection terminated"
 * errors during rolling deploys.
 */

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@/router";
import { createContext } from "@/context";
import { prisma } from "@/lib/prisma";

const app = express();
const PORT = Number(process.env["PORT"] ?? 3001);

// ── Security headers ───────────────────────────────────────────────────────
// Helmet sets sensible HTTP security headers (XSS protection, HSTS, etc.).
// Must come before other middleware.
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Log blocked origins to help with CORS debugging in staging.
      console.warn(`[cors] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    credentials: true,
  })
);

// Increased limit to support base64-encoded PDF uploads (OMs can be 20-30MB → ~40MB as base64).
app.use(express.json({ limit: "50mb" }));

// ── Health check ──────────────────────────────────────────────────────────
// Used by Railway/Render health checks and uptime monitors.
// Returns 200 if the server is running and DB is reachable.
app.get("/health", async (_req, res) => {
  try {
    // Lightweight DB ping — if this fails, the server is unhealthy.
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[health] Database ping failed:", error);
    res.status(503).json({
      status: "degraded",
      error: "Database unreachable",
      timestamp: new Date().toISOString(),
    });
  }
});

// ── tRPC ─────────────────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      // Log server-side errors with path context for easier debugging.
      // Don't log client errors (BAD_REQUEST, NOT_FOUND, UNAUTHORIZED) —
      // those are expected and would create noise in the logs.
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] Error on ${path ?? "unknown"}:`, error);
      }
    },
  })
);

// ── Start server ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
// Railway and similar PaaS platforms send SIGTERM before stopping a container.
// We close the HTTP server (stop accepting new connections) and then
// disconnect Prisma to release the database connection pool cleanly.
const shutdown = async (signal: string) => {
  console.log(`[api] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[api] Shutdown complete.");
    process.exit(0);
  });

  // Force-kill after 10s if graceful shutdown stalls.
  setTimeout(() => {
    console.error("[api] Graceful shutdown timed out — forcing exit.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
