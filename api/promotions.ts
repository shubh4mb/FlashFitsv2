import api from './axiosConfig';

export interface PromoAnnouncement {
  id: string;
  badge: string;
  title: string;
  subtitle?: string;
  highlightText?: string;
  actionUrl?: string;
  icon?: string;
  isActive?: boolean;
  order?: number;
}

export const fetchPromotions = async (): Promise<PromoAnnouncement[]> => {
  try {
    const res = await api.get('user/promotions');
    const promos = res.data?.promotions || res.data?.data || res.data;
    if (Array.isArray(promos)) {
      return promos;
    }
    return [];
  } catch (error) {
    return [];
  }
};
