/**
 * Vitest Global Test Setup
 *
 * Runs before every test file. Responsible for:
 *  1. Resetting all vi.fn() mocks between tests to prevent test pollution
 *  2. Setting test environment variables so code that reads process.env
 *     doesn't fail with "Missing env variable" in test runs
 *
 * WHY reset mocks in setup rather than per-test?
 * Using vi.resetAllMocks() globally ensures that a new test file always
 * starts with clean mocks, even if a previous test file forgot to clean up.
 * Tests that need specific mock behaviour still call vi.fn().mockResolvedValue()
 * within the test itself — the reset just clears the previous state.
 */

import { vi, beforeEach } from "vitest";

// Set safe test values for all environment variables the app reads.
// This prevents "undefined" errors in code that does process.env["VAR"]!
process.env["NODE_ENV"] = "test";
process.env["SUPABASE_URL"] = "https://test.supabase.co";
process.env["SUPABASE_ANON_KEY"] = "test-anon-key";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";
process.env["MAPBOX_SECRET_TOKEN"] = "sk.test-mapbox-token";
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";

beforeEach(() => {
  // Clear call counts, return values, and implementations on all mocks.
  // Equivalent to calling .mockReset() on every mock.
  vi.resetAllMocks();
});
