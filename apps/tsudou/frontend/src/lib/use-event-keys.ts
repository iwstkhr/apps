import { useEffect } from 'react';
import { setAnswerKey, setManageToken, useAnswerKey, useManageToken } from './keyring';
import { readAnswerKeyFromHash, readTokenFromHash, stripHash } from './urls';

/** Take the keys in the URL into memory only, and clear the fragment immediately. */
export function useAnswerKeyFromHash(eventId: string | undefined, hash: string) {
  const key = useAnswerKey(eventId);
  useEffect(() => {
    const incoming = readAnswerKeyFromHash(hash);
    if (!eventId || !incoming) return;
    setAnswerKey(eventId, incoming);
    stripHash();
  }, [eventId, hash]);
  return key;
}

export function useManageTokenFromHash(eventId: string | undefined, hash: string) {
  const token = useManageToken(eventId);
  useEffect(() => {
    const incoming = readTokenFromHash(hash);
    if (!eventId || !incoming) return;
    setManageToken(eventId, incoming);
    stripHash();
  }, [eventId, hash]);
  return token;
}
