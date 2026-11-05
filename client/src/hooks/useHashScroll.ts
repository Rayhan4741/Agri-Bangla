import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Returns the in-page anchor (after the route) and scrolls to it once rendered. */
export function useHashScroll(): string {
  const { hash } = useLocation();
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => clearTimeout(t);
  }, [id]);
  return id;
}
