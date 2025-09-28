// Update the handleSaveLayout function in EnhancedLayoutBuilder

const handleSaveLayout = async (layout: SeatingLayout) => {
  try {
    const layoutData = {
      name: layout.name,
      type: 'seating_chart',
      venueId: venue.id,
      sections: layout.sections,
      stage: layout.stage,
      aisles: layout.aisles,
      totalCapacity: layout.capacity,
      viewBox: layout.viewBox,
      priceCategories: layout.priceCategories || [], // Include price categories
      configuration: {
        version: '2.0',
        format: 'svg'
      }
    }

    if (selectedLayout) {
      await AdminService.updateLayout(selectedLayout.id, layoutData)
    } else {
      await AdminService.createLayout(layoutData)
    }

    setIsDesigning(false)
    setCurrentLayout(null)
    setSelectedLayout(null)
    await loadLayouts()
    alert('Layout saved successfully!')
  } catch (error) {
    console.error('Error saving layout:', error)
    alert('Error saving layout')
  }
}

const handleEditLayout = (layout: any) => {
  if (layout.type === 'general_admission') {
    alert('GA layouts can only be edited through the wizard')
    return
  }
  
  const seatingLayout: SeatingLayout = {
    id: layout.id,
    venueId: venue.id,
    name: layout.name,
    sections: layout.sections || [],
    stage: layout.stage || {
      x: 400,
      y: 50,
      width: 400,
      height: 60,
      label: 'STAGE',
      type: 'stage'
    },
    aisles: layout.aisles || [],
    capacity: layout.totalCapacity || 0,
    viewBox: layout.viewBox || {
      x: 0,
      y: 0,
      width: 1200,
      height: 800
    },
    priceCategories: layout.priceCategories || [] // Include price categories when editing
  }
  setCurrentLayout(seatingLayout)
  setSelectedLayout(layout)
  setIsDesigning(true)
}
