  static async getEvent(eventId: string) {
    try {
      const eventRef = doc(db, 'events', eventId)
      const eventDoc = await getDoc(eventRef)
      if (eventDoc.exists()) {
        return { id: eventDoc.id, ...eventDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching event:', error)
      return null
    }
  }
