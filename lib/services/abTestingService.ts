import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore'

// Types
export interface Experiment {
  id: string
  promoterId: string
  name: string
  description?: string
  hypothesis: string
  type: ExperimentType
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
  variants: Variant[]
  targeting: TargetingConfig
  traffic: TrafficConfig
  goals: ExperimentGoal[]
  schedule?: ExperimentSchedule
  results?: ExperimentResults
  settings: ExperimentSettings
  createdBy: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  updatedAt: Date
}

export type ExperimentType =
  | 'ab_test' // Simple A/B test
  | 'multivariate' // Multiple variables
  | 'split_url' // Different URLs
  | 'personalization' // Targeted experiences
  | 'feature_flag' // Feature rollout
  | 'holdout' // Control group measurement

export interface Variant {
  id: string
  name: string
  description?: string
  weight: number // Traffic allocation percentage
  isControl: boolean
  changes: VariantChange[]
  metrics: VariantMetrics
}

export interface VariantChange {
  id: string
  type: 'element' | 'style' | 'content' | 'redirect' | 'code' | 'config'
  selector?: string
  property?: string
  value: any
  originalValue?: any
}

export interface VariantMetrics {
  visitors: number
  conversions: number
  revenue: number
  engagementTime: number
  bounceRate: number
  customMetrics: Record<string, number>
}

export interface TargetingConfig {
  enabled: boolean
  rules: TargetingRule[]
  segments?: string[]
  audiences?: string[]
}

export interface TargetingRule {
  id: string
  type: 'url' | 'device' | 'location' | 'language' | 'referrer' | 'cookie' | 'custom'
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches' | 'in' | 'not_in'
  value: string | string[]
  logic?: 'and' | 'or'
}

export interface TrafficConfig {
  percentage: number // % of total traffic in experiment
  allocation: 'random' | 'sticky' | 'weighted'
  excludeReturning: boolean
  excludeBots: boolean
}

export interface ExperimentGoal {
  id: string
  name: string
  type: GoalType
  primary: boolean
  target?: number
  config: GoalConfig
}

export type GoalType =
  | 'conversion' // Purchase, signup, etc.
  | 'revenue' // Revenue per visitor
  | 'engagement' // Time on page, scroll depth
  | 'clicks' // Element clicks
  | 'page_views' // Pages per session
  | 'custom' // Custom events

export interface GoalConfig {
  event?: string
  selector?: string
  url?: string
  minValue?: number
  maxValue?: number
}

export interface ExperimentSchedule {
  startDate: Date
  endDate?: Date
  autoStop?: {
    enabled: boolean
    minSampleSize: number
    confidenceLevel: number
    minRuntime: number // hours
  }
}

export interface ExperimentResults {
  winner?: string // variant ID
  confidence: number
  statisticalSignificance: boolean
  sampleSize: number
  runtime: number // hours
  analysis: VariantAnalysis[]
  summary: string
  recommendedAction?: string
  calculatedAt: Date
}

export interface VariantAnalysis {
  variantId: string
  variantName: string
  conversionRate: number
  conversionRateCI: [number, number] // 95% CI
  improvement: number // vs control
  improvementCI: [number, number]
  probability: number // probability to be best
  expectedLoss: number
}

export interface ExperimentSettings {
  minSampleSize: number
  maxDuration: number // days
  confidenceLevel: number // e.g., 0.95
  mde: number // minimum detectable effect
  testType: 'one_tailed' | 'two_tailed'
  multipleComparison: 'none' | 'bonferroni' | 'holm'
}

export interface Assignment {
  id: string
  experimentId: string
  visitorId: string
  customerId?: string
  variantId: string
  assignedAt: Date
  converted: boolean
  conversionAt?: Date
  revenue?: number
  metadata?: Record<string, any>
}

