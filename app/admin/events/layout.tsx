export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This ensures the parent admin layout is applied
  return <>{children}</>
}
