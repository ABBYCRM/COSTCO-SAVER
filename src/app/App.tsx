import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
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
import { AuthGate } from '@features/auth/AuthGate';

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

export function App(): JSX.Element {
  return (
    <IonApp>
      <IonReactRouter>
        <AuthGate>
          <IonSplitPane contentId="main">
            <AppShell />
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
          </IonSplitPane>
        </AuthGate>
      </IonReactRouter>
    </IonApp>
  );
}
