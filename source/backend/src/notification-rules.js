export const NOTIFICATION_EVENTS = Object.freeze({
 CUSTOMER_MESSAGE: 'customer_message',
 TEAM_MESSAGE: 'team_message',
 ADMIN_MESSAGE: 'admin_message',
 PROJECT_APPROVED: 'project_approved',
 PROJECT_PREVIEW_READY: 'project_preview_ready',
 PROJECT_UPDATED: 'project_updated'
});
export function validateNotificationTarget(path) {
 return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !Array.from(path).some(char => char.charCodeAt(0) === 10 || char.charCodeAt(0) === 13) && path.length <= 500;
}
export function telegramReady(env = process.env) {
 return env.TELEGRAM_NOTIFICATIONS_ENABLED === 'true' && Boolean(env.TELEGRAM_BOT_TOKEN?.trim()) && Boolean(env.TELEGRAM_ADMIN_CHAT_ID?.trim());
}
export function notificationRecipient(type, id) {
 if (!['customer', 'team'].includes(type) || !/^[0-9a-f-]{36}$/i.test(id || '')) throw new Error('Invalid notification recipient');
 return { type, id };
}
