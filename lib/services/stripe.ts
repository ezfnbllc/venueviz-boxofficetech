const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

export async function createCheckoutSession(items: any[]) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || ''
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity || 1
    })),
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/checkout`
  });
  return session;
}
