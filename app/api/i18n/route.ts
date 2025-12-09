import { NextRequest, NextResponse } from 'next/server'
import { I18nService, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '@/lib/services/i18nService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'currencies':
        data = SUPPORTED_CURRENCIES
        break

      case 'locales':
        data = SUPPORTED_LOCALES
        break

      case 'timezones':
        data = I18nService.getTimezones()
        break

      case 'exchangeRate':
        const baseCurrency = searchParams.get('base')
        const targetCurrency = searchParams.get('target')
        if (!baseCurrency || !targetCurrency) {
          return NextResponse.json({ error: 'base and target currencies are required' }, { status: 400 })
        }
        data = { rate: await I18nService.getExchangeRate(baseCurrency, targetCurrency) }
        break

      case 'convert':
        const amount = parseFloat(searchParams.get('amount') || '0')
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        if (!from || !to) {
          return NextResponse.json({ error: 'from and to currencies are required' }, { status: 400 })
        }
        data = await I18nService.convertCurrency(amount, from, to)
        break

      case 'translations':
        const promoterId = searchParams.get('promoterId')
        const locale = searchParams.get('locale')
        const namespace = searchParams.get('namespace')
        if (!promoterId || !locale || !namespace) {
          return NextResponse.json({ error: 'promoterId, locale, and namespace are required' }, { status: 400 })
        }
        data = await I18nService.getTranslations(promoterId, locale, namespace)
        break

      case 'localizedContent':
        const contentType = searchParams.get('contentType') as any
        const contentId = searchParams.get('contentId')
        const contentLocale = searchParams.get('locale')
        if (!contentType || !contentId || !contentLocale) {
          return NextResponse.json({ error: 'contentType, contentId, and locale are required' }, { status: 400 })
        }
        data = await I18nService.getLocalizedContent(contentType, contentId, contentLocale)
        break

      case 'availableTranslations':
        const avContentType = searchParams.get('contentType') as any
        const avContentId = searchParams.get('contentId')
        if (!avContentType || !avContentId) {
          return NextResponse.json({ error: 'contentType and contentId are required' }, { status: 400 })
        }
        data = await I18nService.getAvailableTranslations(avContentType, avContentId)
        break

      case 'taxConfiguration':
        const taxPromoterId = searchParams.get('promoterId')
        const country = searchParams.get('country')
        const region = searchParams.get('region')
        if (!taxPromoterId || !country) {
          return NextResponse.json({ error: 'promoterId and country are required' }, { status: 400 })
        }
        data = await I18nService.getTaxConfiguration(taxPromoterId, country, region || undefined)
        break

      case 'regionalSettings':
        const rsPromoterId = searchParams.get('promoterId')
        const rsCountry = searchParams.get('country')
        const rsRegion = searchParams.get('region')
        if (!rsPromoterId || !rsCountry) {
          return NextResponse.json({ error: 'promoterId and country are required' }, { status: 400 })
        }
        data = await I18nService.getRegionalSettings(rsPromoterId, rsCountry, rsRegion || undefined)
        break

      case 'detectLocale':
        data = { locale: I18nService.detectLocaleFromBrowser() }
        break

      default:
        data = {
          currencies: SUPPORTED_CURRENCIES,
          locales: SUPPORTED_LOCALES,
        }
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('I18n error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'setExchangeRate':
        result = await I18nService.setExchangeRate(
          data.baseCurrency,
          data.targetCurrency,
          data.rate,
          data.source
        )
        break

      case 'setTranslation':
        result = await I18nService.setTranslation(data.translation)
        break

      case 'importTranslations':
        result = await I18nService.importTranslations(
          data.promoterId,
          data.locale,
          data.namespace,
          data.translations,
          data.userId
        )
        break

      case 'setLocalizedContent':
        result = await I18nService.setLocalizedContent(data.content)
        break

      case 'setTaxConfiguration':
        result = await I18nService.setTaxConfiguration(data.config)
        break

      case 'calculateTax':
        const taxConfig = await I18nService.getTaxConfiguration(
          data.promoterId,
          data.country,
          data.region
        )
        if (!taxConfig) {
          return NextResponse.json({ error: 'Tax configuration not found' }, { status: 404 })
        }
        result = I18nService.calculateTax(data.amount, taxConfig)
        break

      case 'setRegionalSettings':
        result = await I18nService.setRegionalSettings(data.settings)
        break

      case 'formatCurrency':
        result = { formatted: I18nService.formatCurrency(data.amount, data.currency, data.locale) }
        break

      case 'formatDate':
        result = { formatted: I18nService.formatDate(new Date(data.date), data.locale, data.format) }
        break

      case 'formatTime':
        result = { formatted: I18nService.formatTime(new Date(data.date), data.locale, data.format) }
        break

      case 'formatDateTime':
        result = { formatted: I18nService.formatDateTime(new Date(data.date), data.locale, data.format) }
        break

      case 'translate':
        result = { text: I18nService.translate(data.template, data.variables, data.options) }
        break

      case 'clearCache':
        I18nService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('I18n error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
