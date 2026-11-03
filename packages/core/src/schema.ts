import { z } from "zod";

export const ModeSchema = z.enum(["online", "offline", "hybrid"]);
export type Mode = z.infer<typeof ModeSchema>;

export const FeeTypeSchema = z.enum(["free", "paid", "unknown"]);
export type FeeType = z.infer<typeof FeeTypeSchema>;

export const FeeSchema = z.object({
  type: FeeTypeSchema,
  amountINR: z.number().int().nonnegative().optional(),
});
export type Fee = z.infer<typeof FeeSchema>;

export const SourceLinkSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});
export type SourceLink = z.infer<typeof SourceLinkSchema>;

export const HackathonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  sources: z.array(SourceLinkSchema).optional(),
  url: z.string().url(),
  organizer: z.string().min(1),
  mode: ModeSchema,
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional().default("India"),
  registrationDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  endDate: z.string().datetime({ offset: true }).nullable().optional(),
  fee: FeeSchema,
  prize: z.string().nullable().optional(),
  themes: z.array(z.string()).default([]),
  eligibility: z.string().nullable().optional(),
  teamSize: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  lastSeenAt: z.string().datetime({ offset: true }),
  isNearby: z.boolean().default(false),
  deadlineUnknown: z.boolean().default(false),
});
export type Hackathon = z.infer<typeof HackathonSchema>;

export const SourceHealthStatusSchema = z.enum(["ok", "error", "degraded"]);
export type SourceHealthStatus = z.infer<typeof SourceHealthStatusSchema>;

export const SourceHealthSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: SourceHealthStatusSchema,
  count: z.number().int().nonnegative(),
  lastRun: z.string().datetime({ offset: true }),
  error: z.string().optional(),
});
export type SourceHealth = z.infer<typeof SourceHealthSchema>;

export const HackathonDatasetSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  timezone: z.literal("Asia/Kolkata"),
  totalEvents: z.number().int().nonnegative(),
  sources: z.array(SourceHealthSchema),
  events: z.array(HackathonSchema),
});
export type HackathonDataset = z.infer<typeof HackathonDatasetSchema>;

export const FilterOptionsSchema = z.object({
  fee: z.enum(["all", "free", "paid"]).default("all").optional(),
  mode: z.enum(["all", "online", "offline", "hybrid"]).default("all").optional(),
  city: z.string().optional(),
  nearby: z.boolean().default(false).optional(),
  theme: z.string().optional(),
  closingDays: z.number().positive().optional(),
  search: z.string().optional(),
});
export type FilterOptions = z.infer<typeof FilterOptionsSchema>;
