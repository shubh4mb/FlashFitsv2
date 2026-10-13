import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PhoneLogin from '@/components/auth/PhoneLogin';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { returnUrl: paramReturnUrl } = useLocalSearchParams<{ returnUrl?: string }>();
  const { returnUrl: contextReturnUrl, setReturnUrl } = useAuth();
  const returnUrl = paramReturnUrl || contextReturnUrl;

  useEffect(() => {
    if (paramReturnUrl && paramReturnUrl !== contextReturnUrl) {
      setReturnUrl(paramReturnUrl);
    }
  }, [paramReturnUrl, contextReturnUrl, setReturnUrl]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (returnUrl) {
        setReturnUrl(null);
        if (returnUrl.includes('?')) {
          const [path, queryString] = returnUrl.split('?');
          const params: Record<string, string> = {};
          queryString.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });
          router.replace({ pathname: path as any, params });
        } else {
          router.replace(returnUrl as any);
        }
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(app)/(tabs)');
      }
      return true;
    });

    return () => backHandler.remove();
  }, [router, returnUrl, setReturnUrl]);

  return <PhoneLogin returnUrl={returnUrl || undefined} />;
}
