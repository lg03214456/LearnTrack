import { PageHeader } from "@/components/page-header";
import { AttendanceView } from "@/components/views/attendance-view";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { attendanceRepository } from "@/server/repositories/attendance";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "attendance.read")) return <AccessDenied />;
  const params = await searchParams,
    date = first(params.date) ?? "2026-08-28",
    classId = first(params.classId);
  const view = await attendanceRepository.forDate(actor, date, classId);
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 出缺席"
        title="出缺席紀錄"
        description="依班級排課自動帶出指定日期的應到學生。"
      />
      <AttendanceView
        initial={view.rows}
        date={date}
        classId={classId}
        classOptions={view.classOptions}
        canManage={can(actor, "attendance.manage")}
      />
    </>
  );
}
