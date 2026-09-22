import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { StudentStudyPlansView } from "@/features/curriculum/components/student-study-plans";
import { StudentDetailManagement } from "@/features/student-profile/components/student-detail-management";
import {
  StudentDetailMenu,
  type StudentDetailSection,
} from "@/features/student-profile/components/student-detail-menu";
import {
  StudentAssessmentHistory,
  StudentProfileHero,
  StudentProfileOverview,
} from "@/features/student-profile/components/student-profile-overview";
import { StudentSessionHistory } from "@/features/student-profile/components/student-session-history";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { studentDetailRepository } from "@/server/repositories/student-detail";

const isStudentDetailSection = (value?: string): value is StudentDetailSection =>
  value === "overview" || value === "sessions" || value === "assessments" || value === "plans";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{
    classId?: string;
    tab?: string;
    termId?: string;
    subject?: string;
    page?: string;
    notice?: string;
    tone?: string;
  }>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "student_profiles.read")) return <AccessDenied />;
  const { studentId } = await params;
  const query = await searchParams;
  const filters = {
    termId: query.termId,
    subject: query.subject,
    page: Math.max(1, Number(query.page) || 1),
    pageSize: 20,
  };
  const detail = studentDetailRepository.get(actor, studentId, filters);
  if (!detail) notFound();
  const canViewPlans = can(actor, "study_plans.read");
  const requestedSection = isStudentDetailSection(query.tab) ? query.tab : "overview";
  const activeSection =
    requestedSection === "plans" && !canViewPlans ? "overview" : requestedSection;
  const plans =
    canViewPlans && activeSection === "plans"
      ? curriculumRepository.studentPlans(actor, studentId)
      : undefined;
  const parentHref = query.classId
    ? `/students?classId=${encodeURIComponent(query.classId)}`
    : "/students";

  return (
    <>
      <PageHeader
        eyebrow="學生名單 / 個人資訊"
        breadcrumbs={[
          { label: query.classId ? "班級學生名單" : "學生名單", href: parentHref },
          { label: "個人資訊" },
        ]}
        title={`${detail.profile.name}的個人資料`}
        description="查看學生資料、每次課堂進度、成績紀錄與教材修課進度。"
      />
      {query.notice && (
        <div
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${query.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {query.notice}
        </div>
      )}
      <StudentProfileHero detail={detail} />
      <section className="card overflow-hidden">
        <StudentDetailMenu
          activeSection={activeSection}
          studentId={studentId}
          classId={query.classId}
          canViewPlans={canViewPlans}
        />
        <div className="p-5">
          {activeSection === "overview" && (
            <>
              <StudentProfileOverview detail={detail} />
              <StudentDetailManagement
                detail={detail}
                canManageProfile={can(actor, "student_profiles.manage")}
                canManageAssessments={false}
              />
            </>
          )}
          {activeSection === "sessions" && (
            <StudentSessionHistory
              studentId={detail.profile.id}
              studentName={detail.profile.name}
              sessions={detail.sessions}
            />
          )}{" "}
          {activeSection === "assessments" && (
            <>
              <StudentAssessmentHistory detail={detail} filters={filters} classId={query.classId} />
              <StudentDetailManagement
                detail={detail}
                canManageProfile={false}
                canManageAssessments={can(actor, "assessment_history.manage")}
              />
            </>
          )}
          {activeSection === "plans" && plans && (
            <section aria-labelledby="study-plan-heading">
              <div className="mb-4">
                <p className="text-xs font-bold tracking-wide text-emerald-600">LEARNING PLAN</p>
                <h2 id="study-plan-heading" className="mt-1 text-lg font-bold">
                  修課計畫與教材進度
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  查看各科教材完成比例，並更新目前學習狀態。
                </p>
              </div>
              <StudentStudyPlansView data={plans} canManage={can(actor, "study_plans.manage")} />
            </section>
          )}
        </div>
      </section>
    </>
  );
}
