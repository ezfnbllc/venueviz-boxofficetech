/**
 * FAQ Page
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPromoterBySlug } from '@/lib/public/publicService'
import { Layout } from '@/components/public/Layout'
import { Card, CardContent } from '@/components/public/Card'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    return { title: 'Not Found' }
  }

  return {
    title: `FAQ | ${promoter.name}`,
    description: `Frequently asked questions about ${promoter.name}`,
  }
}

const faqs = [
  {
    question: 'How do I purchase tickets?',
    answer: 'Browse our events page, select the event you want to attend, choose your tickets, and proceed to checkout. You can pay securely with credit/debit card.',
  },
  {
    question: 'Can I get a refund for my tickets?',
    answer: 'Tickets are generally non-refundable. However, if an event is cancelled, you will receive a full refund. If an event is rescheduled, your tickets will be valid for the new date.',
  },
  {
    question: 'How will I receive my tickets?',
    answer: 'After purchase, you will receive an email confirmation with your tickets attached as a PDF. You can also access your tickets from your account page.',
  },
  {
    question: 'Can I transfer my tickets to someone else?',
    answer: 'Yes, you can transfer your tickets to another person through your account. The recipient will receive an email with the transferred tickets.',
  },
  {
    question: 'What should I bring to the event?',
    answer: 'Bring your ticket (printed or on your mobile device) and a valid ID. Check the specific event details for any additional requirements.',
  },
  {
    question: 'Is there an age requirement for events?',
    answer: 'Age requirements vary by event. Please check the specific event details for age restrictions and requirements.',
  },
  {
    question: 'What if I lose my tickets?',
    answer: 'Don\'t worry! You can always access your tickets from your account or request them to be resent to your email address.',
  },
  {
    question: 'How do I contact customer support?',
    answer: 'You can reach us through our contact page or by email. We typically respond within 24-48 hours.',
  },
]

export default async function FAQPage({ params }: PageProps) {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    notFound()
  }

  return (
    <Layout
      promoterSlug={slug}
      header={{
        logo: promoter.logo,
        logoText: promoter.name,
        navItems: [
          { label: 'Home', href: `/p/${slug}` },
          { label: 'Events', href: `/p/${slug}/events` },
          { label: 'About', href: `/p/${slug}/about` },
          { label: 'Contact', href: `/p/${slug}/contact` },
        ],
      }}
      footer={{
        logoText: promoter.name,
        description: promoter.description,
      }}
    >
      {/* Page Header */}
      <section className="bg-[#1d1d1d] py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/80 text-lg">
            Find answers to common questions
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#1d1d1d] mb-3 flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#6ac045] text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                      ?
                    </span>
                    {faq.question}
                  </h3>
                  <p className="text-[#717171] pl-9">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact CTA */}
          <Card className="mt-8 bg-[#f9fafb]">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold text-[#1d1d1d] mb-2">
                Still have questions?
              </h3>
              <p className="text-[#717171] mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <a
                href={`/p/${slug}/contact`}
                className="inline-block px-6 py-3 bg-[#6ac045] text-white font-medium rounded-md hover:bg-[#5aa935] transition-colors"
              >
                Contact Us
              </a>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  )
}
