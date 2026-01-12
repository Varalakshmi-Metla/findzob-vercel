'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

export interface UseCollectionOptions {
  skip?: boolean;
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options?: UseCollectionOptions,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const { skip } = options || {};
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery || skip) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const isProbablyCollectionRef = (obj: any) => {
      try {
        if (!obj) return false;
        if (typeof obj.path === 'string' && obj.path.trim().length > 0) return true;
        if (obj.type === 'collection') return true;
        return false;
      } catch (e) {
        return false;
      }
    };

    const isProbablyQuery = (obj: any) => {
      try {
        if (!obj) return false;
        return !!(obj._query && obj._query.path && typeof obj._query.path.canonicalString === 'function' && String(obj._query.path.canonicalString()).trim().length > 0);
      } catch (e) {
        return false;
      }
    };

    if (!(isProbablyCollectionRef(memoizedTargetRefOrQuery) || isProbablyQuery(memoizedTargetRefOrQuery))) {
      setError(new Error('Invalid Firestore collection or query passed to useCollection. Check the hook input (received invalid reference).'));
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        let path = 'unknown';
        try {
          if ((memoizedTargetRefOrQuery as any)?.type === 'collection') {
            path = (memoizedTargetRefOrQuery as CollectionReference).path || 'unknown';
          } else if ((memoizedTargetRefOrQuery as any)?._query?.path?.canonicalString) {
            path = (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();
          } else if (typeof memoizedTargetRefOrQuery === 'object' && memoizedTargetRefOrQuery !== null) {
            path = (memoizedTargetRefOrQuery as any).path || (memoizedTargetRefOrQuery as any).constructor?.name || JSON.stringify(Object.keys(memoizedTargetRefOrQuery).slice(0,5));
          }
        } catch (e) {
          path = 'unreadable-path';
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        } as any);
        (contextualError as any).meta = { debug: typeof memoizedTargetRefOrQuery === 'object' && memoizedTargetRefOrQuery !== null ? Object.keys(memoizedTargetRefOrQuery).slice(0,10) : typeof memoizedTargetRefOrQuery };

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, skip]);

  if(memoizedTargetRefOrQuery && !(memoizedTargetRefOrQuery as any).__memo) {
    console.warn('The query or reference passed to useCollection was not created with useMemoFirebase. This can lead to infinite loops and performance issues.', memoizedTargetRefOrQuery);
  }

  return { data, isLoading, error };
}
