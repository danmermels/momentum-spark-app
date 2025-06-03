
"use client";

import { useState, useEffect, useCallback } from 'react';

function getValueFromClientStorage<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    // This effect runs once on mount to sync with localStorage
    // It ensures that the state is initialized with the value from localStorage if available.
    const valueFromStorage = getValueFromClientStorage(key, initialValue);
     // Only update if the value from storage is actually different from the initial state
     // This prevents unnecessary re-renders if initialValue and storage value are the same
    if (JSON.stringify(valueFromStorage) !== JSON.stringify(initialValue)) {
        setStoredValue(valueFromStorage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // initialValue is intentionally omitted from deps to only run on key change or mount.

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

