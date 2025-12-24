import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export class StorageService {
  static async uploadEventImage(file: File, eventName: string): Promise<string> {
    try {
      // Create unique filename
      const timestamp = Date.now()
      const safeName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const fileName = `events/${safeName}_${timestamp}_${file.name}`

      // Upload to Firebase Storage
      const storageRef = ref(storage, fileName)
      const snapshot = await uploadBytes(storageRef, file)

      // Get download URL
      const url = await getDownloadURL(snapshot.ref)
      return url
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  static async optimizeImage(file: File): Promise<File> {
    // For now, return the original file
    // Client-side image optimization can be added later
    return file
  }

  static async uploadVenueImage(file: File, venueName?: string): Promise<string> {
    try {
      const timestamp = Date.now()
      const safeName = (venueName || 'venue').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const fileName = `venues/${safeName}_${timestamp}_${file.name}`

      const storageRef = ref(storage, fileName)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)
      return url
    } catch (error) {
      console.error('Error uploading venue image:', error)
      throw error
    }
  }

  static async uploadPromoterLogo(file: File, promoterName?: string): Promise<string> {
    try {
      const timestamp = Date.now()
      const safeName = (promoterName || 'promoter').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const fileName = `promoters/logos/${safeName}_${timestamp}_${file.name}`

      const storageRef = ref(storage, fileName)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)
      return url
    } catch (error) {
      console.error('Error uploading promoter logo:', error)
      throw error
    }
  }

  /**
   * Upload image from URL - fetches via proxy API and uploads to Firebase
   */
  static async uploadFromUrl(imageUrl: string, eventName: string): Promise<string | null> {
    try {
      // Fetch image through proxy to avoid CORS
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl })
      })

      if (!response.ok) {
        console.error('Failed to fetch image from URL:', imageUrl)
        return null
      }

      const blob = await response.blob()

      // Get file extension from URL or content type
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? '.png' :
                  contentType.includes('gif') ? '.gif' :
                  contentType.includes('webp') ? '.webp' : '.jpg'

      // Create file from blob
      const timestamp = Date.now()
      const safeName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const fileName = `imported_${timestamp}${ext}`
      const file = new File([blob], fileName, { type: contentType })

      // Upload to Firebase
      return await StorageService.uploadEventImage(file, eventName)
    } catch (error) {
      console.error('Error uploading from URL:', error)
      return null
    }
  }

  /**
   * Upload multiple images from URLs
   */
  static async uploadMultipleFromUrls(imageUrls: string[], eventName: string): Promise<string[]> {
    const uploadedUrls: string[] = []

    for (const url of imageUrls) {
      try {
        const uploadedUrl = await StorageService.uploadFromUrl(url, eventName)
        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl)
        }
      } catch (error) {
        console.error('Error uploading image:', url, error)
      }
    }

    return uploadedUrls
  }
}
