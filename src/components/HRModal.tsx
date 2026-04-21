import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';
import { Lunar } from 'lunar-javascript';

export function HRModal({ isOpen, onClose, members, onSaveMember, onDeleteMember, liaisonDepts, onSaveDept, onDeleteDept }: any) {
  const [activeTab, setActiveTab] = useState<'members' | 'depts'>('members');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    '投资部': true,
    '法务部': true,
    '审计部': true,
    '家族办公室': true,
    '投资者关系部': true,
  });

  const coreDepts = ['投资部', '法务部', '审计部', '家族办公室', '投资者关系部'];

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const getDeptColor = (dept: string) => {
    const colors: Record<string, any> = {
      '投资部': { border: 'border-blue-200', dot: 'bg-blue-400', title: 'text-blue-900', count: 'text-blue-400', avatarBg: 'bg-blue-50', avatarText: 'text-blue-600', headerBg: 'bg-blue-50/30', icon: 'text-blue-400' },
      '法务部': { border: 'border-purple-200', dot: 'bg-purple-400', title: 'text-purple-900', count: 'text-purple-400', avatarBg: 'bg-purple-50', avatarText: 'text-purple-600', headerBg: 'bg-purple-50/30', icon: 'text-purple-400' },
      '审计部': { border: 'border-orange-200', dot: 'bg-orange-400', title: 'text-orange-900', count: 'text-orange-400', avatarBg: 'bg-orange-50', avatarText: 'text-orange-600', headerBg: 'bg-orange-50/30', icon: 'text-orange-400' },
      '家族办公室': { border: 'border-emerald-200', dot: 'bg-emerald-400', title: 'text-emerald-900', count: 'text-emerald-400', avatarBg: 'bg-emerald-50', avatarText: 'text-emerald-600', headerBg: 'bg-emerald-50/30', icon: 'text-emerald-400' },
      '投资者关系部': { border: 'border-pink-200', dot: 'bg-pink-400', title: 'text-pink-900', count: 'text-pink-400', avatarBg: 'bg-pink-50', avatarText: 'text-pink-600', headerBg: 'bg-pink-50/30', icon: 'text-pink-400' },
    };
    return colors[dept] || { border: 'border-slate-200', dot: 'bg-slate-400', title: 'text-slate-900', count: 'text-slate-400', avatarBg: 'bg-slate-50', avatarText: 'text-slate-600', headerBg: 'bg-slate-50/30', icon: 'text-slate-400' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>人力资源与部门管理</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 border-b border-slate-200 mb-4">
          <button 
            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'members' ? 'text-[#1abc9c] border-b-2 border-[#1abc9c]' : 'text-slate-500'}`}
            onClick={() => setActiveTab('members')}
          >
            成员管理
          </button>
          <button 
            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'depts' ? 'text-[#1abc9c] border-b-2 border-[#1abc9c]' : 'text-slate-500'}`}
            onClick={() => setActiveTab('depts')}
          >
            协助部门管理
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="space-y-6">
            {coreDepts.map(dept => {
              const deptMembers = members.filter((m: any) => m.department === dept);
              const isExpanded = expandedDepts[dept];
              const colors = getDeptColor(dept);

              return (
                <div key={dept} className={`rounded-xl border ${colors.border} overflow-hidden bg-white`}>
                  {/* Header */}
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer select-none ${colors.headerBg}`}
                    onClick={() => toggleDept(dept)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <h3 className={`font-medium text-lg ${colors.title}`}>{dept}</h3>
                      <span className={`text-sm ${colors.count}`}>{deptMembers.length} 人</span>
                    </div>
                    <div className={colors.icon}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Member List */}
                  {isExpanded && (
                    <div className="flex flex-col">
                      {deptMembers.map((m: any, index: number) => (
                        <div key={m.id} className={`flex items-center justify-between p-4 ${index !== deptMembers.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-medium ${colors.avatarBg} ${colors.avatarText}`}>
                              {m.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800 text-base">{m.name}</span>
                              {m.profile && Object.keys(m.profile).length > 0 ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                  <span>{m.profile.position || '未设置岗位'}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-emerald-600/70 italic mt-0.5">暂无档案</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => setEditingMember(m)} className="text-slate-400 hover:text-[#1abc9c] transition-colors">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => onDeleteMember(m.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Member Form */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
                            if (input.value) {
                              onSaveMember({ name: input.value, department: dept });
                              input.value = '';
                            }
                          }}
                          className="flex items-center gap-2 max-w-sm"
                        >
                          <input name="name" placeholder="添加新成员..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50 bg-white" />
                          <button type="submit" className="p-2 text-white bg-[#1abc9c] hover:bg-[#16a085] rounded-lg transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'depts' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap gap-2 mb-4">
              {liaisonDepts.map((d: any) => (
                <div key={d.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                  <span>{d.name}</span>
                  <button onClick={() => onDeleteDept(d.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
                if (input.value) {
                  onSaveDept({ name: input.value });
                  input.value = '';
                }
              }}
              className="flex gap-2 max-w-sm"
            >
              <input name="name" placeholder="添加协助部门..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
              <button type="submit" className="px-4 py-2 bg-[#1abc9c] text-white rounded-lg text-sm font-medium hover:bg-[#16a085]">添加</button>
            </form>
          </div>
        )}

        {/* Member Profile Edit Modal */}
        {editingMember && (
          <MemberProfileModal 
            member={editingMember} 
            onClose={() => setEditingMember(null)}
            onSave={(updated) => {
              onSaveMember(updated);
              setEditingMember(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberProfileModal({ member, onClose, onSave }: any) {
  const [profile, setProfile] = useState<any>({
    position: '', age: '', education: '本科', school: '', major: '',
    hireDate: '', salary: '', birthday: '', birthdayType: 'solar',
    lastSalaryAdjustment: '', personality: '',
    ...(member.profile || {})
  });

  const getBirthdayLabel = () => {
    if (!profile.birthday) return '';
    
    // birthday format YYYY-MM-DD
    const [y, m, d] = profile.birthday.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return '';

    if (profile.birthdayType === 'lunar') {
      const lunar = Lunar.fromYmd(y, m, d);
      return `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} (农历)`;
    } else {
      return `${m}月${d}日 (阳历)`;
    }
  };

  const calculateYearsOfService = (hireDateStr: string) => {
    if (!hireDateStr) return '';
    const hireDate = new Date(hireDateStr);
    const today = new Date();
    const years = differenceInYears(today, hireDate);
    const months = differenceInMonths(today, hireDate) % 12;
    const days = differenceInDays(today, new Date(today.getFullYear(), today.getMonth(), hireDate.getDate()));
    return `${years}年${months}月${days >= 0 ? days : 0}天`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const yearsOfService = calculateYearsOfService(profile.hireDate);
    
    onSave({
      ...member,
      profile: {
        ...profile,
        yearsOfService,
        age: parseInt(profile.age) || null,
        salary: parseInt(profile.salary) || null,
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑员工档案 - {member.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">岗位</label>
            <input value={profile.position} onChange={e => setProfile({...profile, position: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">年龄</label>
            <input type="number" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">学历</label>
            <select value={profile.education} onChange={e => setProfile({...profile, education: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50">
              <option>博士</option><option>硕士</option><option>本科</option><option>大专</option><option>高中</option><option>其他</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">毕业学校</label>
            <input value={profile.school} onChange={e => setProfile({...profile, school: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">专业</label>
            <input value={profile.major} onChange={e => setProfile({...profile, major: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">入职日期</label>
            <input type="date" value={profile.hireDate} onChange={e => setProfile({...profile, hireDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">薪资 (元/月)</label>
            <input type="number" value={profile.salary} onChange={e => setProfile({...profile, salary: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">生日类型</label>
            <select value={profile.birthdayType} onChange={e => setProfile({...profile, birthdayType: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50">
              <option value="solar">阳历</option>
              <option value="lunar">阴历</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">生日 (YYYY-MM-DD)</label>
            <input value={profile.birthday} onChange={e => setProfile({...profile, birthday: e.target.value})} placeholder="1990-01-01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
            <p className="text-xs text-emerald-600 mt-1">{getBirthdayLabel()}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">上一次调薪日期</label>
            <input type="date" value={profile.lastSalaryAdjustment || ''} onChange={e => setProfile({...profile, lastSalaryAdjustment: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">性格 (如: ENFJ, 稳重)</label>
            <input value={profile.personality || ''} onChange={e => setProfile({...profile, personality: e.target.value})} placeholder="例如: ENFJ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#1abc9c] hover:bg-[#16a085] rounded-lg transition-colors">保存档案</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
