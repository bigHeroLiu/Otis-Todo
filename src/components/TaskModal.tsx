import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Plus, Trash2, Sparkles, Loader2, Users, MapPin, Calendar, ListTodo } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { estimateTravelTime } from '../services/api';

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
    meetingInfo: null, // New
  });

  const [hasTrip, setHasTrip] = useState(false);
  const [isMeeting, setIsMeeting] = useState(false); // New

  const [isEstimating, setIsEstimating] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        departments: task.departments || [],
        teamMembers: task.teamMembers || [],
        liaisonDepartments: (task.liaisonDepartments || []).map((ld: any) => typeof ld === 'string' ? { name: ld, contact: '', id: ld } : ld),
      });
      setHasTrip(!!task.tripInfo);
      setIsMeeting(!!task.meetingInfo);
    } else {
      setFormData({
        name: '',
        description: '',
        departments: [],
        projectLead: '',
        teamMembers: [],
        liaisonDepartments: [], // Will store objects: { id: string, name: string, contact?: string }
        status: 'pending',
        tripInfo: null,
        meetingInfo: null,
      });
      setHasTrip(false);
      setIsMeeting(false);
    }
  }, [task, isOpen]);

  const handleLiaisonToggle = (dept: any) => {
    setFormData((prev: any) => {
      const exists = prev.liaisonDepartments.find((d: any) => d.id === dept.id || d.name === dept.name);
      if (exists) {
        return {
          ...prev,
          liaisonDepartments: prev.liaisonDepartments.filter((d: any) => d.id !== dept.id && d.name !== dept.name)
        };
      } else {
        return {
          ...prev,
          liaisonDepartments: [...prev.liaisonDepartments, { id: dept.id, name: dept.name, contact: '' }]
        };
      }
    });
  };

  const handleLiaisonContactChange = (deptId: string, contact: string) => {
    setFormData((prev: any) => ({
      ...prev,
      liaisonDepartments: prev.liaisonDepartments.map((d: any) => 
        d.id === deptId ? { ...d, contact } : d
      )
    }));
  };

  const handleEstimate = async () => {
    if (!formData.tripInfo) return;
    setIsEstimating(true);
    try {
      const estimate = await estimateTravelTime(formData.tripInfo, '');
      if (estimate) {
        setFormData((prev: any) => ({
          ...prev,
          tripInfo: {
            ...prev.tripInfo,
            estimatedTravelTime: estimate
          }
        }));
      }
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tripInfo: hasTrip ? formData.tripInfo : null,
      meetingInfo: isMeeting ? formData.meetingInfo : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col p-0 border-none rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#1abc9c] to-[#16a085] px-6 py-8 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Plus className="w-6 h-6" />
              {task ? '编辑事项详情' : '创建新任务事项'}
            </DialogTitle>
            <p className="text-[#e8f8f5] text-sm mt-1 opacity-90">请填写以下信息以完善事项记录</p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 bg-white overflow-y-auto">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-[#1abc9c] rounded-full"></span>
              基本信息
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">任务名称 <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text"
                  placeholder="请输入简洁清晰的任务标题"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1abc9c]/10 focus:border-[#1abc9c] transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">详细描述</label>
                <textarea 
                  placeholder="添加更多关于此任务的备注或需求细则..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1abc9c]/10 focus:border-[#1abc9c] transition-all text-slate-800 resize-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 text-indigo-500">
                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                会见安排
              </h3>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={cn(
                  "w-10 h-6 rounded-full relative transition-all duration-300",
                  isMeeting ? "bg-indigo-500" : "bg-slate-200"
                )}>
                  <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                    isMeeting ? "translate-x-4" : ""
                  )} />
                </div>
                <input 
                  type="checkbox" 
                  checked={isMeeting}
                  onChange={e => {
                    setIsMeeting(e.target.checked);
                    if (e.target.checked && !formData.meetingInfo) {
                      setFormData({...formData, meetingInfo: {}});
                    }
                  }}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">开启会见详情</span>
              </label>
            </div>

            {isMeeting && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-indigo-50/30 p-5 rounded-2xl space-y-6 border border-indigo-100/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-2 ml-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> 会见人
                    </label>
                    <input 
                      type="text"
                      placeholder="姓名或单位"
                      value={formData.meetingInfo?.person || ''} 
                      onChange={e => setFormData({...formData, meetingInfo: {...formData.meetingInfo, person: e.target.value}})} 
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-2 ml-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> 会见时间
                    </label>
                    <input 
                      type="datetime-local" 
                      value={formData.meetingInfo?.time || ''} 
                      onChange={e => setFormData({...formData, meetingInfo: {...formData.meetingInfo, time: e.target.value}})} 
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase mb-2 ml-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> 会见地点
                  </label>
                  <input 
                    placeholder="具体会议室或地点"
                    value={formData.meetingInfo?.location || ''} 
                    onChange={e => setFormData({...formData, meetingInfo: {...formData.meetingInfo, location: e.target.value}})} 
                    className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase mb-2 ml-1 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5" /> 会见事项及议程
                  </label>
                  <textarea 
                    rows={3} 
                    placeholder="请输入主要讨论内容或注意事项..."
                    value={formData.meetingInfo?.agenda || ''} 
                    onChange={e => setFormData({...formData, meetingInfo: {...formData.meetingInfo, agenda: e.target.value}})} 
                    className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none shadow-sm"
                  />
                </div>
              </motion.div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-[#1abc9c] rounded-full"></span>
              责任与状态
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">负责部门</label>
                <select 
                  value={formData.departments[0] || ''}
                  onChange={e => setFormData({...formData, departments: e.target.value ? [e.target.value] : []})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1abc9c]/10 focus:border-[#1abc9c] transition-all text-slate-800 cursor-pointer appearance-none"
                >
                  <option value="">请选择部门</option>
                  <option value="legal">法务部</option>
                  <option value="investment">投资部</option>
                  <option value="audit">审计部</option>
                  <option value="family_office">家族办公室</option>
                  <option value="ir">投资者关系部</option>
                  <option value="personal">个人事务</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">负责人</label>
                <select 
                  value={formData.projectLead}
                  onChange={e => setFormData({...formData, projectLead: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1abc9c]/10 focus:border-[#1abc9c] transition-all text-slate-800 cursor-pointer appearance-none"
                >
                  <option value="">请选择负责人</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">当前进度</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1abc9c]/10 focus:border-[#1abc9c] transition-all text-slate-800 cursor-pointer appearance-none"
                >
                  <option value="pending">待处理</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 text-violet-500">
              <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
              协同办公
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">选择协助部门及对接人</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {liaisonDepts.map((d: any) => {
                  const deptObj = typeof d === 'string' ? { id: d, name: d } : d;
                  const isSelected = formData.liaisonDepartments.find((ld: any) => (typeof ld === 'string' ? ld === deptObj.name : ld.id === deptObj.id || ld.name === deptObj.name));
                  return (
                    <button
                      key={deptObj.id}
                      type="button"
                      onClick={() => handleLiaisonToggle(deptObj)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                        isSelected 
                          ? "bg-violet-100 text-violet-700 border-violet-200 shadow-sm" 
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {deptObj.name}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {formData.liaisonDepartments.map((ld: any, index: number) => {
                  const deptObj = typeof ld === 'string' ? { name: ld, contact: '' } : ld;
                  return (
                    <div key={deptObj.id || index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-xl">
                      <div className="min-w-[100px] text-sm font-bold text-violet-700">
                        {deptObj.name}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text"
                          placeholder="请输入该部门对接人姓名"
                          value={deptObj.contact || ''}
                          onChange={e => handleLiaisonContactChange(deptObj.id || deptObj.name, e.target.value)}
                          className="w-full bg-white border border-violet-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                        />
                      </div>
                    </div>
                  );
                })}
                {formData.liaisonDepartments.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm italic">
                    暂未选择任何协助部门
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 text-sky-500">
                <span className="w-1 h-4 bg-sky-500 rounded-full"></span>
                差务信息
              </h3>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={cn(
                  "w-10 h-6 rounded-full relative transition-all duration-300",
                  hasTrip ? "bg-[#1abc9c]" : "bg-slate-200"
                )}>
                  <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                    hasTrip ? "translate-x-4" : ""
                  )} />
                </div>
                <input 
                  type="checkbox" 
                  checked={hasTrip}
                  onChange={e => {
                    setHasTrip(e.target.checked);
                    if (e.target.checked && !formData.tripInfo) {
                      setFormData({...formData, tripInfo: { transport: '飞机' }});
                    }
                  }}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">开启出差单</span>
              </label>
            </div>

            {hasTrip && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-sky-50/30 p-5 rounded-2xl space-y-6 border border-sky-100/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">去程目的地</label>
                    <input 
                      type="text"
                      placeholder="城市名称"
                      value={formData.tripInfo?.destination || ''}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, destination: e.target.value}})}
                      className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">返程信息</label>
                    <input 
                      type="text"
                      placeholder="返程城市或日期"
                      value={formData.tripInfo?.returnTrip || ''}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, returnTrip: e.target.value}})}
                      className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">出差日期区间</label>
                    <input 
                      type="text"
                      placeholder="如: 2026-04-10 至 04-15"
                      value={formData.tripInfo?.dates || ''}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, dates: e.target.value}})}
                      className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">主要交通工具</label>
                    <select 
                      value={formData.tripInfo?.transport || '飞机'}
                      onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, transport: e.target.value}})}
                      className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all cursor-pointer"
                    >
                      <option value="飞机">✈️ 飞机</option>
                      <option value="高铁">🚄 高铁</option>
                      <option value="公司司机">🏎️ 公司司机接送</option>
                      <option value="自驾">🚗 自驾</option>
                      <option value="其他">🚲 其他</option>
                    </select>
                  </div>
                </div>

                {formData.tripInfo?.transport === '飞机' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">航班号</label>
                      <input 
                        type="text"
                        placeholder="航班/车次"
                        value={formData.tripInfo?.flightNo || ''}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, flightNo: e.target.value}})}
                        className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sky-700 uppercase mb-1.5 ml-1">详细时间与机场</label>
                      <input 
                        type="text"
                        placeholder="起飞/降落时间及航站楼"
                        value={formData.tripInfo?.flightTime || ''}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, flightTime: e.target.value}})}
                        className="w-full bg-white border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-sky-100/50">
                  <div className="flex items-center h-full">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.tripInfo?.needsDriver || false}
                        onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, needsDriver: e.target.checked}})}
                        className="w-5 h-5 rounded-md border-sky-200 text-sky-500 focus:ring-sky-500 transition-all"
                      />
                      <span className="text-sm font-bold text-sky-900 group-hover:text-[#1abc9c] transition-colors">需要特别指派司机接送</span>
                    </label>
                  </div>
                  
                  {formData.tripInfo?.needsDriver && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-white/60 rounded-2xl border border-sky-200/50"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-sky-400 uppercase mb-1 ml-1">司机姓名</label>
                        <input 
                          type="text"
                          value={formData.tripInfo?.driverName || ''}
                          onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverName: e.target.value}})}
                          className="w-full border border-sky-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-sky-400 uppercase mb-1 ml-1">联系电话</label>
                        <input 
                          type="text"
                          value={formData.tripInfo?.driverPhone || ''}
                          onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverPhone: e.target.value}})}
                          className="w-full border border-sky-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-sky-400 uppercase mb-1 ml-1">详细接车地点</label>
                        <input 
                          type="text"
                          value={formData.tripInfo?.driverPickupLocation || ''}
                          onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, driverPickupLocation: e.target.value}})}
                          className="w-full border border-sky-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-sky-700 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI 行程助手预估
                    </label>
                    <button
                      type="button"
                      onClick={handleEstimate}
                      disabled={isEstimating || !formData.tripInfo?.destination}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[#1abc9c]/10 text-[#1abc9c] font-bold rounded-full hover:bg-[#1abc9c]/20 transition-all disabled:opacity-40"
                    >
                      {isEstimating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isEstimating ? '计算中...' : '智能生成预估'}
                    </button>
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.tripInfo?.estimatedTravelTime || ''}
                    onChange={e => setFormData({...formData, tripInfo: {...formData.tripInfo, estimatedTravelTime: e.target.value}})}
                    className="w-full bg-white border border-sky-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all resize-none placeholder:text-slate-300"
                    placeholder="AI 将根据目的地为您计算大约行程时间和提醒..."
                  />
                </div>
              </motion.div>
            )}
          </section>

          <div className="flex items-center justify-between gap-4 pt-10 pb-2">
            <button 
              type="button" 
              onClick={() => onClose(false)}
              className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-2xl transition-all"
            >
              放弃更改
            </button>
            <button 
              type="submit"
              className="flex-[2] py-4 text-sm font-bold text-white bg-gradient-to-r from-[#1abc9c] to-[#16a085] hover:opacity-90 rounded-2xl shadow-xl shadow-[#1abc9c]/20 transition-all active:scale-[0.98]"
            >
              完成并保存事项
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
