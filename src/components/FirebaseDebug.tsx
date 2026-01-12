"use client";

import React, { useEffect, useState } from 'react';
import { useUser, useAuth } from '@/firebase';

export default function FirebaseDebug() {
  const { user, isUserLoading, userError } = useUser();
  const auth = useAuth();
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    console.group && console.group('FirebaseDebug');
    console.log('isUserLoading=', isUserLoading);
    console.log('userError=', userError);
    console.log('user=', user);
    console.groupEnd && console.groupEnd();

    let mounted = true;
    if (user && auth) {
      user.getIdToken(/* forceRefresh */ true).then(token => {
        if (mounted) {
          setIdToken(token);
          console.log('FirebaseDebug: ID token (first 64 chars)=', token?.slice(0, 64));
        }
      }).catch(err => {
        console.error('FirebaseDebug: failed to getIdToken', err);
      });
    }

    return () => { mounted = false; };
  }, [user, isUserLoading, userError, auth]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div style={{position: 'fixed', right: 8, bottom: 8, zIndex: 9999}}>
      <div className="rounded bg-white/90 p-2 text-xs text-black shadow">
        <div><strong>Firebase Debug</strong></div>
        <div>Loading: {String(isUserLoading)}</div>
        <div>User: {user ? (user.email || user.uid) : 'null'}</div>
        <div>ID Token: {idToken ? 'present' : 'none'}</div>
        <div style={{opacity: 0.7}}>(Check console for full details)</div>
      </div>
    </div>
  );
}
