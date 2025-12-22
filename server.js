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
/* ===== THEMES ===== */
body[data-theme="tech"]{
  --bg1:#05080d; --bg2:#08121f;
  --accent:#00eaff; --card:rgba(17,24,39,.9); --text:#e6edf3;
}
body[data-theme="cute"]{
  --bg1:#fff1f5; --bg2:#fde2e4;
  --accent:#ff5fa2; --card:rgba(255,255,255,.92); --text:#111;
}

body{
  margin:0;
  background:radial-gradient(circle at top,var(--bg2),var(--bg1));
  color:var(--text);
  font-family:system-ui,-apple-system,Segoe UI,Roboto;
  transition:background .4s,color .4s;
}

/* ===== ANIMATED BG ===== */
body::before{
  content:"";
  position:fixed; inset:0;
  background:
    linear-gradient(transparent 95%, var(--accent) 96%),
    linear-gradient(90deg, transparent 95%, var(--accent) 96%);
  background-size:60px 60px;
  opacity:.06;
  animation:gridMove 25s linear infinite;
  pointer-events:none;
}
body[data-theme="cute"]::before{
  background:
    radial-gradient(circle at 20% 30%, #ffb3d9 0 6px, transparent 7px),
    radial-gradient(circle at 80% 40%, #ffcce6 0 5px, transparent 6px),
    radial-gradient(circle at 50% 70%, #ffd9ec 0 4px, transparent 5px);
  background-size:200px 200px;
  animation:float 20s ease-in-out infinite;
}
@keyframes gridMove{to{transform:translateY(60px)}}
@keyframes float{50%{transform:translateY(-20px)}}

/* ===== UI ===== */
.container{max-width:540px;margin:auto;padding:26px}
.card{
  background:var(--card);
  border-radius:18px;
  padding:22px;
  margin-bottom:18px;
  box-shadow:0 0 28px rgba(0,0,0,.15);
}
h1,h2{color:var(--accent);margin-top:0}
.code{
  background:#00000015;
  padding:12px;
  border-radius:10px;
  font-family:monospace;
  margin:10px 0;
  word-break:break-all;
}
small{opacity:.75}
input,select{
  width:100%;
  padding:12px;
  margin-top:10px;
  border-radius:12px;
  border:none;
}
button{
  width:100%;
  padding:14px;
  margin-top:12px;
  background:var(--accent);
  border:none;
  border-radius:14px;
  font-weight:700;
  color:#000;
  cursor:pointer;
}
.status{
  display:inline-block;
  padding:6px 14px;
  border-radius:999px;
  margin-top:10px;
}
.pending{background:rgba(255,170,0,.15);color:#ff9800}
.approved{background:rgba(0,255,170,.15);color:#00b894}

/* ===== TOP CONTROLS ===== */
.controls{
  display:flex;
  gap:10px;
  margin-bottom:14px;
}
.controls select, .controls button{
  margin-top:0;
}

/* ===== STYLE SELECT (FIRST VISIT) ===== */
#styleSelect{
  position:fixed; inset:0;
  background:#000000cc;
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
}
.style-box{
  background:#fff;
  border-radius:20px;
  padding:30px;
  max-width:360px;
  text-align:center;
}
.style-card{
  padding:16px;
  border-radius:14px;
  margin-top:12px;
  cursor:pointer;
  font-weight:600;
}
.tech{background:#0b1220;color:#00eaff}
.cute{background:#ffe4ef;color:#ff4d94}
</style>
</head>

<body data-theme="tech">

<!-- FIRST VISIT STYLE SELECT -->
<div id="styleSelect">
  <div class="style-box">
    <h2>Choose your experience</h2>
    <div class="style-card tech" onclick="setStyle('tech')">
      🤖 Tech / JARVIS Interface
    </div>
    <div class="style-card cute" onclick="setStyle('cute')">
      🌸 Cute / Aesthetic Interface
    </div>
  </div>
</div>

<div class="container">

<!-- TOP CONTROLS -->
<div class="card">
  <div class="controls">
    <select onchange="setLang(this.value)">
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="bn">বাংলা</option>
      <option value="ta">தமிழ்</option>
      <option value="te">తెలుగు</option>
    </select>
    <button onclick="toggleStyle()">🎨 Style</button>
  </div>
</div>

${body}
</div>

<script>
/* ===== STYLE ===== */
const savedStyle = localStorage.getItem("uiStyle");
if(savedStyle){
  document.body.dataset.theme = savedStyle;
  document.getElementById("styleSelect").style.display="none";
}
function setStyle(s){
  localStorage.setItem("uiStyle",s);
  document.body.dataset.theme=s;
  document.getElementById("styleSelect").style.display="none";
}
function toggleStyle(){
  const next = document.body.dataset.theme === "tech" ? "cute" : "tech";
  setStyle(next);
}

/* ===== LANGUAGE ===== */
function setLang(l){
  localStorage.setItem("lang",l);
  location.reload();
}

/* ===== COPY ===== */
function copyCoupon(){
  const el=document.getElementById("coupon");
  if(!el) return;
  navigator.clipboard.writeText(el.innerText);
  alert("Copied");
}
</script>

</body>
</html>`;
}

/* ===== ROUTES ===== */

// HOME
app.get("/",(req,res)=>{
  const oid=generateOrderId();
  res.send(page("Genuine Shein Shop",`
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
</div>`));
});

// SUBMIT
app.post("/submit",(req,res)=>{
  db.run(
    `INSERT INTO orders(order_id,utr,status,created_at)
     VALUES(?,?, 'PENDING', datetime('now'))`,
    [req.body.order_id,req.body.utr],
    ()=>res.redirect(`/order/${req.body.order_id}`)
  );
});

// ORDER STATUS
app.get("/order/:id",(req,res)=>{
  db.get("SELECT * FROM orders WHERE order_id=?",[req.params.id],(e,o)=>{
    if(!o) return res.send("Order not found");
    let html=`<div class="card">
<h2>Order Status</h2>
<small>Order ID</small>
<div class="code">${o.order_id}</div>`;
    if(o.status==="APPROVED"){
      html+=`<div class="status approved">Approved</div>
<small>Your Coupon Code</small>
<div id="coupon" class="code">${o.coupon}</div>
<button onclick="copyCoupon()">Copy Coupon</button>`;
    }else{
      html+=`<div class="status pending">Under Verification</div>
<p><small>Refresh this page after approval.</small></p>
<button onclick="location.reload()">Refresh</button>`;
    }
    html+=`</div>`;
    res.send(page("Order Status",html,o.status!=="APPROVED"));
  });
});

// ADMIN
app.get("/admin",(req,res)=>{
  if(req.query.pass!==ADMIN_PASSWORD) return res.send("Unauthorized");
  db.all("SELECT * FROM orders ORDER BY id DESC",(e,rows)=>{
    res.send(page("Admin Panel",`
<div class="card">
<h2>Admin Panel</h2>
${rows.map(o=>`
<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
${o.order_id} | ${o.status}<br>
<input type="hidden" name="order_id" value="${o.order_id}">
<input name="coupon" placeholder="Coupon">
<button>Approve</button>
</form>`).join("")}
</div>`));
  });
});

// APPROVE
app.post("/approve",(req,res)=>{
  db.run(
    `UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?`,
    [req.body.coupon,req.body.order_id],
    ()=>res.redirect(`/admin?pass=${ADMIN_PASSWORD}`)
  );
});

app.listen(PORT,()=>console.log("System online"));
