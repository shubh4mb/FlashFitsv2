import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export type Gender = 'Men' | 'Women' | 'Kids';

interface GenderContextType {
  selectedGender: Gender;
  setSelectedGender: (gender: Gender) => void;
  isInitializing: boolean;
}

const GenderContext = createContext<GenderContextType | undefined>(undefined);

export const GenderProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGender, setSelectedGender] = useState<Gender>('Men');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadGender = async () => {
      try {
        const saved = await SecureStore.getItemAsync('user_gender');
        if (saved && ['Men', 'Women', 'Kids'].includes(saved)) {
          setSelectedGender(saved as Gender);
        } else {
          // Reset to default if invalid or legacy value exists
          setSelectedGender('Men');
        }
      } catch (error) {
        console.error('Failed to load gender:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    loadGender();
  }, []);

  const handleSetGender = async (gender: Gender) => {
    setSelectedGender(gender);
    try {
      await SecureStore.setItemAsync('user_gender', gender);
    } catch (error) {
      console.error('Failed to save gender:', error);
    }
  };

  return (
    <GenderContext.Provider value={{ selectedGender, setSelectedGender: handleSetGender, isInitializing }}>
      {children}
    </GenderContext.Provider>
  );
};

export const useGender = () => {
  const context = useContext(GenderContext);
  if (!context) {
    throw new Error('useGender must be used within a GenderProvider');
  }
  return context;
};
