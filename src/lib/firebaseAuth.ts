import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/tasks");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0; // epoch ms
// Google access tokens live ~60 minutes. The token is also persisted in
// sessionStorage: Firebase restores the signed-in user across reloads, and
// without persistence every reload looked like an auth failure and forced a
// fresh popup sign-in.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;
const TOKEN_STORAGE_KEY = "workspaceAccessToken";

function storeToken(token: string) {
  cachedAccessToken = token;
  cachedTokenExpiresAt = Date.now() + TOKEN_LIFETIME_MS;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt: cachedTokenExpiresAt }));
  } catch {
    // Storage unavailable (private mode etc.); the in-memory cache still works.
  }
}

function loadStoredToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (!token || !expiresAt || Date.now() >= expiresAt) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    cachedAccessToken = token;
    cachedTokenExpiresAt = expiresAt;
    return token;
  } catch {
    return null;
  }
}

function clearToken() {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

const tokenStillValid = () => cachedAccessToken !== null && Date.now() < cachedTokenExpiresAt;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (tokenStillValid() || loadStoredToken()) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken!);
      } else if (!isSigningIn) {
        clearToken();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    storeToken(credential.accessToken);
    return { user: result.user, accessToken: cachedAccessToken! };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!tokenStillValid() && !loadStoredToken()) {
    clearToken();
    return null;
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  clearToken();
};
