import { PrismaClient } from "@prisma/client";

export type LogLevel = "INFO" | "WARN" | "ERROR";

const prisma = new PrismaClient();

const ERROR_WINDOW_MS = 10 * 60 * 1000;

export async function writeLog(
  category: string,
  level: LogLevel,
  message: string
) {
  try {
    if (level === "ERROR") {
      const last = await prisma.log.findFirst({
        where: { category, level, message },
        orderBy: { ts: "desc" },
        select: { ts: true },
      });

      if (last) {
        const diff = Date.now() - last.ts.getTime();
        if (diff < ERROR_WINDOW_MS) {
          return;
        }
      }
    }

    await prisma.log.create({
      data: {
        category,
        level,
        message,
      },
    });
  } catch (e) {}
}

export const log = {
  info: (category: string, message: string) =>
    writeLog(category, "INFO", message),
  warn: (category: string, message: string) =>
    writeLog(category, "WARN", message),
  error: (category: string, message: string) =>
    writeLog(category, "ERROR", message),
};
