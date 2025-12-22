/**
 * Terms of Service Page
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
    title: `Terms of Service | ${promoter.name}`,
    description: `Terms of service for ${promoter.name}`,
  }
}

export default async function TermsPage({ params }: PageProps) {
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
            Terms of Service
          </h1>
          <p className="text-white/80 text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using this website and purchasing tickets through {promoter.name},
                you accept and agree to be bound by the terms and provision of this agreement.
              </p>

              <h2>2. Ticket Purchases</h2>
              <p>
                All ticket sales are final. Tickets are non-refundable unless the event is cancelled
                or rescheduled by the organizer. In case of cancellation, refunds will be processed
                within 14 business days.
              </p>

              <h2>3. Event Changes</h2>
              <p>
                Event dates, times, and venues are subject to change. We will make reasonable efforts
                to notify ticket holders of any changes via the email address provided at purchase.
              </p>

              <h2>4. User Conduct</h2>
              <p>
                You agree to use this service only for lawful purposes. You are responsible for
                maintaining the confidentiality of your account information.
              </p>

              <h2>5. Limitation of Liability</h2>
              <p>
                {promoter.name} shall not be liable for any indirect, incidental, special, or
                consequential damages arising from the use of this service or attendance at events.
              </p>

              <h2>6. Contact</h2>
              <p>
                For questions about these terms, please contact us at{' '}
                {promoter.contactEmail ? (
                  <a href={`mailto:${promoter.contactEmail}`} className="text-[#6ac045]">
                    {promoter.contactEmail}
                  </a>
                ) : (
                  'our contact page'
                )}.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  )
}
