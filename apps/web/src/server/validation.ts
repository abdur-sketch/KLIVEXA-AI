import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Password minimal 12 karakter.")
  .max(128, "Password terlalu panjang.")
  .regex(/[a-z]/, "Password memerlukan huruf kecil.")
  .regex(/[A-Z]/, "Password memerlukan huruf besar.")
  .regex(/[0-9]/, "Password memerlukan angka.")
  .regex(/[^A-Za-z0-9]/, "Password memerlukan simbol.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(128),
});

export const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const createProjectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1_000).optional().default(""),
});

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1_000).nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan yang dikirim.");

export const youtubeImportSchema = z.object({
  projectId: z.string().trim().min(10).max(40),
  url: z.string().trim().url().max(2_048),
  rightsConfirmed: z.literal(true, { error: "Konfirmasi hak penggunaan diperlukan." }),
});

export const mediaListSchema = z.object({
  projectId: z.string().trim().min(10).max(40).optional(),
});
