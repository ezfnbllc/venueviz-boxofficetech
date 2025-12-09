/**
 * Multi-Currency & Internationalization Service
 * Comprehensive i18n support for global event ticketing
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ==================== CURRENCY TYPES ====================

export interface Currency {
  code: string // ISO 4217 code (e.g., 'USD', 'EUR')
  symbol: string
  name: string
  decimals: number
  symbolPosition: 'before' | 'after'
  thousandsSeparator: string
  decimalSeparator: string
}

export interface ExchangeRate {
  id?: string
  baseCurrency: string
  targetCurrency: string
  rate: number
  source: 'api' | 'manual'
  validFrom: Date
  validTo?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CurrencyConversion {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  timestamp: Date
}

// ==================== LOCALE TYPES ====================

export interface Locale {
  code: string // BCP 47 language tag (e.g., 'en-US', 'es-MX')
  language: string // ISO 639-1 (e.g., 'en', 'es')
  region: string // ISO 3166-1 alpha-2 (e.g., 'US', 'MX')
  name: string
  nativeName: string
  direction: 'ltr' | 'rtl'
  dateFormat: string
  timeFormat: string
  dateTimeFormat: string
  currency: string
  timezone: string
}

export interface Translation {
  id?: string
  promoterId: string
  locale: string
  namespace: string // e.g., 'common', 'events', 'checkout'
  key: string
  value: string
  defaultValue?: string
  context?: string
  pluralRules?: {
    zero?: string
    one?: string
    two?: string
    few?: string
    many?: string
    other: string
  }
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface LocalizedContent {
  id?: string
  promoterId: string
  contentType: 'event' | 'venue' | 'ticket_type' | 'email_template' | 'page'
  contentId: string
  locale: string
  fields: Record<string, string>
  status: 'draft' | 'published' | 'needs_review'
  translatedBy?: 'human' | 'machine'
  reviewedBy?: string
  createdAt: Date
  updatedAt: Date
}

// ==================== TAX & REGIONAL TYPES ====================

export interface TaxConfiguration {
  id?: string
  promoterId: string
  country: string
  region?: string
  taxType: 'vat' | 'sales_tax' | 'gst' | 'none'
  rate: number
  name: string
  includedInPrice: boolean
  appliesTo: ('tickets' | 'fees' | 'merchandise')[]
  validFrom: Date
  validTo?: Date
  createdAt: Date
  updatedAt: Date
}

export interface RegionalSettings {
  id?: string
  promoterId: string
  country: string
  region?: string
  defaultLocale: string
  defaultCurrency: string
  availableLocales: string[]
  availableCurrencies: string[]
  taxConfiguration?: TaxConfiguration
  dateFormat: string
  timeFormat: string
  timezone: string
  phoneFormat: string
  addressFormat: {
    fields: string[]
    required: string[]
    format: string
  }
  legalRequirements: {
    gdprCompliant?: boolean
    ccpaCompliant?: boolean
    requiresAgeVerification?: boolean
    minimumAge?: number
    customDisclosures?: string[]
  }
  paymentMethods: string[]
  createdAt: Date
  updatedAt: Date
}

// ==================== SUPPORTED DATA ====================

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, symbolPosition: 'after', thousandsSeparator: '.', decimalSeparator: ',' },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2, symbolPosition: 'before', thousandsSeparator: '.', decimalSeparator: ',' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2, symbolPosition: 'before', thousandsSeparator: "'", decimalSeparator: '.' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2, symbolPosition: 'after', thousandsSeparator: ' ', decimalSeparator: ',' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0, symbolPosition: 'before', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2, symbolPosition: 'before', thousandsSeparator: ' ', decimalSeparator: ',' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, symbolPosition: 'after', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2, symbolPosition: 'after', thousandsSeparator: ',', decimalSeparator: '.' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2, symbolPosition: 'after', thousandsSeparator: ' ', decimalSeparator: ',' },
]

export const SUPPORTED_LOCALES: Locale[] = [
  { code: 'en-US', language: 'en', region: 'US', name: 'English (US)', nativeName: 'English', direction: 'ltr', dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', dateTimeFormat: 'MM/DD/YYYY h:mm A', currency: 'USD', timezone: 'America/New_York' },
  { code: 'en-GB', language: 'en', region: 'GB', name: 'English (UK)', nativeName: 'English', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'en-AU', language: 'en', region: 'AU', name: 'English (Australia)', nativeName: 'English', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A', dateTimeFormat: 'DD/MM/YYYY h:mm A', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'es-ES', language: 'es', region: 'ES', name: 'Spanish (Spain)', nativeName: 'Español', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'es-MX', language: 'es', region: 'MX', name: 'Spanish (Mexico)', nativeName: 'Español', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A', dateTimeFormat: 'DD/MM/YYYY h:mm A', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'fr-FR', language: 'fr', region: 'FR', name: 'French (France)', nativeName: 'Français', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'fr-CA', language: 'fr', region: 'CA', name: 'French (Canada)', nativeName: 'Français', direction: 'ltr', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', dateTimeFormat: 'YYYY-MM-DD HH:mm', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'de-DE', language: 'de', region: 'DE', name: 'German', nativeName: 'Deutsch', direction: 'ltr', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD.MM.YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'it-IT', language: 'it', region: 'IT', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'pt-BR', language: 'pt', region: 'BR', name: 'Portuguese (Brazil)', nativeName: 'Português', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'pt-PT', language: 'pt', region: 'PT', name: 'Portuguese (Portugal)', nativeName: 'Português', direction: 'ltr', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Lisbon' },
  { code: 'ja-JP', language: 'ja', region: 'JP', name: 'Japanese', nativeName: '日本語', direction: 'ltr', dateFormat: 'YYYY/MM/DD', timeFormat: 'HH:mm', dateTimeFormat: 'YYYY/MM/DD HH:mm', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'zh-CN', language: 'zh', region: 'CN', name: 'Chinese (Simplified)', nativeName: '中文', direction: 'ltr', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', dateTimeFormat: 'YYYY-MM-DD HH:mm', currency: 'CNY', timezone: 'Asia/Shanghai' },
  { code: 'zh-TW', language: 'zh', region: 'TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr', dateFormat: 'YYYY/MM/DD', timeFormat: 'HH:mm', dateTimeFormat: 'YYYY/MM/DD HH:mm', currency: 'TWD', timezone: 'Asia/Taipei' },
  { code: 'ko-KR', language: 'ko', region: 'KR', name: 'Korean', nativeName: '한국어', direction: 'ltr', dateFormat: 'YYYY.MM.DD', timeFormat: 'HH:mm', dateTimeFormat: 'YYYY.MM.DD HH:mm', currency: 'KRW', timezone: 'Asia/Seoul' },
  { code: 'ar-SA', language: 'ar', region: 'SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية', direction: 'rtl', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'ar-AE', language: 'ar', region: 'AE', name: 'Arabic (UAE)', nativeName: 'العربية', direction: 'rtl', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD/MM/YYYY HH:mm', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'hi-IN', language: 'hi', region: 'IN', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', dateFormat: 'DD-MM-YYYY', timeFormat: 'h:mm A', dateTimeFormat: 'DD-MM-YYYY h:mm A', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'nl-NL', language: 'nl', region: 'NL', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', dateFormat: 'DD-MM-YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD-MM-YYYY HH:mm', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'pl-PL', language: 'pl', region: 'PL', name: 'Polish', nativeName: 'Polski', direction: 'ltr', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', dateTimeFormat: 'DD.MM.YYYY HH:mm', currency: 'PLN', timezone: 'Europe/Warsaw' },
]

class I18nServiceClass {
  private exchangeRateCache: Map<string, { rate: number; timestamp: Date }> = new Map()
  private translationCache: Map<string, Map<string, string>> = new Map()

  // ==================== CURRENCY OPERATIONS ====================

  getCurrency(code: string): Currency | undefined {
    return SUPPORTED_CURRENCIES.find((c) => c.code === code)
  }

  getSupportedCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES
  }

  formatCurrency(amount: number, currencyCode: string, locale?: string): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return `${currencyCode} ${amount.toFixed(2)}`
    }

    const formattedNumber = this.formatNumber(amount, currency.decimals, currency.thousandsSeparator, currency.decimalSeparator)

    return currency.symbolPosition === 'before'
      ? `${currency.symbol}${formattedNumber}`
      : `${formattedNumber} ${currency.symbol}`
  }

  private formatNumber(
    value: number,
    decimals: number,
    thousandsSep: string,
    decimalSep: string
  ): string {
    const fixed = value.toFixed(decimals)
    const [intPart, decPart] = fixed.split('.')

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)

    return decPart ? `${formattedInt}${decimalSep}${decPart}` : formattedInt
  }

  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    if (baseCurrency === targetCurrency) return 1

    const cacheKey = `${baseCurrency}-${targetCurrency}`
    const cached = this.exchangeRateCache.get(cacheKey)

    // Cache valid for 1 hour
    if (cached && Date.now() - cached.timestamp.getTime() < 3600000) {
      return cached.rate
    }

    // Try to get from database
    const q = query(
      collection(db, 'exchangeRates'),
      where('baseCurrency', '==', baseCurrency),
      where('targetCurrency', '==', targetCurrency),
      orderBy('validFrom', 'desc')
    )

    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const rateDoc = snapshot.docs[0].data()
      const rate = rateDoc.rate

      this.exchangeRateCache.set(cacheKey, { rate, timestamp: new Date() })
      return rate
    }

    // Try reverse rate
    const reverseQ = query(
      collection(db, 'exchangeRates'),
      where('baseCurrency', '==', targetCurrency),
      where('targetCurrency', '==', baseCurrency),
      orderBy('validFrom', 'desc')
    )

    const reverseSnapshot = await getDocs(reverseQ)
    if (!reverseSnapshot.empty) {
      const reverseRate = 1 / reverseSnapshot.docs[0].data().rate

      this.exchangeRateCache.set(cacheKey, { rate: reverseRate, timestamp: new Date() })
      return reverseRate
    }

    // Fallback to USD as intermediary
    if (baseCurrency !== 'USD' && targetCurrency !== 'USD') {
      const baseToUsd = await this.getExchangeRate(baseCurrency, 'USD')
      const usdToTarget = await this.getExchangeRate('USD', targetCurrency)
      return baseToUsd * usdToTarget
    }

    throw new Error(`Exchange rate not found for ${baseCurrency} to ${targetCurrency}`)
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency)
    const targetCurrency = this.getCurrency(toCurrency)

    const convertedAmount = amount * rate
    const roundedAmount = targetCurrency
      ? Math.round(convertedAmount * Math.pow(10, targetCurrency.decimals)) /
        Math.pow(10, targetCurrency.decimals)
      : Math.round(convertedAmount * 100) / 100

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: roundedAmount,
      targetCurrency: toCurrency,
      exchangeRate: rate,
      timestamp: new Date(),
    }
  }

  async setExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
    source: 'api' | 'manual' = 'manual'
  ): Promise<ExchangeRate> {
    const now = new Date()
    const rateData = {
      baseCurrency,
      targetCurrency,
      rate,
      source,
      validFrom: Timestamp.fromDate(now),
      validTo: null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'exchangeRates'), rateData)

    // Update cache
    this.exchangeRateCache.set(`${baseCurrency}-${targetCurrency}`, {
      rate,
      timestamp: now,
    })

    return {
      id: docRef.id,
      ...rateData,
      validFrom: now,
      validTo: undefined,
      createdAt: now,
      updatedAt: now,
    }
  }

  // ==================== LOCALE OPERATIONS ====================

  getLocale(code: string): Locale | undefined {
    return SUPPORTED_LOCALES.find((l) => l.code === code)
  }

  getLocaleByLanguage(language: string): Locale[] {
    return SUPPORTED_LOCALES.filter((l) => l.language === language)
  }

  getSupportedLocales(): Locale[] {
    return SUPPORTED_LOCALES
  }

  formatDate(date: Date, locale: string, format?: string): string {
    const localeConfig = this.getLocale(locale) || SUPPORTED_LOCALES[0]
    const formatStr = format || localeConfig.dateFormat

    return this.applyDateFormat(date, formatStr)
  }

  formatTime(date: Date, locale: string, format?: string): string {
    const localeConfig = this.getLocale(locale) || SUPPORTED_LOCALES[0]
    const formatStr = format || localeConfig.timeFormat

    return this.applyTimeFormat(date, formatStr)
  }

  formatDateTime(date: Date, locale: string, format?: string): string {
    const localeConfig = this.getLocale(locale) || SUPPORTED_LOCALES[0]
    const formatStr = format || localeConfig.dateTimeFormat

    let result = this.applyDateFormat(date, formatStr)
    result = this.applyTimeFormat(date, result)

    return result
  }

  private applyDateFormat(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
  }

  private applyTimeFormat(date: Date, format: string): string {
    const hours24 = date.getHours()
    const hours12 = hours24 % 12 || 12
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours24 >= 12 ? 'PM' : 'AM'

    return format
      .replace('HH', hours24.toString().padStart(2, '0'))
      .replace('hh', hours12.toString().padStart(2, '0'))
      .replace('h', hours12.toString())
      .replace('mm', minutes)
      .replace('A', ampm)
      .replace('a', ampm.toLowerCase())
  }

  // ==================== TRANSLATIONS ====================

  async getTranslation(
    promoterId: string,
    locale: string,
    namespace: string,
    key: string
  ): Promise<string | null> {
    // Check cache first
    const cacheKey = `${promoterId}:${locale}:${namespace}`
    const cached = this.translationCache.get(cacheKey)
    if (cached?.has(key)) {
      return cached.get(key)!
    }

    const q = query(
      collection(db, 'translations'),
      where('promoterId', '==', promoterId),
      where('locale', '==', locale),
      where('namespace', '==', namespace),
      where('key', '==', key)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const translation = snapshot.docs[0].data().value

    // Update cache
    if (!this.translationCache.has(cacheKey)) {
      this.translationCache.set(cacheKey, new Map())
    }
    this.translationCache.get(cacheKey)!.set(key, translation)

    return translation
  }

  async getTranslations(
    promoterId: string,
    locale: string,
    namespace: string
  ): Promise<Record<string, string>> {
    const q = query(
      collection(db, 'translations'),
      where('promoterId', '==', promoterId),
      where('locale', '==', locale),
      where('namespace', '==', namespace)
    )

    const snapshot = await getDocs(q)
    const translations: Record<string, string> = {}

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      translations[data.key] = data.value
    })

    // Update cache
    const cacheKey = `${promoterId}:${locale}:${namespace}`
    this.translationCache.set(cacheKey, new Map(Object.entries(translations)))

    return translations
  }

  async setTranslation(
    translation: Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Translation> {
    const now = new Date()

    // Check if translation exists
    const q = query(
      collection(db, 'translations'),
      where('promoterId', '==', translation.promoterId),
      where('locale', '==', translation.locale),
      where('namespace', '==', translation.namespace),
      where('key', '==', translation.key)
    )

    const existing = await getDocs(q)

    if (!existing.empty) {
      // Update existing
      const docRef = doc(db, 'translations', existing.docs[0].id)
      await updateDoc(docRef, {
        value: translation.value,
        updatedBy: translation.updatedBy,
        updatedAt: Timestamp.fromDate(now),
      })

      // Invalidate cache
      const cacheKey = `${translation.promoterId}:${translation.locale}:${translation.namespace}`
      this.translationCache.delete(cacheKey)

      return {
        id: existing.docs[0].id,
        ...translation,
        createdAt: existing.docs[0].data().createdAt?.toDate(),
        updatedAt: now,
      }
    }

    // Create new
    const docRef = await addDoc(collection(db, 'translations'), {
      ...translation,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    // Invalidate cache
    const cacheKey = `${translation.promoterId}:${translation.locale}:${translation.namespace}`
    this.translationCache.delete(cacheKey)

    return {
      id: docRef.id,
      ...translation,
      createdAt: now,
      updatedAt: now,
    }
  }

  async importTranslations(
    promoterId: string,
    locale: string,
    namespace: string,
    translations: Record<string, string>,
    userId: string
  ): Promise<{ imported: number; updated: number }> {
    let imported = 0
    let updated = 0

    for (const [key, value] of Object.entries(translations)) {
      const q = query(
        collection(db, 'translations'),
        where('promoterId', '==', promoterId),
        where('locale', '==', locale),
        where('namespace', '==', namespace),
        where('key', '==', key)
      )

      const existing = await getDocs(q)

      if (existing.empty) {
        await this.setTranslation({
          promoterId,
          locale,
          namespace,
          key,
          value,
          updatedBy: userId,
        })
        imported++
      } else {
        await updateDoc(doc(db, 'translations', existing.docs[0].id), {
          value,
          updatedBy: userId,
          updatedAt: Timestamp.fromDate(new Date()),
        })
        updated++
      }
    }

    // Invalidate cache
    const cacheKey = `${promoterId}:${locale}:${namespace}`
    this.translationCache.delete(cacheKey)

    return { imported, updated }
  }

  translate(
    template: string,
    variables: Record<string, any> = {},
    options?: { count?: number; locale?: string }
  ): string {
    let result = template

    // Handle pluralization
    if (options?.count !== undefined && template.includes('|')) {
      const parts = template.split('|')
      if (options.count === 0 && parts.length > 2) {
        result = parts[0]
      } else if (options.count === 1) {
        result = parts.length > 1 ? parts[0] : template
      } else {
        result = parts.length > 1 ? parts[1] : template
      }
    }

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value))
    })

    return result
  }

  // ==================== LOCALIZED CONTENT ====================

  async getLocalizedContent(
    contentType: LocalizedContent['contentType'],
    contentId: string,
    locale: string
  ): Promise<LocalizedContent | null> {
    const q = query(
      collection(db, 'localizedContent'),
      where('contentType', '==', contentType),
      where('contentId', '==', contentId),
      where('locale', '==', locale),
      where('status', '==', 'published')
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as LocalizedContent
  }

  async setLocalizedContent(
    content: Omit<LocalizedContent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalizedContent> {
    const now = new Date()

    // Check for existing content
    const q = query(
      collection(db, 'localizedContent'),
      where('contentType', '==', content.contentType),
      where('contentId', '==', content.contentId),
      where('locale', '==', content.locale)
    )

    const existing = await getDocs(q)

    if (!existing.empty) {
      const docRef = doc(db, 'localizedContent', existing.docs[0].id)
      await updateDoc(docRef, {
        fields: content.fields,
        status: content.status,
        translatedBy: content.translatedBy,
        reviewedBy: content.reviewedBy,
        updatedAt: Timestamp.fromDate(now),
      })

      return {
        id: existing.docs[0].id,
        ...content,
        createdAt: existing.docs[0].data().createdAt?.toDate(),
        updatedAt: now,
      }
    }

    const docRef = await addDoc(collection(db, 'localizedContent'), {
      ...content,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    return {
      id: docRef.id,
      ...content,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getAvailableTranslations(
    contentType: LocalizedContent['contentType'],
    contentId: string
  ): Promise<string[]> {
    const q = query(
      collection(db, 'localizedContent'),
      where('contentType', '==', contentType),
      where('contentId', '==', contentId),
      where('status', '==', 'published')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data().locale)
  }

  // ==================== TAX CONFIGURATION ====================

  async getTaxConfiguration(
    promoterId: string,
    country: string,
    region?: string
  ): Promise<TaxConfiguration | null> {
    let q = query(
      collection(db, 'taxConfigurations'),
      where('promoterId', '==', promoterId),
      where('country', '==', country)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    // Prefer region-specific config
    let config = snapshot.docs.find((doc) => doc.data().region === region)
    if (!config) {
      config = snapshot.docs.find((doc) => !doc.data().region)
    }
    if (!config) {
      config = snapshot.docs[0]
    }

    const data = config.data()
    return {
      id: config.id,
      ...data,
      validFrom: data.validFrom?.toDate(),
      validTo: data.validTo?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as TaxConfiguration
  }

  async setTaxConfiguration(
    config: Omit<TaxConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TaxConfiguration> {
    const now = new Date()

    const docRef = await addDoc(collection(db, 'taxConfigurations'), {
      ...config,
      validFrom: Timestamp.fromDate(config.validFrom),
      validTo: config.validTo ? Timestamp.fromDate(config.validTo) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    return {
      id: docRef.id,
      ...config,
      createdAt: now,
      updatedAt: now,
    }
  }

  calculateTax(amount: number, taxConfig: TaxConfiguration): { taxAmount: number; totalAmount: number } {
    if (taxConfig.includedInPrice) {
      // Tax is already included in the price
      const taxAmount = amount - amount / (1 + taxConfig.rate / 100)
      return {
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: amount,
      }
    } else {
      // Add tax to the price
      const taxAmount = amount * (taxConfig.rate / 100)
      return {
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round((amount + taxAmount) * 100) / 100,
      }
    }
  }

  // ==================== REGIONAL SETTINGS ====================

  async getRegionalSettings(
    promoterId: string,
    country: string,
    region?: string
  ): Promise<RegionalSettings | null> {
    let q = query(
      collection(db, 'regionalSettings'),
      where('promoterId', '==', promoterId),
      where('country', '==', country)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    // Prefer region-specific settings
    let settings = snapshot.docs.find((doc) => doc.data().region === region)
    if (!settings) {
      settings = snapshot.docs.find((doc) => !doc.data().region)
    }
    if (!settings) {
      settings = snapshot.docs[0]
    }

    const data = settings.data()
    return {
      id: settings.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as RegionalSettings
  }

  async setRegionalSettings(
    settings: Omit<RegionalSettings, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RegionalSettings> {
    const now = new Date()

    // Check for existing settings
    const q = query(
      collection(db, 'regionalSettings'),
      where('promoterId', '==', settings.promoterId),
      where('country', '==', settings.country),
      where('region', '==', settings.region || null)
    )

    const existing = await getDocs(q)

    if (!existing.empty) {
      const docRef = doc(db, 'regionalSettings', existing.docs[0].id)
      await updateDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.fromDate(now),
      })

      return {
        id: existing.docs[0].id,
        ...settings,
        createdAt: existing.docs[0].data().createdAt?.toDate(),
        updatedAt: now,
      }
    }

    const docRef = await addDoc(collection(db, 'regionalSettings'), {
      ...settings,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    return {
      id: docRef.id,
      ...settings,
      createdAt: now,
      updatedAt: now,
    }
  }

  // ==================== DETECTION ====================

  detectLocaleFromBrowser(): string {
    if (typeof navigator === 'undefined') return 'en-US'

    const browserLang = navigator.language || (navigator as any).userLanguage
    const locale = SUPPORTED_LOCALES.find((l) => l.code === browserLang)

    if (locale) return locale.code

    // Try matching just the language part
    const langPart = browserLang.split('-')[0]
    const langMatch = SUPPORTED_LOCALES.find((l) => l.language === langPart)

    return langMatch?.code || 'en-US'
  }

  async detectCurrencyFromIP(ipAddress: string): Promise<string> {
    // In production, use a geolocation service
    // For now, return default
    return 'USD'
  }

  getDefaultLocaleForCountry(countryCode: string): Locale | undefined {
    return SUPPORTED_LOCALES.find((l) => l.region === countryCode)
  }

  // ==================== UTILITIES ====================

  clearCache(): void {
    this.exchangeRateCache.clear()
    this.translationCache.clear()
  }

  getTimezones(): string[] {
    return [
      'Pacific/Honolulu',
      'America/Anchorage',
      'America/Los_Angeles',
      'America/Denver',
      'America/Chicago',
      'America/New_York',
      'America/Sao_Paulo',
      'Atlantic/Reykjavik',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Australia/Sydney',
      'Pacific/Auckland',
    ]
  }

  convertTimezone(date: Date, fromTz: string, toTz: string): Date {
    // In production, use a proper timezone library like date-fns-tz or luxon
    // This is a simplified implementation
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: toTz }))
    return targetDate
  }
}

export const I18nService = new I18nServiceClass()
