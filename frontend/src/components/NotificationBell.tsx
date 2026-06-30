import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { friendsApi, notificationsApi } from '../services/api'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: unread = { count: 0 } } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: open,
  })

  const markReadMutation = useMutation({
    mutationFn: () => notificationsApi.markRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open && unread.count > 0) {
      markReadMutation.mutate()
    }
  }

  const handleFriendAction = async (friendshipId: string, accept: boolean) => {
    if (accept) await friendsApi.accept(friendshipId)
    else await friendsApi.decline(friendshipId)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['friends'] })
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread.count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {unread.count > 9 ? '9+' : unread.count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900">
          <div className="border-b border-black/10 px-4 py-3 dark:border-white/10">
            <p className="font-semibold">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-black/5 px-4 py-3 dark:border-white/5 ${!n.is_read ? 'bg-emerald-500/5' : ''}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.message}</p>
                  {n.type === 'friend_request' && n.data?.friendship_id && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="btn-primary py-1 text-xs"
                        onClick={() => handleFriendAction(n.data!.friendship_id!, true)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn-secondary py-1 text-xs"
                        onClick={() => handleFriendAction(n.data!.friendship_id!, false)}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-black/10 px-4 py-2 dark:border-white/10">
            <Link to="/friends" className="text-xs text-emerald-500 hover:underline" onClick={() => setOpen(false)}>
              Manage friends →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
