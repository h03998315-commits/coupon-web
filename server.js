import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CONFIG ===== */
const UPI_ID = "xxxpgn.332@ptyes";
const ADMIN_PASSWORD = "admin123";
/* ================== */

app.use(express.urlencoded({ extended: true }));
const db = new sqlite3.Database("database.db");

/* ===== DB ===== */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      utr TEXT,
      status TEXT DEFAULT 'PENDING',
      coupon TEXT,
      created_at TEXT
    )
  `);
});

/* ===== UTILS ===== */
function generateOrderId() {
  const r = Math.floor(100000 + Math.random() * 900000);
  const d = new Date().toISOString().slice(0,10).replace(/-/g,"");
  return `ORD-${d}-${r}`;
}

/* ===== PAGE TEMPLATE ===== */
function page(title, body, autoRefresh=false) {
return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${autoRefresh ? `<meta http-equiv="refresh" content="60">` : ""}
<style>
:root{--cyan:#00eaff;--blue:#007cff;--bg:#05080d;}
*{box-sizing:border-box}
body{
  margin:0;
  background:radial-gradient(circle at top,#08121f,var(--bg));
  color:#e6edf3;
  font-family:system-ui,-apple-system,Segoe UI,Roboto;
}

/* ===== BOOT (LIGHT & CONDITIONAL) ===== */
#boot{
  position:fixed; inset:0;
  background:#000;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  color:var(--cyan);
  font-family:monospace;
  z-index:9999;
}
#boot.hide{display:none}
.hud{
  width:140px;height:140px;
  border:2px solid var(--cyan);
  border-radius:50%;
  animation:spin 1.6s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== MAIN UI ===== */
.container{max-width:540px;margin:auto;padding:26px}
.card{
  background:rgba(17,24,39,.9);
  border-radius:16px;
  padding:22px;
  margin-bottom:18px;
  box-shadow:0 0 32px rgba(0,234,255,.10);
}
h1,h2{color:var(--cyan);margin-top:0}
ul{padding-left:18px}
.code{
  background:#020617;
  border:1px dashed rgba(0,234,255,.35);
  padding:12px;
  border-radius:10px;
  font-family:monospace;
  margin:10px 0;
  word-break:break-all;
}
small{color:#9ca3af}
input{
  width:100%;
  padding:12px;
  margin-top:10px;
  border-radius:10px;
  border:none;
}
button{
  width:100%;
  padding:14px;
  margin-top:12px;
  background:linear-gradient(135deg,var(--cyan),var(--blue));
  border:none;
  border-radius:12px;
  font-weight:800;
  color:#000;
  cursor:pointer;
}
.status{
  display:inline-block;
  padding:6px 14px;
  border-radius:999px;
  margin-top:10px;
}
.pending{background:rgba(255,170,0,.15);color:#ffb703}
.approved{background:rgba(0,255,170,.15);color:#00ffa6}
.progress{
  height:6px;background:#020617;border-radius:999px;
  overflow:hidden;margin-top:10px
}
.progress span{
  display:block;height:100%;width:40%;
  background:linear-gradient(90deg,var(--cyan),var(--blue));
  animation:scan 2s infinite;
}
@keyframes scan{from{transform:translateX(-100%)}to{transform:translateX(300%)}}
.glow{box-shadow:0 0 28px rgba(0,255,170,.55)}
.lang-box{display:flex;gap:10px;margin-bottom:10px}
select{flex:1;padding:10px;border-radius:10px}
table{width:100%;border-collapse:collapse}
td,th{border:1px solid #334155;padding:8px}
</style>
</head>

<body>

<!-- BOOT -->
<div id="boot">
  <div class="hud"></div>
  <div style="margin-top:14px;text-align:center">
    INITIALIZING…<br><b>SHEIN COUPON SHOP</b><br>SYSTEM ONLINE
  </div>
</div>

<div class="container">
${body}
</div>

<script>
/* ===== BOOT OPTIMIZATION ===== */
const boot = document.getElementById("boot");
const isHome = location.pathname === "/";
const seen = localStorage.getItem("bootSeen");

if(!isHome){
  boot.classList.add("hide");
}else if(seen){
  boot.classList.add("hide");
}else{
  localStorage.setItem("bootSeen","1");
  setTimeout(()=>boot.classList.add("hide"),1400);
}

/* ===== COPY COUPON ===== */
function copyCoupon(){
  const el=document.getElementById("coupon");
  navigator.clipboard.writeText(el.innerText);
  const c=document.getElementById("copied");
  if(c) c.innerText="✔ Copied";
}
</script>

</body>
</html>`;
}

