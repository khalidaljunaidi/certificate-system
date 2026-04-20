import type { NotificationItem } from "@/lib/types";

export function getNotificationHref(notification: NotificationItem) {
  if (notification.relatedProjectId && notification.relatedCertificateId) {
    return `/admin/projects/${notification.relatedProjectId}/certificates/${notification.relatedCertificateId}`;
  }

  if (notification.relatedProjectId) {
    return `/admin/projects/${notification.relatedProjectId}`;
  }

  if (notification.relatedCertificateId) {
    return "/admin/certificates";
  }

  return "/admin/notifications";
}
