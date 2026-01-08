'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { getUserResearchSessions, deleteResearchSession } from '@/lib/actions/research'
import type { ResearchSession } from '@/lib/actions/research'
import { Plus, LogOut, Trash2, FileText, ChevronRight, Sparkles, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-zinc-400',
  researching: 'bg-blue-500',
  council_gather: 'bg-amber-500',
  council_debate: 'bg-amber-500',
  deliberation: 'bg-purple-500',
  finalized: 'bg-emerald-500',
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sessions, setSessions] = useState<ResearchSession[]>([])
  const [user, setUser] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    loadSessions()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
      })
      loadSessions()
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await getUserResearchSessions()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load research sessions:', error)
    }
  }

  const handleNewResearch = async () => {
    router.push('/dashboard/research/new')
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await deleteResearchSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getUserInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  const isActiveSession = (sessionId: string) => {
    return pathname === `/dashboard/research/${sessionId}`
  }

  return (
    <div className="w-64 h-screen flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
      {/* Logo & Brand */}
      <div className="h-14 px-4 flex items-center border-b border-[hsl(var(--sidebar-border))]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Investment Council</span>
        </Link>
      </div>

      {/* New Research Button */}
      <div className="p-3">
        <Button
          onClick={handleNewResearch}
          className="w-full h-9 justify-start gap-2.5 text-[13px] font-medium shadow-sm"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          New Research
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2">
          <span className="text-[11px] font-medium text-[hsl(var(--sidebar-muted))] uppercase tracking-wider">
            Research Sessions
          </span>
        </div>
        
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/research/${session.id}`}
                className={cn(
                  "group flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150",
                  "hover:bg-[hsl(var(--sidebar-accent))]",
                  isActiveSession(session.id) && "bg-[hsl(var(--sidebar-accent))]"
                )}
              >
                <div className="relative flex-shrink-0">
                  <FileText className="w-4 h-4 text-[hsl(var(--sidebar-muted))]" />
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[hsl(var(--sidebar-background))]",
                    STATUS_COLORS[session.status] || 'bg-zinc-400'
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[hsl(var(--sidebar-foreground))] truncate leading-tight">
                    {session.title}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate mt-0.5">
                    {session.thesis.substring(0, 40)}...
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-destructive/10 hover:text-destructive"
                  )}
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ))}
            
            {sessions.length === 0 && (
              <div className="px-2.5 py-8 text-center">
                <FileText className="w-8 h-8 mx-auto text-[hsl(var(--sidebar-muted))] opacity-50 mb-2" />
                <p className="text-[13px] text-[hsl(var(--sidebar-muted))]">No research yet</p>
                <p className="text-[11px] text-[hsl(var(--sidebar-muted))] opacity-70 mt-0.5">
                  Create your first session
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* User Menu */}
      <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-foreground/10 text-[11px] font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium text-[hsl(var(--sidebar-foreground))] truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[hsl(var(--sidebar-muted))]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <DropdownMenuItem disabled className="text-[13px]">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-[13px] text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
