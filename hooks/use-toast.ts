"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

let toastCount = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(props: Omit<Toast, "id">) {
  const id = String(++toastCount);
  const duration = props.duration ?? 4000;
  toasts = [...toasts, { ...props, id }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, duration);
  return id;
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(toasts);

  // Subscribe on mount
  if (!listeners.includes(setState as (t: Toast[]) => void)) {
    listeners.push(setState as (t: Toast[]) => void);
  }

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts: state, toast, dismiss };
}
