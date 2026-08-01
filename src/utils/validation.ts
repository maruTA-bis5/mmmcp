import { z } from "zod";

export const mattermostIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9]+$/, "Must be a Mattermost identifier.");

export const paginationSchema = z.object({
  page: z.number().int().min(0).optional(),
  per_page: z.number().int().min(1).max(200).optional(),
});
