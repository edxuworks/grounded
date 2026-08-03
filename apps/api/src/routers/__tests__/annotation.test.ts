/**
 * Annotation Router — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  createTestCaller,
  mockAnnotation,
  mockDeal,
  mockWorkspace,
} from "../../__tests__/helpers";

const validGeometry = {
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
};

describe("annotation.listByDeal", () => {
  it("returns annotations for a deal", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findFirst.mockResolvedValue(mockDeal);
    mockDb.annotation.findMany.mockResolvedValue([mockAnnotation]);

    const result = await caller.annotation.listByDeal({
      dealId: mockDeal.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("RISK_ZONE");
  });

  it("throws NOT_FOUND when deal is not in workspace", async () => {
    const { caller, mockDb } = createTestCaller();
    mockDb.deal.findFirst.mockResolvedValue(null);

    await expect(
      caller.annotation.listByDeal({
        dealId: "wrong-deal",
        workspaceId: mockWorkspace.id,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("annotation.create", () => {
  it("creates an annotation with valid geometry", async () => {
    const { caller, mockDb } = createTestCaller({ role: "MEMBER" });
    mockDb.deal.findFirst.mockResolvedValue(mockDeal);
    mockDb.annotation.create.mockResolvedValue({ ...mockAnnotation, name: "Risk Area" });  // Mock reflects input

    const result = await caller.annotation.create({
      workspaceId: mockWorkspace.id,
      dealId: mockDeal.id,
      name: "Risk Area",
      category: "RISK_ZONE",
      geometry: validGeometry,
    });

    expect(result.name).toBe("Risk Area");
    expect(mockDb.annotation.create).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when VIEWER tries to create", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.annotation.create({
        workspaceId: mockWorkspace.id,
        dealId: mockDeal.id,
        name: "Zone",
        category: "ACCESS",
        geometry: validGeometry,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid GeoJSON geometry", async () => {
    const { caller } = createTestCaller();

    await expect(
      caller.annotation.create({
        workspaceId: mockWorkspace.id,
        dealId: mockDeal.id,
        name: "Zone",
        category: "ACCESS",
        // Invalid: type is not "Polygon"
        geometry: { type: "Point" as unknown as "Polygon", coordinates: [] },
      })
    ).rejects.toThrow(); // Zod validation
  });
});

describe("annotation.delete", () => {
  it("allows non-viewer members to delete annotations", async () => {
    const { caller, mockDb } = createTestCaller({ role: "MEMBER" });
    mockDb.annotation.findFirst.mockResolvedValue(mockAnnotation);
    mockDb.annotation.delete.mockResolvedValue(mockAnnotation);

    const result = await caller.annotation.delete({
      id: mockAnnotation.id,
      workspaceId: mockWorkspace.id,
    });

    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN when VIEWER tries to delete", async () => {
    const { caller } = createTestCaller({ role: "VIEWER" });

    await expect(
      caller.annotation.delete({
        id: mockAnnotation.id,
        workspaceId: mockWorkspace.id,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
