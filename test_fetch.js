fetch('http://localhost:3000/api/tasks').then(async r => {
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    console.log("Tasks length:", data.length);
  } catch (e) {
    console.log("Status:", r.status, "Response text:", text.slice(0, 100));
  }
}).catch(console.error);
