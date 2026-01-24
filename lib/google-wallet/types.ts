/**
 * Google Wallet API Types
 * Type definitions for Event Ticket passes
 */

// Event Ticket Class - defines the template for all tickets for an event
export interface EventTicketClass {
  id: string // Format: issuerId.eventId
  issuerName: string
  localizedIssuerName?: LocalizedString
  eventName: LocalizedString
  eventId: string
  logo: ImageUri
  heroImage?: ImageUri
  venue: EventVenue
  dateTime: EventDateTime
  reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'APPROVED_WITH_WARNINGS'
  countryCode?: string
  homepageUri?: Uri
  linksModuleData?: LinksModuleData
  hexBackgroundColor?: string
  enableSmartTap?: boolean
  redemptionIssuers?: string[]
  securityAnimation?: SecurityAnimation
  callbackOptions?: CallbackOptions
}

// Event Ticket Object - represents a single ticket instance
export interface EventTicketObject {
  id: string // Format: issuerId.ticketId
  classId: string // Reference to EventTicketClass
  state: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'INACTIVE'
  ticketHolderName?: string
  ticketNumber?: string
  ticketType?: LocalizedString
  seatInfo?: SeatInfo
  reservationInfo?: ReservationInfo
  faceValue?: Money
  barcode?: Barcode
  validTimeInterval?: TimeInterval
  linkedOfferIds?: string[]
  heroImage?: ImageUri
  textModulesData?: TextModuleData[]
  linksModuleData?: LinksModuleData
  imageModulesData?: ImageModuleData[]
  infoModuleData?: InfoModuleData
  passConstraints?: PassConstraints
  groupingInfo?: GroupingInfo
  hexBackgroundColor?: string
}

// Supporting types
export interface LocalizedString {
  defaultValue: TranslatedString
  translatedValues?: TranslatedString[]
}

export interface TranslatedString {
  language: string
  value: string
}

export interface ImageUri {
  uri: string
  description?: string
  localizedDescription?: LocalizedString
}

export interface Uri {
  uri: string
  description?: string
  localizedDescription?: LocalizedString
  id?: string
}

export interface EventVenue {
  name: LocalizedString
  address: LocalizedString
}

export interface EventDateTime {
  start?: string // RFC 3339 format
  end?: string
  doorsOpen?: string
  doorsOpenLabel?: LocalizedString
  customDoorsOpenLabel?: LocalizedString
}

export interface SeatInfo {
  seat?: LocalizedString
  row?: LocalizedString
  section?: LocalizedString
  gate?: LocalizedString
}

export interface ReservationInfo {
  confirmationCode?: string
  frequentFlyerInfo?: FrequentFlyerInfo
}

export interface FrequentFlyerInfo {
  programName?: LocalizedString
  frequentFlyerNumber?: string
}

export interface Money {
  micros: string // Amount in micros (1/1,000,000 of currency unit)
  currencyCode: string
}

export interface Barcode {
  type: 'AZTEC' | 'CODE_39' | 'CODE_128' | 'CODABAR' | 'DATA_MATRIX' | 'EAN_8' | 'EAN_13' | 'ITF_14' | 'PDF_417' | 'QR_CODE' | 'UPC_A' | 'TEXT_ONLY'
  value: string
  alternateText?: string
  showCodeText?: LocalizedString
}

export interface TimeInterval {
  start?: DateTime
  end?: DateTime
}

export interface DateTime {
  date: string // RFC 3339 format
}

export interface TextModuleData {
  header?: string
  body?: string
  localizedHeader?: LocalizedString
  localizedBody?: LocalizedString
  id?: string
}

export interface ImageModuleData {
  mainImage: ImageUri
  id?: string
}

export interface LinksModuleData {
  uris?: Uri[]
}

export interface InfoModuleData {
  showLastUpdateTime?: boolean
  labelValueRows?: LabelValueRow[]
}

export interface LabelValueRow {
  columns?: LabelValue[]
}

export interface LabelValue {
  label?: string
  localizedLabel?: LocalizedString
  value?: string
  localizedValue?: LocalizedString
}

export interface PassConstraints {
  screenshotEligibility?: 'SCREENSHOT_ELIGIBILITY_UNSPECIFIED' | 'ELIGIBLE' | 'INELIGIBLE'
  nfcConstraint?: string[]
}

export interface GroupingInfo {
  sortIndex?: number
  groupingId?: string
}

export interface SecurityAnimation {
  animationType: 'ANIMATION_UNSPECIFIED' | 'FOIL_SHIMMER'
}

export interface CallbackOptions {
  url: string
  updateRequestUrl?: string
}

// Pass creation request/response
export interface CreatePassRequest {
  orderId: string
  ticketId: string
  eventId: string
  eventName: string
  eventDate: string
  eventTime?: string
  venueName: string
  venueAddress?: string
  ticketType: string
  section?: string
  row?: string | number
  seat?: string | number
  price: number
  currency: string
  holderName?: string
  holderEmail?: string
  promoterName: string
  promoterLogo?: string
  qrCode?: string
}

export interface CreatePassResponse {
  saveUrl: string // URL for "Add to Google Wallet" button
  jwt: string // Signed JWT for pass
  passId: string // Unique pass identifier
}

// Google Wallet API configuration
export interface GoogleWalletConfig {
  issuerId: string
  serviceAccountEmail: string
  privateKey: string
  origins?: string[]
}
