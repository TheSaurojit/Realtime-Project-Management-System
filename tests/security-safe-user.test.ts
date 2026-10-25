import { describe, it, expect } from "vitest";
import { SAFE_USER_SELECT } from "@/lib/db";
import { sanitizeSensitiveFields, containsSensitiveCredentials } from "@/lib/utils";
import { Task, Project, WorkspaceMember, ActivityLog, Notification, User } from "@/lib/types";

/**
 * Asserts that a response object, payload, or serialized HTML does not contain
 * any passwordHash key, bcrypt hash string, or credential leak.
 */
export function assertNoPasswordHash(payload: unknown, contextDescription = "Response"): void {
  const jsonString = typeof payload === "string" ? payload : JSON.stringify(payload);

  if (!jsonString) return;

  // 1. Fail if 'passwordHash' key or token exists
  if (jsonString.includes("passwordHash")) {
    throw new Error(`[SECURITY VIOLATION] ${contextDescription} leaked 'passwordHash'! Found in payload:\n${jsonString.slice(0, 300)}...`);
  }

  // 2. Fail if standard bcrypt hash pattern ($2a$, $2b$, $2y$) exists
  const bcryptRegex = /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/g;
  const bcryptMatches = jsonString.match(bcryptRegex);
  if (bcryptMatches && bcryptMatches.length > 0) {
    throw new Error(
      `[SECURITY VIOLATION] ${contextDescription} leaked bcrypt password hash strings (${bcryptMatches.length} occurrence(s))! Example: ${bcryptMatches[0]}`
    );
  }
}

