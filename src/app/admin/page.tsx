'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { recordClientAudit } from '@/lib/audit-logger'
import {
  Users,
  CheckCircle2,
  Clock,
  Activity,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileCode,
  Eye,
  Check,
  UserX
} from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  is_superuser: boolean
  is_approved: boolean
  created_at: string
}

interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

type MainTab = 'users' | 'audit'
type UserStatusFilter = 'all' | 'approved' | 'pending'
type AuditCategoryFilter = 'all' | 'logins' | 'submissions' | 'resources' | 'moodle' | 'admin'

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s ago`
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return dateString
  }
}

function getActionBadgeProps(action: string) {
  if (action.startsWith('assignment.')) {
    return {
      bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      label: action,
    }
  }
  if (action.startsWith('moodle.')) {
    return {
      bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      label: action,
    }
  }
  if (action.startsWith('resource.')) {
    return {
      bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
      label: action,
    }
  }
  if (action.startsWith('admin.')) {
    return {
      bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      label: action,
    }
  }
  return {
    bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    label: action,
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isSuperuser, setIsSuperuser] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [totalAuditCount, setTotalAuditCount] = useState(0)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<MainTab>('users')

  // User Management filters
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all')

  // Audit Logs filters
  const [auditSearch, setAuditSearch] = useState('')
  const [auditCategory, setAuditCategory] = useState<AuditCategoryFilter>('all')

  // Detail modal state
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null)

  // Listen for Escape key to close the Audit Details modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAuditLog) {
        setSelectedAuditLog(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAuditLog])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  const checkAccessAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (router) router.push('/login')
        else window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superuser')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.is_superuser) {
        if (router) router.push('/dashboard')
        else window.location.href = '/dashboard'
        return
      }

      setIsSuperuser(true)
      await Promise.all([fetchProfiles(), fetchAuditLogs()])
    } catch (err) {
      console.error('Error loading admin page:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles(data || [])
  }

  const fetchAuditLogs = async (categoryFilter = auditCategory, searchQuery = auditSearch) => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      params.set('offset', '0')

      if (categoryFilter !== 'all') {
        if (categoryFilter === 'logins') params.set('action', 'auth.login')
        else if (categoryFilter === 'submissions') params.set('action', 'assignment')
        else if (categoryFilter === 'resources') params.set('action', 'resource')
        else if (categoryFilter === 'moodle') params.set('action', 'moodle')
        else if (categoryFilter === 'admin') params.set('action', 'admin')
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.auditLogs || [])
        setTotalAuditCount(data.totalCount || 0)
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    }
  }

  // Refetch audit logs whenever audit filter/search changes
  useEffect(() => {
    if (isSuperuser) {
      const timeout = setTimeout(() => {
        fetchAuditLogs(auditCategory, auditSearch)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [auditCategory, auditSearch, isSuperuser])

  const toggleApproval = async (targetUser: Profile) => {
    const newStatus = !targetUser.is_approved
    setUpdatingUserId(targetUser.id)

    // Optimistic update
    setProfiles(prev =>
      prev.map(p => (p.id === targetUser.id ? { ...p, is_approved: newStatus } : p))
    )

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: newStatus })
        .eq('id', targetUser.id)

      if (error) {
        // Rollback on error
        setProfiles(prev =>
          prev.map(p => (p.id === targetUser.id ? { ...p, is_approved: targetUser.is_approved } : p))
        )
      } else {
        // Record audit event
        recordClientAudit({
          action: 'admin.user_approval',
          entityType: 'user_profile',
          entityId: targetUser.id,
          details: {
            userEmail: targetUser.email,
            previousStatus: targetUser.is_approved,
            newStatus,
          },
        })
      }
    } catch {
      // Rollback
      setProfiles(prev =>
        prev.map(p => (p.id === targetUser.id ? { ...p, is_approved: targetUser.is_approved } : p))
      )
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Derived metrics
  const totalUsersCount = profiles.length
  const approvedUsersCount = useMemo(() => profiles.filter(p => p.is_approved).length, [profiles])
  const pendingUsersCount = useMemo(() => profiles.filter(p => !p.is_approved).length, [profiles])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return profiles.filter(user => {
      // Status filter
      if (userStatusFilter === 'approved' && !user.is_approved) return false
      if (userStatusFilter === 'pending' && user.is_approved) return false

      // Search filter
      if (userSearch.trim()) {
        const query = userSearch.toLowerCase().trim()
        const nameMatch = user.full_name?.toLowerCase().includes(query)
        const emailMatch = user.email?.toLowerCase().includes(query)
        if (!nameMatch && !emailMatch) return false
      }

      return true
    })
  }, [profiles, userStatusFilter, userSearch])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
        <span className="text-xs font-mono uppercase tracking-widest text-secondary">
          Loading Admin Console...
        </span>
      </div>
    )
  }

  if (!isSuperuser) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="clash-title text-3xl uppercase tracking-wider mb-2">Unauthorized</h1>
        <p className="text-secondary font-medium text-sm max-w-sm">
          You do not have superuser privileges to access the administrative console.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-background text-foreground py-10 px-4 md:px-12 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        
        {/* Hero Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-secondary mb-2">
            <span>Administration</span>
            <span className="text-tertiary">/</span>
            <span className="text-foreground font-semibold">Console</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <h1 className="clash-title text-4xl md:text-5xl uppercase tracking-tight text-foreground">
              Admin Console
            </h1>
            <span className="text-xs font-mono text-secondary uppercase tracking-widest">
              Live Auditing & Access Control
            </span>
          </div>
          <p className="text-secondary font-medium text-sm mt-1">
            Manage user authorization credentials, monitor activity telemetry, and review live audit records.
          </p>
          <div className="hairline-divider w-full h-px mt-6 bg-border/20" />
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Total Users</span>
              <Users className="h-4 w-4 text-tertiary" />
            </div>
            <div className="text-3xl font-semibold clash-title tracking-tight text-foreground">
              {totalUsersCount}
            </div>
            <div className="text-[11px] text-tertiary font-mono mt-1">Registered accounts</div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Approved</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-semibold clash-title tracking-tight text-emerald-600 dark:text-emerald-400">
              {approvedUsersCount}
            </div>
            <div className="text-[11px] text-tertiary font-mono mt-1">Full portal access</div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Pending</span>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-3xl font-semibold clash-title tracking-tight text-amber-600 dark:text-amber-400">
              {pendingUsersCount}
            </div>
            <div className="text-[11px] text-tertiary font-mono mt-1">Awaiting approval</div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Total Events</span>
              <Activity className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-3xl font-semibold clash-title tracking-tight text-foreground">
              {totalAuditCount}
            </div>
            <div className="text-[11px] text-tertiary font-mono mt-1">Telemetry log entries</div>
          </div>
        </div>

        {/* Segmented Main Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/40 pb-px">
          <div className="flex items-center gap-3" role="tablist" aria-label="Admin Navigation Tabs">
            <button
              role="tab"
              aria-selected={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-secondary hover:text-foreground'
              }`}
            >
              <span>User Management</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeTab === 'users'
                    ? 'bg-foreground text-background font-bold'
                    : 'bg-muted text-secondary'
                }`}
              >
                {profiles.length}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'audit'}
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-secondary hover:text-foreground'
              }`}
            >
              <span>Audit Logs</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeTab === 'audit'
                    ? 'bg-foreground text-background font-bold'
                    : 'bg-muted text-secondary'
                }`}
              >
                {totalAuditCount}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: User Management */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            
            {/* Controls Bar: Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  aria-label="Search users"
                  className="w-full bg-card border border-border/40 pl-10 pr-10 py-2.5 rounded-xl text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-foreground/30 transition-all shadow-xs"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    aria-label="Clear user search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/20 self-start sm:self-auto">
                {(['all', 'approved', 'pending'] as UserStatusFilter[]).map(status => {
                  const isActive = userStatusFilter === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setUserStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize tracking-wide transition-all cursor-pointer ${
                        isActive
                          ? 'bg-card text-foreground font-semibold shadow-xs border border-border/30'
                          : 'text-secondary hover:text-foreground'
                      }`}
                    >
                      {status}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredUsers.map(user => {
                  const isUpdating = updatingUserId === user.id
                  return (
                    <div
                      key={user.id}
                      data-testid={`user-card-${user.id}`}
                      className="rounded-2xl border border-border/40 bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar initials */}
                        <div className="h-11 w-11 rounded-xl bg-muted/80 border border-border/30 flex items-center justify-center font-semibold clash-title text-sm text-foreground shrink-0">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base text-foreground truncate">
                              {user.full_name || 'No Name Provided'}
                            </span>
                            {user.is_superuser && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold bg-foreground text-background">
                                <ShieldCheck className="h-3 w-3" />
                                Superuser
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                                user.is_approved
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              }`}
                            >
                              {user.is_approved ? 'Approved' : 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-secondary mt-1 flex-wrap">
                            <span className="font-mono text-tertiary">{user.email}</span>
                            <span>•</span>
                            <span className="font-mono text-tertiary">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Approval Toggle */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => toggleApproval(user)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                            user.is_approved
                              ? 'bg-card text-secondary border-border/40 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30'
                              : 'bg-foreground text-background border-foreground hover:opacity-90 shadow-xs'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : user.is_approved ? (
                            <UserX className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>{user.is_approved ? 'Revoke Access' : 'Approve Access'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-secondary">
                  <Search className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-base text-foreground clash-title">No users found</h3>
                <p className="text-xs text-secondary max-w-sm">
                  {userSearch
                    ? `No registered accounts match “${userSearch}”.`
                    : 'There are no users in this status category.'}
                </p>
                {(userSearch || userStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setUserSearch('')
                      setUserStatusFilter('all')
                    }}
                    className="mt-2 text-xs font-semibold text-foreground underline underline-offset-4 cursor-pointer"
                  >
                    Clear search and filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Audit Logs Stream */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-6">
            
            {/* Controls Bar: Search & Action Category Filter Pills */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by user email or entity ID..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  aria-label="Search audit logs"
                  className="w-full bg-card border border-border/40 pl-10 pr-10 py-2.5 rounded-xl text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-foreground/30 transition-all shadow-xs"
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    aria-label="Clear audit search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Action Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Audit category filters">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'logins', label: 'Logins' },
                    { id: 'submissions', label: 'Submissions' },
                    { id: 'resources', label: 'Resources' },
                    { id: 'moodle', label: 'Moodle' },
                    { id: 'admin', label: 'Admin' },
                  ] as const
                ).map(({ id, label }) => {
                  const isActive = auditCategory === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setAuditCategory(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                          : 'bg-card text-secondary border-border/40 hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Audit Log Rows */}
            {auditLogs.length > 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-xs divide-y divide-border/30">
                {auditLogs.map(log => {
                  const badgeProps = getActionBadgeProps(log.action)
                  return (
                    <div
                      key={log.id}
                      data-testid={`audit-log-row-${log.id}`}
                      className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors group"
                    >
                      {/* User Avatar + Action info */}
                      <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-muted/80 border border-border/30 flex items-center justify-center font-semibold clash-title text-xs text-foreground shrink-0 mt-0.5 md:mt-0">
                          {(log.user_email || '?').charAt(0).toUpperCase()}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-foreground truncate">
                              {log.user_email || 'anonymous'}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${badgeProps.bg}`}
                            >
                              {badgeProps.label}
                            </span>
                            {log.entity_id && (
                              <span className="text-[10px] font-mono text-tertiary bg-muted/50 border border-border/30 px-1.5 py-0.2 rounded truncate max-w-[140px]">
                                {log.entity_id}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-secondary font-mono mt-1 flex-wrap">
                            <span>{formatRelativeTime(log.created_at)}</span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <span className="text-tertiary">IP: {log.ip_address}</span>
                              </>
                            )}
                            {log.user_agent && (
                              <>
                                <span>•</span>
                                <span className="text-tertiary truncate max-w-[200px]" title={log.user_agent}>
                                  {log.user_agent}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detail Inspect Action */}
                      <div className="shrink-0 flex items-center self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => setSelectedAuditLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs font-medium text-secondary hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-secondary">
                  <FileCode className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-base text-foreground clash-title">No audit records found</h3>
                <p className="text-xs text-secondary max-w-sm">
                  {auditSearch
                    ? `No telemetry logs match “${auditSearch}”.`
                    : 'No telemetry logs recorded in this category.'}
                </p>
                {(auditSearch || auditCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setAuditSearch('')
                      setAuditCategory('all')
                    }}
                    className="mt-2 text-xs font-semibold text-foreground underline underline-offset-4 cursor-pointer"
                  >
                    Clear search and filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audit Details Modal Dialog */}
        {selectedAuditLog && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedAuditLog(null)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-xl rounded-2xl border border-border/40 bg-card p-6 shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-border/20 pb-4">
                <div>
                  <h3 id="audit-detail-modal-title" className="clash-title text-xl font-semibold text-foreground">
                    Audit Event Details
                  </h3>
                  <p className="text-xs font-mono text-tertiary mt-0.5">
                    ID: {selectedAuditLog.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  aria-label="Close dialog"
                  className="p-1.5 rounded-lg text-secondary hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Event Metadata Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-muted/30 p-3.5 rounded-xl border border-border/20">
                <div>
                  <span className="text-tertiary block">Action:</span>
                  <span className="text-foreground font-semibold">{selectedAuditLog.action}</span>
                </div>
                <div>
                  <span className="text-tertiary block">Entity Type:</span>
                  <span className="text-foreground font-semibold">{selectedAuditLog.entity_type}</span>
                </div>
                <div>
                  <span className="text-tertiary block">User:</span>
                  <span className="text-foreground font-semibold truncate block">
                    {selectedAuditLog.user_email || 'anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-tertiary block">Timestamp:</span>
                  <span className="text-foreground font-semibold">
                    {new Date(selectedAuditLog.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Formatted JSON Details */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-secondary">
                  Payload Details
                </span>
                <pre
                  data-testid="audit-modal-details-json"
                  className="p-4 rounded-xl bg-muted/60 border border-border/30 text-xs font-mono text-foreground overflow-x-auto max-h-60 scrollbar-none"
                >
                  {JSON.stringify(selectedAuditLog.details || {}, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

