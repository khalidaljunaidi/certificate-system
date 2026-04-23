type ContextLinkInput = {
  href?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  vendorId?: string | null;
  projectVendorId?: string | null;
  certificateId?: string | null;
};

export function buildAdminContextHref(input: ContextLinkInput) {
  if (input.href) {
    return input.href;
  }

  if (input.taskId) {
    return `/admin/tasks/${input.taskId}`;
  }

  if (input.projectId && input.certificateId) {
    return `/admin/projects/${input.projectId}/certificates/${input.certificateId}`;
  }

  if (input.projectId && input.projectVendorId) {
    return `/admin/projects/${input.projectId}#assignment-${input.projectVendorId}`;
  }

  if (input.vendorId) {
    return `/admin/vendors/${input.vendorId}`;
  }

  if (input.projectId) {
    return `/admin/projects/${input.projectId}`;
  }

  if (input.certificateId) {
    return "/admin/certificates";
  }

  return "/admin/dashboard";
}
