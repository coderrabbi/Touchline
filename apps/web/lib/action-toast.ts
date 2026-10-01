import toast from 'react-hot-toast';

export function actionMessage(path: string, method: string, result: unknown): string {
  const data = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  if (path === '/auth/register') return data.emailDelivery === 'retry_required'
    ? 'Account created. Verification email needs to be resent.' : 'Account created. Check your inbox and spam folder for verification.';
  if (/\/auth\/(resend-verification|forgot-password)$/.test(path)) return data.deliveryMode === 'development'
    ? 'Email saved in local preview. No inbox email was sent.' : 'Email requested. Check your inbox and spam folder.';
  if (path === '/auth/verify-email') return 'Email verified.';
  if (path === '/auth/reset-password') return 'Password changed. Log in with your new password.';
  if (path === '/auth/login') return 'Logged in successfully.';
  if (path === '/auth/logout') return 'Logged out.';
  if (path === '/uploads') return 'Image uploaded.';
  if (path.endsWith('/join')) return 'Tournament registration submitted.';
  if (path.endsWith('/withdraw')) return 'Registration withdrawn.';
  if (path.endsWith('/kickoff')) return 'Tournament is now live.';
  if (path.endsWith('/seeding')) return 'Seeding updated.';
  if (path.endsWith('/schedule')) return 'Match schedule updated.';
  if (path.endsWith('/status')) return 'Tournament status updated.';
  if (path.includes('/notifications')) return 'Notifications updated.';
  if (path.includes('/notification-preferences')) return 'Notification preferences saved.';
  if (path.includes('/users/me')) return 'Profile updated.';
  if (method === 'DELETE') return path.includes('/participants/') ? 'Participant removed.' : path.includes('/tournaments/') ? 'Tournament deleted.' : path.includes('/users/') ? 'Account deleted.' : 'Deleted successfully.';
  if (path === '/tournaments' && method === 'POST') return 'Tournament draft created.';
  if (path.includes('/tournaments/')) return 'Tournament changes saved.';
  if (path.includes('/matches/')) return 'Match updated.';
  if (path.includes('/admin/users/')) return 'Account updated.';
  return 'Changes saved.';
}

/** One toast per user request, outside the session-retry layer. Reads stay silent. */
export async function actionToast<T>(operation: () => Promise<T>, path: string, method: string): Promise<T> {
  if (typeof window === 'undefined') return operation();
  // A sent chat message already appears in the conversation; only failures need a toast.
  const quiet = /\/(messages|read|read-all)$/.test(path);
  const id = quiet ? undefined : toast.loading(path === '/uploads' ? 'Uploading image...' : 'Saving...');
  try {
    const result = await operation();
    if (id) toast.success(actionMessage(path, method, result), { id });
    return result;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Action failed. Please try again.', { id });
    throw error;
  }
}
