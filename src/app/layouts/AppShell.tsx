import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { bookmarkOutline, homeOutline, personOutline, pricetagOutline, scanOutline, searchOutline } from 'ionicons/icons';

/**
 * Side menu only. Spec §42 tabs live on the IonTabBar in App.tsx.
 * This file must not render a second IonRouterOutlet — IonSplitPane
 * contentId="main" already points at the outlet in App.tsx.
 */
export function AppShell(): JSX.Element {
  return (
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
            <IonItem routerLink="/scan" routerDirection="root">
              <IonIcon icon={scanOutline} slot="start" />
              <IonLabel>Scan</IonLabel>
            </IonItem>
            <IonItem routerLink="/search" routerDirection="root">
              <IonIcon icon={searchOutline} slot="start" />
              <IonLabel>Search</IonLabel>
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
  );
}
