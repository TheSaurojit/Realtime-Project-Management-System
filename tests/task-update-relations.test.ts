import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { updateTask } from "@/lib/db";

describe("task relation updates", () => {
  const tx = {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findMany: vi.fn(),
    },
    label: {
      findMany: vi.fn(),
    },
    taskAssignee: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    taskLabel: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tx.task.findUnique.mockResolvedValue({
      id: "task-id",
      projectId: "project-id",
      project: {
        id: "project-id",
        workspaceId: "workspace-id",
        workspace: { ownerId: "workspace-owner" },
      },
    });
    tx.workspaceMember.findMany.mockResolvedValue([{ userId: "member-id" }]);
    tx.label.findMany.mockResolvedValue([{ id: "label-id" }]);
    tx.taskAssignee.deleteMany.mockResolvedValue({ count: 0 });
    tx.taskAssignee.createMany.mockResolvedValue({ count: 1 });
    tx.taskLabel.deleteMany.mockResolvedValue({ count: 0 });
    tx.taskLabel.createMany.mockResolvedValue({ count: 1 });
    tx.task.update.mockResolvedValue({
      id: "task-id",
      projectId: "project-id",
      assignees: [{ user: { id: "member-id" } }],
      labels: [{ label: { id: "label-id" } }],
    });
    vi.mocked(prisma.$transaction).mockImplementation(
      (callback) => callback(tx as never) as never
    );
  });

  it("replaces assignees and labels within the same transaction", async () => {
    const result = await updateTask(
      "task-id",
      { assigneeIds: ["member-id"], labelIds: ["label-id"] },
      "actor-id"
    );

    expect(tx.taskAssignee.deleteMany).toHaveBeenCalledWith({ where: { taskId: "task-id" } });
    expect(tx.taskAssignee.createMany).toHaveBeenCalledWith({
      data: [{ taskId: "task-id", userId: "member-id" }],
    });
    expect(tx.taskLabel.deleteMany).toHaveBeenCalledWith({ where: { taskId: "task-id" } });
    expect(tx.taskLabel.createMany).toHaveBeenCalledWith({
      data: [{ taskId: "task-id", labelId: "label-id" }],
    });
    expect(result?.assignees[0].user.id).toBe("member-id");
  });

  it("rejects assignees from a different workspace without changing relations", async () => {
    tx.workspaceMember.findMany.mockResolvedValueOnce([]);

    await expect(
      updateTask("task-id", { assigneeIds: ["foreign-user"] })
    ).rejects.toThrow("does not belong to this workspace");
    expect(tx.taskAssignee.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects labels from a different workspace without changing relations", async () => {
    tx.label.findMany.mockResolvedValueOnce([]);

    await expect(
      updateTask("task-id", { labelIds: ["foreign-label"] })
    ).rejects.toThrow("does not belong to this workspace");
    expect(tx.taskLabel.deleteMany).not.toHaveBeenCalled();
  });
});
