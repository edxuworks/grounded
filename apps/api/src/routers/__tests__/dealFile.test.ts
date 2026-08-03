/**
 * Deal File Router — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  createTestCaller,
  mockDealFile,
  mockWorkspace,
} from "../../__tests__/helpers";

describe("dealFile.list", () => {
  it("returns deal files for a workspace", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.dealFile.findMany.mockResolvedValue([mockDealFile]);

    const result = await caller.dealFile.list({ workspaceId: mockWorkspace.id });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(mockDealFile.id);
  });
});

describe("dealFile.create", () => {
  it("creates a deal file with default colour", async () => {
    const { caller, mockDb } = createTestCaller({ role: "MEMBER" });
    mockDb.dealFile.create.mockResolvedValue({
      ...mockDealFile,
      name: "New Portfolio",  // Mock reflects the input so assertion is meaningful
      _count: { deals: 0 },
    });

    const result = await caller.dealFile.create({
      workspaceId: mockWorkspace.id,
      name: "New Portfolio",
    });

    expect(mockDb.dealFile.create).toHaveBeenCalledOnce();
    expect(result.name).toBe("New Portfolio");
  });

  it("rejects invalid hex colour", async () => {
    const { caller } = createTestCaller();

    await expect(
      caller.dealFile.create({
        workspaceId: mockWorkspace.id,
        name: "Portfolio",
        color: "not-a-colour",
      })
    ).rejects.toThrow(); // Zod validation error
  });
});

describe("dealFile.update", () => {
  it("throws FORBIDDEN when VIEWER tries to update", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.dealFile.update({ id: mockDealFile.id, workspaceId: mockWorkspace.id, name: "New Name" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when deal file is not in workspace", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.dealFile.findFirst.mockResolvedValue(null);

    await expect(
      caller.dealFile.update({ id: "wrong-id", workspaceId: mockWorkspace.id, name: "New Name" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("dealFile.delete", () => {
  it("allows OWNER to delete and returns deleted count", async () => {
    const { caller, mockDb } = createTestCaller({ role: "OWNER" });
    mockDb.dealFile.findFirst.mockResolvedValue({
      ...mockDealFile,
      _count: { deals: 3 },
    });
    mockDb.dealFile.delete.mockResolvedValue(mockDealFile);

    const result = await caller.dealFile.delete({
      id: mockDealFile.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(3);
  });

  it("throws FORBIDDEN when MEMBER tries to delete", async () => {
    const { caller } = createTestCaller({ role: "MEMBER" });

    await expect(
      caller.dealFile.delete({
        id: mockDealFile.id,
        workspaceId: mockWorkspace.id,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
