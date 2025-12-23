import express from "express";
import sqlite3 from "sqlite3";
import https from "https";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CONFIG ===== */
const UPI_ID = "xxxpgn.332@ptyes";
const ADMIN_PASSWORD = "admin123";

/* ===== TELEGRAM CONFIG ===== */
const TG_BOT_TOKEN = "PASTE_BOT_TOKEN_HERE";
const TG_ADMIN_CHAT_ID = "PASTE_ADMIN_CHAT_ID_HERE";
/* =========================== */

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

/* ===== TELEGRAM SEND ===== */
function sendTelegram(message) {
  const data = JSON.stringify({
    chat_id: TG_ADMIN_CHAT_ID,
    text: message
  });

  const options = {
    hostname: "api.telegram.org",
    path: `/bot${TG_BOT_TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const req = https.request(options);
  req.on("error", () => {});
  req.write(data);
  req.end();
}

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

/* ===== RESET / FIXES ===== */
*, *::before, *::after {
  box-sizing: border-box;
}

/* ===== THEMES ===== */
body[data-theme="tech"]{
  --bg1:#05080d;
  --bg2:#08121f;
  --accent:#00eaff;
  --card:rgba(17,24,39,.92);
  --text:#e6edf3;
}
body[data-theme="cute"]{
  --bg1:#fff1f5;
  --bg2:#fde2e4;
  --accent:#ff5fa2;
  --card:rgba(255,255,255,.94);
  --text:#111;
}

body{
  margin:0;
  background:radial-gradient(circle at top,var(--bg2),var(--bg1));
  color:var(--text);
  font-family:system-ui,-apple-system,Segoe UI,Roboto;
  transition:background .4s,color .4s;
}

/* ===== ANIMATED BACKGROUND ===== */
body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  opacity:.06;
  background:
    linear-gradient(transparent 95%, var(--accent) 96%),
    linear-gradient(90deg, transparent 95%, var(--accent) 96%);
  background-size:60px 60px;
  animation:gridMove 25s linear infinite;
}
body[data-theme="cute"]::before{
  background:
    radial-gradient(circle at 20% 30%, #ffb3d9 0 6px, transparent 7px),
    radial-gradient(circle at 80% 40%, #ffcce6 0 5px, transparent 6px),
    radial-gradient(circle at 50% 70%, #ffd9ec 0 4px, transparent 5px);
  background-size:220px 220px;
  animation:float 18s ease-in-out infinite;
}
@keyframes gridMove { to{ transform:translateY(60px) } }
@keyframes float { 50%{ transform:translateY(-18px) } }

/* ===== UI ===== */
.container{
  max-width:540px;
  margin:auto;
  padding:26px;
}
.card{
  background:var(--card);
  border-radius:18px;
  padding:22px;
  margin-bottom:18px;
  box-shadow:0 0 30px rgba(0,0,0,.15);
}
h1,h2{
  color:var(--accent);
  margin-top:0;
}
.code{
  background:#00000012;
  padding:12px;
  border-radius:10px;
  font-family:monospace;
  margin:10px 0;
  word-break:break-all;
}
small{ opacity:.75 }

/* ===== INPUTS ===== */
input{
  width:100%;
  padding:14px;
  margin-top:12px;
  border-radius:14px;
  border:none;
  outline:none;
  font-size:15px;
  color:var(--text);
  background:rgba(0,0,0,.05);
  transition:.25s;
}

/* Jarvis polish */
body[data-theme="tech"] input{
  background:rgba(0,234,255,.08);
  border:1px solid rgba(0,234,255,.25);
}
body[data-theme="tech"] input::placeholder{
  color:#7fefff;
}

/* Cute clarity */
body[data-theme="cute"] input{
  background:#f3f3f3;
  border:1px solid #ffd0e2;
}

/* ===== BUTTONS ===== */
button{
  width:100%;
  padding:15px;
  margin-top:14px;
  background:var(--accent);
  border:none;
  border-radius:16px;
  font-weight:700;
  font-size:15px;
  cursor:pointer;
  transition:.25s;
}
button:hover{
  transform:translateY(-1px);
  box-shadow:0 8px 22px rgba(0,0,0,.25);
}

/* ===== STATUS ===== */
.status{
  display:inline-block;
  padding:6px 14px;
  border-radius:999px;
  margin-top:10px;
  font-size:14px;
}
.pending{ background:rgba(255,170,0,.15); color:#ff9800 }
.approved{ background:rgba(0,255,170,.15); color:#00b894 }

/* ===== TOP BAR ===== */
.controls{
  display:flex;
  justify-content:flex-end;
}
.controls button{
  width:auto;
  padding:10px 16px;
  margin:0;
}

/* ===== STYLE SELECT (FIRST VISIT) ===== */
#styleSelect{
  position:fixed;
  inset:0;
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
.tech{ background:#0b1220; color:#00eaff }
.cute{ background:#ffe4ef; color:#ff4d94 }

</style>
</head>

<body data-theme="tech">

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

<div class="card">
  <div class="controls">
    <button onclick="toggleStyle()">🎨 Style</button>
  </div>
</div>

${body}
</div>

<script>
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
  setStyle(document.body.dataset.theme==="tech"?"cute":"tech");
}
function copyCoupon(){
  const el=document.getElementById("coupon");
  if(!el) return;
  navigator.clipboard.writeText(el.innerText);
  alert("Coupon copied");
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
<input name="utr" placeholder="Enter UTR number" required>
<button>Submit Payment</button>
</form>
</div>`));
});

// SUBMIT (🔔 TELEGRAM NOTIFICATION)
app.post("/submit",(req,res)=>{
  db.run(
    `INSERT INTO orders(order_id,utr,status,created_at)
     VALUES(?,?, 'PENDING', datetime('now'))`,
    [req.body.order_id,req.body.utr],
    ()=>{
      sendTelegram(
        `🆕 Payment Submitted\nOrder: ${req.body.order_id}\nUTR: ${req.body.utr}`
      );
      res.redirect(`/order/${req.body.order_id}`);
    }
  );
});

// ORDER STATUS
app.get("/order/:id",(req,res)=>{
  db.get("SELECT * FROM orders WHERE order_id=?",[req.params.id],(e,o)=>{
    if(!o) return res.send("Order not found");
    let html=`<div class="card">
<h2>Order Status</h2>
<div class="code">${o.order_id}</div>`;
    if(o.status==="APPROVED"){
      html+=`
<div class="status approved">Approved</div>
<div id="coupon" class="code">${o.coupon}</div>
<button onclick="copyCoupon()">Copy Coupon</button>`;
    }else{
      html+=`
<div class="status pending">Under verification</div>
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
<div class="card">
<strong>${o.order_id}</strong><br>
<div class="code">UTR: ${o.utr || "-"}</div>
${o.status==="APPROVED"
? `<div class="status approved">APPROVED</div>
   <div class="code">${o.coupon}</div>`
: `<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
    <input type="hidden" name="order_id" value="${o.order_id}">
    <input name="coupon" placeholder="Coupon code" required>
    <button>Approve</button>
   </form>`}
</div>
`).join("")}
</div>`));
  });
});

// APPROVE (🔔 TELEGRAM NOTIFICATION)
app.post("/approve",(req,res)=>{
  db.run(
    `UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?`,
    [req.body.coupon,req.body.order_id],
    ()=>{
      sendTelegram(
        `✅ Order Approved\nOrder: ${req.body.order_id}\nCoupon: ${req.body.coupon}`
      );
      res.redirect(`/admin?pass=${ADMIN_PASSWORD}`);
    }
  );
});

app.listen(PORT,()=>console.log("System online"));
