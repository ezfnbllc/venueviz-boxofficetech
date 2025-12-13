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
    return <div className="animate-pulse text-secondary-contrast">Loading documents...</div>
  }

  return (
    <div className="space-y-6">
      <div className="stat-card rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 text-primary-contrast">Documents</h3>
        {documents.length === 0 ? (
          <p className="text-secondary-contrast">No documents uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div>
                  <p className="font-medium text-primary-contrast">{doc.fileName}</p>
                  <p className="text-sm text-secondary-contrast">
                    Type: {doc.type} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge-success text-sm px-2 py-1 rounded-full">{doc.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
