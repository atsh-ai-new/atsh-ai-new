import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNotificationTarget, telegramReady, notificationRecipient, NOTIFICATION_EVENTS } from '../src/notification-rules.js';
test('relative links only',()=>{assert.equal(validateNotificationTarget('/customer/projects/123'),true);assert.equal(validateNotificationTarget('//evil.example'),false);assert.equal(validateNotificationTarget('https://evil.example'),false);});
test('telegram remains disabled until explicitly enabled and configured',()=>{assert.equal(telegramReady({}),false);assert.equal(telegramReady({TELEGRAM_NOTIFICATIONS_ENABLED:'true'}),false);assert.equal(telegramReady({TELEGRAM_NOTIFICATIONS_ENABLED:'true',TELEGRAM_BOT_TOKEN:'token',TELEGRAM_ADMIN_CHAT_ID:'123'}),true);});
test('recipient identity validation',()=>{assert.deepEqual(notificationRecipient('customer','123e4567-e89b-12d3-a456-426614174000'),{type:'customer',id:'123e4567-e89b-12d3-a456-426614174000'});assert.throws(()=>notificationRecipient('all','123'));assert.ok(NOTIFICATION_EVENTS.CUSTOMER_MESSAGE);});
