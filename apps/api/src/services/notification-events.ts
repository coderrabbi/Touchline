import { EventEmitter } from "node:events";

export const notificationEvents = new EventEmitter();

notificationEvents.setMaxListeners(0);

export function notifyUser(userId: string) {
  notificationEvents.emit(userId);
}

export function notifyUsers(userIds: string[]) {
  for (const userId of new Set(userIds)) {
    notificationEvents.emit(userId);
  }
}
