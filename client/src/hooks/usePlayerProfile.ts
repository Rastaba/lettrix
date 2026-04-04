import { useState, useCallback } from 'react';

export interface PlayerProfile {
  name: string;
  token: string;
}

function generateToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const name = localStorage.getItem('lettrix-player-name') || '';
    let token = localStorage.getItem('lettrix-token');
    if (!token) {
      token = generateToken();
      localStorage.setItem('lettrix-token', token);
    }
    return { name, token };
  });

  const setName = useCallback((name: string) => {
    localStorage.setItem('lettrix-player-name', name);
    setProfile((p) => ({ ...p, name }));
  }, []);

  return { profile, setName };
}
