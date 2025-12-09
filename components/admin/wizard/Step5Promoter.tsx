'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

interface Promoter {
  id: string
  name: string
  email: string
  phone?: string
  website?: string
  commission?: number
  paymentTerms?: string
}

export default function Step5Promoter() {
  const { formData, updateFormData } = useEventWizardStore()
  const { user, loading: authLoading } = useAuth()
  
  const [promoters, setPromoters] = useState<Promoter[]>([])
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>('')
  const [isNewPromoter, setIsNewPromoter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  
  const isMasterAdmin = user?.isMaster === true && user?.role === 'admin'
  const promoterData = formData.promoter || {}
  
  const handleUpdate = (updates: any) => {
    console.log('[Step5] Updating promoter section:', updates)
    updateFormData('promoter', updates)
  }

  // Fetch promoters on mount
  useEffect(() => {
    fetchPromoters()
  }, [])
  
  // Load existing promoter data after promoters are fetched
  useEffect(() => {
    if (!initialLoadDone && promoters.length > 0 && promoterData.promoterId) {
      console.log('[Step5] Initial load - setting promoter:', promoterData.promoterId)
      setSelectedPromoterId(promoterData.promoterId)
      
      // Load the full promoter data if we only have the ID
      const existingPromoter = promoters.find(p => p.id === promoterData.promoterId)
      if (existingPromoter && !promoterData.promoterEmail) {
        console.log('[Step5] Loading full promoter data from database')
        handleUpdate({
          promoterId: existingPromoter.id,
          promoterName: existingPromoter.name,
          promoterEmail: existingPromoter.email || '',
          promoterPhone: existingPromoter.phone || '',
          promoterWebsite: existingPromoter.website || '',
          commission: promoterData.commission || existingPromoter.commission || 0,
          paymentTerms: promoterData.paymentTerms || existingPromoter.paymentTerms || 'net-30'
        })
      }
      setInitialLoadDone(true)
    }
  }, [promoters, promoterData.promoterId, initialLoadDone])

  const fetchPromoters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'promoters'))
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Promoter))
      
      setPromoters(list)
      setLoading(false)
    } catch (error) {
      console.error('[Step5] Error:', error)
      setLoading(false)
    }
  }

  const handlePromoterSelect = async (promoterId: string) => {
    console.log('[Step5] Selecting:', promoterId)
    setSelectedPromoterId(promoterId)
    
    if (!promoterId) {
      handleUpdate({
        promoterId: '',
        promoterName: '',
        promoterEmail: '',
        promoterPhone: '',
        promoterWebsite: '',
        commission: 0,
        paymentTerms: 'net-30'
      })
      return
    }
    
    if (promoterId === 'new') {
      setIsNewPromoter(true)
      handleUpdate({
        promoterId: '',
        promoterName: '',
        promoterEmail: '',
        promoterPhone: '',
        promoterWebsite: '',
        commission: 0,
        paymentTerms: 'net-30'
      })
      return
    }

    // Load selected promoter data
    const promoter = promoters.find(p => p.id === promoterId)
    if (promoter) {
      setIsNewPromoter(false)
      
      // Also try to load from database for complete data
      try {
        const docSnap = await getDoc(doc(db, 'promoters', promoterId))
        const dbData = docSnap.exists() ? docSnap.data() : {}
        
        handleUpdate({
          promoterId: promoter.id,
          promoterName: promoter.name || dbData.name,
          promoterEmail: promoter.email || dbData.email || '',
          promoterPhone: promoter.phone || dbData.phone || '',
          promoterWebsite: promoter.website || dbData.website || '',
          commission: promoter.commission || dbData.commission || 0,
          paymentTerms: promoter.paymentTerms || dbData.paymentTerms || 'net-30'
        })
      } catch (error) {
        console.error('[Step5] Error loading promoter details:', error)
        // Fall back to local data
        handleUpdate({
          promoterId: promoter.id,
          promoterName: promoter.name,
          promoterEmail: promoter.email || '',
          promoterPhone: promoter.phone || '',
          promoterWebsite: promoter.website || '',
          commission: promoter.commission || 0,
          paymentTerms: promoter.paymentTerms || 'net-30'
        })
      }
    }
  }

  const saveNewPromoter = async () => {
    if (!promoterData.promoterName || !promoterData.promoterEmail) {
      alert('Name and email required')
      return
    }

    try {
      const newPromoter = {
        name: promoterData.promoterName,
        email: promoterData.promoterEmail,
        phone: promoterData.promoterPhone || '',
        website: promoterData.promoterWebsite || '',
        commission: promoterData.commission || 0,
        paymentTerms: promoterData.paymentTerms || 'net-30',
        active: true,
        createdAt: new Date().toISOString()
      }

      const docRef = doc(collection(db, 'promoters'))
      await setDoc(docRef, newPromoter)
      
      setPromoters([...promoters, { ...newPromoter, id: docRef.id }])
      setSelectedPromoterId(docRef.id)
      setIsNewPromoter(false)
      
      handleUpdate({ promoterId: docRef.id })
      alert('Promoter saved!')
    } catch (error) {
      console.error('[Step5] Save error:', error)
      alert('Failed to save')
    }
  }

  if (authLoading || loading) {
    return <div className="p-8 text-center animate-pulse">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Promoter Information</h2>
        <p className="text-slate-500 dark:text-slate-400">Select an existing promoter or create new</p>
      </div>

      {/* User Status */}
      {user && (
        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Logged in as:</span>
            <span className="text-sm font-medium">{user.email}</span>
            {isMasterAdmin ? (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                🔑 Master Admin
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-600/20 text-slate-500 dark:text-slate-400 text-xs rounded-full">
                Standard User
              </span>
            )}
          </div>
        </div>
      )}

      {/* Promoter Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Promoter</h3>
        
        <div className="flex gap-4">
          <select
            value={selectedPromoterId}
            onChange={(e) => handlePromoterSelect(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
          >
            <option value="">-- Select --</option>
            {promoters.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.email || 'No email'})
              </option>
            ))}
            <option value="new">+ Add New</option>
          </select>
          
          {isNewPromoter && (
            <button
              onClick={saveNewPromoter}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Name *</label>
            <input
              type="text"
              value={promoterData.promoterName || ''}
              onChange={(e) => handleUpdate({ promoterName: e.target.value })}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
              disabled={!isNewPromoter && selectedPromoterId !== ''}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Email *</label>
            <input
              type="email"
              value={promoterData.promoterEmail || ''}
              onChange={(e) => handleUpdate({ promoterEmail: e.target.value })}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
              disabled={!isNewPromoter && selectedPromoterId !== ''}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Phone</label>
            <input
              type="tel"
              value={promoterData.promoterPhone || ''}
              onChange={(e) => handleUpdate({ promoterPhone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
              disabled={!isNewPromoter && selectedPromoterId !== ''}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Website</label>
            <input
              type="url"
              value={promoterData.promoterWebsite || ''}
              onChange={(e) => handleUpdate({ promoterWebsite: e.target.value })}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
              disabled={!isNewPromoter && selectedPromoterId !== ''}
            />
          </div>
        </div>
      </div>

      {/* Commission & Terms - Master Admin Only */}
      <div className={`space-y-4 ${!isMasterAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Commission & Payment Terms
          {isMasterAdmin ? (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
              🔑 Master Admin Only
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-600/20 text-red-700 dark:text-red-400 text-xs rounded-full">
              🔒 Restricted
            </span>
          )}
        </h3>
        
        {!isMasterAdmin ? (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Commission: {promoterData.commission || 0}% | Terms: {promoterData.paymentTerms || 'net-30'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Commission (%)</label>
              <input
                type="number"
                value={promoterData.commission || 0}
                onChange={(e) => handleUpdate({ commission: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
                min="0" max="100" step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Payment Terms</label>
              <select
                value={promoterData.paymentTerms || 'net-30'}
                onChange={(e) => handleUpdate({ paymentTerms: e.target.value })}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
              >
                <option value="immediate">Immediate</option>
                <option value="net-7">Net 7</option>
                <option value="net-14">Net 14</option>
                <option value="net-30">Net 30</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
