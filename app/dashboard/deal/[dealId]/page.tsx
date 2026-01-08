import { notFound } from 'next/navigation';
import { getDealMemo } from '@/lib/actions/deals';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoutForm } from '@/components/dashboard/scout-form';
import { ReportViewer } from '@/components/dashboard/report-viewer';
import { CouncilSplitView } from '@/components/dashboard/council-split-view';
import { InterrogationChat } from '@/components/dashboard/interrogation-chat';
import { Badge } from '@/components/ui/badge';

interface DealPageProps {
  params: Promise<{ dealId: string }>;
}

export default async function DealPage({ params }: DealPageProps) {
  const { dealId } = await params;
  
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Handle new deal creation
  if (dealId === 'new') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border/40 px-6 py-4">
          <h1 className="text-xl font-semibold">New Deal Memo</h1>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-6">
            <ScoutForm dealId={null} />
          </div>
        </div>
      </div>
    );
  }
  
  // Load existing deal
  const deal = await getDealMemo(dealId);
  
  if (!deal) {
    notFound();
  }
  
  // Determine default tab based on status
  const defaultTab = 
    deal.status === 'scouting' ? 'scout' :
    deal.status === 'researching' || deal.status === 'council_review' ? 'report' :
    deal.status === 'interrogation' ? 'interrogation' :
    'report';
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{deal.company_name}</h1>
            {deal.ticker && (
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{deal.ticker}</p>
            )}
          </div>
          <Badge variant={
            deal.status === 'finalized' ? 'outline' : 
            deal.status === 'scouting' ? 'secondary' : 
            'default'
          }>
            {deal.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
        <div className="border-b border-border/40 px-6">
          <TabsList className="h-12 bg-transparent border-0 p-0 gap-6">
            <TabsTrigger 
              value="scout" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
            >
              Scout
            </TabsTrigger>
            <TabsTrigger 
              value="report"
              disabled={!deal.research_report}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
            >
              The Report
            </TabsTrigger>
            <TabsTrigger 
              value="council"
              disabled={!deal.council_enabled || !deal.critiques}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
            >
              The Council
            </TabsTrigger>
            <TabsTrigger 
              value="interrogation"
              disabled={deal.status !== 'interrogation' && deal.status !== 'finalized'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
            >
              Interrogation
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="scout" className="h-full m-0">
            <ScoutForm dealId={dealId} initialData={deal} />
          </TabsContent>
          
          <TabsContent value="report" className="h-full m-0">
            <ReportViewer deal={deal} />
          </TabsContent>
          
          <TabsContent value="council" className="h-full m-0">
            <CouncilSplitView deal={deal} />
          </TabsContent>
          
          <TabsContent value="interrogation" className="h-full m-0">
            <InterrogationChat deal={deal} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
