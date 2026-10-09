import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

function read<T>(key: string): T | undefined {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

/** useState that survives route changes and reloads within the tab. `init` receives the stored value, if any. */
export function useSessionState<T>(key: string, init: (stored: T | undefined) => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => init(read<T>(key)))
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or unavailable: state simply won't persist
    }
  }, [key, value])
  return [value, setValue]
}