export interface FeatureFlag {
  id: string
  promoterId: string
  key: string
  name: string
  description?: string
  type: 'boolean' | 'string' | 'number' | 'json'
  defaultValue: any
  status: 'active' | 'inactive'
  targeting: FeatureFlagTargeting
  variants?: FeatureFlagVariant[]
  schedule?: {
    enableAt?: Date
    disableAt?: Date
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface FeatureFlagTargeting {
  rules: FeatureFlagRule[]
  defaultVariant?: string
  percentage?: number
}

export interface FeatureFlagRule {
  id: string
  conditions: TargetingRule[]
  variant: string
  percentage?: number
}

export interface FeatureFlagVariant {
  id: string
  name: string
  value: any
  weight?: number
}

export interface PersonalizationCampaign {
  id: string
  promoterId: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  audiences: string[]
  experiences: PersonalizationExperience[]
  priority: number
  schedule?: { start: Date; end?: Date }
  metrics: {
    impressions: number
    conversions: number
    revenue: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface PersonalizationExperience {
  id: string
  name: string
  audienceId: string
  changes: VariantChange[]
  weight?: number
}

// Caching
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute for experiments

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl })
}

// Helper functions
function generateHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function selectVariant(variants: Variant[], visitorId: string, experimentId: string): Variant {
  const hash = generateHash(`${experimentId}:${visitorId}`)
  const bucket = (hash % 10000) / 100

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (bucket < cumulative) {
      return variant
    }
  }

  return variants[variants.length - 1]
}

function calculateStatistics(
  controlConversions: number,
  controlVisitors: number,
  treatmentConversions: number,
  treatmentVisitors: number
): {
  controlRate: number
  treatmentRate: number
  improvement: number
  confidence: number
  significant: boolean
} {
  const controlRate = controlVisitors > 0 ? controlConversions / controlVisitors : 0
  const treatmentRate = treatmentVisitors > 0 ? treatmentConversions / treatmentVisitors : 0
  const improvement = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0

  // Simplified z-test for proportions
  const pooledRate = (controlConversions + treatmentConversions) / (controlVisitors + treatmentVisitors)
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlVisitors + 1 / treatmentVisitors))
  const z = se > 0 ? (treatmentRate - controlRate) / se : 0

  // Approximate p-value from z-score
  const pValue = 1 - (0.5 * (1 + Math.tanh(z * 0.7978845608)))
  const confidence = (1 - pValue) * 100

  return {
    controlRate: Math.round(controlRate * 10000) / 100,
    treatmentRate: Math.round(treatmentRate * 10000) / 100,
    improvement: Math.round(improvement * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    significant: confidence >= 95,
  }
}

// Main Service Class
export class ABTestingService {
  // ==================== EXPERIMENT MANAGEMENT ====================

