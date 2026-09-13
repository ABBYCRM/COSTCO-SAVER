import { useEffect } from 'react';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router';
import { HomePage } from '@features/home/HomePage';
import { DealsPage } from '@features/deals/DealsPage';
import { ScanPage } from '@features/scanner/ScanPage';
import { SavedPage } from '@features/saved/SavedPage';
import { AccountPage } from '@features/account/AccountPage';
import { AppShell } from '@app/layouts/AppShell';
import { ProductDetailPage } from '@features/products/ProductDetailPage';
import { SearchPage } from '@features/products/SearchPage';
import { BuyItPage } from '@features/products/BuyItPage';

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

import { setupIonicReact } from '@ionic/react';

setupIonicReact({ mode: 'md' });

function routerBasename(): string {
  const raw = import.meta.env.BASE_URL || '/';
  if (raw === './' || raw === '') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) || '/' : raw;
}

export function App(): JSX.Element {
  useEffect(() => {
    // No-op (outbox draining removed — local-first build)
  }, []);

  return (
    <IonApp>
      <IonReactRouter basename={routerBasename()}>
        <AppShell>
          <Route exact path="/" render={() => <Redirect to="/home" />} />
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/deals" component={DealsPage} />
          <Route exact path="/scan" component={ScanPage} />
          <Route exact path="/saved" component={SavedPage} />
          <Route exact path="/account" component={AccountPage} />
          <Route exact path="/product/:id" component={ProductDetailPage} />
          <Route exact path="/product/:productId/buy" component={BuyItPage} />
          <Route exact path="/buy/:productId" component={BuyItPage} />
          <Route exact path="/search" component={SearchPage} />
        </AppShell>
      </IonReactRouter>
    </IonApp>
  );
}
