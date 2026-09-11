import { Stack } from 'expo-router';
import { GenderProvider } from '@/context/GenderContext';
import { CampaignProvider } from '@/context/CampaignContext';
import AddressSelectorModal from '@/components/common/AddressSelectorModal';

export default function AppLayout() {
  return (
    <GenderProvider>
      <CampaignProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="search-results" options={{ headerShown: false }} />
        </Stack>
        <AddressSelectorModal />
      </CampaignProvider>
    </GenderProvider>
  );
}
