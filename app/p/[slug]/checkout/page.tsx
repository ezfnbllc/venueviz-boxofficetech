'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useCart } from '@/lib/stores/cartStore'
import Layout from '@/components/public/Layout'
import Link from 'next/link'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

interface CheckoutFormProps {
  clientSecret: string
  orderId: string
  promoterSlug: string
  onSuccess: (orderId: string) => void
}

function CheckoutForm({ clientSecret, orderId, promoterSlug, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const { items, currentEvent, calculateSubtotal, calculateServiceFee, calculateTotal } = useCart()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'An error occurred')
      setProcessing(false)
      return
    }

    const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/p/${promoterSlug}/confirmation/${orderId}`,
      },
      redirect: 'if_required',
    })

    if (paymentError) {
      setError(paymentError.message || 'Payment failed')
      setProcessing(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(orderId)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="main-card">
        <div className="bp-title">
          <h4>Payment Information</h4>
        </div>
        <div className="p-6">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || processing}
            className="main-btn btn-hover h-12 w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${calculateTotal().toFixed(2)}`
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your payment is secure and encrypted
          </p>
        </div>
      </div>
    </form>
  )
}

function BillingForm({
  formData,
  setFormData,
  emailError,
}: {
  formData: { firstName: string; lastName: string; email: string; address: string; city: string; state: string; zipCode: string; country: string }
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>
  emailError?: string
}) {
  return (
    <div className="main-card">
      <div className="bp-title">
        <h4>Billing Information</h4>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">First Name*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email*</label>
            <input
              className={`form-control h-12 ${emailError ? 'border-red-500' : ''}`}
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {emailError && (
              <p className="text-red-500 text-sm mt-1">{emailError}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Address*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">City*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">State*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ZIP Code*</label>
            <input
              className="form-control h-12"
              type="text"
              required
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Country*</label>
            <select
              className="form-control h-12"
              required
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            >
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IN">India</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderSummary({
  promoterSlug,
  couponCode,
  setCouponCode,
  onApplyCoupon,
}: {
  promoterSlug: string
  couponCode: string
  setCouponCode: (code: string) => void
  onApplyCoupon: () => void
}) {
  const { items, currentEvent, calculateSubtotal, calculateServiceFee, calculateTotal, getItemCount } = useCart()

  return (
    <div className="main-card order-summary">
      <div className="bp-title">
        <h4>Order Summary</h4>
      </div>
      <div className="p-6">
        {/* Event Info */}
        {currentEvent && (
          <div className="flex gap-4 mb-6 pb-6 border-b border-gray-200">
            {currentEvent.eventImage && (
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={currentEvent.eventImage}
                  alt={currentEvent.eventName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 mb-1">{currentEvent.eventName}</h5>
              {currentEvent.eventDate && (
                <span className="text-sm text-gray-600">{currentEvent.eventDate}</span>
              )}
              {currentEvent.venueName && (
                <div className="text-sm text-[#6ac045] mt-1">{currentEvent.venueName}</div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.ticketType || 'Ticket'}
                {item.quantity > 1 && ` x${item.quantity}`}
                {item.section && ` - ${item.section}`}
                {item.row && ` Row ${item.row}`}
                {item.seat && ` Seat ${item.seat}`}
              </span>
              <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({getItemCount()} tickets)</span>
            <span>${calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service Fee</span>
            <span>${calculateServiceFee().toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-[#6ac045]">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Coupon Code */}
        <div className="mt-6">
          <label className="form-label">Coupon Code</label>
          <div className="flex gap-2">
            <input
              className="form-control h-12 flex-1"
              type="text"
              placeholder="Enter code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              className="px-4 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Price is inclusive of all applicable taxes
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const cart = useCart()
  const { items, currentEvent, calculateTotal, clearCart, _hasHydrated } = cart
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  })
  const [emailError, setEmailError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Create payment intent when form is complete (with debouncing)
  useEffect(() => {
    if (!_hasHydrated || items.length === 0) {
      setLoading(false)
      return
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Only proceed if we have required billing info
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setLoading(false)
      setEmailError(null)
      return
    }

    // Validate email format before making API call
    if (!isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Clear email error if valid
    setEmailError(null)
    setLoading(true)

    // Debounce the API call to prevent requests on every keystroke
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(item => ({
              id: item.id,
              type: item.type,
              eventId: item.eventId,
              eventName: item.eventName,
              ticketType: item.ticketType,
              section: item.section,
              row: item.row,
              seat: item.seat,
              price: item.price,
              quantity: item.quantity,
            })),
            customerEmail: formData.email,
            customerName: `${formData.firstName} ${formData.lastName}`,
            promoterSlug: slug,
            metadata: {
              billingAddress: formData.address,
              billingCity: formData.city,
              billingState: formData.state,
              billingZip: formData.zipCode,
              billingCountry: formData.country,
            },
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment')
        }

        setClientSecret(data.clientSecret)
        setOrderId(data.orderId)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment')
      } finally {
        setLoading(false)
      }
    }, 500) // 500ms debounce delay

    // Cleanup function to clear timer on unmount or re-run
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [_hasHydrated, items, formData.email, formData.firstName, formData.lastName, slug])

  const handleApplyCoupon = () => {
    // TODO: Implement coupon validation
    console.log('Applying coupon:', couponCode)
  }

  const handlePaymentSuccess = (orderId: string) => {
    clearCart()
    router.push(`/p/${slug}/confirmation/${orderId}`)
  }

  // Show loading during hydration
  if (!_hasHydrated) {
    return (
      <Layout promoterSlug={slug}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ac045]"></div>
        </div>
      </Layout>
    )
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <Layout promoterSlug={slug}>
        {/* Breadcrumb */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <nav aria-label="breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href={`/p/${slug}`} className="text-gray-600 hover:text-[#6ac045]">
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li className="text-gray-900 font-medium">Checkout</li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven&apos;t added any tickets yet. Browse our events to find something exciting!
            </p>
            <Link
              href={`/p/${slug}/events`}
              className="main-btn btn-hover inline-block px-8 py-3"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout promoterSlug={slug}>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href={`/p/${slug}`} className="text-gray-600 hover:text-[#6ac045]">
                  Home
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href={`/p/${slug}/events`} className="text-gray-600 hover:text-[#6ac045]">
                  Events
                </Link>
              </li>
              {currentEvent && (
                <>
                  <li className="text-gray-400">/</li>
                  <li>
                    <Link
                      href={`/p/${slug}/events/${currentEvent.eventId}`}
                      className="text-gray-600 hover:text-[#6ac045]"
                    >
                      {currentEvent.eventName}
                    </Link>
                  </li>
                </>
              )}
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium">Checkout</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Order Confirmation</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Billing Information */}
              <BillingForm formData={formData} setFormData={setFormData} emailError={emailError || undefined} />

              {/* Payment Section */}
              {clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#6ac045',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    orderId={orderId!}
                    promoterSlug={slug}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              ) : (
                <div className="main-card">
                  <div className="bp-title">
                    <h4>Payment Information</h4>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ac045]"></div>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-8">
                        Please fill in your billing information above to proceed with payment.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <OrderSummary
                  promoterSlug={slug}
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  onApplyCoupon={handleApplyCoupon}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  )
}
