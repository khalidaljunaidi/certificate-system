import { ActivityFeed } from "@/components/admin/activity-feed";
import { EmailTestPanel } from "@/components/admin/email-test-panel";
import { KpiCard } from "@/components/admin/kpi-card";
import { NotificationList } from "@/components/admin/notification-list";
import { PageNotice } from "@/components/admin/page-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { getDashboardData } from "@/server/queries/dashboard-queries";

type DashboardPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      {params.notice === "password-updated" ? (
        <PageNotice
          title="Password updated successfully."
          body="You can continue using the admin workspace."
        />
      ) : null}

      <section className="tg-reveal tg-breathe-panel rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(77,34,106,0.96)_62%,rgba(215,132,57,0.94))] px-8 py-9 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f7c08b]">
          Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Project-based certificate governance at a glance.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#efe3f5]">
          Monitor live project and certificate workload, recent workflow actions,
          unread operational notifications, and outbound email testing from one
          internal command center.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={data.kpis.totalProjects}
          className="tg-reveal"
        />
        <KpiCard
          label="Active Projects"
          value={data.kpis.activeProjects}
          accent="#d78439"
          className="tg-reveal tg-delay-1"
        />
        <KpiCard
          label="Total Certificates"
          value={data.kpis.totalCertificates}
          accent="#5b2a7a"
          className="tg-reveal tg-delay-2"
        />
        <KpiCard
          label="Draft Certificates"
          value={data.kpis.draftCertificates}
          accent="#b45309"
          className="tg-reveal tg-delay-3"
        />
        <KpiCard
          label="Pending PM Approval"
          value={data.kpis.pendingPmApproval}
          accent="#d78439"
          className="tg-reveal tg-delay-1"
        />
        <KpiCard
          label="Approved"
          value={data.kpis.approvedCertificates}
          accent="#5b2a7a"
          className="tg-reveal tg-delay-2"
        />
        <KpiCard
          label="Issued"
          value={data.kpis.issuedCertificates}
          accent="#166534"
          className="tg-reveal tg-delay-3"
        />
        <KpiCard
          label="Revoked"
          value={data.kpis.revokedCertificates}
          accent="#991b1b"
          className="tg-reveal tg-delay-4"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="tg-reveal tg-delay-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              items={data.recentActivity.map((item) => ({
                id: item.id,
                action: item.action,
                entityType: item.entityType,
                actorName: item.actorName,
                createdAt: item.createdAt,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="tg-reveal tg-delay-2">
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationList notifications={data.recentNotifications} />
          </CardContent>
        </Card>
      </section>

      <section className="tg-reveal tg-delay-2">
        <EmailTestPanel defaultRecipientEmail={session.user.email} />
      </section>
    </div>
  );
}
