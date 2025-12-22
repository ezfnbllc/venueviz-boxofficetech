/**
 * Privacy Policy Page
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
    title: `Privacy Policy | ${promoter.name}`,
    description: `Privacy policy for ${promoter.name}`,
  }
}

export default async function PrivacyPage({ params }: PageProps) {
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
            Privacy Policy
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
              <h2>1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account,
                make a purchase, or contact us for support. This may include:
              </p>
              <ul>
                <li>Name and email address</li>
                <li>Payment information (processed securely by our payment provider)</li>
                <li>Phone number (if provided)</li>
                <li>Event preferences and purchase history</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Process your ticket purchases and send confirmations</li>
                <li>Send you important event updates and reminders</li>
                <li>Improve our services and customer experience</li>
                <li>Send promotional communications (with your consent)</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information with:
              </p>
              <ul>
                <li>Event organizers (for event management purposes)</li>
                <li>Payment processors (to complete transactions)</li>
                <li>Service providers who assist in our operations</li>
              </ul>

              <h2>4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information.
                However, no method of transmission over the Internet is 100% secure.
              </p>

              <h2>5. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal information.
                Contact us to exercise these rights.
              </p>

              <h2>6. Cookies</h2>
              <p>
                We use cookies to improve your experience on our site. You can control cookie
                settings through your browser preferences.
              </p>

              <h2>7. Contact Us</h2>
              <p>
                For privacy-related questions, contact us at{' '}
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
