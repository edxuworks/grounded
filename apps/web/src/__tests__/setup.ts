/**
 * Vitest Frontend Test Setup
 *
 * Runs before every test file in apps/web.
 * Sets up browser API mocks needed by React components.
 */

import { vi, beforeEach } from "vitest";

// Mock the Supabase client — prevents real auth calls in tests.
// Individual tests can override specific methods via vi.fn().mockResolvedValue()
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock mapbox-gl — the map canvas requires WebGL which is not available in jsdom.
// Map components are tested via E2E (Playwright) instead.
vi.mock("mapbox-gl", () => ({
  default: { accessToken: "" },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

vi.mock("react-map-gl", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// Set test environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SUPABASE_URL: "https://test.supabase.co",
    VITE_SUPABASE_ANON_KEY: "test-anon-key",
    VITE_MAPBOX_PUBLIC_TOKEN: "pk.test-token",
    VITE_API_URL: "http://localhost:3001",
    DEV: false,
    PROD: false,
  },
  writable: true,
});

beforeEach(() => {
  vi.resetAllMocks();
});
