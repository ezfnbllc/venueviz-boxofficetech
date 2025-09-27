import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-12-12'
})

export async function createCheckoutSession(items: any[]) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description
        },
        unit_amount: item.price * 100
      },
      quantity: item.quantity
    })),
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout`
  })
  return session
}
