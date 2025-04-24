import * as functions from 'firebase-functions';
export declare const regenerateApiKey: functions.https.CallableFunction<any, Promise<{
    apiKey: string;
    message: string;
}>, unknown>;
export declare const sendReminderEmail: functions.https.HttpsFunction;
