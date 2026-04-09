import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { format, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';

export function HRModal({ isOpen, onClose, members, onSaveMember, onDeleteMember, liaisonDepts, onSaveDept, onDeleteDept }: any) {
  const [activeTab, setActiveTab] = useState<'members' | 'depts'>('members');
  const [editingMember, setEditingMember] = useState<any>(null);

  const coreDepts = ['投资部', '法务部', '审计部', '家族办公室', '投资者关系部'];

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
            协同部门管理
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="space-y-8">
            {coreDepts.map(dept => (
              <div key={dept} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-medium text-lg mb-3">{dept}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {members.filter((m: any) => m.department === dept).map((m: any) => (
                    <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{m.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingMember(m)} className="p-1 text-slate-400 hover:text-[#1abc9c]"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDeleteMember(m.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {m.profile && Object.keys(m.profile).length > 0 ? (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">{m.profile.position || '未设置岗位'}</span>
                            {m.profile.rank && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">{m.profile.rank}</span>}
                            {m.profile.personality && <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px]">{m.profile.personality}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            {m.profile.education && <span>{m.profile.education}</span>}
                            {m.profile.education && m.profile.yearsOfService && <span>·</span>}
                            {m.profile.yearsOfService && <span>司龄 {m.profile.yearsOfService}</span>}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {m.profile.salary && (
                              <span className="text-emerald-600 font-medium">
                                ¥{m.profile.salary}/月
                              </span>
                            )}
                            {m.profile.lastSalaryAdjustment && (
                              <span className="text-slate-400 text-[10px]">
                                上次调薪: {m.profile.lastSalaryAdjustment}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 italic">
                          暂无档案信息
                        </div>
                      )}
                    </div>
                  ))}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
                      if (input.value) {
                        onSaveMember({ name: input.value, department: dept });
                        input.value = '';
                      }
                    }}
                    className="bg-white p-3 rounded-lg border border-dashed border-slate-300 flex items-center gap-2"
                  >
                    <input name="name" placeholder="添加新成员..." className="flex-1 text-sm outline-none" />
                    <button type="submit" className="text-[#1abc9c]"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>
              </div>
            ))}
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
              <input name="name" placeholder="添加协同部门..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
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
    position: '', rank: '', age: '', education: '本科', school: '', major: '',
    hireDate: '', salary: '', birthday: '', lastSalaryAdjustment: '', personality: '',
    ...(member.profile || {})
  });

  const calculateYearsOfService = (hireDateStr: string) => {
    if (!hireDateStr) return '';
    const hireDate = new Date(hireDateStr);
    const today = new Date();
    const years = differenceInYears(today, hireDate);
    const months = differenceInMonths(today, hireDate) % 12;
    const days = differenceInDays(today, new Date(today.getFullYear(), today.getMonth(), hireDate.getDate()));
    return `${years}年${months}月${days >= 0 ? days : 0}天`;
  };

  const calculateBirthday = (birthdayInput: string, age: number) => {
    if (!birthdayInput || !age) return birthdayInput;
    // Simple logic: if input is "5月20日", prepend year based on age
    const match = birthdayInput.match(/(\d+)月(\d+)日?/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const today = new Date();
      let birthYear = today.getFullYear() - age;
      if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
        birthYear -= 1;
      }
      return `${birthYear}年${month}月${day}日`;
    }
    return birthdayInput;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const yearsOfService = calculateYearsOfService(profile.hireDate);
    const birthday = calculateBirthday(profile.birthday, parseInt(profile.age));
    
    onSave({
      ...member,
      profile: {
        ...profile,
        yearsOfService,
        birthday,
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
            <label className="block text-xs font-medium text-slate-500 mb-1">职级</label>
            <input value={profile.rank} onChange={e => setProfile({...profile, rank: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
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
            <label className="block text-xs font-medium text-slate-500 mb-1">生日 (如: 5月20日)</label>
            <input value={profile.birthday} onChange={e => setProfile({...profile, birthday: e.target.value})} placeholder="5月20日" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50" />
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
