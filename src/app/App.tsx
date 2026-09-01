import { IonApp, IonRouterOutlet, IonTabs, setupIonicReact } from '@ionic/react';
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
import { TripPage } from '@features/trip/TripPage';
import { AdminPage } from '@features/admin/AdminPage';
import { NotificationsPage } from '@features/notifications/NotificationsPage';
import { ReceiptImportPage } from '@features/receipts/ReceiptImportPage';

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
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/" render={() => <Redirect to="/home" />} />
              <Route exact path="/home" component={HomePage} />
              <Route exact path="/deals" component={DealsPage} />
              <Route exact path="/scan" component={ScanPage} />
              <Route exact path="/saved" component={SavedPage} />
              <Route exact path="/account" component={AccountPage} />
              <Route exact path="/product/:productId" component={ProductDetailPage} />
              <Route exact path="/product/:productId/buy" component={BuyItPage} />
              <Route exact path="/search" component={SearchPage} />
              <Route exact path="/trip" component={TripPage} />
              <Route exact path="/admin" component={AdminPage} />
              <Route exact path="/notifications" component={NotificationsPage} />
              <Route exact path="/receipts/import" component={ReceiptImportPage} />
            </IonRouterOutlet>
            <AppShell />
          </IonTabs>
        </AuthGate>
      </IonReactRouter>
    </IonApp>
  );
}
