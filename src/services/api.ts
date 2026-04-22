export const API_BASE = '/api';

export async function processNaturalLanguageTask(input: string, userLocation?: string) {
  const res = await fetch(`${API_BASE}/ai/extract-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, userLocation }),
  });
  return res.json();
}

export async function estimateTravelTime(tripInfo: any, userLocation?: string) {
  const res = await fetch(`${API_BASE}/ai/estimate-travel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripInfo, userLocation }),
  });
  const data = await res.json();
  return data.text;
}

export async function summarizeTask(task: any) {
  const res = await fetch(`${API_BASE}/ai/summarize-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  });
  const data = await res.json();
  return data.text;
}

export async function fetchTasks(deleted = false) {
  const res = await fetch(`${API_BASE}/tasks?deleted=${deleted}`);
  return res.json();
}

export async function saveTask(task: any) {
  if (task.id) {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return task;
  } else {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    const { id } = await res.json();
    return { ...task, id };
  }
}

export async function updateTask(id: string, updates: any) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteTask(id: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function reorderTasks(orders: { id: string, sortOrder: number }[]) {
  const res = await fetch(`${API_BASE}/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
  return res.json();
}

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/members`);
  return res.json();
}

export async function saveMember(member: any) {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  const { id } = await res.json();
  return { ...member, id };
}

export async function deleteMember(id: string) {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchDepts() {
  const res = await fetch(`${API_BASE}/depts`);
  return res.json();
}

export async function saveDept(dept: any) {
  const res = await fetch(`${API_BASE}/depts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dept),
  });
  const { id } = await res.json();
  return { ...dept, id };
}

export async function deleteDept(id: string) {
  const res = await fetch(`${API_BASE}/depts/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}
