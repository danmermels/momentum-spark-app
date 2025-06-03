
"use client";

import { useLocalStorage } from './use-local-storage'; // Relative path

export interface AppSettings {
  userName: string;
  enableNotifications: boolean;
  enableBluetoothAudio: boolean;
  soundVolume: number; // 0-100
}

const defaultSettings: AppSettings = {
  userName: 'User',
  enableNotifications: true,
  enableBluetoothAudio: false,
  soundVolume: 75,
};

export function useSettings() {
  // For settings, we can assume they are always loaded from localStorage or defaults,
  // so no explicit loading state is needed here unlike tasks which might come from an API.
  const [settings, setSettings] = useLocalStorage<AppSettings>('momentumSparkSettings', defaultSettings);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prevSettings) => ({ ...prevSettings, ...newSettings }));
  };

  // A loading state for settings is generally not idiomatic if they are purely client-side localStorage.
  // The useLocalStorage hook initializes synchronously on the client after the first render if window is available.
  // So, we can consider settings "loaded" once the component mounts.
  // If settings were fetched from an API, a loading state would be appropriate.
  // For simplicity and alignment with typical localStorage patterns, we'll omit explicit loading/error states here.
  return { settings, updateSettings, loading: false, error: null };
}

