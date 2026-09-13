"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AddMemberModal from "@/components/AddMemberModal";
import ExcelImportModal from "@/components/ExcelImportModal";
import { supabase, type Group, type Member } from "@/lib/supabase";
import type { ImportedMember } from "@/lib/excel";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [groupResult, memberResult] = await Promise.all([
      supabase
        .from("groups")
        .select("id, name, created_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("members")
        .select("id, group_id, student_id, name, created_at")
        .eq("group_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (groupResult.error)
      setError(`加载名单失败：${groupResult.error.message}`);
    else if (!groupResult.data) setError("没有找到这个名单");
    else setGroup(groupResult.data);
    if (memberResult.error)
      setError(`加载成员失败：${memberResult.error.message}`);
    else setMembers(memberResult.data ?? []);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) void Promise.resolve().then(() => loadData());
  }, [id, loadData]);

  async function importMembers(imported: ImportedMember[]) {
    if (!supabase) throw new Error("尚未配置 Supabase，请先填写 .env.local");
    let importedCount = 0;
    let skipped = 0;
    let failed = 0;
    for (const member of imported) {
      const { error: insertError } = await supabase
        .from("members")
        .insert({
          group_id: id,
          student_id: member.studentId,
          name: member.name,
        });
      if (!insertError) importedCount++;
      else if (insertError.code === "23505") skipped++;
      else failed++;
    }
    await loadData();
    return { imported: importedCount, skipped, failed };
  }

  async function addMember(studentId: string, name: string) {
    if (!supabase) throw new Error("尚未配置 Supabase，请先填写 .env.local");
    const { error: insertError } = await supabase
      .from("members")
      .insert({ group_id: id, student_id: studentId, name });
    if (insertError) {
      if (insertError.code === "23505")
        throw new Error("该学号已存在于当前名单");
      throw new Error(`添加成员失败：${insertError.message}`);
    }
    setIsAddOpen(false);
    await loadData();
  }

  async function deleteMember(memberId: string) {
    if (!supabase || !window.confirm("确定要删除这名成员吗？此操作无法撤销。"))
      return;
    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);
    if (deleteError) setError(`删除成员失败：${deleteError.message}`);
    else await loadData();
  }

  if (isLoading)
    return (
      <div className="min-h-screen px-5 py-12 text-center text-sm text-[#9aa5b7]">
        正在加载名单...
      </div>
    );

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="mb-8">
        <Link
          href="/groups"
          className="cursor-pointer text-xs font-semibold text-[#71819a] transition-colors hover:text-[#5b8def]"
        >
          ← 返回人员名单
        </Link>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
          {error}
        </div>
      )}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
            <span className="font-bold text-[#5b8def]">C</span> ClassHub
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
            {group?.name ?? "名单详情"}
          </h1>
          <p className="mt-2 text-sm text-[#7d899e]">共 {members.length} 人</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe6f1] bg-white px-4 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#fafcff]"
          >
            <span className="text-lg">↥</span> 导入 Excel
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5b8def] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc]"
          >
            <span className="text-xl font-light leading-none">+</span> 添加成员
          </button>
        </div>
      </header>
      <section className="overflow-hidden rounded-2xl border border-[#e8ecf3] bg-white shadow-[0_6px_24px_rgba(31,49,82,0.035)]">
        <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-[#17233a]">成员列表</h2>
            <p className="mt-1 text-xs text-[#9aa5b7]">当前名单中的真实成员</p>
          </div>
          <span className="rounded-full bg-[#edf7f1] px-3 py-1 text-[11px] font-medium text-[#43a278]">
            数据已保存
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-[#fafbfc] text-xs text-[#8d99aa]">
              <tr>
                <th className="px-6 py-4 font-medium">学号</th>
                <th className="px-6 py-4 font-medium">姓名</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f5]">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-[#9aa5b7]"
                  >
                    暂无成员，请导入 Excel 或添加成员
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="text-sm text-[#34425a]">
                    <td className="px-6 py-4 font-mono text-xs text-[#738099]">
                      {member.student_id}
                    </td>
                    <td className="px-6 py-4 font-medium">{member.name}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-[#edf7f1] px-3 py-1 text-[11px] font-medium text-[#43a278]">
                        正常
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => void deleteMember(member.id)}
                        className="cursor-pointer text-xs font-semibold text-[#cb7373] transition-colors hover:text-[#a64f4f]"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {isImportOpen && (
        <ExcelImportModal
          onClose={() => setIsImportOpen(false)}
          onConfirm={importMembers}
        />
      )}
      {isAddOpen && (
        <AddMemberModal
          onClose={() => setIsAddOpen(false)}
          onConfirm={addMember}
        />
      )}
    </div>
  );
}
