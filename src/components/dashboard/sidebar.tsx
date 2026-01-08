'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { getUserResearchSessions, deleteResearchSession } from '@/lib/actions/research'
import type { ResearchSession } from '@/lib/actions/research'
import { Plus, LogOut, Trash2 } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  researching: 'Research',
  council_gather: 'Council',
  council_debate: 'Debate',
  deliberation: 'Chat',
  finalized: 'Final',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  researching: 'default',
  council_gather: 'default',
  council_debate: 'default',
  deliberation: 'secondary',
  finalized: 'outline',
} as const

export function Sidebar() {
  const router = useRouter()
  const supabase = createClient()
  const [sessions, setSessions] = useState<ResearchSession[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Load user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Load research sessions
    loadSessions()

    // Subscribe to auth changes
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

  return (
    <div className="w-56 border-r border-border/40 flex flex-col bg-background">
      {/* Header */}
      <div className="p-3">
        <Button
          onClick={handleNewResearch}
          variant="outline"
          className="w-full justify-start h-9 text-sm"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          New research
        </Button>
      </div>

      <Separator className="bg-border/40" />

      {/* Research Sessions List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {sessions.map((session) => (
            <div key={session.id} className="group relative">
              <Link
                href={`/dashboard/research/${session.id}`}
                className="flex flex-col gap-1 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate text-foreground">
                    {session.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:text-destructive shrink-0"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {session.thesis.substring(0, 30)}...
                  </span>
                  <Badge
                    variant={STATUS_VARIANTS[session.status]}
                    className="text-[10px] h-4 px-1.5 shrink-0"
                  >
                    {STATUS_LABELS[session.status]}
                  </Badge>
                </div>
              </Link>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="px-2.5 py-4 text-center text-sm text-muted-foreground">
              <p>No research sessions yet.</p>
              <p className="text-xs mt-1">Create one to get started.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-border/40" />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2.5 h-9 text-sm"
            >
              <Avatar className="w-5 h-5">
                <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground truncate">
                {user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-muted-foreground"
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
