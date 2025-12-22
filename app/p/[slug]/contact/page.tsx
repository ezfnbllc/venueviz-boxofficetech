/**
 * Contact Page
 * Contact form and information for promoter
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPromoterBySlug } from '@/lib/public/publicService'
import { Layout } from '@/components/public/Layout'
import { Card, CardContent } from '@/components/public/Card'
import { Button } from '@/components/public/Button'
import { Input, Textarea } from '@/components/public/Input'

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
    title: `Contact | ${promoter.name}`,
    description: `Get in touch with ${promoter.name}`,
  }
}

export default async function ContactPage({ params }: PageProps) {
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
            Contact Us
          </h1>
          <p className="text-white/80 text-lg">
            We'd love to hear from you
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Contact Form */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-[#1d1d1d] mb-6">Send us a message</h2>
                <form className="space-y-4">
                  <div>
                    <Input
                      label="Name"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Subject"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div>
                    <Textarea
                      label="Message"
                      placeholder="Your message..."
                      rows={5}
                      required
                    />
                  </div>
                  <Button variant="primary" size="lg" className="w-full">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#e8f7f7] rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1d1d1d] mb-1">Email</h3>
                      {promoter.contactEmail ? (
                        <a href={`mailto:${promoter.contactEmail}`} className="text-[#6ac045] hover:underline">
                          {promoter.contactEmail}
                        </a>
                      ) : (
                        <p className="text-[#717171]">Contact form only</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {promoter.website && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#e8f7f7] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1d1d1d] mb-1">Website</h3>
                        <a href={promoter.website} target="_blank" rel="noopener noreferrer" className="text-[#6ac045] hover:underline">
                          {promoter.website}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {promoter.socialLinks && Object.values(promoter.socialLinks).some(Boolean) && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-[#1d1d1d] mb-4">Follow Us</h3>
                    <div className="flex gap-3">
                      {promoter.socialLinks.facebook && (
                        <a href={promoter.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#f1f2f3] rounded-lg flex items-center justify-center hover:bg-[#e8f7f7] transition-colors">
                          <svg className="w-5 h-5 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                          </svg>
                        </a>
                      )}
                      {promoter.socialLinks.twitter && (
                        <a href={promoter.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#f1f2f3] rounded-lg flex items-center justify-center hover:bg-[#e8f7f7] transition-colors">
                          <svg className="w-5 h-5 text-[#1da1f2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                          </svg>
                        </a>
                      )}
                      {promoter.socialLinks.instagram && (
                        <a href={promoter.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#f1f2f3] rounded-lg flex items-center justify-center hover:bg-[#e8f7f7] transition-colors">
                          <svg className="w-5 h-5 text-[#e4405f]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
