import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface AuditLogParams {
  userId?: string | null
  userEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, any>
  req?: Request
}

/**
 * Logs an audit event on the server side.
 * Safely extracts client IP and user-agent from Request headers if provided.
 * Inserts directly into public.audit_logs via Supabase service role or server client.
 * Never throws an error so primary operations are not interrupted.
 */
export async function logServerAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (params.req) {
      const forwardedFor = params.req.headers.get('x-forwarded-for')
      const realIp = params.req.headers.get('x-real-ip')
      ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || null)
      userAgent = params.req.headers.get('user-agent') || null
    }

    let supabase: any
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    } else {
      supabase = await createServerClient()
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: params.details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (error) {
      console.error('[audit-logger] Failed to insert audit log:', error)
    }
  } catch (error) {
    console.error('[audit-logger] Unexpected error logging audit event:', error)
  }
}

/**
 * Records an audit event from client-side code by dispatching a POST to /api/audit.
 * Fails silently on network errors so UI actions are never blocked.
 */
export async function recordClientAudit(params: Omit<AuditLogParams, 'req'>): Promise<void> {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      }),
    })
  } catch {
    // Fail silently on network errors
  }
}
