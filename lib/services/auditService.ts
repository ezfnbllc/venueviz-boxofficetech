import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Helper to check if code is running in browser
const isBrowser = typeof window !== 'undefined'

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import'
  | 'login' | 'logout' | 'login_failed' | 'password_reset'
  | 'permission_change' | 'settings_change'
  | 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'refund'
  | 'api_access' | 'webhook_triggered' | 'bulk_operation'

export type AuditResource =
  | 'event' | 'venue' | 'layout' | 'order' | 'customer' | 'promoter'
  | 'promotion' | 'user' | 'payment_gateway' | 'document'
  | 'settings' | 'api_key' | 'webhook' | 'report'

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AuditLogEntry {
  id?: string
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  resourceName?: string
  userId: string
  userEmail: string
  userName?: string
  userRole?: string
  promoterId?: string
  ipAddress?: string
  userAgent?: string
  previousValue?: any
  newValue?: any
  metadata?: Record<string, any>
  severity: AuditSeverity
  status: 'success' | 'failure' | 'pending'
  errorMessage?: string
  timestamp: Date
  sessionId?: string
}

export interface AuditLogFilter {
  action?: AuditAction | AuditAction[]
  resource?: AuditResource | AuditResource[]
  userId?: string
  promoterId?: string
  severity?: AuditSeverity | AuditSeverity[]
  status?: 'success' | 'failure' | 'pending'
  startDate?: Date
  endDate?: Date
  searchTerm?: string
  limit?: number
}

export interface AuditStats {
  totalLogs: number
  byAction: Record<string, number>
  byResource: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  recentActivity: AuditLogEntry[]
  suspiciousActivity: AuditLogEntry[]
}

// Determine severity based on action and resource
function determineSeverity(action: AuditAction, resource: AuditResource): AuditSeverity {
  const criticalActions: AuditAction[] = ['permission_change', 'login_failed', 'payment_failed', 'refund']
  const highActions: AuditAction[] = ['delete', 'settings_change', 'bulk_operation', 'payment_initiated']
  const mediumActions: AuditAction[] = ['create', 'update', 'import', 'export', 'payment_completed']

  const sensitiveResources: AuditResource[] = ['user', 'payment_gateway', 'api_key', 'settings']

  if (criticalActions.includes(action)) return 'critical'
  if (highActions.includes(action) || sensitiveResources.includes(resource)) return 'high'
  if (mediumActions.includes(action)) return 'medium'
  return 'low'
}

export class AuditService {
  private static sessionId: string = typeof crypto !== 'undefined'
    ? crypto.randomUUID?.() || Math.random().toString(36).substring(2)
    : Math.random().toString(36).substring(2)

  // Log an action
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'severity' | 'sessionId'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const severity = determineSeverity(entry.action, entry.resource)

      const logEntry: Omit<AuditLogEntry, 'id'> = {
        ...entry,
        severity,
        sessionId: this.sessionId,
        timestamp: new Date(),
        ipAddress: entry.ipAddress || await this.getClientIP(),
        userAgent: entry.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
      }

      // Clean undefined values
      const cleanEntry = JSON.parse(JSON.stringify(logEntry))

      const auditRef = collection(db, 'audit_logs')
      const docRef = await addDoc(auditRef, {
        ...cleanEntry,
        timestamp: Timestamp.now()
      })

      // Log critical events to console for immediate visibility
      if (severity === 'critical') {
        console.warn('[AUDIT CRITICAL]', logEntry)
      }

