import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { friendsApi, formatNetworkError } from '../services/api'

export default function FriendsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list().then((r) => r.data),
  })

  const { data: requests = [] } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => friendsApi.requests().then((r) => r.data),
  })

  const { data: searchResults = [], refetch: runSearch } = useQuery({
    queryKey: ['friend-search', search],
    queryFn: () => friendsApi.search(search).then((r) => r.data),
    enabled: false,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] })
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
  }

  const sendMutation = useMutation({
    mutationFn: (username: string) => friendsApi.sendRequest(username),
    onSuccess: () => {
      setStatus('Friend request sent')
      invalidate()
    },
    onError: (err) => setStatus(formatNetworkError(err, 'send request')),
  })

  const acceptMutation = useMutation({
    mutationFn: (id: string) => friendsApi.accept(id),
    onSuccess: () => {
      setStatus('Friend request accepted')
      invalidate()
    },
    onError: (err) => setStatus(formatNetworkError(err, 'accept request')),
  })

  const declineMutation = useMutation({
    mutationFn: (id: string) => friendsApi.decline(id),
    onSuccess: () => {
      setStatus('Request declined')
      invalidate()
    },
    onError: (err) => setStatus(formatNetworkError(err, 'decline request')),
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Friends</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Add players by username and manage requests.</p>
      </div>

      <div className="glass-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Add friend</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="input-field max-w-xs"
            placeholder="Search username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary py-2 text-sm"
            disabled={search.trim().length < 2}
            onClick={() => runSearch()}
          >
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul className="space-y-2">
            {searchResults.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
              >
                <div>
                  <span className="font-medium">{u.username}</span>
                  <span className="ml-2 text-sm text-gray-500">{u.rating_blitz} quick play</span>
                </div>
                {u.friendship_status === 'accepted' ? (
                  <span className="text-sm text-emerald-400">Friends</span>
                ) : u.friendship_status === 'pending_sent' ? (
                  <span className="text-sm text-gray-500">Pending</span>
                ) : u.friendship_status === 'pending_received' ? (
                  <span className="text-sm text-yellow-400">Respond in requests</span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary py-1.5 text-sm"
                    onClick={() => sendMutation.mutate(u.username)}
                    disabled={sendMutation.isPending}
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {requests.length > 0 && (
        <div className="glass-panel space-y-4 p-6">
          <h2 className="text-lg font-semibold">Incoming requests</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
              >
                <span className="font-medium">{r.friend?.username ?? 'Unknown'}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary py-1.5 text-sm"
                    onClick={() => acceptMutation.mutate(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-secondary py-1.5 text-sm"
                    onClick={() => declineMutation.mutate(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Your friends ({friends.length})</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-gray-500">No friends yet — search above to add someone.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
              >
                <span className="font-medium">{f.friend?.username}</span>
                <span className="text-sm text-gray-500">{f.friend?.rating_blitz} quick play</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status && <p className="text-sm text-gray-500">{status}</p>}
    </motion.div>
  )
}
