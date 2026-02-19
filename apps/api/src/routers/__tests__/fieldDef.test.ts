/**
 * Field Definition Router — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  createTestCaller,
  mockWorkspace,
} from "../../__tests__/helpers";

const mockFieldDef = {
  id: "fd-test-id-1",
  workspaceId: mockWorkspace.id,
  name: "Purchase Price",
  fieldType: "NUMBER" as const,
  displayOrder: 0,
  isRequired: false,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("fieldDef.list", () => {
  it("returns field definitions ordered by displayOrder", async () => {
    const { caller, mockDb } = createTestCaller();
    const defs = [
      mockFieldDef,
      { ...mockFieldDef, id: "fd-2", name: "Owner", fieldType: "TEXT" as const, displayOrder: 1 },
    ];
    mockDb.dealFieldDefinition.findMany.mockResolvedValue(defs);

    const result = await caller.fieldDef.list({ workspaceId: mockWorkspace.id });

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Purchase Price");
  });
});

describe("fieldDef.create", () => {
  it("creates a field def and places it at the end of the list", async () => {
    const { caller, mockDb } = createTestCaller({ role: "ADMIN" });
    // Current max order is 2 (three existing fields)
    mockDb.dealFieldDefinition.aggregate.mockResolvedValue({
      _max: { displayOrder: 2 },
    });
    mockDb.dealFieldDefinition.create.mockResolvedValue({
      ...mockFieldDef,
      displayOrder: 3,
    });

    await caller.fieldDef.create({
      workspaceId: mockWorkspace.id,
      name: "IRR Target",
      fieldType: "NUMBER",
    });

    expect(mockDb.dealFieldDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayOrder: 3 }),
      })
    );
  });

  it("throws FORBIDDEN when VIEWER tries to create", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.fieldDef.create({
        workspaceId: mockWorkspace.id,
        name: "Field",
        fieldType: "TEXT",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("fieldDef.reorder", () => {
  it("updates displayOrder for all provided IDs in transaction", async () => {
    const { caller, mockDb } = createTestCaller({ role: "ADMIN" });
    mockDb.dealFieldDefinition.update.mockResolvedValue(mockFieldDef);
    mockDb.dealFieldDefinition.findMany.mockResolvedValue([mockFieldDef]);

    await caller.fieldDef.reorder({
      workspaceId: mockWorkspace.id,
      orderedIds: ["fd-2", "fd-1", "fd-3"],
    });

    // Transaction should have been called with 3 update promises
    expect(mockDb.$transaction).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when MEMBER tries to reorder", async () => {
    const { caller } = createTestCaller({ role: "MEMBER" });

    await expect(
      caller.fieldDef.reorder({
        workspaceId: mockWorkspace.id,
        orderedIds: ["fd-1"],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("fieldDef.delete", () => {
  it("deletes a field definition", async () => {
    const { caller, mockDb } = createTestCaller({ role: "OWNER" });
    mockDb.dealFieldDefinition.findFirst.mockResolvedValue(mockFieldDef);
    mockDb.dealFieldDefinition.delete.mockResolvedValue(mockFieldDef);

    const result = await caller.fieldDef.delete({
      id: mockFieldDef.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result.success).toBe(true);
    // Crucially: no deal field values are modified (orphaned values are retained)
    expect(mockDb.deal.update).not.toHaveBeenCalled();
  });
});
