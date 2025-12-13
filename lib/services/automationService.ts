import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { NotificationService } from './notificationService'
import { DynamicPricingService } from './dynamicPricingService'
import { ReportService } from './reportService'
import { WebhookService } from './webhookService'

const isBrowser = typeof window !== 'undefined'

export type AutomationTrigger =
  | 'schedule' | 'event_created' | 'event_updated' | 'event_date_approaching'
  | 'order_created' | 'order_completed' | 'low_inventory'
  | 'price_threshold' | 'sales_milestone' | 'manual'

export type AutomationAction =
  | 'send_notification' | 'send_email' | 'update_pricing'
  | 'generate_report' | 'trigger_webhook' | 'update_event_status'
  | 'apply_promotion' | 'send_reminder' | 'export_data'

export interface AutomationRule {
  id?: string
  name: string
  description?: string
  trigger: AutomationTrigger
  triggerConfig: TriggerConfig
  actions: ActionConfig[]
  enabled: boolean
  promoterId?: string
  filters?: {
    eventIds?: string[]
    categories?: string[]
    venueIds?: string[]
  }
  executionHistory: ExecutionRecord[]
  lastExecuted?: Date
  nextExecution?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface TriggerConfig {
  // Schedule trigger
  cronExpression?: string
  timezone?: string

  // Event date approaching
  daysBeforeEvent?: number

  // Low inventory
  inventoryThreshold?: number // percentage

  // Price threshold
  priceAbove?: number
  priceBelow?: number

  // Sales milestone
  salesCount?: number
  revenueAmount?: number

  // Time-based
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
}

export interface ActionConfig {
  action: AutomationAction
  config: {
    // Notification
    notificationType?: string
    notificationTitle?: string
    notificationMessage?: string
    notificationPriority?: string

    // Email
    emailTemplate?: string
    emailSubject?: string
    emailRecipients?: string[]

    // Pricing
    priceAdjustmentPercent?: number
    priceAdjustmentFixed?: number
    applyToTiers?: string[]

    // Report
    reportType?: string
    reportFormat?: string
    reportRecipients?: string[]

    // Webhook
    webhookId?: string

    // Event status
    newStatus?: string

    // Promotion
    promotionId?: string

    // Custom data
    customData?: Record<string, any>
  }
  delayMinutes?: number
  condition?: string
}

export interface ExecutionRecord {
  timestamp: Date
  trigger: string
  success: boolean
  actionsExecuted: string[]
  error?: string
  duration: number
}

export interface ScheduledTask {
  id?: string
  name: string
  type: 'one-time' | 'recurring'
  action: AutomationAction
  actionConfig: ActionConfig['config']
  scheduledFor: Date
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly'
    interval: number
    daysOfWeek?: number[]
    dayOfMonth?: number
    endDate?: Date
  }
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  lastRun?: Date
  nextRun?: Date
  runCount: number
  maxRuns?: number
  createdBy?: string
  promoterId?: string
  createdAt?: Date
}

export class AutomationService {

  // ============ AUTOMATION RULES ============

