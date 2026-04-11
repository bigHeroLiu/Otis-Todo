import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function TaskModal({ isOpen, onClose, task, onSave, members, liaisonDepts }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    departments: [],
    projectLead: '',
    teamMembers: [],
    liaisonDepartments: [],
    status: 'pending',
    tripInfo: null,
  });

  const [hasTrip, setHasTrip] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        departments: task.departments || [],
        teamMembers: task.teamMembers || [],
        liaisonDepartments: task.liaisonDepartments || [],
      });
      setHasTrip(!!task.tripInfo);
    } else {
      setFormData({
        name: '',
        description: '',
        departments: [],
        projectLead: '',
        teamMembers: [],
        liaisonDepartments: [],
        status: 'pending',
        tripInfo: null,
      });
      setHasTrip(false);
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tripInfo: hasTrip ? formData.tripInfo : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? '编辑事项' : '新建事项'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">任务标题 *</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">任务描述</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">负责部门</label>
              <select 
                value={formData.departments[0] || ''}
                onChange={e => setFormData({...formData, departments: e.target.value ? [e.target.value] : []})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
              >
                <option value="">请选择</option>
                <option value="legal">法务部</option>
                <option value="investment">投资部</option>
                <option value="audit">审计部</option>
                <option value="family_office">家族办公室</option>
                <option value="ir">投资者关系部</option>
                <option value="personal">个人事务</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
              >
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>

          {/* Simplified Member Selection for now */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">负责人</label>
            <select 
              value={formData.projectLead}
              onChange={e => setFormData({...formData, projectLead: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
            >
              <option value="">请选择负责人</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.name}>{m.name} ({m.department})</option>
              ))}
            </select>
          </div>

          {/* Simplified Liaison Depts */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">协同部门 (多选)</label>
            <select 
              multiple
              value={formData.liaisonDepartments}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions).map((option: any) => option.value);
                setFormData({...formData, liaisonDepartments: values});
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1abc9c]/50 min-h-[100px]"
            >
              {liaisonDepts.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">按住 Ctrl/Cmd 键进行多选</p>
          </div>

          {/* Trip Info Toggle */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={hasTrip}
                onChange={e => {
                  setHasTrip(e.target.checked);
                  if (e.target.checked && !formData.tripInfo) {
                    setFormData({...formData, tripInfo: { transport: '飞机' }});
                  }
                }}
                className="rounded border-slate-300 text-[#1abc9c] focus:ring-[#1abc9c]"
              />
              <span className="text-sm font-medium text-slate-700">包含出差信息</span>
            </label>
          </div>

          {hasTrip && (
            <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">出差地</label>
                  <input 
                    type="text"
                    value={formData.tripInfo?.destination || ''}
                    onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, destination: e.target.value}})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">出差日期</label>
                  <input 
                    type="text"
                    placeholder="如: 2026-04-10 至 2026-04-15"
                    value={formData.tripInfo?.dates || ''}
                    onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, dates: e.target.value}})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">交通方式</label>
                  <select 
                    value={formData.tripInfo?.transport || '飞机'}
                    onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, transport: e.target.value}})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                  >
                    <option value="飞机">飞机</option>
                    <option value="高铁">高铁</option>
                    <option value="公司司机">公司司机</option>
                    <option value="自驾">自驾</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              {formData.tripInfo?.transport === '飞机' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">航班号</label>
                    <input 
                      type="text"
                      value={formData.tripInfo?.flightNo || ''}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, flightNo: e.target.value}})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">起降时间与机场</label>
                    <input 
                      type="text"
                      value={formData.tripInfo?.flightTime || ''}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, flightTime: e.target.value}})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-4">
                <div className="flex items-center h-full md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.tripInfo?.needsDriver || false}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, needsDriver: e.target.checked}})}
                      className="rounded border-slate-300 text-[#1abc9c] focus:ring-[#1abc9c]"
                    />
                    <span className="text-sm font-medium text-slate-700">需要司机</span>
                  </label>
                </div>
                {formData.tripInfo?.needsDriver && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">司机姓名</label>
                      <input 
                        type="text"
                        value={formData.tripInfo?.driverName || ''}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverName: e.target.value}})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">司机手机号</label>
                      <input 
                        type="text"
                        value={formData.tripInfo?.driverPhone || ''}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverPhone: e.target.value}})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">司机在哪里接</label>
                      <input 
                        type="text"
                        value={formData.tripInfo?.driverPickupLocation || ''}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverPickupLocation: e.target.value}})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => onClose(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#1abc9c] hover:bg-[#16a085] rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
