import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "./session";
import { db } from "./db";
import { createProject, listProjects, softDeleteProject, updateProject } from "./projects";

const marker = randomUUID();
let first: SessionUser;
let second: SessionUser;
let projectId: string;

describe("project ownership integration", () => {
  beforeAll(async () => {
    const [a, b] = await Promise.all([
      db.user.create({ data: { email: `owner-a-${marker}@test.local`, name: "Owner A", passwordHash: "integration-only" }, select: { id: true, email: true, name: true, role: true } }),
      db.user.create({ data: { email: `owner-b-${marker}@test.local`, name: "Owner B", passwordHash: "integration-only" }, select: { id: true, email: true, name: true, role: true } }),
    ]);
    first = a; second = b;
    projectId = (await createProject(first, { title: "Private project" })).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { in: [`owner-a-${marker}@test.local`, `owner-b-${marker}@test.local`] } } });
    await db.$disconnect();
  });

  it("lists only the current user's project", async () => {
    expect((await listProjects(first)).some((project) => project.id === projectId)).toBe(true);
    expect((await listProjects(second)).some((project) => project.id === projectId)).toBe(false);
  });

  it("conceals another user's project on update and delete", async () => {
    await expect(updateProject(second, projectId, { title: "Stolen" })).rejects.toMatchObject({ status: 404 });
    await expect(softDeleteProject(second, projectId)).rejects.toMatchObject({ status: 404 });
  });

  it("supports archive and soft delete for the owner", async () => {
    expect((await updateProject(first, projectId, { archived: true })).archivedAt).not.toBeNull();
    await softDeleteProject(first, projectId);
    expect((await listProjects(first)).some((project) => project.id === projectId)).toBe(false);
  });
});