  // Get all automation rules
  static async getRules(promoterId?: string): Promise<AutomationRule[]> {
    if (!isBrowser) return []

    try {
      const rulesRef = collection(db, 'automation_rules')
      let q = query(rulesRef)

      if (promoterId) {
        q = query(rulesRef, where('promoterId', '==', promoterId))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastExecuted: doc.data().lastExecuted?.toDate?.(),
        nextExecution: doc.data().nextExecution?.toDate?.(),
        createdAt: doc.data().createdAt?.toDate?.(),
        updatedAt: doc.data().updatedAt?.toDate?.()
      })) as AutomationRule[]
    } catch (error) {
      console.error('[AutomationService] Error fetching rules:', error)
      return []
    }
  }

  // Create automation rule
  static async createRule(rule: Omit<AutomationRule, 'id' | 'executionHistory' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const rulesRef = collection(db, 'automation_rules')
      const docRef = await addDoc(rulesRef, {
        ...rule,
        executionHistory: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('[AutomationService] Error creating rule:', error)
      return null
    }
  }

  // Update automation rule
  static async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const ruleRef = doc(db, 'automation_rules', ruleId)
      await updateDoc(ruleRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('[AutomationService] Error updating rule:', error)
      return false
    }
  }

  // Delete automation rule
  static async deleteRule(ruleId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const ruleRef = doc(db, 'automation_rules', ruleId)
      await deleteDoc(ruleRef)
      return true
    } catch (error) {
      console.error('[AutomationService] Error deleting rule:', error)
      return false
    }
  }

  // Execute an automation rule
  static async executeRule(rule: AutomationRule, context?: Record<string, any>): Promise<ExecutionRecord> {
    const startTime = Date.now()
    const actionsExecuted: string[] = []
    let error: string | undefined

    try {
      for (const actionConfig of rule.actions) {
        // Check condition if specified
        if (actionConfig.condition && !this.evaluateCondition(actionConfig.condition, context)) {
          continue
        }

        // Apply delay if specified
        if (actionConfig.delayMinutes && actionConfig.delayMinutes > 0) {
          await new Promise(resolve => setTimeout(resolve, actionConfig.delayMinutes! * 60 * 1000))
        }

        // Execute action
        await this.executeAction(actionConfig, context)
        actionsExecuted.push(actionConfig.action)
      }

      // Update rule execution history
      const record: ExecutionRecord = {
        timestamp: new Date(),
        trigger: rule.trigger,
        success: true,
        actionsExecuted,
        duration: Date.now() - startTime
      }

      await this.updateRule(rule.id!, {
        lastExecuted: new Date(),
        executionHistory: [...(rule.executionHistory || []).slice(-99), record]
      })

      return record
    } catch (err: any) {
      error = err.message

      const record: ExecutionRecord = {
        timestamp: new Date(),
        trigger: rule.trigger,
        success: false,
        actionsExecuted,
        error,
        duration: Date.now() - startTime
      }

      await this.updateRule(rule.id!, {
        lastExecuted: new Date(),
        executionHistory: [...(rule.executionHistory || []).slice(-99), record]
      })

      return record
    }
  }

  // Execute a single action
  private static async executeAction(actionConfig: ActionConfig, context?: Record<string, any>): Promise<void> {
    switch (actionConfig.action) {
      case 'send_notification':
        if (context?.userId) {
          await NotificationService.create({
            type: (actionConfig.config.notificationType as any) || 'system',
            priority: (actionConfig.config.notificationPriority as any) || 'medium',
            title: this.interpolate(actionConfig.config.notificationTitle || 'Automation Alert', context),
            message: this.interpolate(actionConfig.config.notificationMessage || '', context),
            userId: context.userId
          })
        }
        break

      case 'update_pricing':
        if (context?.eventId && actionConfig.config.priceAdjustmentPercent) {
          const analysis = await DynamicPricingService.analyzeEventPricing(context.eventId)
          if (analysis) {
            const tierName = actionConfig.config.applyToTiers?.[0] || analysis.currentPricing.tiers[0]?.name
            if (tierName) {
              const currentPrice = analysis.currentPricing.tiers.find(t => t.name === tierName)?.currentPrice || 0
              const newPrice = currentPrice * (1 + actionConfig.config.priceAdjustmentPercent / 100)
              await DynamicPricingService.applyPricingAdjustment(
                context.eventId,
                tierName,
                newPrice,
                'Automation rule adjustment'
              )
            }
          }
        }
        break

      case 'generate_report':
        if (actionConfig.config.reportType) {
          await ReportService.generateReport({
            type: actionConfig.config.reportType as any,
            format: (actionConfig.config.reportFormat as any) || 'json',
            includeCharts: true
          })
        }
        break

      case 'trigger_webhook':
        if (actionConfig.config.webhookId) {
          await WebhookService.testWebhook(actionConfig.config.webhookId)
        }
        break

      case 'send_reminder':
        if (context?.userId && context?.eventId) {
          await NotificationService.notifyEventReminder(
            { id: context.eventId, name: context.eventName },
            context.userId,
            context.daysUntilEvent || 1
          )
        }
        break

      default:
        console.log(`[AutomationService] Action ${actionConfig.action} not implemented`)
    }
  }

  // ============ SCHEDULED TASKS ============

  // Get scheduled tasks
  static async getScheduledTasks(options?: {
    status?: string
    promoterId?: string
  }): Promise<ScheduledTask[]> {
    if (!isBrowser) return []

    try {
      const tasksRef = collection(db, 'scheduled_tasks')
      const snapshot = await getDocs(tasksRef)

      let tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor?.toDate?.() || new Date(),
        lastRun: doc.data().lastRun?.toDate?.(),
        nextRun: doc.data().nextRun?.toDate?.(),
        createdAt: doc.data().createdAt?.toDate?.()
      })) as ScheduledTask[]

      if (options?.status) {
        tasks = tasks.filter(t => t.status === options.status)
      }

      if (options?.promoterId) {
        tasks = tasks.filter(t => t.promoterId === options.promoterId)
      }

      return tasks.sort((a, b) =>
        (a.nextRun || a.scheduledFor).getTime() - (b.nextRun || b.scheduledFor).getTime()
      )
    } catch (error) {
      console.error('[AutomationService] Error fetching tasks:', error)
      return []
    }
  }

  // Create scheduled task
  static async createTask(task: Omit<ScheduledTask, 'id' | 'status' | 'runCount' | 'createdAt'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const tasksRef = collection(db, 'scheduled_tasks')
      const docRef = await addDoc(tasksRef, {
        ...task,
        status: 'pending',
        runCount: 0,
        nextRun: Timestamp.fromDate(task.scheduledFor),
        createdAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('[AutomationService] Error creating task:', error)
      return null
    }
  }

  // Cancel scheduled task
  static async cancelTask(taskId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const taskRef = doc(db, 'scheduled_tasks', taskId)
      await updateDoc(taskRef, {
        status: 'cancelled'
      })
      return true
    } catch (error) {
      console.error('[AutomationService] Error cancelling task:', error)
      return false
    }
  }

  // Execute scheduled task
  static async executeTask(task: ScheduledTask): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const taskRef = doc(db, 'scheduled_tasks', task.id!)

      // Update status to running
      await updateDoc(taskRef, {
        status: 'running',
        lastRun: Timestamp.now()
      })

      // Execute the action
      await this.executeAction({
        action: task.action,
        config: task.actionConfig
      })

      // Update status based on type
      const newRunCount = task.runCount + 1
      let newStatus: ScheduledTask['status'] = 'completed'
      let nextRun: Date | null = null

      if (task.type === 'recurring' && task.recurrence) {
        if (!task.maxRuns || newRunCount < task.maxRuns) {
          newStatus = 'pending'
          nextRun = this.calculateNextRun(task)
        }
      }

      await updateDoc(taskRef, {
        status: newStatus,
        runCount: newRunCount,
        nextRun: nextRun ? Timestamp.fromDate(nextRun) : null
      })

      return true
    } catch (error) {
      console.error('[AutomationService] Error executing task:', error)

      const taskRef = doc(db, 'scheduled_tasks', task.id!)
      await updateDoc(taskRef, {
        status: 'failed'
      })

      return false
    }
  }

  // ============ EVENT-TRIGGERED AUTOMATION ============

  // Check and execute rules for a specific trigger
  static async checkTrigger(
    trigger: AutomationTrigger,
    context: Record<string, any>
  ): Promise<number> {
    if (!isBrowser) return 0

    try {
      const rules = await this.getRules()
      const matchingRules = rules.filter(rule =>
        rule.enabled && rule.trigger === trigger && this.matchesFilters(rule, context)
      )

      let executedCount = 0

      for (const rule of matchingRules) {
        const result = await this.executeRule(rule, context)
        if (result.success) executedCount++
      }

      return executedCount
    } catch (error) {
      console.error('[AutomationService] Error checking trigger:', error)
      return 0
    }
  }

  // Check for events approaching
  static async checkUpcomingEvents(): Promise<void> {
    if (!isBrowser) return

    try {
      const events = await this.fetchEvents()
      const rules = await this.getRules()
      const now = new Date()

      const dateApproachingRules = rules.filter(r =>
        r.enabled && r.trigger === 'event_date_approaching'
      )

      for (const event of events) {
        const eventDate = event.schedule?.date?.toDate?.() || new Date(event.schedule?.date || 0)
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        for (const rule of dateApproachingRules) {
          if (rule.triggerConfig.daysBeforeEvent === daysUntil) {
            await this.executeRule(rule, {
              eventId: event.id,
              eventName: event.name,
              daysUntilEvent: daysUntil,
              userId: event.createdBy
            })
          }
        }
      }
    } catch (error) {
      console.error('[AutomationService] Error checking upcoming events:', error)
    }
  }

  // Check for low inventory
  static async checkLowInventory(): Promise<void> {
    if (!isBrowser) return

    try {
      const [events, orders] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders()
      ])

      const rules = await this.getRules()
      const lowInventoryRules = rules.filter(r =>
        r.enabled && r.trigger === 'low_inventory'
      )

      for (const event of events) {
        const capacity = event.capacity || event.totalCapacity || 1000
        const ticketsSold = orders
          .filter(o => o.eventId === event.id)
          .reduce((sum, o) => sum + (o.tickets?.length || o.quantity || 1), 0)

        const remainingPercent = ((capacity - ticketsSold) / capacity) * 100

        for (const rule of lowInventoryRules) {
          if (remainingPercent <= (rule.triggerConfig.inventoryThreshold || 10)) {
            await this.executeRule(rule, {
              eventId: event.id,
              eventName: event.name,
              remainingPercent,
              ticketsSold,
              capacity,
              userId: event.createdBy
            })
          }
        }
      }
    } catch (error) {
      console.error('[AutomationService] Error checking low inventory:', error)
    }
  }

  // ============ HELPER METHODS ============

  private static matchesFilters(rule: AutomationRule, context: Record<string, any>): boolean {
    if (!rule.filters) return true

    if (rule.filters.eventIds?.length && context.eventId) {
      if (!rule.filters.eventIds.includes(context.eventId)) return false
    }

    if (rule.filters.categories?.length && context.category) {
      if (!rule.filters.categories.includes(context.category)) return false
    }

    if (rule.filters.venueIds?.length && context.venueId) {
      if (!rule.filters.venueIds.includes(context.venueId)) return false
    }

    return true
  }

  private static evaluateCondition(condition: string, context?: Record<string, any>): boolean {
    if (!condition || !context) return true

    try {
      // Simple condition evaluation (e.g., "revenue > 1000")
      const parts = condition.match(/(\w+)\s*(>|<|>=|<=|==|!=)\s*(\d+)/)
      if (!parts) return true

      const [, field, operator, valueStr] = parts
      const contextValue = context[field]
      const value = parseFloat(valueStr)

      if (contextValue === undefined) return true

      switch (operator) {
        case '>': return contextValue > value
        case '<': return contextValue < value
        case '>=': return contextValue >= value
        case '<=': return contextValue <= value
        case '==': return contextValue === value
        case '!=': return contextValue !== value
        default: return true
      }
    } catch {
      return true
    }
  }

  private static interpolate(template: string, context?: Record<string, any>): string {
    if (!context) return template

    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return context[key]?.toString() || `{${key}}`
    })
  }

  private static calculateNextRun(task: ScheduledTask): Date {
    const lastRun = task.lastRun || task.scheduledFor
    const nextRun = new Date(lastRun)

    if (!task.recurrence) return nextRun

    switch (task.recurrence.pattern) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + task.recurrence.interval)
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 * task.recurrence.interval))
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + task.recurrence.interval)
        break
    }

    return nextRun
  }

  private static async fetchEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }
}

export default AutomationService
