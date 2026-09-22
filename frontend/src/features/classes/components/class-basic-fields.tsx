import { Card } from "@/components/ui";
import type { ClassCommandResult, ClassEditorView } from "../class-management.types";

export function ClassBasicFields({
  view,
  values,
  fieldErrors,
}: {
  view: ClassEditorView;
  values: ClassEditorView["initial"];
  fieldErrors?: ClassCommandResult["fieldErrors"];
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">班級基本資料</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          班級名稱
          <input name="name" required defaultValue={values.name} className="input mt-1 w-full" />
          <small className="text-red-600">{fieldErrors?.name}</small>
        </label>
        <label className="text-sm">
          班級代碼
          <input name="code" required defaultValue={values.code} className="input mt-1 w-full" />
          <small className="text-red-600">{fieldErrors?.code}</small>
        </label>
        <label className="text-sm">
          班級類型
          <select name="type" defaultValue={values.type} className="input mt-1 w-full">
            <option value="progress">進度授課班</option>
            <option value="individual">個別指導班</option>
            <option value="study">自習加強班</option>
          </select>
        </label>
        <label className="text-sm">
          授課教師
          <select
            name="teacherId"
            defaultValue={values.teacherId}
            disabled={!view.capabilities.canChangeTeacher}
            className="input mt-1 w-full"
          >
            <option value="">請選擇</option>
            {view.teacherOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {!view.capabilities.canChangeTeacher && (
            <input type="hidden" name="teacherId" value={values.teacherId} />
          )}
          <small className="text-red-600">{fieldErrors?.teacherId}</small>
        </label>
        <label className="text-sm">
          容納人數上限
          <input
            name="capacity"
            type="number"
            min="1"
            defaultValue={values.capacity ?? ""}
            placeholder="空白表示無上限"
            className="input mt-1 w-full"
          />
          <small className="text-red-600">{fieldErrors?.capacity}</small>
        </label>
        <label className="text-sm">
          狀態
          <select
            name="status"
            defaultValue={values.status}
            disabled={!view.capabilities.canChangeLifecycle}
            className="input mt-1 w-full"
          >
            <option value="recruiting">招生中</option>
            <option value="active">上課中</option>
            <option value="completed">已結業</option>
            <option value="archived">已封存</option>
          </select>
          {!view.capabilities.canChangeLifecycle && (
            <input type="hidden" name="status" value={values.status} />
          )}
        </label>
      </div>
      <fieldset className="mt-5">
        <legend className="font-bold">主要科目（可複選）</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {view.subjectOptions.map((option) => (
            <label key={option.id} className="rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="subjectIds"
                value={option.id}
                defaultChecked={values.subjectIds.includes(option.id)}
                className="mr-2"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="font-bold">適用年級</legend>
        <label className="mt-2 inline-flex rounded-lg border px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="allGrades"
            defaultChecked={values.allGrades}
            className="mr-2"
          />
          全年級
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          {view.gradeOptions.map((option) => (
            <label key={option.id} className="rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="gradeIds"
                value={option.id}
                defaultChecked={values.gradeIds.includes(option.id)}
                className="mr-2"
              />
              {option.label}
            </label>
          ))}
        </div>
        <small className="text-red-600">{fieldErrors?.gradeIds}</small>
      </fieldset>
    </Card>
  );
}
