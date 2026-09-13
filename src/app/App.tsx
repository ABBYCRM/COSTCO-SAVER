import { useEffect } from 'react';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router';
import { bookmarkOutline, homeOutline, personOutline, pricetagOutline, scanOutline } from 'ionicons/icons';
import { HomePage } from '@features/home/HomePage';
import { DealsPage } from '@features/deals/DealsPage';
import { ScanPage } from '@features/scanner/ScanPage';
import { SavedPage } from '@features/saved/SavedPage';
import { AccountPage } from '@features/account/AccountPage';
import { AppShell } from '@app/layouts/AppShell';
import { ProductDetailPage } from '@features/products/ProductDetailPage';
import { SearchPage } from '@features/products/SearchPage';
import { BuyItPage } from '@features/products/BuyItPage';
import { AuthGate } from '@features/auth/AuthGate';
import { drainOutbox } from '@services/offline/sync';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

setupIonicReact({ mode: 'md' });

/** Vite BASE_URL is `/` or `/COSTCO-SAVER/`; React Router 5 wants no trailing slash. */
function routerBasename(): string {
  const raw = import.meta.env.BASE_URL || '/';
  if (raw === './' || raw === '') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) || '/' : raw;
}

export function App(): JSX.Element {
  useEffect(() => {
    void drainOutbox();
    const onOnline = (): void => {
      void drainOutbox();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <IonApp>
      <IonReactRouter basename={routerBasename()}>
        <AuthGate>
          <IonSplitPane contentId="main">
            <AppShell />
            <IonTabs>
              <IonRouterOutlet id="main">
                <Route exact path="/" render={() => <Redirect to="/home" />} />
                <Route exact path="/home" component={HomePage} />
                <Route exact path="/deals" component={DealsPage} />
                <Route exact path="/scan" component={ScanPage} />
                <Route exact path="/saved" component={SavedPage} />
                <Route exact path="/account" component={AccountPage} />
                <Route exact path="/product/:productId" component={ProductDetailPage} />
                <Route exact path="/product/:productId/buy" component={BuyItPage} />
                <Route exact path="/search" component={SearchPage} />
              </IonRouterOutlet>
              <IonTabBar slot="bottom">
                <IonTabButton tab="home" href="/home">
                  <IonIcon icon={homeOutline} />
                  <IonLabel>Home</IonLabel>
                </IonTabButton>
                <IonTabButton tab="deals" href="/deals">
                  <IonIcon icon={pricetagOutline} />
                  <IonLabel>Deals</IonLabel>
                </IonTabButton>
                <IonTabButton tab="scan" href="/scan">
                  <IonIcon icon={scanOutline} />
                  <IonLabel>Scan</IonLabel>
                </IonTabButton>
                <IonTabButton tab="saved" href="/saved">
                  <IonIcon icon={bookmarkOutline} />
                  <IonLabel>Saved</IonLabel>
                </IonTabButton>
                <IonTabButton tab="account" href="/account">
                  <IonIcon icon={personOutline} />
                  <IonLabel>Account</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </IonSplitPane>
        </AuthGate>
      </IonReactRouter>
    </IonApp>
  );
}
