/**
 * Test Helpers — Mock Context & Caller Factory
 *
 * These utilities are the foundation of our TDD approach for tRPC procedures.
 *
 * HOW tRPC testing works (no HTTP layer):
 * tRPC's `createCaller` lets us call procedures directly, passing a mock
 * context object. This means tests are:
 *  - Fast: no HTTP server, no port binding, no network
 *  - Isolated: each test controls exactly what the DB returns via vi.fn()
 *  - Type-safe: the caller is fully typed — wrong inputs fail at compile time
 *
 * The mock Prisma client uses Vitest's vi.fn() for every method we call.
 * Tests set return values via mockResolvedValue() before calling the procedure.
 *
 * Usage:
 *   const { caller, mockDb } = createTestCaller({ role: 'OWNER' })
 *   mockDb.deal.findMany.mockResolvedValue([mockDeal])
 *   const result = await caller.deal.list({ workspaceId: 'ws-1' })
 *   expect(result).toHaveLength(1)
 */

import { vi } from "vitest";
import type { Context, AuthUser } from "@/context";
import { appRouter } from "@/router";
import type { WorkspaceMemberRole } from "@grounded/db";

// ── Mock Prisma client ───────────────────────────────────────────────────
// We mock every Prisma model method used in our routers.
// Adding a new model/method: add it here to make it available in tests.
// The type 'any' is used intentionally — the mock is not type-safe, but
// our actual application code that calls ctx.db IS type-safe.

function createMockDb() {
  const makeModel = () => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  });

  return {
    user: makeModel(),
    workspace: makeModel(),
    workspaceMember: makeModel(),
    dealFile: makeModel(),
    dealFieldDefinition: makeModel(),
    deal: makeModel(),
    annotation: makeModel(),
    comment: makeModel(),
    // Prisma transaction mock — executes each promise in the array sequentially.
    $transaction: vi.fn(async (promises: Promise<unknown>[]) => {
      if (Array.isArray(promises)) {
        return Promise.all(promises);
      }
      // Callback-style transaction
      return (promises as unknown as (tx: unknown) => Promise<unknown>)(createMockDb());
    }),
    $queryRaw: vi.fn(),
  };
}

export type MockDb = ReturnType<typeof createMockDb>;

// ── Test fixture data ────────────────────────────────────────────────────

export const mockUser: AuthUser = {
  id: "user-test-id-1",
  email: "test@grounded.io",
};

export const mockWorkspace = {
  id: "ws-test-id-1",
  name: "Test Workspace",
  slug: "test-workspace",
  plan: "free",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockWorkspaceMember = {
  id: "member-test-id-1",
  workspaceId: mockWorkspace.id,
  userId: mockUser.id,
  role: "OWNER" as WorkspaceMemberRole,
  joinedAt: new Date("2025-01-01"),
  workspace: mockWorkspace,
};

export const mockDealFile = {
  id: "df-test-id-1",
  workspaceId: mockWorkspace.id,
  name: "Test Portfolio",
  description: null,
  color: "#3b82f6",
  createdById: mockUser.id,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockDeal = {
  id: "deal-test-id-1",
  dealFileId: mockDealFile.id,
  workspaceId: mockWorkspace.id,
  title: "123 Test Street",
  address: "123 Test Street, London, EC1A 1AA",
  longitude: -0.1276,
  latitude: 51.5074,
  status: "SOURCING" as const,
  fieldValues: {},
  pinned: false,
  createdById: mockUser.id,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockAnnotation = {
  id: "ann-test-id-1",
  dealId: mockDeal.id,
  workspaceId: mockWorkspace.id,
  name: "Test Zone",
  description: null,
  category: "RISK_ZONE" as const,
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [-0.13, 51.51],
        [-0.12, 51.51],
        [-0.12, 51.52],
        [-0.13, 51.52],
        [-0.13, 51.51],
      ],
    ],
  },
  createdById: mockUser.id,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ── Caller factory ───────────────────────────────────────────────────────

interface CreateTestCallerOptions {
  /** The workspace role for the test user. Defaults to 'OWNER'. */
  role?: WorkspaceMemberRole;
  /** Override the authenticated user. Defaults to mockUser. */
  user?: AuthUser | null;
  /** Pre-configured mock DB. If not provided, a fresh mock is created. */
  db?: MockDb;
}

/**
 * Creates a tRPC caller with a mocked context for unit testing.
 * Returns both the caller and the mockDb so tests can set up expectations
 * and verify calls.
 *
 * WHY we pre-mock workspaceMember.findUnique:
 * The `workspaceProcedure` middleware calls ctx.db.workspaceMember.findUnique
 * on every workspace-scoped procedure call to verify membership.  Pre-mocking
 * it here means tests don't have to set it up manually each time.  Tests that
 * need to simulate "user is not a member" can override this via:
 *   mockDb.workspaceMember.findUnique.mockResolvedValue(null)
 */
export function createTestCaller(options: CreateTestCallerOptions = {}) {
  const { role = "OWNER", user = mockUser } = options;
  const mockDb = options.db ?? createMockDb();

  // Pre-wire the workspace membership lookup that the hasWorkspaceAccess
  // middleware performs on every workspaceProcedure call.  Tests that want
  // a non-member scenario can override this with .mockResolvedValue(null).
  if (user) {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      ...mockWorkspaceMember,
      role,
      workspace: mockWorkspace,
    });
  }

  const ctx: Context = {
    db: mockDb as unknown as Context["db"],
    user,
  };

  const caller = appRouter.createCaller(ctx);

  return { caller, mockDb };
}
