/**
 * About Page
 * Static page for promoter information
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
    title: `About | ${promoter.name}`,
    description: `Learn more about ${promoter.name}`,
  }
}

export default async function AboutPage({ params }: PageProps) {
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
            About Us
          </h1>
          <p className="text-white/80 text-lg">
            Learn more about {promoter.name}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                {promoter.description ? (
                  <p className="text-[#717171] whitespace-pre-wrap">{promoter.description}</p>
                ) : (
                  <p className="text-[#717171]">
                    Welcome to {promoter.name}! We are dedicated to bringing you the best events
                    and experiences. Stay tuned for more information about our mission and story.
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-8 pt-8 border-t border-[#efefef]">
                <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">Get in Touch</h2>
                <div className="space-y-2 text-[#717171]">
                  {promoter.contactEmail && (
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href={`mailto:${promoter.contactEmail}`} className="text-[#6ac045] hover:underline">
                        {promoter.contactEmail}
                      </a>
                    </p>
                  )}
                  {promoter.website && (
                    <p>
                      <strong>Website:</strong>{' '}
                      <a href={promoter.website} target="_blank" rel="noopener noreferrer" className="text-[#6ac045] hover:underline">
                        {promoter.website}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  )
}
