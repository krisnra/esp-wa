export type Health = "ok" | "down" | "loading";
export type Me = { uid: number; email: string };

export type LogRow = {
  id: number;
  ts: string | Date;
  category: string;
  level: "INFO" | "WARN" | "ERROR" | (string & {});
  message?: string | null;
};

export type SubscriberFlat = {
  phone: string;
  name?: string | null;
  topic: "ALARM" | "BRANKAS";
  enabled: boolean;
};

export type SubRow = {
  phone: string;
  name?: string | null;
  alarm: boolean;
  brankas: boolean;
};

export type ContactRow = {
  id: number;
  phone: string;
  name?: string | null;
  allowed: boolean;
  createdAt?: string;
};

export type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER" | (string & {});
  createdAt: string | Date;
};
