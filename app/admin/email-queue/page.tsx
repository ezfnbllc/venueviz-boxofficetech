'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, Timestamp } from 'firebase/firestore'

interface QueuedEmail {
  id: string
  type: 'order_confirmation' | 'password_reset' | 'welcome' | 'custom'
  status: 'pending' | 'approved' | 'sent' | 'failed' | 'cancelled'
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  from: {
    email: string
    name: string
  }
  promoterSlug?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt?: Date
  sentAt?: Date
  error?: string
  attempts: number
}

export default function EmailQueuePage() {
  const router = useRouter()
  const [emails, setEmails] = useState<QueuedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<QueuedEmail | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all')
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, cancelled: 0 })
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadEmails()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadEmails = async () => {
    try {
      const q = query(
        collection(db, 'email_queue'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)

      const emailList: QueuedEmail[] = []
      const statusCounts = { pending: 0, sent: 0, failed: 0, cancelled: 0 }

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const email: QueuedEmail = {
          id: doc.id,
          type: data.type,
          status: data.status,
          to: data.to,
          toName: data.toName,
          subject: data.subject,
          html: data.html,
          text: data.text,
          from: data.from,
          promoterSlug: data.promoterSlug,
          metadata: data.metadata,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : undefined),
          sentAt: data.sentAt?.toDate?.() || (data.sentAt ? new Date(data.sentAt) : undefined),
          error: data.error,
          attempts: data.attempts || 0,
        }
        emailList.push(email)

        if (email.status in statusCounts) {
          statusCounts[email.status as keyof typeof statusCounts]++
        }
      })

      setEmails(emailList)
      setStats(statusCounts)
    } catch (error) {
      console.error('Error loading emails:', error)
    }
    setLoading(false)
  }

  const sendEmail = async (emailId: string) => {
    setSending(emailId)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })

      const result = await response.json()
      if (result.success) {
        await loadEmails()
      } else {
        alert(`Failed to send: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
    setSending(null)
  }

  const cancelEmail = async (emailId: string) => {
    if (!confirm('Cancel this email? It will not be sent.')) return

    try {
      await updateDoc(doc(db, 'email_queue', emailId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      })
      await loadEmails()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Delete this email permanently?')) return

    try {
      await deleteDoc(doc(db, 'email_queue', emailId))
      await loadEmails()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const sendBulk = async () => {
    if (bulkSelected.size === 0) return
    if (!confirm(`Send ${bulkSelected.size} selected emails?`)) return

    setSending('bulk')
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: Array.from(bulkSelected) }),
      })

      const result = await response.json()
      if (result.success) {
        setBulkSelected(new Set())
        await loadEmails()
        alert(`Sent ${result.sent} of ${result.total} emails`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
    setSending(null)
  }

  const toggleBulkSelect = (emailId: string) => {
    const newSet = new Set(bulkSelected)
    if (newSet.has(emailId)) {
      newSet.delete(emailId)
    } else {
      newSet.add(emailId)
    }
    setBulkSelected(newSet)
  }

  const selectAllPending = () => {
    const pendingIds = emails
      .filter((e) => e.status === 'pending')
      .map((e) => e.id)
    setBulkSelected(new Set(pendingIds))
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_confirmation: 'Order Confirmation',
      password_reset: 'Password Reset',
      welcome: 'Welcome',
      custom: 'Custom',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      order_confirmation: 'bg-green-100 text-green-800',
      password_reset: 'bg-orange-100 text-orange-800',
      welcome: 'bg-blue-100 text-blue-800',
      custom: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredEmails = filter === 'all'
    ? emails
    : emails.filter((e) => e.status === filter)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Queue</h1>
        <p className="text-gray-600">Manage and send queued emails (Test Mode)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
          <div className="text-sm text-green-600">Sent</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-700">{stats.cancelled}</div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Emails</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          {filter === 'all' && stats.pending > 0 && (
            <button
              onClick={selectAllPending}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select all pending ({stats.pending})
            </button>
          )}
        </div>

        {bulkSelected.size > 0 && (
          <button
            onClick={sendBulk}
            disabled={sending === 'bulk'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sending === 'bulk' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>Send {bulkSelected.size} Selected</>
            )}
          </button>
        )}
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={bulkSelected.size === emails.filter((e) => e.status === 'pending').length && bulkSelected.size > 0}
                  onChange={() =>
                    bulkSelected.size > 0 ? setBulkSelected(new Set()) : selectAllPending()
                  }
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Type</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Recipient</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Subject</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Created</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No emails found
                </td>
              </tr>
            ) : (
              filteredEmails.map((email) => (
                <tr key={email.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {email.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(email.id)}
                        onChange={() => toggleBulkSelect(email.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(email.type)}`}>
                      {getTypeLabel(email.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{email.toName || email.to}</div>
                    {email.toName && <div className="text-xs text-gray-500">{email.to}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{email.subject}</div>
                    {email.promoterSlug && (
                      <div className="text-xs text-gray-500">Tenant: {email.promoterSlug}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                    {email.error && (
                      <div className="text-xs text-red-500 mt-1">{email.error}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {email.createdAt.toLocaleString()}
                    {email.sentAt && (
                      <div className="text-xs">Sent: {email.sentAt.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmail(email)
                          setShowPreview(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Preview
                      </button>
                      {email.status === 'pending' && (
                        <>
                          <button
                            onClick={() => sendEmail(email.id)}
                            disabled={sending === email.id}
                            className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                          >
                            {sending === email.id ? 'Sending...' : 'Send'}
                          </button>
                          <button
                            onClick={() => cancelEmail(email.id)}
                            className="text-orange-600 hover:text-orange-800 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {(email.status === 'cancelled' || email.status === 'sent') && (
                        <button
                          onClick={() => deleteEmail(email.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                      {email.status === 'failed' && (
                        <button
                          onClick={() => sendEmail(email.id)}
                          disabled={sending === email.id}
                          className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold">Email Preview</h2>
                <p className="text-sm text-gray-500">
                  To: {selectedEmail.toName || selectedEmail.to}
                  {selectedEmail.toName && ` <${selectedEmail.to}>`}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">From:</span>{' '}
                  <span className="font-medium">{selectedEmail.from.name} &lt;{selectedEmail.from.email}&gt;</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(selectedEmail.type)}`}>
                    {getTypeLabel(selectedEmail.type)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Subject:</span>{' '}
                  <span className="font-medium">{selectedEmail.subject}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={selectedEmail.html}
                className="w-full h-full min-h-[400px] border border-gray-200 rounded"
                title="Email Preview"
              />
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              {selectedEmail.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      cancelEmail(selectedEmail.id)
                      setShowPreview(false)
                    }}
                    className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                  >
                    Cancel Email
                  </button>
                  <button
                    onClick={async () => {
                      await sendEmail(selectedEmail.id)
                      setShowPreview(false)
                    }}
                    disabled={sending === selectedEmail.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {sending === selectedEmail.id ? 'Sending...' : 'Send Now'}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
