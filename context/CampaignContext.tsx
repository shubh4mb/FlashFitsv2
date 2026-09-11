import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CampaignTheme {
  primaryColor: string;
  secondaryColor: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  textColor: string;
  presetName?: string;
}

export interface SubCuration {
  id: string;
  label: string;
  filterTag?: string;
  gender?: string;
  categoryId?: string;
  maxPrice?: number;
}

export interface ActiveCampaign {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  badgeText?: string;
  description?: string;
  campaignType: string;
  theme: CampaignTheme;
  bannerImage?: { public_id: string; url: string };
  heroBannerImage?: { public_id: string; url: string };
  subCurations?: SubCuration[];
  attachedCouponCode?: string;
  attachedOffer?: any;
  schedule?: {
    isScheduled: boolean;
    startDate?: string;
    endDate?: string;
  };
  products?: any[];
}

interface CampaignContextType {
  activeCampaign: ActiveCampaign | null;
  campaignTheme: CampaignTheme | null;
  setCampaignFromCollections: (collections: any[]) => void;
  hasCampaign: boolean;
}

const CampaignContext = createContext<CampaignContextType>({
  activeCampaign: null,
  campaignTheme: null,
  setCampaignFromCollections: () => {},
  hasCampaign: false,
});

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);

  const setCampaignFromCollections = useCallback((collections: any[]) => {
    if (!Array.isArray(collections) || collections.length === 0) {
      setActiveCampaign(null);
      return;
    }

    // Pick the highest-priority festival/seasonal campaign
    const campaignTypes = ['festival', 'seasonal', 'flash_drop'];
    const heroCampaign = collections
      .filter((c) => campaignTypes.includes(c.campaignType) && c.theme)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

    if (heroCampaign) {
      setActiveCampaign(heroCampaign);
    } else {
      setActiveCampaign(null);
    }
  }, []);

  const campaignTheme = activeCampaign?.theme || null;
  const hasCampaign = activeCampaign !== null;

  return (
    <CampaignContext.Provider
      value={{
        activeCampaign,
        campaignTheme,
        setCampaignFromCollections,
        hasCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  return useContext(CampaignContext);
}
