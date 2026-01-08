'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { getUserSessions, deleteSession } from '@/lib/actions/sessions'
import type { ChatSession } from '@/types/database'
import { Plus, LogOut, Trash2 } from 'lucide-react'
import { useAgent } from './agent-provider'

export function Sidebar() {
  const router = useRouter()
  const supabase = createClient()
  const { selectedAgent } = useAgent()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Load user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Load sessions
    loadSessions()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await getUserSessions()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const handleNewChat = async () => {
    router.push(`/dashboard?agent=${selectedAgent}`)
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await deleteSession(sessionId)
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
    <div className="w-56 border-r border-border/50 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4">
        <Button
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start h-9"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          New analysis
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {sessions.map((session) => (
            <div key={session.id} className="group relative flex items-center gap-1">
              <Link
                href={`/dashboard/chat/${session.id}`}
                className="flex-1 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {session.title}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={(e) => handleDeleteSession(session.id, e)}
              >
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-border/50" />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 h-9"
            >
              <Avatar className="w-5 h-5">
                <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground truncate">
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
