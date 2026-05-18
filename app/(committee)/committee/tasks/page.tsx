import { redirect } from 'next/navigation';

/**
 * Legacy sidebar path — Action Queue lives at `/tasks` (`app/tasks/page.tsx`).
 */
export default function CommitteeTasksRedirectPage() {
  redirect('/tasks');
}
