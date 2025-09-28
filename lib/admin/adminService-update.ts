// Add these methods to your existing AdminService class

static async createLayout(data: any): Promise<string> {
  const layoutData = {
    venueId: data.venueId,
    name: data.name,
    type: data.type,
    sections: data.sections || [],
    gaLevels: data.gaLevels || [],
    totalCapacity: data.totalCapacity || 0,
    configuration: data.configuration || {},
    stage: data.stage,
    aisles: data.aisles || [],
    viewBox: data.viewBox,
    createdAt: Timestamp.now()
  }
  const docRef = await addDoc(collection(db, 'layouts'), layoutData)
  return docRef.id
}

static async updateLayout(id: string, data: any) {
  const updateData: any = {
    ...data,
    updatedAt: Timestamp.now()
  }
  await updateDoc(doc(db, 'layouts', id), updateData)
}
