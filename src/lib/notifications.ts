import { buildAdminContextHref } from "@/lib/context-links";
import type { NotificationItem } from "@/lib/types";

export function getNotificationHref(notification: NotificationItem) {
  return buildAdminContextHref({
    href: notification.href,
    taskId: notification.relatedTaskId,
    projectId: notification.relatedProjectId,
    vendorId: notification.relatedVendorId,
    projectVendorId: notification.relatedProjectVendorId,
    certificateId: notification.relatedCertificateId,
  });
}
