"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CreateGroupModal from "@/components/CreateGroupModal";
import { supabase, type Group } from "@/lib/supabase";

const toneClasses = [
  "bg-[#e9f1ff] text-[#5b8def]",
  "bg-[#eaf8f5] text-[#50b69f]",
  "bg-[#fff2e5] text-[#e9a05d]",
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!supabase) {
      setError("尚未配置 Supabase，请先填写 .env.local 中的连接信息");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: queryError } = await supabase
      .from("groups")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (queryError) setError(`加载名单失败：${queryError.message}`);
    else {
      setGroups(data ?? []);
      setError("");
    }
    setIsLoading(false);
  }, []);

  async function createGroup(name: string) {
    if (!supabase) throw new Error("尚未配置 Supabase，请先填写 .env.local");
    const { error: insertError } = await supabase
      .from("groups")
      .insert({ name });
    if (insertError) throw new Error(`创建名单失败：${insertError.message}`);
    setIsCreateOpen(false);
    await loadGroups();
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadGroups());
  }, [loadGroups]);

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#6c7b95] lg:hidden">
            <span className="font-bold text-[#5b8def]">C</span> ClassHub
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#17233a] sm:text-[32px]">
            人员名单
          </h1>
          <p className="mt-2 text-sm text-[#7d899e]">
            管理班级成员与会议参与范围
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setError("请先进入具体名单详情页，再导入 Excel 成员")
            }
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe6f1] bg-white px-4 text-sm font-semibold text-[#61718b] transition-colors hover:border-[#c8d7ef] hover:bg-[#fafcff]"
          >
            <span className="text-lg">↥</span> 导入 Excel
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5b8def] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-[#4d7fdc]"
          >
            <span className="text-xl font-light leading-none">+</span> 新建名单
          </button>
        </div>
      </header>
      {error && (
        <div className="mb-6 rounded-xl border border-[#f0d9d9] bg-[#fff8f8] px-4 py-3 text-sm text-[#cb7373]">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="rounded-2xl border border-[#e8ecf3] bg-white p-10 text-center text-sm text-[#9aa5b7]">
          正在加载名单...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd8ec] bg-[#f9fbff] p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-[#5b8def] shadow-sm">
            ♙
          </div>
          <h2 className="text-base font-bold text-[#34425a]">暂无名单</h2>
          <p className="mt-2 text-xs text-[#9aa5b7]">
            先创建一个名单，再进入详情页导入成员
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {groups.map((group, index) => (
            <section
              key={group.id}
              className="rounded-2xl border border-[#e8ecf3] bg-white p-6 shadow-[0_6px_24px_rgba(31,49,82,0.035)]"
            >
              <div className="mb-8 flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[index % toneClasses.length]}`}
                >
                  ♙
                </div>
                <span className="rounded-full bg-[#f5f7fb] px-3 py-1 text-[11px] font-medium text-[#8895a9]">
                  名单 {index + 1}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#273650]">{group.name}</h2>
              <p className="mt-2 text-sm text-[#9aa5b7]">
                创建于 {new Date(group.created_at).toLocaleDateString("zh-CN")}
              </p>
              <div className="mt-7 flex items-center justify-end border-t border-[#edf0f5] pt-4">
                <Link
                  href={`/groups/${group.id}`}
                  className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-[#61718b] transition-colors hover:bg-[#f1f5fd] hover:text-[#5b8def]"
                >
                  查看详情 <span className="ml-1">→</span>
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
      {isCreateOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateOpen(false)}
          onConfirm={createGroup}
        />
      )}
    </div>
  );
}
