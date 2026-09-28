import api from './axiosConfig';

export interface SupportTicketPayload {
  category: string;
  orderId?: string;
  itemId?: string;
  itemDetails?: {
    name?: string;
    size?: string;
    image?: string;
    price?: number;
  };
  phone?: string;
  message?: string;
  images?: string[];
}

export interface SupportTicket {
  _id: string;
  userId: string;
  phone: string;
  category: string;
  orderId?: any;
  itemId?: any;
  itemDetails?: {
    name?: string;
    size?: string;
    image?: string;
    price?: number;
  };
  message?: string;
  images?: Array<{ url: string; public_id?: string }>;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export const createSupportTicket = async (data: SupportTicketPayload) => {
  const { images = [], ...fields } = data;

  if (images && images.length > 0) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });

    images.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `issue_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });

    const response = await api.post('/user/support/ticket', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    const response = await api.post('/user/support/ticket', fields);
    return response.data;
  }
};

export const getMySupportTickets = async (): Promise<{ success: boolean; tickets: SupportTicket[] }> => {
  const response = await api.get('/user/support/tickets');
  return response.data;
};
