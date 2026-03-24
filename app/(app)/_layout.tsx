import { Slot } from 'expo-router';
import { AddressProvider } from '@/context/AddressContext';
import { GenderProvider } from '@/context/GenderContext';

export default function AppLayout() {
  return (
    <AddressProvider>
      <GenderProvider>
        <Slot />
      </GenderProvider>
    </AddressProvider>
  );
}