describe("Security: Safe User Selects & No Password Hashes in Responses", () => {
  const mockBcryptHash = "$2a$10$e7j41V9bHqXg88ePz.Hkfe2KqZgN5VqY1u4qNqFp3yA9lRk.Xo2mO";

  describe("SAFE_USER_SELECT projection", () => {
    it("should never include passwordHash or password in SAFE_USER_SELECT", () => {
      expect(SAFE_USER_SELECT).toBeDefined();
      expect("passwordHash" in SAFE_USER_SELECT).toBe(false);
      expect("password" in SAFE_USER_SELECT).toBe(false);
      expect((SAFE_USER_SELECT as Record<string, unknown>).passwordHash).toBeUndefined();

      // Ensure expected public fields are present
      expect(SAFE_USER_SELECT.id).toBe(true);
      expect(SAFE_USER_SELECT.name).toBe(true);
      expect(SAFE_USER_SELECT.email).toBe(true);
      expect(SAFE_USER_SELECT.avatarUrl).toBe(true);
    });
  });

  describe("Task PATCH response & DTO safety", () => {
    it("should ensure a task response has safe reporter, assignees, and comments without passwordHash", () => {
      // Simulate task PATCH payload returned by updateTask with SAFE_USER_SELECT
      const safeTask: Task = {
        id: "task-101",
        projectId: "proj-1",
        columnId: "col-in-progress",
        taskKey: "DEV-101",
        title: "Secure API Endpoint against credential leakage",
        priority: "HIGH",
        status: "IN_PROGRESS",
        position: 0,
        reporterId: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reporter: {
          id: "user-1",
          email: "reporter@example.com",
          name: "Alice Reporter",
          avatarUrl: "https://avatar.vercel.sh/alice",
        },
        assignees: [
          {
            user: {
              id: "user-2",
              email: "assignee@example.com",
              name: "Bob Developer",
              avatarUrl: "https://avatar.vercel.sh/bob",
            },
          },
        ],
        labels: [],
        checklists: [],
        attachments: [],
        comments: [
          {
            id: "comment-1",
            taskId: "task-101",
            authorId: "user-2",
            content: "Fixed relation query to use safe user selects.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: {
              id: "user-2",
              email: "assignee@example.com",
              name: "Bob Developer",
              avatarUrl: null,
            },
          },
        ],
      };

      // Assert no password hash shows up in the task response
      expect(() => assertNoPasswordHash(safeTask, "Task PATCH Response")).not.toThrow();
      expect(containsSensitiveCredentials(safeTask)).toBe(false);
    });

    it("should fail assertNoPasswordHash if a task PATCH response contains passwordHash", () => {
      const contaminatedTask = {
        id: "task-101",
        title: "Contaminated Task",
        reporter: {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
          passwordHash: mockBcryptHash, // LEAK!
        },
      };

      expect(containsSensitiveCredentials(contaminatedTask)).toBe(true);
      expect(() => assertNoPasswordHash(contaminatedTask, "Contaminated Task Response")).toThrow(
        /SECURITY VIOLATION.*passwordHash/
      );
    });
  });

  describe("Project Board HTML & RSC view data safety", () => {
    it("should ensure project board data contains zero passwordHash or bcrypt strings", () => {
      const safeProject: Project = {
        id: "proj-1",
        workspaceId: "ws-1",
        name: "SyncBoard Core",
        key: "PRJ",
        status: "ACTIVE",
        priority: "HIGH",
        createdAt: new Date().toISOString(),
        lead: {
          id: "lead-1",
          email: "lead@example.com",
          name: "Project Lead",
        },
        columns: [
          {
            id: "col-1",
            projectId: "proj-1",
            name: "To Do",
            position: 0,
            tasks: [
              {
                id: "task-1",
                projectId: "proj-1",
                columnId: "col-1",
                taskKey: "PRJ-1",
                title: "Initialize setup",
                priority: "MEDIUM",
                status: "TODO",
                position: 0,
                reporterId: "user-1",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reporter: {
                  id: "user-1",
                  name: "Alice",
                  email: "alice@example.com",
                },
                assignees: [
                  {
                    user: {
                      id: "user-2",
                      name: "Bob",
                      email: "bob@example.com",
                    },
                  },
                ],
                labels: [],
                checklists: [],
                attachments: [],
                comments: [],
              },
            ],
          },
        ],
      };

      const safeWorkspaceMembers: WorkspaceMember[] = [
        {
          id: "mem-1",
          workspaceId: "ws-1",
          userId: "lead-1",
          role: "OWNER",
          joinedAt: new Date().toISOString(),
          user: {
            id: "lead-1",
            name: "Project Lead",
            email: "lead@example.com",
          },
        },
        {
          id: "mem-2",
          workspaceId: "ws-1",
          userId: "user-2",
          role: "MEMBER",
          joinedAt: new Date().toISOString(),
          user: {
            id: "user-2",
            name: "Bob",
            email: "bob@example.com",
          },
        },
      ];

      const safeActivities: ActivityLog[] = [
        {
          id: "act-1",
          workspaceId: "ws-1",
          projectId: "proj-1",
          actorId: "lead-1",
          action: "created project",
          createdAt: new Date().toISOString(),
          actor: {
            id: "lead-1",
            name: "Project Lead",
            email: "lead@example.com",
          },
        },
      ];

      const safeNotifications: Notification[] = [
        {
          id: "notif-1",
          userId: "user-2",
          actorId: "lead-1",
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: "You were assigned to PRJ-1",
          isRead: false,
          createdAt: new Date().toISOString(),
          actor: {
            id: "lead-1",
            name: "Project Lead",
            email: "lead@example.com",
          },
        },
      ];

      const currentUser: User = {
        id: "lead-1",
        email: "lead@example.com",
        name: "Project Lead",
        role: "OWNER",
      };

      // Combined view model rendered by ProjectPage into HTML/RSC payload
      const pageProps = {
        project: safeProject,
        workspaceMembers: safeWorkspaceMembers,
        activities: safeActivities,
        notifications: safeNotifications,
        currentUser,
      };

      // Stringify as Next.js does for HTML / RSC script tags
      const renderedHtmlPayload = JSON.stringify(pageProps);

      // Verify zero occurrences of passwordHash or bcrypt strings
      expect(() => assertNoPasswordHash(renderedHtmlPayload, "Project Board HTML Payload")).not.toThrow();
      expect(renderedHtmlPayload.includes("passwordHash")).toBe(false);
      expect(containsSensitiveCredentials(renderedHtmlPayload)).toBe(false);
    });

    it("should fail when simulating the 34 leaked bcrypt strings in board HTML", () => {
      // Create a mock payload with 34 occurrences of bcrypt strings (reproducing user's bug scenario)
      const leakedUsers = Array.from({ length: 34 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        passwordHash: mockBcryptHash,
      }));

      const leakedPayload = {
        project: { name: "Leaked Board" },
        members: leakedUsers,
      };

      const serialized = JSON.stringify(leakedPayload);

      // Verify it is detected and fails the assertion
      expect(containsSensitiveCredentials(serialized)).toBe(true);
      expect(() => assertNoPasswordHash(serialized, "Project Board HTML")).toThrow(
        /\[SECURITY VIOLATION\] Project Board HTML leaked/
      );
    });
  });

  describe("sanitizeSensitiveFields defense-in-depth scrubber", () => {
    it("should strip passwordHash from deeply nested objects and arrays", () => {
      const contaminatedData = {
        id: "task-1",
        title: "Test Task",
        reporter: {
          id: "u-1",
          name: "Alice",
          passwordHash: mockBcryptHash,
        },
        assignees: [
          {
            user: {
              id: "u-2",
              name: "Bob",
              passwordHash: mockBcryptHash,
            },
          },
        ],
        comments: [
          {
            id: "c-1",
            author: {
              id: "u-3",
              name: "Charlie",
              passwordHash: mockBcryptHash,
            },
          },
        ],
      };

      const sanitized = sanitizeSensitiveFields(contaminatedData);

      // Verify sanitized object
      expect((sanitized.reporter as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((sanitized.assignees[0].user as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((sanitized.comments[0].author as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(containsSensitiveCredentials(sanitized)).toBe(false);
      expect(() => assertNoPasswordHash(sanitized, "Sanitized Output")).not.toThrow();
    });

    it("should preserve non-sensitive fields and dates during sanitization", () => {
      const now = new Date();
      const input = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        createdAt: now,
        nested: {
          flag: true,
          count: 42,
        },
      };

      const result = sanitizeSensitiveFields(input);
      expect(result.id).toBe("user-123");
      expect(result.name).toBe("Test User");
      expect(result.createdAt).toEqual(now);
      expect(result.nested.count).toBe(42);
    });
  });
});
