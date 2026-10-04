import { colors } from '@lankashield/shared';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './services/firebase';

// Placeholder shell. Replaced by the router, providers and officer login in Phase 4.
function App() {
  // Temporary Phase 2 connection check — remove in Phase 4.
  const [connection, setConnection] = useState('Checking Firebase connection…');

  useEffect(() => {
    getDoc(doc(db, '_connectionTest', 'ping'))
      .then((snap) => setConnection(`Firebase: ${snap.data()?.message ?? 'test document missing'}`))
      .catch((err: Error) => setConnection(`Firebase error: ${err.message}`));
  }, []);

  return (
    <main className="placeholder">
      <h1 style={{ color: colors.primary }}>LankaShield</h1>
      <p>Officer dashboard — Duty Officers, District Officers and DMC Analysts</p>
      <p>{connection}</p>
    </main>
  );
}

export default App;