  static async createExperiment(
    data: Omit<Experiment, 'id' | 'status' | 'results' | 'createdAt' | 'startedAt' | 'completedAt' | 'updatedAt'>
  ): Promise<Experiment> {
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Initialize variant metrics
    const variants = data.variants.map((v) => ({
      ...v,
      metrics: v.metrics || {
        visitors: 0,
        conversions: 0,
        revenue: 0,
        engagementTime: 0,
        bounceRate: 0,
        customMetrics: {},
      },
    }))

    const experiment: Experiment = {
      ...data,
      id: experimentId,
      variants,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const firestoreData: any = {
      ...experiment,
      createdAt: Timestamp.fromDate(experiment.createdAt),
      updatedAt: Timestamp.fromDate(experiment.updatedAt),
    }

    if (experiment.schedule) {
      firestoreData.schedule = {
        ...experiment.schedule,
        startDate: Timestamp.fromDate(experiment.schedule.startDate),
        endDate: experiment.schedule.endDate
          ? Timestamp.fromDate(experiment.schedule.endDate)
          : null,
      }
    }

    await setDoc(doc(db, 'experiments', experimentId), firestoreData)

    return experiment
  }

  static async getExperiment(experimentId: string): Promise<Experiment | null> {
    const cached = getCached<Experiment>(`experiment:${experimentId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'experiments', experimentId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const experiment: Experiment = {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      schedule: data.schedule
        ? {
            ...data.schedule,
            startDate: data.schedule.startDate.toDate(),
            endDate: data.schedule.endDate?.toDate(),
          }
        : undefined,
      results: data.results
        ? { ...data.results, calculatedAt: data.results.calculatedAt?.toDate() }
        : undefined,
    } as Experiment

    setCache(`experiment:${experimentId}`, experiment)
    return experiment
  }

  static async getExperiments(
    promoterId: string,
    filters?: {
      status?: Experiment['status']
      type?: ExperimentType
    }
  ): Promise<Experiment[]> {
    let q = query(
      collection(db, 'experiments'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Experiment
    })
  }

  static async updateExperiment(
    experimentId: string,
    updates: Partial<Experiment>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'experiments', experimentId), updateData)
    cache.delete(`experiment:${experimentId}`)
  }

  static async startExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, {
      status: 'running',
      startedAt: new Date(),
    })
  }

  static async pauseExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, { status: 'paused' })
  }

  static async resumeExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, { status: 'running' })
  }

  static async completeExperiment(
    experimentId: string,
    winnerId?: string
  ): Promise<void> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const results = await this.calculateResults(experimentId)

    await this.updateExperiment(experimentId, {
      status: 'completed',
      completedAt: new Date(),
      results: {
        ...results,
        winner: winnerId || results.winner,
      },
    })
  }

  static async deleteExperiment(experimentId: string): Promise<void> {
    await deleteDoc(doc(db, 'experiments', experimentId))
    cache.delete(`experiment:${experimentId}`)
  }

  // ==================== VARIANT ASSIGNMENT ====================

  static async assignVariant(
    experimentId: string,
    visitorId: string,
    customerId?: string,
    metadata?: Record<string, any>
  ): Promise<{ variant: Variant; assignment: Assignment }> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment || experiment.status !== 'running') {
      throw new Error('Experiment not available')
    }

    // Check for existing assignment
    const existingQuery = query(
      collection(db, 'assignments'),
      where('experimentId', '==', experimentId),
      where('visitorId', '==', visitorId),
      limit(1)
    )

    const existingSnap = await getDocs(existingQuery)
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data() as Assignment
      const variant = experiment.variants.find((v) => v.id === existing.variantId)
      if (variant) {
        return { variant, assignment: existing }
      }
    }

    // Check targeting rules
    if (experiment.targeting.enabled) {
      const matches = await this.evaluateTargeting(experiment.targeting, metadata)
      if (!matches) {
        throw new Error('Visitor does not match targeting criteria')
      }
    }

    // Check traffic allocation
    const hash = generateHash(`traffic:${experimentId}:${visitorId}`)
    if ((hash % 100) >= experiment.traffic.percentage) {
      throw new Error('Visitor not in experiment traffic')
    }

    // Select variant
    const variant = selectVariant(experiment.variants, visitorId, experimentId)

    // Create assignment
    const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const assignment: Assignment = {
      id: assignmentId,
      experimentId,
      visitorId,
      customerId,
      variantId: variant.id,
      assignedAt: new Date(),
      converted: false,
      metadata,
    }

    await setDoc(doc(db, 'assignments', assignmentId), {
      ...assignment,
      assignedAt: Timestamp.fromDate(assignment.assignedAt),
    })

    // Update variant metrics
    await this.incrementVariantMetric(experimentId, variant.id, 'visitors', 1)

    return { variant, assignment }
  }

  static async getAssignment(
    experimentId: string,
    visitorId: string
  ): Promise<Assignment | null> {
    const q = query(
      collection(db, 'assignments'),
      where('experimentId', '==', experimentId),
      where('visitorId', '==', visitorId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const data = snapshot.docs[0].data()
    return {
      ...data,
      id: snapshot.docs[0].id,
      assignedAt: data.assignedAt.toDate(),
      conversionAt: data.conversionAt?.toDate(),
    } as Assignment
  }

  static async recordConversion(
    experimentId: string,
    visitorId: string,
    goalId: string,
    revenue?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const assignment = await this.getAssignment(experimentId, visitorId)
    if (!assignment) {
      throw new Error('No assignment found')
    }

    if (assignment.converted) {
      return // Already converted
    }

    await updateDoc(doc(db, 'assignments', assignment.id), {
      converted: true,
      conversionAt: Timestamp.fromDate(new Date()),
      revenue: revenue || 0,
      metadata: { ...assignment.metadata, ...metadata, goalId },
    })

    // Update variant metrics
    await this.incrementVariantMetric(experimentId, assignment.variantId, 'conversions', 1)
    if (revenue) {
      await this.incrementVariantMetric(experimentId, assignment.variantId, 'revenue', revenue)
    }
  }

  static async incrementVariantMetric(
    experimentId: string,
    variantId: string,
    metric: keyof VariantMetrics,
    value: number
  ): Promise<void> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) return

    const variants = experiment.variants.map((v) => {
      if (v.id === variantId) {
        return {
          ...v,
          metrics: {
            ...v.metrics,
            [metric]: (v.metrics[metric] as number || 0) + value,
          },
        }
      }
      return v
    })

    await updateDoc(doc(db, 'experiments', experimentId), {
      variants,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`experiment:${experimentId}`)
  }

  // ==================== TARGETING ====================

  static async evaluateTargeting(
    targeting: TargetingConfig,
    context?: Record<string, any>
  ): Promise<boolean> {
    if (!targeting.enabled || targeting.rules.length === 0) {
      return true
    }

    for (const rule of targeting.rules) {
      const contextValue = context?.[rule.type] || ''
      let matches = false

      switch (rule.operator) {
        case 'equals':
          matches = contextValue === rule.value
          break
        case 'contains':
          matches = String(contextValue).includes(String(rule.value))
          break
        case 'starts_with':
          matches = String(contextValue).startsWith(String(rule.value))
          break
        case 'ends_with':
          matches = String(contextValue).endsWith(String(rule.value))
          break
        case 'in':
          matches = Array.isArray(rule.value) && rule.value.includes(contextValue)
          break
        case 'not_in':
          matches = Array.isArray(rule.value) && !rule.value.includes(contextValue)
          break
        case 'matches':
          try {
            matches = new RegExp(String(rule.value)).test(String(contextValue))
          } catch {
            matches = false
          }
          break
      }

      if (rule.logic === 'or' && matches) {
        return true
      }
      if (rule.logic !== 'or' && !matches) {
        return false
      }
    }

    return true
  }

  // ==================== RESULTS & ANALYSIS ====================

  static async calculateResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const control = experiment.variants.find((v) => v.isControl)
    if (!control) {
      throw new Error('No control variant found')
    }

    const analysis: VariantAnalysis[] = []
    let winner: string | undefined
    let highestProb = 0
    let totalSampleSize = 0

    for (const variant of experiment.variants) {
      totalSampleSize += variant.metrics.visitors

      const stats = calculateStatistics(
        control.metrics.conversions,
        control.metrics.visitors,
        variant.metrics.conversions,
        variant.metrics.visitors
      )

      const conversionRate = variant.metrics.visitors > 0
        ? (variant.metrics.conversions / variant.metrics.visitors) * 100
        : 0

      // Simplified confidence interval
      const margin = 1.96 * Math.sqrt((conversionRate * (100 - conversionRate)) / Math.max(variant.metrics.visitors, 1))

      // Simplified probability to be best (would use Bayesian methods in production)
      const probability = variant.isControl ? 0 : stats.confidence / 100

      if (probability > highestProb && !variant.isControl) {
        highestProb = probability
        winner = variant.id
      }

      analysis.push({
        variantId: variant.id,
        variantName: variant.name,
        conversionRate: Math.round(conversionRate * 100) / 100,
        conversionRateCI: [
          Math.max(0, Math.round((conversionRate - margin) * 100) / 100),
          Math.min(100, Math.round((conversionRate + margin) * 100) / 100),
        ],
        improvement: variant.isControl ? 0 : stats.improvement,
        improvementCI: variant.isControl ? [0, 0] : [stats.improvement * 0.8, stats.improvement * 1.2],
        probability: Math.round(probability * 100) / 100,
        expectedLoss: variant.isControl ? 0 : Math.max(0, control.metrics.conversions - variant.metrics.conversions),
      })
    }

    const runtime = experiment.startedAt
      ? (Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60)
      : 0

    const statisticalSignificance = analysis.some((a) => !a.variantId !== control.id && a.probability >= 0.95)

    let summary = ''
    let recommendedAction: string | undefined

    if (statisticalSignificance && winner) {
      const winningVariant = experiment.variants.find((v) => v.id === winner)
      const winningAnalysis = analysis.find((a) => a.variantId === winner)
      summary = `${winningVariant?.name} is the winner with ${winningAnalysis?.improvement}% improvement`
      recommendedAction = `Implement ${winningVariant?.name} as the new default`
    } else if (totalSampleSize < experiment.settings.minSampleSize) {
      summary = `Experiment needs more data (${totalSampleSize}/${experiment.settings.minSampleSize} visitors)`
      recommendedAction = 'Continue running the experiment'
    } else {
      summary = 'No statistically significant winner yet'
      recommendedAction = 'Consider extending the experiment or accepting the control'
    }

    return {
      winner: statisticalSignificance ? winner : undefined,
      confidence: Math.round(highestProb * 100),
      statisticalSignificance,
      sampleSize: totalSampleSize,
      runtime: Math.round(runtime * 100) / 100,
      analysis,
      summary,
      recommendedAction,
      calculatedAt: new Date(),
    }
  }

  static async getExperimentStats(experimentId: string): Promise<{
    experiment: Experiment
    variantStats: Array<{
      variant: Variant
      conversionRate: number
      revenuePerVisitor: number
      avgEngagementTime: number
    }>
    progress: {
      sampleSize: number
      requiredSampleSize: number
      percentComplete: number
      estimatedDaysRemaining: number
    }
  }> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error('Experiment not found')
    }

    const variantStats = experiment.variants.map((variant) => ({
      variant,
      conversionRate: variant.metrics.visitors > 0
        ? Math.round((variant.metrics.conversions / variant.metrics.visitors) * 10000) / 100
        : 0,
      revenuePerVisitor: variant.metrics.visitors > 0
        ? Math.round((variant.metrics.revenue / variant.metrics.visitors) * 100) / 100
        : 0,
      avgEngagementTime: variant.metrics.visitors > 0
        ? Math.round((variant.metrics.engagementTime / variant.metrics.visitors) * 100) / 100
        : 0,
    }))

    const totalVisitors = experiment.variants.reduce((sum, v) => sum + v.metrics.visitors, 0)
    const percentComplete = Math.min(100, (totalVisitors / experiment.settings.minSampleSize) * 100)

    // Estimate days remaining based on current rate
    const runtime = experiment.startedAt
      ? (Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0
    const dailyRate = runtime > 0 ? totalVisitors / runtime : 0
    const remaining = experiment.settings.minSampleSize - totalVisitors
    const estimatedDaysRemaining = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : 0

    return {
      experiment,
      variantStats,
      progress: {
        sampleSize: totalVisitors,
        requiredSampleSize: experiment.settings.minSampleSize,
        percentComplete: Math.round(percentComplete),
        estimatedDaysRemaining,
      },
    }
  }

  // ==================== FEATURE FLAGS ====================

  static async createFeatureFlag(
    data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const flagId = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const flag: FeatureFlag = {
      ...data,
      id: flagId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'featureFlags', flagId), {
      ...flag,
      createdAt: Timestamp.fromDate(flag.createdAt),
      updatedAt: Timestamp.fromDate(flag.updatedAt),
      schedule: flag.schedule
        ? {
            enableAt: flag.schedule.enableAt ? Timestamp.fromDate(flag.schedule.enableAt) : null,
            disableAt: flag.schedule.disableAt ? Timestamp.fromDate(flag.schedule.disableAt) : null,
          }
        : null,
    })

    return flag
  }

  static async getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
    const cached = getCached<FeatureFlag>(`flag:${flagId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'featureFlags', flagId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const flag: FeatureFlag = {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      schedule: data.schedule
        ? {
            enableAt: data.schedule.enableAt?.toDate(),
            disableAt: data.schedule.disableAt?.toDate(),
          }
        : undefined,
    } as FeatureFlag

    setCache(`flag:${flagId}`, flag, 30 * 1000) // 30 second cache for flags
    return flag
  }

  static async getFeatureFlags(promoterId: string): Promise<FeatureFlag[]> {
    const q = query(
      collection(db, 'featureFlags'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as FeatureFlag
    })
  }

  static async evaluateFeatureFlag(
    flagKey: string,
    promoterId: string,
    context?: Record<string, any>
  ): Promise<any> {
    const q = query(
      collection(db, 'featureFlags'),
      where('promoterId', '==', promoterId),
      where('key', '==', flagKey),
      where('status', '==', 'active'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const flag = snapshot.docs[0].data() as FeatureFlag

    // Check schedule
    const now = new Date()
    if (flag.schedule?.enableAt && now < flag.schedule.enableAt) {
      return flag.defaultValue
    }
    if (flag.schedule?.disableAt && now > flag.schedule.disableAt) {
      return flag.defaultValue
    }

    // Evaluate targeting rules
    for (const rule of flag.targeting.rules) {
      const matches = await this.evaluateTargeting(
        { enabled: true, rules: rule.conditions },
        context
      )

      if (matches) {
        if (rule.percentage !== undefined) {
          const hash = generateHash(`${flagKey}:${context?.visitorId || 'default'}`)
          if ((hash % 100) < rule.percentage) {
            return flag.variants?.find((v) => v.id === rule.variant)?.value || flag.defaultValue
          }
        } else {
          return flag.variants?.find((v) => v.id === rule.variant)?.value || flag.defaultValue
        }
      }
    }

    // Check percentage rollout
    if (flag.targeting.percentage !== undefined && context?.visitorId) {
      const hash = generateHash(`${flagKey}:${context.visitorId}`)
      if ((hash % 100) >= flag.targeting.percentage) {
        return flag.defaultValue
      }
    }

    // Return default variant or value
    if (flag.targeting.defaultVariant && flag.variants) {
      return flag.variants.find((v) => v.id === flag.targeting.defaultVariant)?.value || flag.defaultValue
    }

    return flag.type === 'boolean' ? true : flag.defaultValue
  }

  static async updateFeatureFlag(
    flagId: string,
    updates: Partial<FeatureFlag>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'featureFlags', flagId), updateData)
    cache.delete(`flag:${flagId}`)
  }

  static async toggleFeatureFlag(flagId: string, active: boolean): Promise<void> {
    await this.updateFeatureFlag(flagId, { status: active ? 'active' : 'inactive' })
  }

  // ==================== PERSONALIZATION ====================

  static async createPersonalizationCampaign(
    data: Omit<PersonalizationCampaign, 'id' | 'metrics' | 'createdAt' | 'updatedAt'>
  ): Promise<PersonalizationCampaign> {
    const campaignId = `pers_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const campaign: PersonalizationCampaign = {
      ...data,
      id: campaignId,
      metrics: { impressions: 0, conversions: 0, revenue: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'personalizationCampaigns', campaignId), {
      ...campaign,
      schedule: campaign.schedule
        ? {
            start: Timestamp.fromDate(campaign.schedule.start),
            end: campaign.schedule.end ? Timestamp.fromDate(campaign.schedule.end) : null,
          }
        : null,
      createdAt: Timestamp.fromDate(campaign.createdAt),
      updatedAt: Timestamp.fromDate(campaign.updatedAt),
    })

    return campaign
  }

  static async getPersonalizationExperience(
    promoterId: string,
    audienceIds: string[]
  ): Promise<PersonalizationExperience | null> {
    const q = query(
      collection(db, 'personalizationCampaigns'),
      where('promoterId', '==', promoterId),
      where('status', '==', 'active'),
      orderBy('priority', 'desc')
    )

    const snapshot = await getDocs(q)

    for (const campaignDoc of snapshot.docs) {
      const campaign = campaignDoc.data() as PersonalizationCampaign

      // Check if any audience matches
      const matchingAudience = campaign.audiences.find((a) => audienceIds.includes(a))
      if (matchingAudience) {
        const experience = campaign.experiences.find((e) => e.audienceId === matchingAudience)
        if (experience) {
          // Record impression
          await updateDoc(doc(db, 'personalizationCampaigns', campaignDoc.id), {
            'metrics.impressions': increment(1),
          })
          return experience
        }
      }
    }

    return null
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
