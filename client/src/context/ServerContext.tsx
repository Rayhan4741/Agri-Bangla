import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type PublicUser, type ServerConfig } from "@/lib/api";
import { applyContentBundle, currentContentFiles } from "@/lib/data";
import { applyGeoBundle } from "@/lib/geo";
import { resetSearchIndex } from "@/lib/search";
import { usePrefs, type Prefs } from "@/hooks/useStored";

type Status = "checking" | "online" | "offline";

interface ServerState {
  status: Status;
  config: ServerConfig | null;
  /** 'server' once live content from MongoDB has replaced the bundled copy. */
  contentSource: "bundled" | "server";
  contentVersion: string;
  user: PublicUser | null;
  authLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  reloadContent(): Promise<void>;
}

const Ctx = createContext<ServerState | null>(null);

export function useServer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useServer outside ServerProvider");
  return c;
}

/** Profile fields synced to the account (never secrets). */
function prefsToProfile(p: Prefs) {
  return {
    districtId: p.districtId || null,
    upazilaId: p.upazilaId || null,
    language: p.language,
  };
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [contentSource, setContentSource] = useState<"bundled" | "server">(
    "bundled",
  );
  const [contentVersion, setContentVersion] = useState("bundled");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [prefs, updatePrefs] = usePrefs();
  const lastSynced = useRef("");

  const reloadContent = useCallback(async () => {
    const b = await api<{ version: string; files: Record<string, unknown> }>(
      "/content/bundle",
      { timeoutMs: 15000 },
    );
    // skip the re-render when the server copy is identical to what is already loaded
    const same =
      JSON.stringify(currentContentFiles()) ===
      JSON.stringify(
        Object.fromEntries(
          Object.keys(currentContentFiles()).map((k) => [k, b.files[k]]),
        ),
      );
    applyContentBundle(b.files);
    applyGeoBundle(b.files);
    resetSearchIndex();
    setContentSource("server");
    if (!same) setContentVersion(b.version);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await api<{ user: PublicUser | null }>("/auth/me");
      setUser(r.user);
      if (r.user?.profile) {
        const p = r.user.profile as Partial<Prefs>;
        const patch: Partial<Prefs> = {};
        if (p.districtId) patch.districtId = p.districtId;
        if (p.upazilaId) patch.upazilaId = p.upazilaId;
        if (Object.keys(patch).length) updatePrefs(patch);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [updatePrefs]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await api<ServerConfig>("/config", { timeoutMs: 8000 });
        if (!alive) return;
        setConfig(cfg);
        setStatus("online");
        await Promise.allSettled([reloadContent(), refreshUser()]);
      } catch {
        if (alive) {
          setStatus("offline");
          setAuthLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadContent, refreshUser]);

  // keep the account profile in sync with local preferences (debounced)
  useEffect(() => {
    if (!user) return;
    const body = JSON.stringify(prefsToProfile(prefs));
    if (body === lastSynced.current) return;
    const t = setTimeout(() => {
      lastSynced.current = body;
      api("/auth/me/profile", {
        method: "PUT",
        json: { ...(user.profile ?? {}), ...prefsToProfile(prefs) },
      }).catch(() => {
        lastSynced.current = "";
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [prefs, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ user: PublicUser }>("/auth/login", {
        method: "POST",
        json: { email, password },
      });
      setUser(r.user);
      await refreshUser();
    },
    [refreshUser],
  );
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const r = await api<{ user: PublicUser }>("/auth/register", {
        method: "POST",
        json: { name, email, password },
      });
      setUser(r.user);
    },
    [],
  );
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo<ServerState>(
    () => ({
      status,
      config,
      contentSource,
      contentVersion,
      user,
      authLoading,
      login,
      register,
      logout,
      refreshUser,
      reloadContent,
    }),
    [
      status,
      config,
      contentSource,
      contentVersion,
      user,
      authLoading,
      login,
      register,
      logout,
      refreshUser,
      reloadContent,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
