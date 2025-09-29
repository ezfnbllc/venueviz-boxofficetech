'use client'
import { useRouter } from 'next/navigation'
import EventWizard from '@/components/admin/EventWizard'

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  
  const handleClose = () => {
    router.push('/admin/events')
  }
  
  return <EventWizard onClose={handleClose} eventId={params.id} />
}
