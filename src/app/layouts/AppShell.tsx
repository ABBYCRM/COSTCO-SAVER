import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
} from '@ionic/react';
import {
  bookmarkOutline,
  homeOutline,
  personOutline,
  pricetagOutline,
  scanOutline,
} from 'ionicons/icons';

export function AppShell(): JSX.Element {
  return (
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/home">
        <IonIcon icon={homeOutline} />
        <IonLabel>Home</IonLabel>
      </IonTabButton>
      <IonTabButton tab="deals" href="/deals">
        <IonIcon icon={pricetagOutline} />
        <IonLabel>Deals</IonLabel>
      </IonTabButton>
      <IonTabButton tab="scan" href="/scan" className="cs-scan-tab">
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
  );
}
