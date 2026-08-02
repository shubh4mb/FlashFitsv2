import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

export type Gender = 'Men' | 'Women' | 'Kids';
export type SubGender = 'All' | 'Boys' | 'Girls';

interface GenderContextType {
  selectedGender: Gender;
  setSelectedGender: (gender: Gender) => void;
  selectedSubGender: SubGender;
  setSelectedSubGender: (subGender: SubGender) => void;
  isInitializing: boolean;
}

const GenderContext = createContext<GenderContextType | undefined>(undefined);

export const GenderProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGender, setSelectedGender] = useState<Gender>('Men');
  const [selectedSubGender, setSelectedSubGender] = useState<SubGender>('All');
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const loadGender = async () => {
      try {
        const saved = await SecureStore.getItemAsync('user_gender');
        if (saved && ['Men', 'Women', 'Kids'].includes(saved)) {
          setSelectedGender(saved as Gender);
        } else {
          setSelectedGender('Men');
        }
        
        const savedSub = await SecureStore.getItemAsync('user_sub_gender');
        if (savedSub && ['All', 'Boys', 'Girls'].includes(savedSub)) {
          setSelectedSubGender(savedSub as SubGender);
        } else {
          setSelectedSubGender('All');
        }
      } catch (error) {
        console.error('Failed to load gender:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    loadGender();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedGender('Men');
      setSelectedSubGender('All');
      SecureStore.deleteItemAsync('user_gender').catch(e => 
        console.error('Failed to clear gender on logout:', e)
      );
      SecureStore.deleteItemAsync('user_sub_gender').catch(e => 
        console.error('Failed to clear sub-gender on logout:', e)
      );
    }
  }, [isAuthenticated]);

  const handleSetGender = async (gender: Gender) => {
    setSelectedGender(gender);
    // Reset sub-gender if transitioning away from Kids
    if (gender !== 'Kids') {
      setSelectedSubGender('All');
      try {
        await SecureStore.setItemAsync('user_sub_gender', 'All');
      } catch (e) {}
    }
    try {
      await SecureStore.setItemAsync('user_gender', gender);
    } catch (error) {
      console.error('Failed to save gender:', error);
    }
  };

  const handleSetSubGender = async (subGender: SubGender) => {
    setSelectedSubGender(subGender);
    try {
      await SecureStore.setItemAsync('user_sub_gender', subGender);
    } catch (error) {
      console.error('Failed to save sub-gender:', error);
    }
  };

  return (
    <GenderContext.Provider value={{ 
      selectedGender, 
      setSelectedGender: handleSetGender, 
      selectedSubGender, 
      setSelectedSubGender: handleSetSubGender, 
      isInitializing 
    }}>
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
