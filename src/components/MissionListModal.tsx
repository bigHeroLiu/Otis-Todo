import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { DEPARTMENTS } from '../App';

export function MissionListModal({ isOpen, onClose, tasks }: any) {
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress');
  
  const groupedTasks = inProgressTasks.reduce((acc: any, task: any) => {
    const dept = task.departments?.[0] || '未分类';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(task);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  const getDeptConfig = (deptKey: string) => {
    return DEPARTMENTS[deptKey as keyof typeof DEPARTMENTS] || {
      label: deptKey,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto print:max-w-none print:h-auto print:overflow-visible bg-[#f8fafc]">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between pb-4 border-b border-slate-200/60">
          <DialogTitle className="text-2xl font-serif font-bold text-slate-900">Mission List</DialogTitle>
          <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-[#1abc9c] hover:bg-slate-100 rounded-lg transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="mt-6 space-y-8 print:mt-0">
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-serif font-bold">Mission List</h1>
            <p className="text-slate-500 mt-2">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          {Object.entries(groupedTasks).map(([deptKey, deptTasks]: [string, any]) => {
            const config = getDeptConfig(deptKey);
            return (
              <div key={deptKey} className="break-inside-avoid">
                {/* Department Header */}
                <div className={cn("flex items-center justify-between px-5 py-3 rounded-xl mb-3", config.bg)}>
                  <div className={cn("flex items-center gap-3", config.color)}>
                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                    <h2 className="text-base font-bold">{config.label}</h2>
                  </div>
                  <div className={cn("px-3 py-0.5 rounded-full bg-white border text-sm font-medium shadow-sm", config.border, config.color)}>
                    {deptTasks.length} 项
                  </div>
                </div>

                {/* Tasks Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-sm font-medium text-slate-500">
                    <div className="col-span-2">创建时间</div>
                    <div className="col-span-4">项目名称</div>
                    <div className="col-span-3">负责部门</div>
                    <div className="col-span-3">协助部门</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-100">
                    {deptTasks.map((task: any) => (
                      <div key={task.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                        <div className="col-span-2 text-sm text-slate-500 font-mono">
                          {format(new Date(task.createdAt), 'MM/dd HH:mm')}
                        </div>
                        <div className="col-span-4 text-sm font-bold text-slate-800 pr-4">
                          {task.name}
                        </div>
                        <div className="col-span-3">
                          <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-medium border", config.bg, config.color, config.border)}>
                            {config.label}
                          </span>
                        </div>
                        <div className="col-span-3 flex flex-wrap gap-2 text-sm text-slate-700">
                          {task.liaisonDepartments && task.liaisonDepartments.length > 0 ? (
                            task.liaisonDepartments.map((ld: any, idx: number) => {
                              const name = typeof ld === 'string' ? ld : ld.name;
                              const contact = typeof ld === 'string' ? '' : ld.contact;
                              return (
                                <span key={idx} className="inline-flex flex-col px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 leading-tight">
                                  <span className="font-bold">{name}</span>
                                  {contact && <span className="text-[10px] opacity-70">对接: {contact}</span>}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {inProgressTasks.length === 0 && (
            <div className="text-center text-slate-500 py-10 bg-white rounded-xl border border-slate-200 border-dashed">
              当前没有进行中的任务
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
