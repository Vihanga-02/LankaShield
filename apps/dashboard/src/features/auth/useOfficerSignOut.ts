import { useState } from 'react';
import { toErrorMessage } from '@lankashield/shared';
import { signOutOfficer } from './auth.service';

/** Both logout entry points share pending and failure handling. */
export function useOfficerSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signOut = async () => {
    setSigningOut(true); setError(null);
    try { await signOutOfficer(); }
    catch (cause) { setError(toErrorMessage(cause)); }
    finally { setSigningOut(false); }
  };
  return { signingOut, error, signOut };
}