      return docRef.id
    } catch (error) {
      console.error('[AuditService] Error logging audit entry:', error)
      return null
    }
  }

  // Convenience methods for common actions
  static async logCreate(
    resource: AuditResource,
    resourceId: string,
    resourceName: string,
    user: { id: string; email: string; name?: string; role?: string },
    newValue?: any,
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'create',
      resource,
      resourceId,
      resourceName,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      newValue,
      status: 'success'
    })
  }

  static async logUpdate(
    resource: AuditResource,
    resourceId: string,
    resourceName: string,
    user: { id: string; email: string; name?: string; role?: string },
    previousValue?: any,
    newValue?: any,
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'update',
      resource,
      resourceId,
      resourceName,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      previousValue,
      newValue,
      status: 'success'
    })
  }

  static async logDelete(
    resource: AuditResource,
    resourceId: string,
    resourceName: string,
    user: { id: string; email: string; name?: string; role?: string },
    previousValue?: any,
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'delete',
      resource,
      resourceId,
      resourceName,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      previousValue,
      status: 'success'
    })
  }

  static async logView(
    resource: AuditResource,
    resourceId: string,
    resourceName: string,
    user: { id: string; email: string; name?: string; role?: string },
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'view',
      resource,
      resourceId,
      resourceName,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      status: 'success'
    })
  }

  static async logLogin(
    user: { id: string; email: string; name?: string; role?: string },
    success: boolean,
    errorMessage?: string
  ): Promise<string | null> {
    return this.log({
      action: success ? 'login' : 'login_failed',
      resource: 'user',
      resourceId: user.id,
      resourceName: user.email,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      status: success ? 'success' : 'failure',
      errorMessage
    })
  }

  static async logLogout(
    user: { id: string; email: string; name?: string; role?: string }
  ): Promise<string | null> {
    return this.log({
      action: 'logout',
      resource: 'user',
      resourceId: user.id,
      resourceName: user.email,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      status: 'success'
    })
  }

  static async logPayment(
    action: 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'refund',
    orderId: string,
    user: { id: string; email: string; name?: string; role?: string },
    metadata: {
      amount?: number
      paymentMethod?: string
      transactionId?: string
      errorMessage?: string
    },
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action,
      resource: 'order',
      resourceId: orderId,
      resourceName: `Order ${orderId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      metadata,
      status: action === 'payment_failed' ? 'failure' : 'success',
      errorMessage: metadata.errorMessage
    })
  }

  static async logBulkOperation(
    resource: AuditResource,
    action: 'create' | 'update' | 'delete',
    user: { id: string; email: string; name?: string; role?: string },
    metadata: {
      count: number
      resourceIds: string[]
      description?: string
    },
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'bulk_operation',
      resource,
      resourceName: `Bulk ${action} ${metadata.count} ${resource}s`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      metadata,
      status: 'success'
    })
  }

  static async logExport(
    resource: AuditResource,
    user: { id: string; email: string; name?: string; role?: string },
    metadata: {
      format: string
      recordCount: number
      filters?: any
    },
    promoterId?: string
  ): Promise<string | null> {
    return this.log({
      action: 'export',
      resource,
      resourceName: `Export ${metadata.recordCount} ${resource}s`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      promoterId,
      metadata,
      status: 'success'
    })
  }

  // Query audit logs
  static async getLogs(filter?: AuditLogFilter): Promise<AuditLogEntry[]> {
    if (!isBrowser) return []

    try {
      const auditRef = collection(db, 'audit_logs')
      let q = query(auditRef, orderBy('timestamp', 'desc'))

      if (filter?.limit) {
        q = query(q, limit(filter.limit))
      } else {
        q = query(q, limit(100)) // Default limit
      }

      const snapshot = await getDocs(q)
      let logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      })) as AuditLogEntry[]

      // Apply client-side filters (Firestore has limited query capabilities)
      if (filter) {
        if (filter.action) {
          const actions = Array.isArray(filter.action) ? filter.action : [filter.action]
          logs = logs.filter(log => actions.includes(log.action))
        }

        if (filter.resource) {
          const resources = Array.isArray(filter.resource) ? filter.resource : [filter.resource]
          logs = logs.filter(log => resources.includes(log.resource))
        }

        if (filter.userId) {
          logs = logs.filter(log => log.userId === filter.userId)
        }

        if (filter.promoterId) {
          logs = logs.filter(log => log.promoterId === filter.promoterId)
        }

        if (filter.severity) {
          const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity]
          logs = logs.filter(log => severities.includes(log.severity))
        }

        if (filter.status) {
          logs = logs.filter(log => log.status === filter.status)
        }

        if (filter.startDate) {
          logs = logs.filter(log => new Date(log.timestamp) >= filter.startDate!)
        }

        if (filter.endDate) {
          logs = logs.filter(log => new Date(log.timestamp) <= filter.endDate!)
        }

        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase()
          logs = logs.filter(log =>
            log.resourceName?.toLowerCase().includes(term) ||
            log.userEmail?.toLowerCase().includes(term) ||
            log.userName?.toLowerCase().includes(term) ||
            log.action?.toLowerCase().includes(term)
          )
        }
      }

      return logs
    } catch (error) {
      console.error('[AuditService] Error fetching audit logs:', error)
      return []
    }
  }

  // Get audit statistics
  static async getStats(filter?: { promoterId?: string; days?: number }): Promise<AuditStats> {
    if (!isBrowser) {
      return this.getEmptyStats()
    }

    try {
      const startDate = filter?.days
        ? new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000)
        : undefined

      const logs = await this.getLogs({
        promoterId: filter?.promoterId,
        startDate,
        limit: 1000
      })

      const byAction: Record<string, number> = {}
      const byResource: Record<string, number> = {}
      const bySeverity: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      logs.forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1
        byResource[log.resource] = (byResource[log.resource] || 0) + 1
        bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1
        byStatus[log.status] = (byStatus[log.status] || 0) + 1
      })

      // Recent activity (last 20)
      const recentActivity = logs.slice(0, 20)

      // Suspicious activity (failed logins, critical severity)
      const suspiciousActivity = logs.filter(log =>
        log.action === 'login_failed' ||
        log.severity === 'critical' ||
        log.status === 'failure'
      ).slice(0, 10)

      return {
        totalLogs: logs.length,
        byAction,
        byResource,
        bySeverity,
        byStatus,
        recentActivity,
        suspiciousActivity
      }
    } catch (error) {
      console.error('[AuditService] Error fetching audit stats:', error)
      return this.getEmptyStats()
    }
  }

  // Get user activity
  static async getUserActivity(userId: string, days: number = 30): Promise<AuditLogEntry[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return this.getLogs({
      userId,
      startDate,
      limit: 200
    })
  }

  // Get resource history
  static async getResourceHistory(resource: AuditResource, resourceId: string): Promise<AuditLogEntry[]> {
    if (!isBrowser) return []

    try {
      const auditRef = collection(db, 'audit_logs')
      const q = query(
        auditRef,
        where('resource', '==', resource),
        where('resourceId', '==', resourceId),
        orderBy('timestamp', 'desc'),
        limit(50)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      })) as AuditLogEntry[]
    } catch (error) {
      console.error('[AuditService] Error fetching resource history:', error)
      return []
    }
  }

  // Detect suspicious patterns
  static async detectSuspiciousActivity(options?: {
    failedLoginThreshold?: number
    timeWindowMinutes?: number
  }): Promise<{
    alerts: Array<{
      type: string
      severity: AuditSeverity
      message: string
      details: any
    }>
  }> {
    const threshold = options?.failedLoginThreshold || 5
    const timeWindow = options?.timeWindowMinutes || 30
    const startDate = new Date(Date.now() - timeWindow * 60 * 1000)

    const recentLogs = await this.getLogs({
      startDate,
      limit: 500
    })

    const alerts: Array<{
      type: string
      severity: AuditSeverity
      message: string
      details: any
    }> = []

    // Check for brute force login attempts
    const failedLogins: Record<string, number> = {}
    recentLogs
      .filter(log => log.action === 'login_failed')
      .forEach(log => {
        failedLogins[log.userEmail] = (failedLogins[log.userEmail] || 0) + 1
      })

    Object.entries(failedLogins).forEach(([email, count]) => {
      if (count >= threshold) {
        alerts.push({
          type: 'brute_force_attempt',
          severity: 'critical',
          message: `Multiple failed login attempts for ${email}`,
          details: { email, attempts: count, timeWindow }
        })
      }
    })

    // Check for unusual bulk operations
    const bulkOps = recentLogs.filter(log => log.action === 'bulk_operation')
    if (bulkOps.length > 10) {
      alerts.push({
        type: 'excessive_bulk_operations',
        severity: 'high',
        message: `Unusual number of bulk operations detected`,
        details: { count: bulkOps.length, operations: bulkOps.slice(0, 5) }
      })
    }

    // Check for sensitive data access
    const sensitiveAccess = recentLogs.filter(log =>
      log.resource === 'payment_gateway' ||
      log.resource === 'api_key' ||
      (log.action === 'export' && log.resource === 'customer')
    )
    if (sensitiveAccess.length > 0) {
      alerts.push({
        type: 'sensitive_data_access',
        severity: 'medium',
        message: `Sensitive data access detected`,
        details: { count: sensitiveAccess.length, access: sensitiveAccess.slice(0, 5) }
      })
    }

    return { alerts }
  }

  // Helper to get client IP (best effort)
  private static async getClientIP(): Promise<string | undefined> {
    try {
      // This would need a server-side endpoint in production
      return undefined
    } catch {
      return undefined
    }
  }

  private static getEmptyStats(): AuditStats {
    return {
      totalLogs: 0,
      byAction: {},
      byResource: {},
      bySeverity: {},
      byStatus: {},
      recentActivity: [],
      suspiciousActivity: []
    }
  }
}

export default AuditService
