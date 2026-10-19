"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  readStudentSetupAction,
  readStudentLearningSetupAction,
} from "@/app/actions/student-setup-actions";
import { CurriculumEditorDialog } from "@/features/curriculum/components/curriculum-editor-dialog";
import { ExamRangeForm } from "@/features/curriculum/components/student-exam-ranges";
import type { ExamRangeRecord } from "@/features/curriculum/exam-range.types";
import type {
  StudentLearningSetup,
  StudentSetupData,
  StudentSetupStep,
} from "../student-setup.types";
import { StudentSetupBasicForm } from "./student-setup-basic-form";
import { StudentSetupMaterialForm } from "./student-setup-material-form";

export function StudentSetup({
  studentId,
  contextKey,
}: {
  studentId?: string;
  contextKey: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white"
      >
        {studentId ? "基本資料／班級與學習設定" : "新增學生"}
      </button>
      {isOpen && (
        <StudentSetupWorkspace
          key={`${contextKey}:${studentId ?? "new"}`}
          studentId={studentId}
          expectedContext={contextKey}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function StudentSetupWorkspace({
  studentId,
  expectedContext,
  onClose,
}: {
  studentId?: string;
  expectedContext: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState<StudentSetupData | null>(null);
  const [learning, setLearning] = useState<StudentLearningSetup | null>(null);
  const [step, setStep] = useState<StudentSetupStep>("basic");
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [range, setRange] = useState<ExamRangeRecord | undefined>();
  const [generation, setGeneration] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void readStudentSetupAction(studentId)
      .then(async (result) => {
        if (!alive.current) return;
        if (result.status === "ready" && result.value.contextKey === expectedContext) {
          setSetup(result.value);
          if (studentId) {
            const snapshot = await readStudentLearningSetupAction(studentId, expectedContext);
            if (!alive.current) return;
            setLearning(snapshot);
          }
        } else
          setMessage(
            result.status === "ready" ? "登入身分已變更，請重新載入頁面。" : result.message,
          );
        setIsLoading(false);
      })
      .catch(() => {
        if (alive.current) {
          setMessage("無法載入設定，請關閉後重試。");
          setIsLoading(false);
        }
      });
    return () => {
      alive.current = false;
    };
  }, [studentId, expectedContext]);

  const reloadLearning = async (current = setup) => {
    if (!current?.basic.studentId) return;
    setIsLoading(true);
    setLearning(null);
    try {
      const result = await readStudentLearningSetupAction(
        current.basic.studentId,
        current.contextKey,
      );
      if (alive.current) setLearning(result);
    } catch {
      if (alive.current) setMessage("學習設定暫時無法載入，已儲存資料保留，請重新載入。");
    } finally {
      if (alive.current) setIsLoading(false);
    }
  };
  const finish = () => {
    setStep("complete");
    router.refresh();
  };
  const rangeWorkspace = learning?.ranges.status === "ready" ? learning.ranges.value : null;
  const planWorkspace = learning?.plans.status === "ready" ? learning.plans.value : null;
  const titles = {
    basic: "1 · 基本資料與班級",
    materials: "2 · 教材設定",
    range: "3 · 段考範圍",
    complete: "設定結果",
  };
  return (
    <CurriculumEditorDialog
      title={titles[step]}
      isPending={isPending || isLoading}
      onClose={() => {
        if (!isPending && !isLoading) {
          router.refresh();
          onClose();
        }
      }}
    >
      <div className="min-w-0 space-y-5" aria-busy={isPending || isLoading}>
        <ol aria-label="學生設定步驟" className="flex flex-wrap gap-2 text-xs text-slate-500">
          {(["basic", "materials", "range"] as const).map((value, index) => (
            <li
              key={value}
              aria-current={step === value ? "step" : undefined}
              className={step === value ? "font-bold text-teal-800" : ""}
            >
              {index + 1}.{" "}
              {value === "basic" ? "學生與班級" : value === "materials" ? "教材" : "段考範圍"}
            </li>
          ))}
        </ol>
        {setup?.basic.studentId && (
          <p className="rounded-lg bg-teal-50 p-3 text-sm">
            {setup.basic.name} · {setup.basic.number}（已儲存）
          </p>
        )}
        {setup?.basic.studentId && learning && step === "basic" && (
          <div className="space-y-2 rounded-xl border p-3 text-sm">
            <p>
              教材：
              {planWorkspace
                ? `${planWorkspace.plans.filter((plan) => plan.status === "active").length} 份使用中`
                : learning.plans.status === "forbidden"
                  ? "無權限"
                  : "暫時無法確認"}{" "}
              · 段考範圍：
              {rangeWorkspace
                ? `${rangeWorkspace.ranges.length} 份`
                : learning.ranges.status === "forbidden"
                  ? "無權限"
                  : "暫時無法確認"}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={isLoading || isPending}
                onClick={() => setStep("materials")}
                className="rounded-lg border px-3 py-2"
              >
                只調整教材
              </button>
              <button
                disabled={isLoading || isPending}
                onClick={() => setStep("range")}
                className="rounded-lg border px-3 py-2"
              >
                只調整段考範圍
              </button>
            </div>
          </div>
        )}
        {message && (
          <p role="alert" className="text-sm text-amber-800">
            {message}
          </p>
        )}
        {isLoading && <p role="status">載入設定中…</p>}
        {setup && step === "basic" && !isLoading && (
          <StudentSetupBasicForm
            key={generation}
            data={setup}
            onPendingChange={setIsPending}
            onSaved={(basic, shouldFinish) => {
              const updated = { ...setup, basic };
              setSetup(updated);
              if (shouldFinish) finish();
              else {
                setStep("materials");
                void reloadLearning(updated);
              }
            }}
          />
        )}
        {setup && step === "materials" && !isLoading && (
          <>
            <h3 className="font-bold">
              目前教材：
              {planWorkspace
                ? `${planWorkspace.plans.filter((plan) => plan.status === "active").length} 份`
                : "無法確認"}
            </h3>
            {planWorkspace && learning?.canManage ? (
              <StudentSetupMaterialForm
                data={planWorkspace}
                contextKey={setup.contextKey}
                onSaved={reloadLearning}
                onPendingChange={setIsPending}
              />
            ) : (
              <p>
                {learning?.plans.status !== "ready"
                  ? learning?.plans.message
                  : "沒有教材管理權限，可稍後由負責人設定。"}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={isPending}
                onClick={() => {
                  setGeneration((value) => value + 1);
                  setStep("basic");
                }}
                className="rounded-lg border px-3 py-2"
              >
                返回學生資料
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  setStep("range");
                  void reloadLearning();
                }}
                className="rounded-lg border px-3 py-2"
              >
                繼續設定段考
              </button>
              <button disabled={isPending} onClick={finish} className="rounded-lg border px-3 py-2">
                稍後設定／結束
              </button>
            </div>
          </>
        )}
        {setup && step === "range" && !isLoading && (
          <>
            {rangeWorkspace ? (
              <>
                <label className="block text-sm">
                  設定範圍
                  <select
                    className="input mt-1 w-full"
                    disabled={isPending}
                    value={range?.id ?? ""}
                    onChange={(event) =>
                      setRange(rangeWorkspace.ranges.find((item) => item.id === event.target.value))
                    }
                  >
                    <option value="">新增段考範圍</option>
                    {rangeWorkspace.ranges.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                {learning?.canManage ? (
                  <ExamRangeForm
                    key={`${range?.id ?? "new"}:${range?.revision ?? generation}`}
                    contextKey={setup.contextKey}
                    studentId={setup.basic.studentId!}
                    workspace={rangeWorkspace}
                    range={range}
                    onPendingChange={setIsPending}
                    onClose={finish}
                    onSaved={() => {
                      void reloadLearning().then(() => {
                        if (alive.current) finish();
                      });
                    }}
                  />
                ) : (
                  <p>沒有段考範圍管理權限。</p>
                )}
              </>
            ) : (
              <p>
                {learning?.ranges.status !== "ready"
                  ? learning?.ranges.message
                  : "段考範圍無法載入。"}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={isPending}
                onClick={() => {
                  setRange(undefined);
                  setStep("materials");
                }}
                className="rounded-lg border px-3 py-2"
              >
                返回教材
              </button>
              <button disabled={isPending} onClick={finish} className="rounded-lg border px-3 py-2">
                稍後設定／結束
              </button>
            </div>
          </>
        )}
        {setup && step === "complete" && (
          <>
            <p className="text-sm">
              學生資料已儲存。關閉不會刪除已儲存內容；未完成項目可從個人頁接續。
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                班級：
                {setup.basic.classIds === undefined
                  ? "無管理權限，維持原設定"
                  : setup.basic.classIds.length
                    ? `${setup.basic.classIds.length} 班`
                    : "尚未設定"}
              </li>
              <li>
                教材：
                {planWorkspace
                  ? `${planWorkspace.plans.filter((plan) => plan.status === "active").length} 份使用中`
                  : learning?.plans.status === "forbidden"
                    ? "無權限"
                    : "尚未確認"}
              </li>
              <li>
                段考範圍：
                {rangeWorkspace
                  ? `${rangeWorkspace.ranges.length} 份`
                  : learning?.ranges.status === "forbidden"
                    ? "無權限"
                    : "尚未確認"}
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/students/${setup.basic.studentId}?tab=plans`}
                className="rounded-lg bg-teal-800 px-4 py-2 text-white"
                onClick={onClose}
              >
                查看學生個人資料
              </Link>
              <button
                onClick={() => {
                  setSetup({
                    ...setup,
                    basic: {
                      name: "",
                      number: "",
                      phone: "",
                      gender: "女",
                      status: "active",
                      classIds: [],
                    },
                  });
                  setLearning(null);
                  setRange(undefined);
                  setMessage("");
                  setGeneration((value) => value + 1);
                  setStep("basic");
                }}
                className="rounded-lg border px-4 py-2"
              >
                新增下一位
              </button>
            </div>
          </>
        )}
      </div>
    </CurriculumEditorDialog>
  );
}
