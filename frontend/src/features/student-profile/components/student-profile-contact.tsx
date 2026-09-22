import { Phone, School, UserRound, Users } from "lucide-react";
import { Card } from "@/components/ui";
import type { StudentDetailView } from "../student-profile.types";

export function StudentProfileOverview({ detail }: { detail: StudentDetailView }) {
  const { profile } = detail;
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-slate-50/70 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">學生與聯絡資料</h2>
        <p className="mt-1 text-xs text-slate-500">
          集中查看學生基本資訊、家長聯絡方式與目前所屬班級。
        </p>
      </div>
      <div className="grid gap-8 p-5 lg:grid-cols-2">
        <section>
          <h3 className="flex items-center gap-2 border-b pb-3 text-sm font-bold text-slate-800">
            <span className="bg-brand-soft text-brand grid size-7 place-items-center rounded-lg">
              <UserRound size={15} />
            </span>
            個人資訊
          </h3>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
            <div>
              <dt className="text-xs text-slate-400">就讀學校</dt>
              <dd className="mt-1.5 flex items-center gap-2 font-medium">
                <School className="text-slate-400" size={15} />
                {profile.school}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">年級</dt>
              <dd className="mt-1.5 font-medium">{profile.grade}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">學生電話</dt>
              <dd className="mt-1.5 flex items-center gap-2 font-medium">
                <Phone className="text-slate-400" size={15} />
                {profile.phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">性別</dt>
              <dd className="mt-1.5 font-medium">{profile.gender}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3 className="flex items-center gap-2 border-b pb-3 text-sm font-bold text-slate-800">
            <span className="bg-brand-soft text-brand grid size-7 place-items-center rounded-lg">
              <Users size={15} />
            </span>
            家長與班級
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            {profile.guardians.map((guardian) => (
              <div
                key={guardian.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <div>
                  <p className="font-bold">{guardian.name}</p>
                  <p className="text-xs text-slate-400">{guardian.relationship}</p>
                </div>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Phone size={14} />
                  {guardian.phone}
                </span>
              </div>
            ))}
            {!profile.guardians.length && (
              <p className="rounded-xl bg-slate-50 p-4 text-slate-400">尚未建立家長聯絡資料</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.classes.map((courseClass) => (
                <span key={courseClass.id} className="bg-brand-soft text-brand pill">
                  {courseClass.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}
