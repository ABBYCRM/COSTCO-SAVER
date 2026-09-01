import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { registerDeviceToken } from '@services/api/notifications';

let initialized=false;

export async function registerNativePush():Promise<void>{
  if(initialized||!Capacitor.isNativePlatform())return;
  initialized=true;
  const platform=Capacitor.getPlatform();
  if(platform!=='ios'&&platform!=='android')return;

  const current=await PushNotifications.checkPermissions();
  let permission=current.receive;
  if(permission==='prompt'||permission==='prompt-with-rationale'){
    const requested=await PushNotifications.requestPermissions();
    permission=requested.receive;
  }
  if(permission!=='granted')return;

  await PushNotifications.addListener('registration',(token:Token)=>{
    void registerDeviceToken({
      platform,
      token:token.value,
      appVersion:null,
    }).catch((error)=>console.error('push token registration failed',error));
  });
  await PushNotifications.addListener('registrationError',(error)=>{
    console.error('native push registration failed',error);
  });
  await PushNotifications.register();
}
