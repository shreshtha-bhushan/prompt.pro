

async function test() {
  const res = await fetch('https://prompt-pro-liart.vercel.app/api/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello', model: 'deepseek/deepseek-v4-flash' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
test();
