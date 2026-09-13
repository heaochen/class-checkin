"use client";

import { useRef, useState } from "react";
import {
  parseExcelFile,
  type ExcelImportResult,
  type ImportedMember,
  type ImportedMemberStatus,
} from "@/lib/excel";

type ExcelImportModalProps = {
  onClose: () => void;
  onConfirm: (
    members: ImportedMember[],
  ) => Promise<{ imported: number; skipped: number; failed: number }>;
};

const statusLabels: Record<ImportedMemberStatus, string> = {
  valid: "有效",
  missing_student_id: "缺少学号",
  missing_name: "缺少姓名",
  duplicate: "学号重复",
};

function statusClass(status: ImportedMemberStatus) {
  return status === "valid"
    ? "bg-[#edf7f1] text-[#43a278]"
    : "bg-[#fff1f1] text-[#cb7373]";
}

export default function ExcelImportModal({
  onClose,
  onConfirm,
}: ExcelImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsReading(true);
    setError("");
    setResult(null);

    try {
      setResult(await parseExcelFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Excel 文件读取失败");
    } finally {
      setIsReading(false);
    }
  }

  async function handleConfirm() {
    if (!result || result.validCount === 0) return;
    setIsSaving(true);
    setError("");
    try {
      const summary = await onConfirm(
        result.members.filter((member) => member.status === "valid"),
      );
      setSaveMessage(
        `成功导入 ${summary.imported} 人，跳过重复 ${summary.skipped} 人，失败 ${summary.failed} 人`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "导入成员失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17253f]/45 p-4 backdrop-blur-[2px]">
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#edf0f5] px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-lg font-bold text-[#17233a]">导入名单</h2>
            <p className="mt-1 text-xs text-[#9aa5b7]">
              仅在当前浏览器读取 .xlsx 或 .xls 文件
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 text-xl text-[#9aa5b7] transition-colors hover:bg-[#f5f7fb] hover:text-[#34425a]"
            aria-label="关闭导入预览"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          {!result && !error && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isReading}
              className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd8ec] bg-[#f9fbff] text-center transition-colors hover:border-[#7ca5ed] hover:bg-[#f3f7ff] disabled:cursor-wait disabled:opacity-60"
            >
              <span className="mb-3 text-3xl text-[#5b8def]">↥</span>
              <span className="text-sm font-semibold text-[#34425a]">
                {isReading ? "正在读取文件..." : "选择 Excel 文件"}
              </span>
              <span className="mt-1 text-xs text-[#9aa5b7]">
                支持 .xlsx、.xls，仅识别学号和姓名两列
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <div className="rounded-xl border border-[#f0d9d9] bg-[#fff8f8] p-4 text-sm text-[#cb7373]">
              <p className="font-semibold">无法导入该文件</p>
              <p className="mt-1 text-xs">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  inputRef.current?.click();
                }}
                className="mt-3 cursor-pointer text-xs font-semibold text-[#b96262] underline transition-colors hover:text-[#8f4a4a]"
              >
                重新选择文件
              </button>
            </div>
          )}

          {result && (
            <Preview
              result={result}
              onChooseAnother={() => {
                setResult(null);
                inputRef.current?.click();
              }}
            />
          )}
          {saveMessage && (
            <p className="mt-4 rounded-xl bg-[#edf7f1] px-4 py-3 text-sm font-semibold text-[#43a278]">
              {saveMessage}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-[#edf0f5] px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-[#dfe6f1] px-5 py-2.5 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef]"
          >
            取消导入
          </button>
          <button
            type="button"
            disabled={
              !result ||
              result.validCount === 0 ||
              isSaving ||
              Boolean(saveMessage)
            }
            onClick={handleConfirm}
            className="cursor-pointer rounded-xl bg-[#5b8def] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "写入中..." : saveMessage ? "已完成" : "确认导入"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function Preview({
  result,
  onChooseAnother,
}: {
  result: ExcelImportResult;
  onChooseAnother: () => void;
}) {
  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Summary label="文件名" value={result.fileName} />
        <Summary label="总行数" value={`${result.totalRows}`} />
        <Summary label="有效数据" value={`${result.validCount}`} tone="valid" />
        <Summary
          label="错误数据"
          value={`${result.errorCount}`}
          tone={result.errorCount ? "error" : "valid"}
        />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-[#34425a]">导入预览</p>
        <button
          type="button"
          onClick={onChooseAnother}
          className="cursor-pointer text-xs font-semibold text-[#5b8def] transition-colors hover:text-[#3d6fca]"
        >
          重新选择文件
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#e8ecf3]">
        <table className="w-full min-w-[580px] text-left">
          <thead className="bg-[#fafbfc] text-xs text-[#8d99aa]">
            <tr>
              <th className="px-4 py-3 font-medium">序号</th>
              <th className="px-4 py-3 font-medium">学号</th>
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {result.members.map((member, index) => (
              <tr
                key={`${member.studentId}-${index}`}
                className="text-sm text-[#34425a]"
              >
                <td className="px-4 py-3 text-xs text-[#9aa5b7]">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {member.studentId || "-"}
                </td>
                <td className="px-4 py-3">{member.name || "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(member.status)}`}
                  >
                    {statusLabels[member.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "valid" | "error";
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f8fafd] p-3">
      <p className="text-[11px] text-[#9aa5b7]">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-bold ${tone === "error" ? "text-[#cb7373]" : tone === "valid" ? "text-[#43a278]" : "text-[#34425a]"}`}
      >
        {value}
      </p>
    </div>
  );
}
