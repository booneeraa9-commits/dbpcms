import { SETTING_DEFAULTS, type SettingKey } from "@dbpcms/shared";
import { prisma } from "../../core/db/prisma.js";
import { writeAudit } from "../../core/audit/audit.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Reads/writes admin-editable settings. get() falls back to the coded default
 * if a key is missing, so business rules always have a value.
 */
export const settingsService = {
  async list() {
    return prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  },

  async get(key: SettingKey): Promise<string> {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? SETTING_DEFAULTS[key];
  },

  async getNumber(key: SettingKey, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  },

  async update(key: string, value: string, actor: ActorMeta) {
    const before = await prisma.systemSetting.findUnique({ where: { key } });
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedBy: actor.userId },
      create: { key, value, updatedBy: actor.userId },
    });
    await writeAudit({
      userId: actor.userId,
      action: "system-setting.update",
      entityType: "SystemSetting",
      entityId: key,
      before: { value: before?.value ?? null },
      after: { value },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return updated;
  },
};
