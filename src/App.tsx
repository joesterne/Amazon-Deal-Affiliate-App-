/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { initAuth, googleSignIn, logout } from "./lib/firebaseAuth";
import { User } from "firebase/auth";
import Dashboard from "./components/Dashboard";
import { LogIn } from "lucide-react";

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setNeedsAuth(false);
        setIsInitializing(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setIsInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-8 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center font-bold text-slate-900 text-2xl">$</div>
            <span className="text-slate-900 font-bold text-2xl tracking-tight">AffiliateDrop</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Affiliate Price Drop Scanner</h1>
          <p className="text-muted-foreground text-slate-500">
            Scan Amazon for price drops, auto-generate affiliate links, and export them directly to Google Sheets. Manage your content schedule with Google Tasks.
          </p>
        </div>
        
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="gsi-material-button bg-white text-slate-700 shadow-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center px-4 py-2"
        >
           <div className="mr-3">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span className="font-medium">{isLoggingIn ? "Signing in..." : "Sign in with Google"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-slate-900 text-xl">$</div>
            <span className="text-white font-bold text-lg tracking-tight">AffiliateDrop</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Dashboard
          </div>
          <div className="text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            Price Scanners
          </div>
          <div className="text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Affiliate Manager
          </div>
          <div className="text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            Alert Settings
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          v2.4.1 Active Tracking Enabled
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-slate-800">Amazon Price Monitoring Console</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">{user?.displayName || user?.email}</span>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Sign out
            </button>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold border border-slate-300">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 space-y-6 overflow-y-auto">
          <Dashboard />
        </div>
      </main>
    </div>
  );
}