/* ===== ROUTES ===== */

// HOME
app.get("/", (req,res)=>{
  const oid = generateOrderId();
  res.send(page("Genuine Shein Shop", `
<div class="card">
<h1>Genuine Shein Shop</h1>
<ul>
  <li>₹500 Coupon – ₹7</li>
  <li>₹1000 Coupon – ₹14</li>
  <li>₹2000 Coupon – ₹28</li>
  <li>₹4000 Coupon – ₹56</li>
</ul>

<small>Your Order ID</small>
<div class="code">${oid}</div>

<small>Pay via UPI</small>
<div class="code">${UPI_ID}</div>

<form method="POST" action="/submit">
  <input type="hidden" name="order_id" value="${oid}">
  <input name="utr" placeholder="Enter UTR Number" required>
  <button>Submit Payment</button>
</form>
</div>
`));
});

// SUBMIT
app.post("/submit",(req,res)=>{
  const { order_id, utr } = req.body;
  db.run(
    `INSERT INTO orders (order_id, utr, status, created_at)
     VALUES (?, ?, 'PENDING', datetime('now'))`,
    [order_id, utr],
    ()=>res.redirect(`/order/${order_id}`)
  );
});

// ORDER STATUS
app.get("/order/:id",(req,res)=>{
  db.get(
    "SELECT * FROM orders WHERE order_id=?",
    [req.params.id],
    (e,o)=>{
      if(!o) return res.send("Order not found");

      let html = `
<div class="card">
<h2>Order Status</h2>
<small>Order ID</small>
<div class="code">${o.order_id}</div>
`;

      if(o.status==="APPROVED"){
        html += `
<div class="status approved">Approved</div>
<small>Your Coupon Code</small>
<div id="coupon" class="code glow">${o.coupon}</div>
<button onclick="copyCoupon()">Copy Coupon</button>
<div id="copied" style="text-align:center;margin-top:6px;color:#00ffa6"></div>
`;
      } else {
        html += `
<div class="status pending">Under Verification</div>
<div class="progress"><span></span></div>
<p><small>Once approved, refresh this page to receive your coupon.</small></p>
<button onclick="location.reload()">Refresh</button>
`;
      }

      html += `</div>`;
      res.send(page("Order Status", html, o.status!=="APPROVED"));
    }
  );
});

// ADMIN
app.get("/admin",(req,res)=>{
  if(req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");
  db.all("SELECT * FROM orders ORDER BY id DESC",(e,rows)=>{
    const rowsHtml = rows.map(o=>`
<tr>
<td>${o.order_id}</td>
<td>${o.utr}</td>
<td>${o.status}</td>
<td>
<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
  <input type="hidden" name="order_id" value="${o.order_id}">
  <input name="coupon" placeholder="Coupon code" required>
  <button>Approve</button>
</form>
</td>
</tr>
`).join("");

    res.send(page("Admin Panel", `
<div class="card">
<h2>Admin Panel</h2>
<table>
<tr><th>Order</th><th>UTR</th><th>Status</th><th>Action</th></tr>
${rowsHtml}
</table>
</div>
`));
  });
});

// APPROVE
app.post("/approve",(req,res)=>{
  if(req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");
  const { order_id, coupon } = req.body;
  db.run(
    `UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?`,
    [coupon, order_id],
    ()=>res.redirect(`/admin?pass=${ADMIN_PASSWORD}`)
  );
});

app.listen(PORT, ()=>console.log("Optimized system online"));
