import axiosInstance from './axiosConfig';

/**
 * Fetch collections with proximity-filtered products for Home page
 */
export const fetchCollectionsHome = async (gender: string, lat?: number, lng?: number) => {
  try {
    const response = await axiosInstance.get('user/collections/home', {
      params: { gender, lat, lng }
    });

    
    return response.data;
  } catch (error) {
    console.error('Error fetching home collections:', error);
    return [];
  }
};
