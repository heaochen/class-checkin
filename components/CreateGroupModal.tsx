"use client";

import { useState } from "react";

type CreateGroupModalProps = {
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
};

export default function CreateGroupModal({
  onClose,
  onConfirm,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入名单名称");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onConfirm(trimmedName);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建名单失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17253f]/45 p-4 backdrop-blur-[2px]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#17233a]">新建名单</h2>
            <p className="mt-1 text-xs text-[#9aa5b7]">创建后即可导入成员</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 text-xl text-[#9aa5b7] transition-colors hover:bg-[#f5f7fb] hover:text-[#34425a]"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[#34425a]">名单名称</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：2026级技术科学实验班"
            className="mt-2 h-11 w-full rounded-xl border border-[#dfe6f1] px-3 text-sm text-[#34425a] outline-none transition-colors focus:border-[#7ca5ed] focus:ring-2 focus:ring-[#e9f1ff]"
          />
        </label>
        {error && (
          <p className="mt-3 rounded-lg bg-[#fff8f8] px-3 py-2 text-xs text-[#cb7373]">
            {error}
          </p>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-[#dfe6f1] px-5 py-2.5 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef]"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-[#5b8def] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc] disabled:cursor-wait disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "确认创建"}
          </button>
        </div>
      </form>
    </div>
  );
}
