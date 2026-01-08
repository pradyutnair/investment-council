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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { getDealMemos, deleteDealMemo } from '@/lib/actions/deals'
import type { DealMemo } from '@/types/deals'
import { Plus, LogOut, Trash2 } from 'lucide-react'

const STATUS_LABELS = {
  scouting: 'Scout',
  researching: 'Research',
  council_review: 'Council',
  interrogation: 'Interrogate',
  finalized: 'Final',
}

const STATUS_VARIANTS = {
  scouting: 'secondary',
  researching: 'default',
  council_review: 'default',
  interrogation: 'default',
  finalized: 'outline',
} as const

export function Sidebar() {
  const router = useRouter()
  const supabase = createClient()
  const [deals, setDeals] = useState<DealMemo[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Load user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Load deals
    loadDeals()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadDeals = async () => {
    try {
      const data = await getDealMemos()
      setDeals(data)
    } catch (error) {
      console.error('Failed to load deal memos:', error)
    }
  }

  const handleNewDeal = async () => {
    router.push('/dashboard/deal/new')
  }

  const handleDeleteDeal = async (dealId: string, e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await deleteDealMemo(dealId)
      setDeals(deals.filter(d => d.id !== dealId))
    } catch (error) {
      console.error('Failed to delete deal memo:', error)
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
          onClick={handleNewDeal}
          variant="outline"
          className="w-full justify-start h-9 text-sm"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          New deal memo
        </Button>
      </div>

      <Separator className="bg-border/40" />

      {/* Deal Memos List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {deals.map((deal) => (
            <div key={deal.id} className="group relative">
              <Link
                href={`/dashboard/deal/${deal.id}`}
                className="flex flex-col gap-1 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate text-foreground">
                    {deal.company_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:text-destructive shrink-0"
                    onClick={(e) => handleDeleteDeal(deal.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {deal.ticker && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {deal.ticker}
                    </span>
                  )}
                  <Badge 
                    variant={STATUS_VARIANTS[deal.status]}
                    className="text-[10px] h-4 px-1.5"
                  >
                    {STATUS_LABELS[deal.status]}
                  </Badge>
                </div>
              </Link>
            </div>
          ))}
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
