import axiosInstance from './axiosConfig';

/**
 * Fetch collections with proximity-filtered products for Home page
 */
export const fetchCollectionsHome = async (gender: string, lat?: number, lng?: number) => {
  try {
    const response = await axiosInstance.get('user/collections/home', {
      params: { gender, lat, lng }
    });

    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Error fetching home collections:', error);
    return [];
  }
};

/**
 * Fetch detailed campaign / collection with sub-curations, coupon, and paginated products
 */
export const fetchCollectionDetails = async (
  slugOrId: string, 
  params: {
    subCurationId?: string;
    gender?: string;
    sortBy?: string;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
  } = {}
) => {
  try {
    const response = await axiosInstance.get(`user/collections/${slugOrId}`, {
      params
    });

    return response.data?.data || response.data || null;
  } catch (error) {
    console.error(`Error fetching collection details for ${slugOrId}:`, error);
    throw error;
  }
};

