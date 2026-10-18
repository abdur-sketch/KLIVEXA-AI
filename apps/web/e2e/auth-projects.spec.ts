import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const fixturePath = path.join(os.tmpdir(), `klivexa-e2e-${process.pid}.mp4`);

test.beforeAll(() => {
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=0x6d28d9:s=320x180:d=1", "-threads", "1", "-pix_fmt", "yuv420p", "-y", fixturePath]);
});

test.afterAll(() => {
  if (existsSync(fixturePath)) unlinkSync(fixturePath);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("creator@klivexa.local");
  await page.getByLabel("Password", { exact: true }).fill("Creator!Phase1");
  await Promise.all([
    page.waitForURL("/", { timeout: 15_000 }),
    page.getByRole("button", { name: "Masuk", exact: true }).click(),
  ]);
}

test("authenticated creator manages a project", async ({ page, context }, testInfo) => {
  await login(page);
  await expect(page.getByRole("heading", { name: /Selamat datang/ })).toBeVisible();

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "klivexa_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  await page.goto("/projects");
  const title = `E2E ${testInfo.project.name} ${Date.now()}`;
  await page.getByTestId("new-project").click();
  await page.getByLabel("Judul").fill(title);
  await page.getByLabel("Deskripsi").fill("Synthetic E2E project");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText(title)).toBeVisible();

  const card = page.getByTestId("project-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Arsipkan proyek" }).click();
  await expect(card.getByText("Archived")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Hapus proyek" }).click();
  await expect(card).toHaveCount(0);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Logout" }).last().click();
  await expect(page).toHaveURL("/login");
  expect((await context.cookies()).some((cookie) => cookie.name === "klivexa_session")).toBe(false);
});

test("responsive shell keeps mobile navigation usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chrome-mobile", "Mobile-specific assertion");
  await login(page);
  await expect(page.locator("nav").last()).toBeVisible();
  await page.locator("nav").last().getByText("Projects").click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});

test("private media upload is processed and an invalid upload is rejected", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await login(page);
  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media Library" })).toBeVisible();

  const uploadForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Upload & inspect" }) });
  const projectSelect = uploadForm.getByLabel("Project tujuan");
  const firstProject = await projectSelect.locator("option").nth(1).getAttribute("value");
  expect(firstProject).toBeTruthy();
  await projectSelect.selectOption(firstProject!);
  await uploadForm.getByLabel("File video").setInputFiles(fixturePath);
  await uploadForm.getByRole("button", { name: "Upload & inspect" }).click();
  const card = page.getByTestId("media-card").filter({ hasText: path.basename(fixturePath) }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText("Ready", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(card.locator("video")).toBeVisible();

  await projectSelect.selectOption(firstProject!);
  await uploadForm.getByLabel("File video").setInputFiles({ name: "renamed-malware.mp4", mimeType: "video/mp4", buffer: Buffer.from("MZ fake executable") });
  await uploadForm.getByRole("button", { name: "Upload & inspect" }).click();
  await expect(page.locator("p[role='alert']")).toContainText("Magic bytes");

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Hapus media" }).click();
  await expect(card).toHaveCount(0);
  expect(testInfo.project.name).toMatch(/^chrome-/);
});
