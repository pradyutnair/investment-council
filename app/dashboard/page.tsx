import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to new research creation
  redirect('/dashboard/research/new');
}
