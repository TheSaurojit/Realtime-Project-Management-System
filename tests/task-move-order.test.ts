import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { moveTask } from "@/lib/db";

describe("moveTask persisted ordering", () => {
  const tx = {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    boardColumn: {
      findUnique: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tx.task.findUnique.mockResolvedValue({
      id: "moving-task",
      projectId: "project-id",
      columnId: "source-column",
      project: { id: "project-id", workspaceId: "workspace-id" },
    });
    tx.boardColumn.findUnique.mockResolvedValue({
      id: "destination-column",
      projectId: "project-id",
      name: "In Progress",
    });
    tx.task.findMany.mockResolvedValue([
      { id: "before-task", position: 1000 },
      { id: "after-task", position: 2000 },
    ]);
    tx.task.update.mockImplementation(({ where, data }) =>
      Promise.resolve({
        id: where.id,
        projectId: "project-id",
        columnId: "destination-column",
        position: data.position,
        status: data.status,
        project: { id: "project-id", workspaceId: "workspace-id" },
      })
    );
    vi.mocked(prisma.$transaction).mockImplementation(
      (callback) => callback(tx as never) as never
    );
  });

  it("inserts at the requested index between existing positions", async () => {
    const result = await moveTask("moving-task", "destination-column", 1);

    expect(result?.position).toBe(1500);
    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "moving-task" },
        data: expect.objectContaining({
          columnId: "destination-column",
          position: 1500,
          status: "IN_PROGRESS",
        }),
      })
    );
  });
});
