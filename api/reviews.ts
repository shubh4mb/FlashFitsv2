import api from './axiosConfig';

export interface ReviewData {
  targetId: string;
  targetType: 'merchant' | 'rider' | 'product';
  orderId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export const createReview = async (data: ReviewData, images: string[] = []) => {
  const formData = new FormData();
  
  formData.append('targetId', data.targetId);
  formData.append('targetType', data.targetType);
  formData.append('orderId', data.orderId);
  formData.append('rating', data.rating.toString());
  
  if (data.title) formData.append('title', data.title);
  if (data.comment) formData.append('comment', data.comment);

  images.forEach((uri, index) => {
    const filename = uri.split('/').pop() || `image_${index}.jpg`;
    // Infer the type of the image
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('images', {
      uri,
      name: filename,
      type,
    } as any);
  });

  const response = await api.post('/user/review', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMyReviews = async (orderId?: string) => {
  const url = orderId ? `/user/reviews/my?orderId=${orderId}` : '/user/reviews/my';
  const response = await api.get(url);
  return response.data;
};

export const getReviews = async (targetType: string, targetId: string, page = 1) => {
  const response = await api.get(`/user/reviews/${targetType}/${targetId}?page=${page}`);
  return response.data;
};

export const getReviewableItems = async () => {
  const response = await api.get('/user/reviews/reviewable');
  return response.data;
};
