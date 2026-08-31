import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { homeOutline, scanOutline, bookmarkOutline, personOutline, pricetagOutline } from 'ionicons/icons';
import { Redirect, Route } from 'react-router';
import { HomePage } from '@features/home/HomePage';
import { DealsPage } from '@features/deals/DealsPage';
import { ScanPage } from '@features/scanner/ScanPage';
import { SavedPage } from '@features/saved/SavedPage';
import { AccountPage } from '@features/account/AccountPage';

/**
 * 5-tab primary navigation. Spec §42: Home, Deals, Scan, Saved, Account.
 * Scan is centered.
 */
export function AppShell(): JSX.Element {
  return (
    <>
      <IonMenu contentId="main" side="start" type="overlay">
        <IonToolbar>
          <IonTitle>COSTCO-SAVER</IonTitle>
        </IonToolbar>
        <IonContent>
          <IonList>
            <IonMenuToggle autoHide>
              <IonItem routerLink="/home" routerDirection="root">
                <IonIcon icon={homeOutline} slot="start" />
                <IonLabel>Home</IonLabel>
              </IonItem>
              <IonItem routerLink="/deals" routerDirection="root">
                <IonIcon icon={pricetagOutline} slot="start" />
                <IonLabel>Deals</IonLabel>
              </IonItem>
              <IonItem routerLink="/saved" routerDirection="root">
                <IonIcon icon={bookmarkOutline} slot="start" />
                <IonLabel>Saved</IonLabel>
              </IonItem>
              <IonItem routerLink="/account" routerDirection="root">
                <IonIcon icon={personOutline} slot="start" />
                <IonLabel>Account</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>
      <IonRouterOutlet id="main">
        <Route exact path="/home" component={HomePage} />
        <Route exact path="/deals" component={DealsPage} />
        <Route exact path="/scan" component={ScanPage} />
        <Route exact path="/saved" component={SavedPage} />
        <Route exact path="/account" component={AccountPage} />
        <Route exact path="/" render={() => <Redirect to="/home" />} />
      </IonRouterOutlet>
    </>
  );
}

/**
 * Bottom tab bar with the 5 tabs. The split-pane routes use IonTabs for
 * the small-viewport layout.
 */
export function BottomTabs(): JSX.Element {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home" component={HomePage} />
        <Route exact path="/tabs/deals" component={DealsPage} />
        <Route exact path="/tabs/scan" component={ScanPage} />
        <Route exact path="/tabs/saved" component={SavedPage} />
        <Route exact path="/tabs/account" component={AccountPage} />
        <Route exact path="/tabs" render={() => <Redirect to="/tabs/home" />} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="deals" href="/tabs/deals">
          <IonIcon icon={pricetagOutline} />
          <IonLabel>Deals</IonLabel>
        </IonTabButton>
        <IonTabButton tab="scan" href="/tabs/scan">
          <IonIcon icon={scanOutline} />
          <IonLabel>Scan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="saved" href="/tabs/saved">
          <IonIcon icon={bookmarkOutline} />
          <IonLabel>Saved</IonLabel>
        </IonTabButton>
        <IonTabButton tab="account" href="/tabs/account">
          <IonIcon icon={personOutline} />
          <IonLabel>Account</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
