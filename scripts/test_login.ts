async function test() {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahulbathula04@gmail.com', password: 'Arzon@123' })
  });
  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('User Role:', data.user?.role);
  console.log('User Email:', data.user?.email);
  console.log('User Name:', data.user?.fullName);
  console.log('JWT Token Exists:', Boolean(data.token));
  process.exit(0);
}
test();
