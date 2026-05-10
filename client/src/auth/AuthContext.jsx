import { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { setAuthToken } from "../api/http";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest
} from "../api/posApi";

const AUTH_STORAGE_KEY = "cloth_pos_auth_session";

const AuthContext = createContext(null);

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.token !== "string" || !parsed.token) {
      return null;
    }

    return {
      token: parsed.token,
      user: parsed.user || null
    };
  } catch (_error) {
    return null;
  }
}

function persistSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  function clearSession() {
    setAuthToken("");
    setToken("");
    setUser(null);
    clearStoredSession();
  }

  useEffect(() => {
    const storedSession = readStoredSession();

    if (!storedSession?.token) {
      setIsInitializing(false);
      return;
    }

    setAuthToken(storedSession.token);
    setToken(storedSession.token);
    setUser(storedSession.user || null);

    (async () => {
      try {
        const response = await getCurrentUser();
        setUser(response.user);
        persistSession({
          token: storedSession.token,
          user: response.user
        });
      } catch (_error) {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  async function login(credentials) {
    const response = await loginRequest(credentials);

    setAuthToken(response.token);
    setToken(response.token);
    setUser(response.user);
    persistSession({
      token: response.token,
      user: response.user
    });

    return response.user;
  }

  async function logout() {
    if (token) {
      try {
        await logoutRequest();
      } catch (_error) {
        // Session teardown should still complete on the client.
      }
    }

    clearSession();
  }

  const value = useMemo(
    () => ({
      user,
      token,
      role: user?.role || null,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout
    }),
    [isInitializing, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
