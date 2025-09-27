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

  static async uploadVenueImage(file: File, venueName: string): Promise<string> {
    try {
      const timestamp = Date.now()
      const safeName = venueName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
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
}
