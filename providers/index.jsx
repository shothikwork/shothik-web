"use client";

import store from "@/redux/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { MotionConfig } from "framer-motion";
import { Provider } from "react-redux";
import AnalyticsLoader from "../components/analytics/AnalyticsProvider";
import { NotificationProvider } from "./NotificationProvider";
import TanstackQueryProvider from "./TanstackQueryProvider";
import { AuthProvider } from "./AuthProvider";
import ConvexClientProvider from "./ConvexClientProvider";
import { I18nProvider } from "@/i18n";
import { LocaleSync } from "@/i18n/LocaleSync";

function ConditionalGoogleProvider({ children }) {
  const hasGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!hasGoogleClientId || hasGoogleClientId.trim() === "") {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={hasGoogleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default function Providers({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <Provider store={store}>
        <TanstackQueryProvider>
          <AnalyticsLoader />
          <NotificationProvider>
            <AuthProvider>
              <ConvexClientProvider>
                <I18nProvider>
                  <LocaleSync />
                  <ConditionalGoogleProvider>{children}</ConditionalGoogleProvider>
                </I18nProvider>
              </ConvexClientProvider>
            </AuthProvider>
          </NotificationProvider>
        </TanstackQueryProvider>
      </Provider>
    </MotionConfig>
  );
}
