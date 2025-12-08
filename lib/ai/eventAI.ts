// AI service for event generation from posters and URLs
// This module provides AI-powered event data extraction capabilities

// Type definitions for AI-extracted event data
export interface AIExtractedData {
  name: string
  description: string
  category: string
  confidence: number
  tags?: string[]
  performers?: string[]
  images?: {
    cover?: string
    thumbnail?: string
    gallery?: string[]
  }
  imageData?: {
    cover?: { data: string; type: string; name: string }
    thumbnail?: { data: string; type: string; name: string }
    gallery?: { data: string; type: string; name: string }
  }
  date?: string
  time?: string
  venue?: {
    name?: string
    address?: string
  }
  venueId?: string
  pricing?: Array<{
    name: string
    price: number
    description?: string
  }>
  promotions?: Array<{
    code?: string
    description?: string
    type?: 'percentage' | 'fixed'
    discount?: number
  }>
}

// EventAI class with static methods for AI operations
export class EventAI {
  /**
   * Smart fill event details based on event name
   * Uses AI to generate description, category, tags, and performers
   */
  static async smartFill(eventName: string): Promise<AIExtractedData> {
    try {
      const response = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: eventName })
      })

      if (!response.ok) {
        throw new Error('Failed to generate event details')
      }

      const data = await response.json()
      return {
        name: eventName,
        description: data.description || '',
        category: data.category || 'other',
        tags: data.tags || [],
        performers: data.performers || [],
        confidence: data.confidence || 0.7
      }
    } catch (error) {
      console.error('Smart fill error:', error)
      // Return fallback data on error
      return {
        name: eventName,
        description: '',
        category: 'other',
        confidence: 0,
        tags: [],
        performers: []
      }
    }
  }

  /**
   * Extract event data from a URL (e.g., Ticketmaster, StubHub, etc.)
   */
  static async extractFromURL(url: string): Promise<AIExtractedData> {
    try {
      const response = await fetch('/api/scrape-event-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        // Try basic scraper as fallback
        const basicResponse = await fetch('/api/scrape-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })

        if (!basicResponse.ok) {
          throw new Error('Failed to extract event data from URL')
        }

        const basicData = await basicResponse.json()
        return {
          name: basicData.name || '',
          description: basicData.description || '',
          category: basicData.category || 'other',
          confidence: basicData.confidence || 0.5,
          tags: basicData.tags || [],
          performers: basicData.performers || [],
          venue: basicData.venue,
          date: basicData.date,
          time: basicData.time,
          pricing: basicData.pricing,
          images: basicData.images
        }
      }

      const data = await response.json()
      return {
        name: data.name || '',
        description: data.description || '',
        category: data.category || 'other',
        confidence: data.confidence || 0.8,
        tags: data.tags || [],
        performers: data.performers || [],
        venue: data.venue,
        date: data.date,
        time: data.time,
        pricing: data.pricing,
        promotions: data.promotions,
        images: data.images
      }
    } catch (error) {
      console.error('URL extraction error:', error)
      throw new Error('Unable to extract event data from the provided URL')
    }
  }

  /**
   * Extract event data from a poster image using AI vision
   */
  static async extractFromPoster(imageFile: File): Promise<AIExtractedData> {
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URL prefix to get pure base64
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })

      const response = await fetch('/api/analyze-seating-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          type: 'event-poster',
          filename: imageFile.name
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze poster image')
      }

      const data = await response.json()

      // Generate processed images from the uploaded file
      const imageData = await EventAI.processImageForUpload(imageFile)

      return {
        name: data.name || 'Untitled Event',
        description: data.description || '',
        category: data.category || 'other',
        confidence: data.confidence || 0.6,
        tags: data.tags || [],
        performers: data.performers || [],
        venue: data.venue,
        date: data.date,
        time: data.time,
        pricing: data.pricing,
        promotions: data.promotions,
        imageData
      }
    } catch (error) {
      console.error('Poster extraction error:', error)
      throw new Error('Unable to extract event data from the poster image')
    }
  }

  /**
   * Process an image file for upload, creating cover, thumbnail, and gallery versions
   */
  private static async processImageForUpload(file: File): Promise<AIExtractedData['imageData']> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64Data = result.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const timestamp = Date.now()
    const baseName = file.name.replace(/\.[^/.]+$/, '')

    return {
      cover: {
        data: base64,
        type: file.type,
        name: `${baseName}-cover-${timestamp}.${file.type.split('/')[1]}`
      },
      thumbnail: {
        data: base64,
        type: file.type,
        name: `${baseName}-thumb-${timestamp}.${file.type.split('/')[1]}`
      },
      gallery: {
        data: base64,
        type: file.type,
        name: `${baseName}-gallery-${timestamp}.${file.type.split('/')[1]}`
      }
    }
  }
}

// Legacy function exports for backward compatibility
export async function analyzeEventPoster(imageData: string) {
  return {
    success: false,
    message: 'Use EventAI.extractFromPoster() instead',
    data: null
  }
}

export async function scrapeEventFromURL(url: string) {
  return {
    success: false,
    message: 'Use EventAI.extractFromURL() instead',
    data: null
  }
}

export async function generateEventDetails(prompt: string) {
  return {
    success: false,
    message: 'Use EventAI.smartFill() instead',
    data: null
  }
}

export async function enhanceEventDescription(description: string) {
  return {
    success: false,
    message: 'Description enhancement not yet implemented',
    enhanced: description
  }
}
