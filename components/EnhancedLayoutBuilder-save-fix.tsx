// Update only the handleSaveLayout function in your EnhancedLayoutBuilder.tsx

const handleSaveLayout = async (layout: SeatingLayout) => {
  console.log('=== SAVE LAYOUT HANDLER ===')
  console.log('Layout to save:', layout)
  
  try {
    // Ensure all required fields have values
    const layoutData = {
      name: layout.name || 'Unnamed Layout',
      type: 'seating_chart',
      venueId: venue.id,
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
      totalCapacity: layout.capacity || 0,
      viewBox: layout.viewBox || {
        x: 0,
        y: 0,
        width: 1200,
        height: 800
      },
      priceCategories: layout.priceCategories || [],
      configuration: {
        version: '2.0',
        format: 'svg'
      }
    }

    console.log('Prepared layout data:', layoutData)

    if (selectedLayout) {
      console.log('Updating existing layout:', selectedLayout.id)
      await AdminService.updateLayout(selectedLayout.id, layoutData)
    } else {
      console.log('Creating new layout')
      const newId = await AdminService.createLayout(layoutData)
      console.log('Created layout with ID:', newId)
    }

    setIsDesigning(false)
    setCurrentLayout(null)
    setSelectedLayout(null)
    await loadLayouts()
    alert('Layout saved successfully!')
  } catch (error) {
    console.error('Error saving layout:', error)
    alert('Error saving layout. Check console for details.')
  }
}
