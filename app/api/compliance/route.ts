import { NextRequest, NextResponse } from 'next/server'
import { ComplianceService } from '@/lib/services/complianceService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'consent':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const customerId = searchParams.get('customerId')
        if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        data = await ComplianceService.getConsent(promoterId, customerId)
        break

      case 'hasConsent':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const hasConsentCustomerId = searchParams.get('customerId')
        const consentType = searchParams.get('consentType') as any
        if (!hasConsentCustomerId || !consentType) {
          return NextResponse.json({ error: 'customerId and consentType required' }, { status: 400 })
        }
        data = { hasConsent: await ComplianceService.hasConsent(promoterId, hasConsentCustomerId, consentType) }
        break

      case 'dsr':
        const dsrId = searchParams.get('dsrId')
        if (!dsrId) return NextResponse.json({ error: 'dsrId required' }, { status: 400 })
        data = await ComplianceService.getDSR(dsrId)
        break

      case 'dsrs':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const dsrFilters: any = {}
        if (searchParams.get('status')) dsrFilters.status = searchParams.get('status')
        if (searchParams.get('dsrType')) dsrFilters.type = searchParams.get('dsrType')
        if (searchParams.get('email')) dsrFilters.email = searchParams.get('email')
        data = await ComplianceService.getDSRs(promoterId, dsrFilters)
        break

      case 'legalDocument':
        const documentId = searchParams.get('documentId')
        if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })
        data = await ComplianceService.getLegalDocument(documentId)
        break

      case 'legalDocuments':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const docFilters: any = {}
        if (searchParams.get('docType')) docFilters.type = searchParams.get('docType')
        if (searchParams.get('status')) docFilters.status = searchParams.get('status')
        data = await ComplianceService.getLegalDocuments(promoterId, docFilters)
        break

      case 'activeLegalDocument':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const activeDocType = searchParams.get('docType') as any
        if (!activeDocType) return NextResponse.json({ error: 'docType required' }, { status: 400 })
        data = await ComplianceService.getActiveLegalDocument(promoterId, activeDocType)
        break

      case 'retentionPolicies':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await ComplianceService.getRetentionPolicies(promoterId)
        break

      case 'cookieConsent':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const visitorId = searchParams.get('visitorId')
        if (!visitorId) return NextResponse.json({ error: 'visitorId required' }, { status: 400 })
        data = await ComplianceService.getCookieConsent(promoterId, visitorId)
        break

      case 'auditTrail':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const auditFilters: any = {}
        if (searchParams.get('entityType')) auditFilters.entityType = searchParams.get('entityType')
        if (searchParams.get('entityId')) auditFilters.entityId = searchParams.get('entityId')
        if (searchParams.get('actorId')) auditFilters.actorId = searchParams.get('actorId')
        if (searchParams.get('action')) auditFilters.action = searchParams.get('action')
        if (searchParams.get('startDate')) auditFilters.startDate = new Date(searchParams.get('startDate')!)
        if (searchParams.get('endDate')) auditFilters.endDate = new Date(searchParams.get('endDate')!)
        if (searchParams.get('limit')) auditFilters.limit = parseInt(searchParams.get('limit')!)
        data = await ComplianceService.getAuditTrail(promoterId, auditFilters)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Compliance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Consent management
      case 'recordConsent':
        result = await ComplianceService.recordConsent({
          ...data.consent,
          consents: data.consent.consents.map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
            expiresAt: c.expiresAt ? new Date(c.expiresAt) : undefined,
          })),
        })
        break

      case 'updateConsent':
        result = await ComplianceService.updateConsent(
          data.promoterId, data.customerId,
          data.updates.map((u: any) => ({
            ...u,
            timestamp: new Date(u.timestamp),
            expiresAt: u.expiresAt ? new Date(u.expiresAt) : undefined,
          })),
          data.metadata
        )
        break

      case 'withdrawConsent':
        await ComplianceService.withdrawConsent(
          data.promoterId, data.customerId, data.consentTypes, data.metadata
        )
        result = { success: true }
        break

      // DSR management
      case 'createDSR':
        result = await ComplianceService.createDSR(data.dsr)
        break

      case 'updateDSR':
        await ComplianceService.updateDSR(data.dsrId, data.updates)
        result = { success: true }
        break

      case 'verifyDSR':
        await ComplianceService.verifyDSR(data.dsrId, data.method, data.verified)
        result = { success: true }
        break

      case 'completeDSR':
        await ComplianceService.completeDSR(data.dsrId, data.response)
        result = { success: true }
        break

      case 'processErasureRequest':
        result = await ComplianceService.processErasureRequest(data.dsrId, data.customerId)
        break

      case 'processAccessRequest':
        result = await ComplianceService.processAccessRequest(data.customerId)
        break

      case 'exportPortableData':
        result = await ComplianceService.exportPortableData(data.customerId)
        break

      // Legal documents
      case 'createLegalDocument':
        result = await ComplianceService.createLegalDocument({
          ...data.document,
          effectiveDate: new Date(data.document.effectiveDate),
          expiryDate: data.document.expiryDate ? new Date(data.document.expiryDate) : undefined,
        })
        break

      case 'updateLegalDocument':
        const docUpdates = { ...data.updates }
        if (docUpdates.effectiveDate) docUpdates.effectiveDate = new Date(docUpdates.effectiveDate)
        if (docUpdates.expiryDate) docUpdates.expiryDate = new Date(docUpdates.expiryDate)
        await ComplianceService.updateLegalDocument(data.documentId, docUpdates)
        result = { success: true }
        break

      case 'publishNewVersion':
        result = await ComplianceService.publishNewVersion(
          data.documentId, data.content, data.changelog, new Date(data.effectiveDate)
        )
        break

      // Retention policies
      case 'createRetentionPolicy':
        result = await ComplianceService.createRetentionPolicy(data.policy)
        break

      case 'executeRetentionPolicy':
        result = await ComplianceService.executeRetentionPolicy(data.policyId)
        break

      // Cookie consent
      case 'recordCookieConsent':
        result = await ComplianceService.recordCookieConsent({
          ...data.consent,
          consentBanner: {
            ...data.consent.consentBanner,
            shownAt: data.consent.consentBanner.shownAt
              ? new Date(data.consent.consentBanner.shownAt)
              : undefined,
            interactedAt: data.consent.consentBanner.interactedAt
              ? new Date(data.consent.consentBanner.interactedAt)
              : undefined,
          },
        })
        break

      case 'updateCookiePreferences':
        await ComplianceService.updateCookiePreferences(
          data.promoterId, data.visitorId, data.preferences
        )
        result = { success: true }
        break

      // Age verification
      case 'createAgeVerification':
        result = await ComplianceService.createAgeVerification({
          ...data.verification,
          dateOfBirth: data.verification.dateOfBirth
            ? new Date(data.verification.dateOfBirth)
            : undefined,
        })
        break

      case 'verifyAge':
        result = await ComplianceService.verifyAge(data.verificationId, new Date(data.dateOfBirth))
        break

      // Breach management
      case 'createBreachNotification':
        result = await ComplianceService.createBreachNotification({
          ...data.breach,
          detectedAt: new Date(data.breach.detectedAt),
        })
        break

      case 'updateBreachStatus':
        await ComplianceService.updateBreachStatus(data.breachId, data.status, data.actor)
        result = { success: true }
        break

      case 'notifyAuthority':
        await ComplianceService.notifyAuthority(data.breachId, data.reference)
        result = { success: true }
        break

      // Audit logging
      case 'logAudit':
        await ComplianceService.logAudit(data.audit)
        result = { success: true }
        break

      // Reports
      case 'generateComplianceReport':
        result = await ComplianceService.generateComplianceReport(
          data.promoterId, data.reportType,
          { start: new Date(data.period.start), end: new Date(data.period.end) },
          data.generatedBy
        )
        break

      case 'clearCache':
        ComplianceService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Compliance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
