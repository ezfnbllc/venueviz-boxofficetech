// Update just the filter logic section in the events page
// Replace the statusFilter select and filter logic

// In the select dropdown:
<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none cursor-pointer"
>
  <option value="all">All Status</option>
  <option value="active">Active/Published</option>
  <option value="draft">Draft</option>
  <option value="inactive">Cancelled/Deleted</option>
</select>

// Update the filter logic:
const matchesStatus = statusFilter === 'all' || 
                     (statusFilter === 'active' && (event.status === 'active' || event.status === 'published')) ||
                     (statusFilter === 'draft' && event.status === 'draft') ||
                     (statusFilter === 'inactive' && (event.status === 'cancelled' || event.status === 'deleted'))
