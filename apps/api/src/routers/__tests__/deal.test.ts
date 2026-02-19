/**
 * Deal Router — Unit Tests
 *
 * Tests every tRPC procedure in the deal router against a mock database.
 * No HTTP layer, no real database — fast, deterministic, isolated.
 *
 * Coverage goals:
 *  ✓ Happy path for each procedure
 *  ✓ Permission enforcement (VIEWER cannot write)
 *  ✓ Workspace scoping (cannot access another workspace's deals)
 *  ✓ NOT_FOUND when deal/dealFile doesn't exist
 *  ✓ fieldValues merge (not overwrite) on updateFieldValues
 */

import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createTestCaller,
  mockDeal,
  mockDealFile,
  mockUser,
  mockWorkspace,
} from "../../__tests__/helpers";

describe("deal.list", () => {
  it("returns deals for a workspace", async () => {
    const { caller, mockDb } = createTestCaller();
    const deals = [mockDeal, { ...mockDeal, id: "deal-2", title: "456 Other St" }];
    mockDb.deal.findMany.mockResolvedValue(deals);

    const result = await caller.deal.list({ workspaceId: mockWorkspace.id });

    expect(result).toHaveLength(2);
    expect(mockDb.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: mockWorkspace.id }),
      })
    );
  });

  it("filters by dealFileId when provided", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findMany.mockResolvedValue([mockDeal]);

    await caller.deal.list({
      workspaceId: mockWorkspace.id,
      dealFileId: mockDealFile.id,
    });

    expect(mockDb.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: mockWorkspace.id,
          dealFileId: mockDealFile.id,
        }),
      })
    );
  });

  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const { caller } = createTestCaller({ user: null });

    await expect(
      caller.deal.list({ workspaceId: mockWorkspace.id })
    ).rejects.toThrow(TRPCError);
  });
});

describe("deal.getById", () => {
  it("returns a deal with annotations and comments", async () => {
    const { caller, mockDb } = createTestCaller();
    const dealWithRelations = {
      ...mockDeal,
      annotations: [],
      comments: [],
      dealFile: mockDealFile,
      createdBy: { id: mockUser.id, fullName: "Test User", email: mockUser.email },
    };
    mockDb.deal.findFirst.mockResolvedValue(dealWithRelations);

    const result = await caller.deal.getById({
      id: mockDeal.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result.id).toBe(mockDeal.id);
    expect(result.annotations).toEqual([]);
  });

  it("throws NOT_FOUND when deal does not exist", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findFirst.mockResolvedValue(null);

    await expect(
      caller.deal.getById({ id: "non-existent", workspaceId: mockWorkspace.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deal.create", () => {
  it("creates a deal when user is a workspace member", async () => {
    const { caller, mockDb } = createTestCaller({ role: "MEMBER" });
    mockDb.dealFile.findFirst.mockResolvedValue(mockDealFile);
    mockDb.deal.create.mockResolvedValue({ ...mockDeal, dealFile: mockDealFile });

    const result = await caller.deal.create({
      workspaceId: mockWorkspace.id,
      dealFileId: mockDealFile.id,
      title: "123 Test Street",
      address: "123 Test Street, London",
      longitude: -0.1276,
      latitude: 51.5074,
    });

    expect(result.title).toBe("123 Test Street");
    expect(mockDb.deal.create).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when user is a VIEWER", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.deal.create({
        workspaceId: mockWorkspace.id,
        dealFileId: mockDealFile.id,
        title: "Test Deal",
        address: "Test Address",
        longitude: -0.1,
        latitude: 51.5,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when dealFile does not belong to workspace", async () => {
    const { caller, mockDb } = createTestCaller();
    // findFirst returns null = dealFile not in this workspace
    mockDb.dealFile.findFirst.mockResolvedValue(null);

    await expect(
      caller.deal.create({
        workspaceId: mockWorkspace.id,
        dealFileId: "other-workspace-file",
        title: "Test Deal",
        address: "Test Address",
        longitude: -0.1,
        latitude: 51.5,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deal.update", () => {
  it("updates deal status", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findFirst.mockResolvedValue(mockDeal);
    mockDb.deal.update.mockResolvedValue({ ...mockDeal, status: "UNDERWRITING" });

    const result = await caller.deal.update({
      id: mockDeal.id,
      workspaceId: mockWorkspace.id,
      status: "UNDERWRITING",
    });

    expect(result.status).toBe("UNDERWRITING");
  });

  it("throws FORBIDDEN when VIEWER tries to update", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.deal.update({ id: mockDeal.id, workspaceId: mockWorkspace.id, status: "APPROVED" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("deal.updateFieldValues", () => {
  it("merges new values into existing fieldValues (does not overwrite)", async () => {
    const { caller, mockDb } = createTestCaller();

    // Existing deal has one field value
    const existingValues = { "field-id-1": "Existing Corp" };
    mockDb.deal.findFirst.mockResolvedValue({
      ...mockDeal,
      fieldValues: existingValues,
    });

    // Field definitions for this workspace
    mockDb.dealFieldDefinition.findMany.mockResolvedValue([
      { id: "field-id-1", fieldType: "TEXT" },
      { id: "field-id-2", fieldType: "NUMBER" },
    ]);

    // Updated deal with merged values
    mockDb.deal.update.mockResolvedValue({
      id: mockDeal.id,
      fieldValues: { "field-id-1": "Existing Corp", "field-id-2": 5000000 },
      updatedAt: new Date(),
    });

    await caller.deal.updateFieldValues({
      id: mockDeal.id,
      workspaceId: mockWorkspace.id,
      // Only updating field-id-2; field-id-1 should be preserved
      fieldValues: { "field-id-2": 5000000 },
    });

    // Verify the update was called with merged values
    expect(mockDb.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          fieldValues: {
            "field-id-1": "Existing Corp",
            "field-id-2": 5000000,
          },
        },
      })
    );
  });

  it("throws BAD_REQUEST for unknown field definition IDs", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findFirst.mockResolvedValue(mockDeal);
    // Only field-id-1 is a known definition
    mockDb.dealFieldDefinition.findMany.mockResolvedValue([
      { id: "field-id-1", fieldType: "TEXT" },
    ]);

    await expect(
      caller.deal.updateFieldValues({
        id: mockDeal.id,
        workspaceId: mockWorkspace.id,
        fieldValues: { "unknown-field-id": "some value" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("deal.delete", () => {
  it("allows OWNER to delete a deal", async () => {
    const { caller, mockDb } = createTestCaller({ role: "OWNER" });
    mockDb.deal.findFirst.mockResolvedValue(mockDeal);
    mockDb.deal.delete.mockResolvedValue(mockDeal);

    const result = await caller.deal.delete({
      id: mockDeal.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result.success).toBe(true);
    expect(mockDb.deal.delete).toHaveBeenCalledWith({ where: { id: mockDeal.id } });
  });

  it("throws FORBIDDEN when MEMBER tries to delete", async () => {
    const { caller } = createTestCaller({ role: "MEMBER" });

    await expect(
      caller.deal.delete({ id: mockDeal.id, workspaceId: mockWorkspace.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
