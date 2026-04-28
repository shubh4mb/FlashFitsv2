import React, { useRef, useState } from 'react';
import { View, Modal, ActivityIndicator, StyleSheet, Platform, Linking, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/context/AlertContext';

export interface RazorpayOptions {
  key: string;
  amount: number | string;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
  [key: string]: any;
}

interface RazorpayWebViewProps {
  visible: boolean;
  options: RazorpayOptions | null;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  onClose: () => void;
}

export default function RazorpayWebView({
  visible,
  options,
  onSuccess,
  onError,
  onClose
}: RazorpayWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  if (!visible || !options) {
    return null;
  }

  // We inject the checkout options into the HTML so Razorpay can bootstrap
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Razorpay Checkout</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; display: flex; justify-content: center; align-items: center; background-color: transparent; }
      </style>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
      <script>
        function sendToApp(message) {
           window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }

        document.addEventListener("DOMContentLoaded", function() {
          var options = ${JSON.stringify(options)};
          
          options.handler = function(response) {
            sendToApp({ type: 'SUCCESS', data: response });
          };
          
          options.modal = {
            ondismiss: function() {
              sendToApp({ type: 'DISMISS' });
            },
            escape: false,
            animation: true
          };

          var rzp = new Razorpay(options);
          
          rzp.on('payment.failed', function (response){
            sendToApp({ type: 'ERROR', data: response.error });
          });

          // Open checkout immediately
          rzp.open();
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const parsedData = JSON.parse(event.nativeEvent.data);
      switch (parsedData.type) {
        case 'SUCCESS':
          onSuccess(parsedData.data);
          break;
        case 'DISMISS':
          onClose();
          break;
        case 'ERROR':
          onError(parsedData.data);
          onClose();
          break;
      }
    } catch (err) {
      console.error('Error parsing message from webview: ', err);
    }
  };

  const handleShouldStartLoadWithRequest = (event: any) => {
    const { url } = event;
    
    // Allow http, https, and about:blank inside the webview
    if (url.startsWith('http') || url.startsWith('https') || url.startsWith('about:blank')) {
      return true;
    }

    // Attempt to open deep links (UPI apps like GPay, PhonePe, Paytm, etc.) natively
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        showToast({ message: 'No application found to handle this payment method.', type: 'error' });
      }
    }).catch(err => console.error('An error occurred', err));
    
    // Prevent webview from trying to load the custom scheme itself
    return false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.webContainer}>
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0F172A" />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleMessage}
            onLoadEnd={() => setLoading(false)}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            bounces={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  closeBtn: {
    padding: 4,
  },
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#fff',
  }
});
