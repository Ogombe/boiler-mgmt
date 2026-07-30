import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

/**
 * Thin, fail-safe wrapper around the AuditLog table.
 *
 * Audit logging must never break the calling operation, so every helper
 * swallows errors and only logs to the console. Callers do not need to await
 * the result (fire-and-forget is fine) but may do so for ordering.
 *
 * Self-contained (depends only on @/lib/db).
 */

export interface AuditEntry {
  factoryId: string;
  /** User performing the action. Omit for system-generated events. */
  userId?: string | null;
  /** e.g. "create" | "update" | "delete" | "login" | "export" | "approve" | "system" */
  action: string;
  /** e.g. "Boiler" | "OperationLog" | "Notification" | "Report" ... */
  entityType: string;
  /** Primary key of the affected record, when applicable. */
  entityId?: string | null;
  /** Free-form JSON or human-readable context. */
  details?: string | null;
}

/** Alias type kept for compatibility with alternate naming conventions. */
export type LogAuditParams = AuditEntry;

/** Write a single audit record. Never throws. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!entry?.factoryId || !entry?.action || !entry?.entityType) {
    console.warn('[audit] Skipping entry with missing required fields:', entry);
    return;
  }
  try {
    await db.auditLog.create({
      data: {
        factoryId: entry.factoryId,
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] Failed to write audit log:', error);
  }
}

/** Alias of `logAudit` (alternate naming convention). */
export const createAuditLog = logAudit;

/** Write multiple audit records in a single transaction. Never throws. */
export async function logAuditBatch(entries: AuditEntry[]): Promise<void> {
  if (!entries?.length) return;
  try {
    await db.$transaction(
      entries
        .filter((e) => e?.factoryId && e?.action && e?.entityType)
        .map((entry) =>
          db.auditLog.create({
            data: {
              factoryId: entry.factoryId,
              userId: entry.userId ?? null,
              action: entry.action,
              entityType: entry.entityType,
              entityId: entry.entityId ?? null,
              details: entry.details ?? null,
            },
          }),
        ),
    );
  } catch (error) {
    console.error('[audit] Failed to write audit batch:', error);
  }
}

// ---------- convenience builders ----------

function build(action: string) {
  return (e: Omit<AuditEntry, 'action'>) => logAudit({ ...e, action });
}

export const audit = {
  create: build('create'),
  update: build('update'),
  delete: build('delete'),
  export: build('export'),
  login: build('login'),
  approve: build('approve'),
  system: build('system'),
};

/** Function-form convenience helpers (alternate naming convention). */
export function auditCreate(factoryId: string, entityType: string, entityId?: string | null, userId?: string | null, details?: string | null) {
  return logAudit({ factoryId, entityType, entityId: entityId ?? null, userId: userId ?? null, details: details ?? null, action: 'create' });
}
export function auditUpdate(factoryId: string, entityType: string, entityId?: string | null, userId?: string | null, details?: string | null) {
  return logAudit({ factoryId, entityType, entityId: entityId ?? null, userId: userId ?? null, details: details ?? null, action: 'update' });
}
export function auditDelete(factoryId: string, entityType: string, entityId?: string | null, userId?: string | null, details?: string | null) {
  return logAudit({ factoryId, entityType, entityId: entityId ?? null, userId: userId ?? null, details: details ?? null, action: 'delete' });
}
export function auditLogin(factoryId: string, userId: string, details?: string | null) {
  return logAudit({ factoryId, userId, entityType: 'User', action: 'login', details: details ?? null });
}
export function auditExport(factoryId: string, entityType: string, userId?: string | null, details?: string | null) {
  return logAudit({ factoryId, userId: userId ?? null, entityType, action: 'export', details: details ?? null });
}

// ---------- actor resolution ----------

/**
 * Best-effort resolution of the acting user + factory from a request.
 * Reads `x-user-id` / `x-factory-id` headers first, then falls back to
 * query params (`userId`, `factoryId`, `performedBy`). Returns nulls when
 * unavailable.
 */
export async function resolveActor(
  request: NextRequest | Request,
): Promise<{ userId: string | null; factoryId: string | null }> {
  try {
    const url = new URL(request.url);
    const userId =
      request.headers.get('x-user-id') ||
      url.searchParams.get('userId') ||
      url.searchParams.get('performedBy') ||
      null;
    const factoryId =
      request.headers.get('x-factory-id') ||
      url.searchParams.get('factoryId') ||
      null;
    return { userId, factoryId };
  } catch {
    return { userId: null, factoryId: null };
  }
}

// ---------- audit trail reads ----------

export interface AuditTrailFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/** Read the audit trail for a factory. Degrades to an empty result on error. */
export async function getAuditTrail(factoryId: string, filters: AuditTrailFilters = {}) {
  try {
    const where: Record<string, unknown> = { factoryId };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
      where.createdAt = dateFilter;
    }

    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const offset = Math.max(filters.offset ?? 0, 0);

    const [records, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      db.auditLog.count({ where }),
    ]);

    return { records, total };
  } catch (error) {
    console.error('[audit] Failed to read audit trail:', error);
    return { records: [], total: 0 };
  }
}

/** Alias of `getAuditTrail` with a filter-object-first signature. */
export async function getAuditLogs(filters: AuditTrailFilters & { factoryId: string }) {
  const { factoryId, ...rest } = filters;
  return getAuditTrail(factoryId, rest);
}
