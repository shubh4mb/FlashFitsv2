import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

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
  banner?: { imageUrl: string };
  heroBanner?: { imageUrl: string };
  subCurations?: SubCuration[];
  attachedCouponCode?: string;
  attachedOffer?: any;
  schedule?: {
    isScheduled: boolean;
    startDate?: string;
    endDate?: string;
  };
  products?: any[];
  priority?: number;
}

interface CampaignContextType {
  activeCampaign: ActiveCampaign | null;
  activeCampaigns: ActiveCampaign[];
  campaignTheme: CampaignTheme | null;
  setCampaignFromCollections: (collections: any[]) => void;
  hasCampaign: boolean;
}

const CampaignContext = createContext<CampaignContextType>({
  activeCampaign: null,
  activeCampaigns: [],
  campaignTheme: null,
  setCampaignFromCollections: () => {},
  hasCampaign: false,
});

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);

  const setCampaignFromCollections = useCallback((collections: any[]) => {
    if (!Array.isArray(collections) || collections.length === 0) {
      setActiveCampaigns([]);
      return;
    }

    // Filter collections that qualify as campaigns (have a hero banner, campaign banner, theme, or campaignType)
    const validCampaignTypes = ['festival', 'seasonal', 'flash_drop', 'curated'];
    const matched = collections
      .filter((c) => {
        const hasBanner = !!(c.heroBannerImage?.url || c.bannerImage?.url || c.heroBanner?.imageUrl || c.banner?.imageUrl);
        const hasType = validCampaignTypes.includes(c.campaignType);
        const hasTheme = !!(c.theme && (c.theme.bgGradientStart || c.theme.primaryColor));
        return (hasType || hasTheme) && (hasBanner || hasTheme);
      })
      .map((c) => {
        const theme: CampaignTheme = c.theme?.bgGradientStart ? c.theme : {
          primaryColor: '#0F172A',
          secondaryColor: '#EF4444',
          bgGradientStart: '#0F172A',
          bgGradientEnd: '#1E293B',
          textColor: '#FFFFFF',
          presetName: 'midnight_luxe',
        };
        return { ...c, theme };
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    setActiveCampaigns(matched);
  }, []);

  const activeCampaign = useMemo(() => activeCampaigns[0] || null, [activeCampaigns]);
  const campaignTheme = useMemo(() => activeCampaign?.theme || null, [activeCampaign]);
  const hasCampaign = activeCampaigns.length > 0;

  const contextValue = useMemo(() => ({
    activeCampaign,
    activeCampaigns,
    campaignTheme,
    setCampaignFromCollections,
    hasCampaign,
  }), [activeCampaign, activeCampaigns, campaignTheme, setCampaignFromCollections, hasCampaign]);

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  return useContext(CampaignContext);
}
