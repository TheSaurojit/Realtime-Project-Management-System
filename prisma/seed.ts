import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export const DEMO_SEED_USERS = [
  {
    id: "user-1",
    email: "alex@acme.io",
    name: "Alex Rivera",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
    role: "OWNER",
  },
  {
    id: "user-2",
    email: "sarah@acme.io",
    name: "Sarah Chen",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces",
    role: "ADMIN",
  },
  {
    id: "user-3",
    email: "marcus@acme.io",
    name: "Marcus Vance",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
    role: "MEMBER",
  },
  {
    id: "user-4",
    email: "elena@acme.io",
    name: "Elena Rostova",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&crop=faces",
    role: "VIEWER",
  },
];

async function main() {
  console.log("🧹 Step 1: Cleaning existing database records...");

  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.checklist.deleteMany({});
  await prisma.taskLabel.deleteMany({});
  await prisma.taskAssignee.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.taskSequence.deleteMany({});
  await prisma.boardColumn.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.label.deleteMany({});
  await prisma.workspaceInvitation.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ Database cleared.");

  console.log("👥 Step 2: Creating demo users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const u of DEMO_SEED_USERS) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`   - Created user: ${u.name} (${u.email}) [ID: ${u.id}] (verified)`);
  }

  console.log("🏢 Step 3: Creating dummy workspace...");
  const workspace = await prisma.workspace.create({
    data: {
      id: "ws-1",
      name: "Acme Cloud Platform",
      slug: "acme",
      description: "Modern cloud engineering, real-time collaboration, and high-velocity product delivery squad.",
      ownerId: "user-1",
    },
  });
  console.log(`   - Created workspace: ${workspace.name} (/${workspace.slug})`);

  console.log("🤝 Step 4: Adding members to workspace...");
  const memberRoles: Record<string, "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"> = {
    "user-1": "OWNER",
    "user-2": "ADMIN",
    "user-3": "MEMBER",
    "user-4": "VIEWER",
  };

  for (const [userId, role] of Object.entries(memberRoles)) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role,
      },
    });
  }
  console.log("   - Assigned RBAC roles: user-1 (OWNER), user-2 (ADMIN), user-3 (MEMBER), user-4 (VIEWER)");

  console.log("🏷️ Step 5: Creating workspace labels...");
  const labelsData = [
    { id: "lbl-1", name: "Backend", color: "#6366f1" },
    { id: "lbl-2", name: "Frontend", color: "#06b6d4" },
    { id: "lbl-3", name: "DevOps", color: "#10b981" },
    { id: "lbl-4", name: "Bug", color: "#ef4444" },
    { id: "lbl-5", name: "Feature", color: "#8b5cf6" },
    { id: "lbl-6", name: "Security", color: "#f59e0b" },
  ];

  for (const lbl of labelsData) {
    await prisma.label.create({
      data: {
        id: lbl.id,
        workspaceId: workspace.id,
        name: lbl.name,
        color: lbl.color,
      },
    });
  }
  console.log(`   - Created ${labelsData.length} labels.`);

  console.log("👥 Step 6: Creating squad teams...");
  const team1 = await prisma.team.create({
    data: {
      id: "team-1",
      workspaceId: workspace.id,
      name: "Core Engineering",
      description: "Distributed systems, WebSocket protocol, database scaling and backend API services.",
      color: "#6366f1",
      members: {
        create: [
          { userId: "user-1", role: "LEAD" },
          { userId: "user-3", role: "SENIOR_ENGINEER" },
          { userId: "user-2", role: "ENGINEER" },
        ],
      },
    },
  });

  const team2 = await prisma.team.create({
    data: {
      id: "team-2",
      workspaceId: workspace.id,
      name: "Product & Design",
      description: "UI/UX design systems, responsive interfaces, mobile apps, and interactive Kanban boards.",
      color: "#ec4899",
      members: {
        create: [
          { userId: "user-2", role: "LEAD" },
          { userId: "user-4", role: "PRODUCT_ANALYST" },
          { userId: "user-1", role: "COLLABORATOR" },
        ],
      },
    },
  });
  console.log(`   - Created teams: ${team1.name} and ${team2.name}`);

  console.log("📁 Step 7: Creating projects and Kanban columns...");
  // Project 1: SyncBoard Web App
  const project1 = await prisma.project.create({
    data: {
      id: "proj-1",
      workspaceId: workspace.id,
      teamId: team1.id,
      name: "SyncBoard Web App",
      key: "KAN",
      description: "Next.js 16 real-time collaborative Kanban board with WebSocket synchronization and granular RBAC.",
      leadId: "user-1",
      icon: "kanban",
      color: "#6366f1",
      members: {
        create: [
          { userId: "user-1", role: "LEAD" },
          { userId: "user-2", role: "CONTRIBUTOR" },
          { userId: "user-3", role: "CONTRIBUTOR" },
          { userId: "user-4", role: "VIEWER" },
        ],
      },
      columns: {
        create: [
          { id: "col-1", name: "Backlog", position: 1000, wipLimit: 0, color: "#64748b" },
          { id: "col-2", name: "To Do", position: 2000, wipLimit: 6, color: "#3b82f6" },
          { id: "col-3", name: "In Progress", position: 3000, wipLimit: 3, color: "#f59e0b" },
          { id: "col-4", name: "In Review", position: 4000, wipLimit: 3, color: "#8b5cf6" },
          { id: "col-5", name: "Done", position: 5000, wipLimit: 0, color: "#10b981" },
        ],
      },
    },
  });

  // Project 2: Mobile Companion App
  const project2 = await prisma.project.create({
    data: {
      id: "proj-2",
      workspaceId: workspace.id,
      teamId: team2.id,
      name: "Mobile Companion App",
      key: "MOB",
      description: "React Native cross-platform client with push notifications, offline cache, and quick capture.",
      leadId: "user-2",
      icon: "smartphone",
      color: "#ec4899",
      members: {
        create: [
          { userId: "user-2", role: "LEAD" },
          { userId: "user-3", role: "CONTRIBUTOR" },
          { userId: "user-1", role: "CONTRIBUTOR" },
        ],
      },
      columns: {
        create: [
          { id: "col-mob-1", name: "Backlog", position: 1000, wipLimit: 0, color: "#64748b" },
          { id: "col-mob-2", name: "In Progress", position: 2000, wipLimit: 4, color: "#f59e0b" },
          { id: "col-mob-3", name: "Done", position: 3000, wipLimit: 0, color: "#10b981" },
        ],
      },
    },
  });
  console.log(`   - Created Project: ${project1.name} [${project1.key}] (5 columns)`);
  console.log(`   - Created Project: ${project2.name} [${project2.key}] (3 columns)`);

  console.log("📝 Step 8: Seeding tasks, checklists, labels, and comments...");
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Task 1: KAN-1
  await prisma.task.create({
    data: {
      id: "task-1",
      projectId: project1.id,
      columnId: "col-3", // In Progress
      taskKey: "KAN-1",
      title: "Implement WebSocket live sync protocol for task moves",
      description: "Ensure clients automatically reconnect with exponential backoff if the socket disconnects. Must preserve message queueing during temporary network dropouts.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      position: 1000,
      points: 5,
      reporterId: "user-1",
      dueDate: tomorrow,
      startDate: now,
      assignees: {
        create: [{ userId: "user-3" }, { userId: "user-2" }],
      },
      labels: {
        create: [{ labelId: "lbl-1" }, { labelId: "lbl-5" }],
      },
      checklists: {
        create: [
          {
            id: "chk-1",
            title: "Implementation Checklist",
            position: 1000,
            items: {
              create: [
                { content: "Add ping/pong interval timer (30s)", isCompleted: true, position: 1000 },
                { content: "Implement exponential backoff (1s, 2s, 4s, max 30s)", isCompleted: true, position: 2000 },
                { content: "Unit tests for socket connection dropouts", isCompleted: false, position: 3000 },
              ],
            },
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: "user-2",
            content: "@Marcus Vance please check if we can reuse the connection health checker here.",
            createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          },
          {
            authorId: "user-3",
            content: "Tested the ping frames locally, round-trip latency is under 15ms!",
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Task 2: KAN-2
  await prisma.task.create({
    data: {
      id: "task-2",
      projectId: project1.id,
      columnId: "col-3", // In Progress
      taskKey: "KAN-2",
      title: "Design fluid drag-and-drop Kanban column animations",
      description: "Ensure smooth 60fps card transitions during column moves. Includes drop ghost outline and edge detection autoscroll.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      position: 2000,
      points: 3,
      reporterId: "user-1",
      dueDate: nextWeek,
      startDate: now,
      assignees: {
        create: [{ userId: "user-2" }],
      },
      labels: {
        create: [{ labelId: "lbl-2" }, { labelId: "lbl-5" }],
      },
      checklists: {
        create: [
          {
            id: "chk-2",
            title: "UX Refinements",
            position: 1000,
            items: {
              create: [
                { content: "Add ghost drop indicator styling", isCompleted: true, position: 1000 },
                { content: "Edge detection autoscroll on board borders", isCompleted: true, position: 2000 },
                { content: "Accessibility keyboard reordering", isCompleted: false, position: 3000 },
              ],
            },
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: "user-2",
            content: "Animations tested with 150 tasks rendered simultaneously. Frame rates are solid.",
            createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Task 3: KAN-3
  await prisma.task.create({
    data: {
      id: "task-3",
      projectId: project1.id,
      columnId: "col-4", // In Review
      taskKey: "KAN-3",
      title: "PostgreSQL foreign key cascade on workspace deletion",
      description: "Audit all child relations (boards, columns, tasks, labels, teams) to ensure full cascading deletes with zero orphan rows.",
      priority: "URGENT",
      status: "IN_REVIEW",
      position: 1000,
      points: 2,
      reporterId: "user-2",
      dueDate: tomorrow,
      startDate: yesterday,
      assignees: {
        create: [{ userId: "user-3" }],
      },
      labels: {
        create: [{ labelId: "lbl-1" }, { labelId: "lbl-4" }],
      },
      comments: {
        create: [
          {
            authorId: "user-4",
            content: "Verified on staging environment. Wiping a workspace cleans up all child tables cleanly.",
            createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Task 4: KAN-4
  await prisma.task.create({
    data: {
      id: "task-4",
      projectId: project1.id,
      columnId: "col-2", // To Do
      taskKey: "KAN-4",
      title: "Multi-tenant RBAC permissions audit and export",
      description: "Allow workspace Admins and Owners to review member roles and export activity logs to CSV format for security compliance.",
      priority: "MEDIUM",
      status: "TODO",
      position: 1000,
      points: 3,
      reporterId: "user-1",
      dueDate: nextWeek,
      assignees: {
        create: [{ userId: "user-2" }],
      },
      labels: {
        create: [{ labelId: "lbl-6" }, { labelId: "lbl-5" }],
      },
    },
  });

  // Task 5: KAN-5
  await prisma.task.create({
    data: {
      id: "task-5",
      projectId: project1.id,
      columnId: "col-5", // Done
      taskKey: "KAN-5",
      title: "Configure Docker Compose for local PostgreSQL 16 & Redis",
      description: "Provide reproducible developer environment with health checks and persistent volumes.",
      priority: "LOW",
      status: "DONE",
      position: 1000,
      points: 2,
      reporterId: "user-3",
      startDate: yesterday,
      assignees: {
        create: [{ userId: "user-3" }],
      },
      labels: {
        create: [{ labelId: "lbl-3" }],
      },
      comments: {
        create: [
          {
            authorId: "user-3",
            content: "Docker Compose is running cleanly on port 5433 with persistent volumes.",
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Task 6: KAN-6
  await prisma.task.create({
    data: {
      id: "task-6",
      projectId: project1.id,
      columnId: "col-1", // Backlog
      taskKey: "KAN-6",
      title: "Optimize initial board bundle with dynamic route splits",
      description: "Code-split modal dialogs, Markdown editor, and date picker to reduce initial bundle size below 80kB.",
      priority: "LOW",
      status: "BACKLOG",
      position: 1000,
      points: 5,
      reporterId: "user-2",
      assignees: {
        create: [{ userId: "user-2" }],
      },
      labels: {
        create: [{ labelId: "lbl-2" }],
      },
    },
  });

  // Task 7: MOB-1
  await prisma.task.create({
    data: {
      id: "task-7",
      projectId: project2.id,
      columnId: "col-mob-2", // In Progress
      taskKey: "MOB-1",
      title: "Setup Expo React Native architecture & navigation stack",
      description: "Initialize TypeScript client with React Navigation native stack and TanStack Query state cache.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      position: 1000,
      points: 5,
      reporterId: "user-2",
      dueDate: nextWeek,
      startDate: now,
      assignees: {
        create: [{ userId: "user-2" }],
      },
      labels: {
        create: [{ labelId: "lbl-2" }, { labelId: "lbl-5" }],
      },
    },
  });

  // Task 8: MOB-2
  await prisma.task.create({
    data: {
      id: "task-8",
      projectId: project2.id,
      columnId: "col-mob-1", // Backlog
      taskKey: "MOB-2",
      title: "Implement biometric authentication (Face ID & Touch ID)",
      description: "Integrate expo-local-authentication for secure local credential unlock on iOS and Android.",
      priority: "MEDIUM",
      status: "BACKLOG",
      position: 1000,
      points: 3,
      reporterId: "user-2",
      assignees: {
        create: [{ userId: "user-3" }],
      },
      labels: {
        create: [{ labelId: "lbl-6" }],
      },
    },
  });
  console.log("   - Seeded 8 tasks with assignees, labels, checklists, and comments.");

  // Initialize task sequence counters for projects
  await prisma.taskSequence.createMany({
    data: [
      { projectId: project1.id, current: 7 },
      { projectId: project2.id, current: 1 },
    ],
  });
  console.log("   - Initialized task sequence counters.");

  console.log("🔔 Step 9: Creating initial notifications and audit logs...");
  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project1.id,
        taskId: "task-1",
        actorId: "user-1",
        action: "TASK_CREATED",
        details: 'Alex Rivera created task "Implement WebSocket live sync protocol"',
        createdAt: yesterday,
      },
      {
        workspaceId: workspace.id,
        projectId: project1.id,
        taskId: "task-3",
        actorId: "user-3",
        action: "TASK_MOVED",
        details: 'Marcus Vance moved task KAN-3 to "In Review"',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: "user-3",
        actorId: "user-2",
        type: "MENTION",
        title: "Sarah Chen mentioned you",
        message: "@Marcus Vance please check if we can reuse the connection health checker here.",
        link: `/workspace/${workspace.slug}/project/KAN?task=task-1`,
        isRead: false,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        userId: "user-2",
        actorId: "user-1",
        type: "TASK_ASSIGNED",
        title: "Assigned to KAN-2",
        message: 'Alex Rivera assigned you to "Design fluid drag-and-drop Kanban column animations".',
        link: `/workspace/${workspace.slug}/project/KAN?task=task-2`,
        isRead: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("💌 Step 10: Creating sample workspace invitation...");
  await prisma.workspaceInvitation.create({
    data: {
      id: "inv-demo-1",
      workspaceId: workspace.id,
      email: "designer@acme.io",
      role: "MEMBER",
      token: "demo-invite-token-designer-2026",
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      inviterId: "user-1",
    },
  });
  console.log("   - Created sample invitation for designer@acme.io (role: MEMBER)");

  console.log("\n🎉 Database dummy seeding complete!");
  console.log(`   Workspace: ${workspace.name} (/${workspace.slug})`);
  console.log("   Members: 4 (Alex: Owner, Sarah: Admin, Marcus: Member, Elena: Viewer)");
  console.log("   Teams: 2 (Core Engineering, Product & Design)");
  console.log("   Projects: 2 (SyncBoard Web [KAN], Mobile Companion App [MOB])");
  console.log("   Tasks: 8 tasks with checklists, comments, and labels");
  console.log("   Invitations: 1 pending demo invitation (designer@acme.io)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
