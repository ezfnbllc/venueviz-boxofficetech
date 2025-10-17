'use client'

import { useState, useEffect } from 'react'
import PromoterService from '@/lib/services/promoterService'
import { PromoterDocument } from '@/lib/types/promoter'

interface PromoterDocumentsProps {
  promoterId: string
}

export default function PromoterDocuments({ promoterId }: PromoterDocumentsProps) {
  const [documents, setDocuments] = useState<PromoterDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [promoterId])

  const loadDocuments = async () => {
    try {
      const docs = await PromoterService.getPromoterDocuments(promoterId)
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading documents...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-black/40 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Documents</h3>
        {documents.length === 0 ? (
          <p className="text-gray-400">No documents uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium">{doc.fileName}</p>
                  <p className="text-sm text-gray-400">
                    Type: {doc.type} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-green-400 text-sm">{doc.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
