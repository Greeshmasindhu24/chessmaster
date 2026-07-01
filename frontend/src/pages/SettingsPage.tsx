import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../store'
import { setPreferences, setTheme, ThemeMode } from '../store/settingsSlice'
import { logout, setUser } from '../store/authSlice'
import { authApi, billingApi, formatNetworkError, profileApi } from '../services/api'
import { BOARD_THEMES } from '../config/boardThemes'
import { ageFromDateOfBirth, countryLabel, genderLabel } from '../config/profileFields'

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme, boardTheme, soundEnabled, moveConfirmation } = useSelector(
    (s: RootState) => s.settings,
  )
  const user = useSelector((s: RootState) => s.auth.user)

  const [biography, setBiography] = useState(user?.profile?.biography ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatar_url ?? '')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [deleteErr, setDeleteErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (user?.profile) {
      setBiography(user.profile.biography ?? '')
      setAvatarUrl(user.profile.avatar_url ?? '')
    }
  }, [user?.profile])

  const { data: prefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => profileApi.getPreferences().then((r) => r.data),
  })

  const { data: subscriptionPlan } = useQuery({
    queryKey: ['subscription-plan'],
    queryFn: () => billingApi.subscriptionPlan().then((r) => r.data),
  })

  useEffect(() => {
    if (prefs) {
      dispatch(
        setPreferences({
          theme: prefs.theme as ThemeMode,
          board_theme: prefs.board_theme,
          sound_enabled: prefs.sound_enabled,
          move_confirmation: prefs.move_confirmation,
        }),
      )
    }
  }, [prefs, dispatch])

  const prefsMutation = useMutation({
    mutationFn: (data: {
      theme?: ThemeMode
      board_theme?: string
      sound_enabled?: boolean
      move_confirmation?: boolean
    }) => profileApi.updatePreferences(data),
    onSuccess: (res) => {
      dispatch(setPreferences(res.data))
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  const profileMutation = useMutation({
    mutationFn: () =>
      profileApi.updateProfile({
        biography: biography.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    onSuccess: async () => {
      setProfileMsg('Profile saved.')
      setProfileErr('')
      setEditingProfile(false)
      const { data } = await authApi.me()
      dispatch(setUser(data))
    },
    onError: (err) => setProfileErr(formatNetworkError(err, 'save profile')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      dispatch(logout())
      queryClient.clear()
      navigate('/')
    },
    onError: (err) => setDeleteErr(formatNetworkError(err, 'delete account')),
  })

  const handleThemeChange = (next: ThemeMode) => {
    dispatch(setTheme(next))
    prefsMutation.mutate({ theme: next })
  }

  const handleBoardThemeChange = (themeId: string) => {
    dispatch(setPreferences({ board_theme: themeId }))
    prefsMutation.mutate({ board_theme: themeId })
  }

  const handleProfileCancel = () => {
    setBiography(user?.profile?.biography ?? '')
    setAvatarUrl(user?.profile?.avatar_url ?? '')
    setProfileMsg('')
    setProfileErr('')
    setEditingProfile(false)
  }

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg('')
    profileMutation.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Appearance, profile, and account preferences
        </p>
      </motion.div>

      <SettingsSection title="Appearance">
        <div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Theme</p>
          <div className="flex gap-3">
            {(['dark', 'light'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleThemeChange(mode)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                  theme === mode
                    ? 'bg-emerald-600 text-white'
                    : 'border border-black/10 bg-black/5 text-gray-700 hover:bg-black/10 dark:border-white/20 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Board theme</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BOARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleBoardThemeChange(theme.id)}
                className={`rounded-xl border p-2 text-left transition ${
                  boardTheme === theme.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-black/10 hover:border-emerald-500/40 dark:border-white/15'
                }`}
              >
                <div className="mb-2 grid h-10 grid-cols-4 overflow-hidden rounded-md">
                  {[theme.light, theme.dark, theme.dark, theme.light].map((color, i) => (
                    <div key={i} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-xs font-medium">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                dispatch(setPreferences({ sound_enabled: e.target.checked }))
                prefsMutation.mutate({ sound_enabled: e.target.checked })
              }}
              className="h-4 w-4 rounded border-gray-400"
            />
            Sound effects
          </label>
          <p className="mt-1 pl-7 text-xs text-gray-500 dark:text-gray-400">
            Move, capture, check, and game-end sounds
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={moveConfirmation}
            onChange={(e) => prefsMutation.mutate({ move_confirmation: e.target.checked })}
            className="h-4 w-4 rounded border-gray-400"
          />
          Confirm moves before playing
        </label>
      </SettingsSection>

      <SettingsSection title="Profile">
        <div className="mb-4 grid gap-2 rounded-lg bg-black/5 p-4 text-sm dark:bg-white/5">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Username</span>
            <span>{user?.username ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="truncate pl-4 text-right">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Date of birth</span>
            <span>{user?.profile?.date_of_birth ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Age</span>
            <span>
              {user?.profile?.date_of_birth
                ? (ageFromDateOfBirth(user.profile.date_of_birth) ?? '—')
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Gender</span>
            <span>{genderLabel(user?.profile?.gender)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Country</span>
            <span>{countryLabel(user?.profile?.country)}</span>
          </div>
          {!editingProfile && (
            <>
              {user?.profile?.avatar_url && (
                <div className="flex justify-between gap-4 pt-1">
                  <span className="shrink-0 text-gray-500 dark:text-gray-400">Avatar</span>
                  <img
                    src={user.profile.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-gray-500 dark:text-gray-400">Bio</span>
                <span className="text-right">{user?.profile?.biography?.trim() || '—'}</span>
              </div>
            </>
          )}
          <p className="pt-1 text-xs text-gray-500">
            Demographics are set at registration and cannot be changed here.
          </p>
        </div>

        {profileMsg && !editingProfile && (
          <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
            {profileMsg}
          </div>
        )}

        {!editingProfile ? (
          <button
            type="button"
            onClick={() => {
              setProfileMsg('')
              setProfileErr('')
              setEditingProfile(true)
            }}
            className="btn-secondary text-sm"
          >
            Edit profile
          </button>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileErr && (
              <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{profileErr}</div>
            )}
            {profileMsg && (
              <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                {profileMsg}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Avatar URL</label>
              <input
                className="input-field"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Bio</label>
              <textarea
                className="input-field min-h-[80px]"
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
                {profileMutation.isPending ? 'Saving...' : 'Save profile'}
              </button>
              <button
                type="button"
                onClick={handleProfileCancel}
                disabled={profileMutation.isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SettingsSection>

      <SettingsSection title="Monthly subscription">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {subscriptionPlan?.label ?? 'Monthly subscription'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subscriptionPlan?.description ??
                  'Unlock premium features with a simple monthly plan.'}
              </p>
              <p className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {subscriptionPlan?.price_display ?? '$9.99/mo'}
              </p>
            </div>
            {subscriptionPlan?.available ? (
              <button type="button" className="btn-primary shrink-0 text-sm" disabled>
                Subscribe
              </button>
            ) : (
              <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Coming soon
              </span>
            )}
          </div>
          {!subscriptionPlan?.stripe_configured && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Secure payments are being set up. You&apos;ll be able to subscribe here once billing
              is live.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Stay in the loop for online play — friend requests, match invites, draw offers, and other
          game updates are delivered promptly so you never miss a move or a challenge.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use the bell icon in the header to view recent notifications. Mark them read when
          you&apos;re caught up.
        </p>
      </SettingsSection>

      <SettingsSection title="Legal">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your profile is in safe hands — we respect your privacy. Review how we handle your data
          and the rules for using ChessMaster Pro.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Terms of Service
          </Link>
        </div>
      </SettingsSection>

      <SettingsSection title="Account">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Gender</span>
            <span>{genderLabel(user?.profile?.gender)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Age</span>
            <span>
              {user?.profile?.date_of_birth
                ? (ageFromDateOfBirth(user.profile.date_of_birth) ?? '—')
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Country</span>
            <span>{countryLabel(user?.profile?.country)}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          <Link to="/forgot-password" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Forgot password
          </Link>
        </p>

        <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Permanently remove your account, profile, and preferences. This cannot be undone.
          </p>
          {deleteErr && (
            <div className="mt-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{deleteErr}</div>
          )}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-3 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
            >
              Delete my account
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete permanently'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false)
                  setDeleteErr('')
                }}
                disabled={deleteMutation.isPending}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
