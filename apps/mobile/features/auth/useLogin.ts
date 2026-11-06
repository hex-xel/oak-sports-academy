import { useEffect, useRef, useState } from "react";
import type { LoginRequest } from "@oak/shared";
import { api, ApiClientError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { loginMessage, retryDeadline } from "./messages";

/** Submits one explicit login at a time; secure persistence precedes context navigation. Failures remain retryable. */
export function useLogin() {
  const { signIn } = useAuth();
  const busy = useRef(false);
  const mounted = useRef(true);
  const deadline = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
    }, 1000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  async function submit(credentials: LoginRequest): Promise<void> {
    if (busy.current || deadline.current > Date.now()) return;
    busy.current = true;
    setPending(true); setError("");
    try {
      const response = await api.login(credentials);
      if (mounted.current) await signIn(response);
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof ApiClientError && failure.code === "RATE_LIMITED") {
        deadline.current = retryDeadline(failure.retryAfter);
        setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      }
      setError(loginMessage(failure));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { submit, pending, error, remaining };
}
