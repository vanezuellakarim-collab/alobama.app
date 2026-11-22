/* ============ conchau.js — app ben Con chau (du lieu tu server) ============ */
(function () {
  'use strict';
  var $ = ABM.$, $$ = ABM.$$, esc = ABM.esc, hm = ABM.hm, when = ABM.when, toast = ABM.toast;

  var ST = null, lastRev = -1;

  /* ---------- Dong bo (poll 4 giay — nhan su kien tu ben Ong/Ba) ---------- */
  function sameDay(t) { var a = new Date(t), b = new Date(); return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }
  function applyState(s) {
    var first = !ST;
    ST = s;
    var changed = s.rev !== lastRev;
    lastRev = s.rev;
    if (changed || first) { renderAll(); }
    var d = new Date();
    $('#syncTxt').textContent = 'Đã đồng bộ ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }
  async function poll() {
    try {
      var s = await ABM.get('/api/state');
      applyState(s);
    } catch (e) { $('#syncTxt').textContent = '⚠️ Mất kết nối — thử lại…'; }
  }
  setInterval(poll, 4000);

  async function act(p, body) {
    var s = await ABM.api(p, body || {});
    if (s && s.ok) applyState(s);
    return s;
  }

  /* ---------- Header ---------- */
  $('#btnSwitch').addEventListener('click', function () { ABM.switchRole(); });
  $('#btnLogout').addEventListener('click', function () { ABM.logout(); });

  /* ---------- Render toan bo ---------- */
  var EV_ICON = { ok: '✅', sos: '🚨', safe: '🛡️', msg: '💬', note: '💌', rem: '⏰' };
  function renderAll() {
    if (!ST) return;
    $('#famChip').textContent = 'Gia đình ' + ST.code;
    $('#famName').textContent = ST.elderName;
    $('#famPlan').textContent = ST.plan === 'year' ? 'Gói Năm' : 'Gói Tháng';

    var st = $('#famStatus');
    if (ST.lastOk && sameDay(ST.lastOk)) { st.textContent = 'Ổn ✓ — “Tôi ổn” lúc ' + hm(ST.lastOk); st.className = 'pill ok'; }
    else { st.textContent = 'Chưa có tín hiệu hôm nay'; st.className = 'pill idle'; }

    $('#famEvents').innerHTML = (ST.events || []).map(function (e) {
      return '<div class="ev ' + e.type + '"><span class="ev-ic">' + (EV_ICON[e.type] || '🔔') + '</span><div><div class="ev-tx">' + esc(e.text) + '</div><div class="ev-tm">' + when(e.t) + '</div></div></div>';
    }).join('') || '<div class="ev"><span class="ev-ic">🔔</span><div class="ev-tx">Chưa có thông báo nào</div></div>';

    $('#famNotes').innerHTML = (ST.notes || []).map(function (n) {
      return '<div class="note-admin-item"><div><div class="na-tx">💌 ' + esc(n.txt) + '</div><div class="na-meta">' + esc(n.from) + ' · Gửi ' + when(n.t).toLowerCase() + ' · đang hiện trên máy bà</div></div><button class="del" data-id="' + n.id + '" data-kind="note" aria-label="Xóa ghi chú">🗑</button></div>';
    }).join('') || '<div class="na-meta" style="padding:6px 0">Chưa có ghi chú nào — gửi lời đầu tiên cho bà nhé!</div>';

    $('#famRems').innerHTML = (ST.rems || []).map(function (r) {
      return '<div class="rem-admin"><span class="ra-time">' + esc(r.time) + '</span><div class="ra-mid"><b>' + esc(r.title) + '</b><small>' + (r.rep === 'daily' ? 'Hàng ngày' : 'Một lần') + (r.done ? ' • ✓ Bà đã làm' : '') + '</small></div><button class="del" data-id="' + r.id + '" data-kind="rem" aria-label="Xóa nhắc lịch">🗑</button></div>';
    }).join('') || '<div class="na-meta" style="padding:6px 0">Chưa có lịch nhắc nào.</div>';

    renderThread($('#famMsgList'), 'fam');

    var pin = $('#mapPin');
    if (pin && ST.loc) { pin.style.left = ST.loc.x + '%'; pin.style.top = ST.loc.y + '%'; }
    $('#locTime').textContent = ST.loc ? 'Cập nhật ' + when(ST.loc.updatedAt).toLowerCase() : '—';

    checkBanner();
  }

  function checkBanner() {
    var last = (ST.events || [])[0], b = $('#famBanner');
    if (last && last.type === 'sos') {
      b.hidden = false;
      $('#famBannerWho').textContent = ST.elderName;
      $('#famBannerTime').textContent = ' lúc ' + hm(last.t) + ' — hãy gọi ngay cho bà!';
    } else { b.hidden = true; }
  }

  /* ---------- Xoa ghi chu / nhac lich ---------- */
  $('#famNotes').addEventListener('click', function (e) {
    var b = e.target.closest('.del'); if (!b || b.getAttribute('data-kind') !== 'note') return;
    act('/api/note/delete', { id: b.getAttribute('data-id') });
    toast('Đã xóa ghi chú');
  });
  $('#famRems').addEventListener('click', function (e) {
    var b = e.target.closest('.del'); if (!b || b.getAttribute('data-kind') !== 'rem') return;
    act('/api/rem/delete', { id: b.getAttribute('data-id') });
    toast('Đã xóa lịch nhắc');
  });

  /* ---------- Gui ghi chu ---------- */
  $('#noteTxt').addEventListener('input', function () { $('#noteCount').textContent = this.value.length + '/120 ký tự'; });
  $('#btnNoteSend').addEventListener('click', async function () {
    var v = $('#noteTxt').value.trim();
    if (!v) { toast('Bạn chưa nhập nội dung ghi chú'); return; }
    var s = await act('/api/note', { text: v });
    if (s && s.ok) { $('#noteTxt').value = ''; $('#noteCount').textContent = '0/120 ký tự'; toast('💌 Đã gửi — hiện ngay trên màn hình của bà!'); }
  });

  /* ---------- Them nhac lich ---------- */
  $('#btnRemAdd').addEventListener('click', async function () {
    var t = $('#remTitle').value.trim(), tm = $('#remTime').value;
    if (!t) { toast('Bạn chưa nhập việc cần nhắc'); return; }
    var s = await act('/api/rem', { title: t, time: tm, rep: $('#remRep').value });
    if (s && s.ok) { $('#remTitle').value = ''; toast('⏰ Đã đặt — bà sẽ thấy ở phần “Việc cần làm”'); }
  });

  /* ---------- Tin nhan ---------- */
  function renderThread(el, me) {
    if (!el || !ST) return;
    el.innerHTML = (ST.msgs || []).map(function (m) {
      return '<div class="msg ' + (m.who === me ? 'me' : 'them') + '">' + esc(m.text) + '<span class="msg-t">' + hm(m.t) + '</span></div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
  }
  async function sendMsg(text) {
    text = String(text || '').trim(); if (!text) return;
    var s = await act('/api/msg', { text: text });
    if (s && s.ok) renderThread($('#famMsgList'), 'fam');
  }
  $$('.fam-chip').forEach(function (b) { b.addEventListener('click', function () { sendMsg(b.getAttribute('data-text')); }); });
  $('#btnFamSend').addEventListener('click', function () { var i = $('#famMsgTxt'); sendMsg(i.value); i.value = ''; i.focus(); });
  $('#famMsgTxt').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#btnFamSend').click(); });

  /* ---------- Vi tri ---------- */
  $('#btnLocRefresh').addEventListener('click', async function () {
    var s = await act('/api/loc');
    if (s && s.ok) { var pin = $('#mapPin'); pin.style.left = ST.loc.x + '%'; pin.style.top = ST.loc.y + '%'; toast('📍 Đã cập nhật vị trí của bà'); }
  });

  /* ---------- Quick actions + cuoc goi mo phong ---------- */
  function startCall(name, ava) {
    $('#callName').textContent = name; $('#callAva').textContent = ava;
    var st = $('#callState'); st.textContent = 'Đang gọi...';
    $('#callModal').classList.add('show');
    clearTimeout(startCall._t); clearInterval(startCall._i);
    startCall._t = setTimeout(function () {
      var s = 0;
      st.textContent = 'Đang nói chuyện (mô phỏng)';
      startCall._i = setInterval(function () { s++; st.textContent = 'Đang nói chuyện — 0' + Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }, 1000);
    }, 2000);
  }
  function endCall() { clearTimeout(startCall._t); clearInterval(startCall._i); $('#callModal').classList.remove('show'); }
  $('#btnCallEnd').addEventListener('click', endCall);
  $('#callModal').addEventListener('click', function (e) { if (e.target === this) endCall(); });
  $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); }); });
  $$('.js-mclose').forEach(function (b) { b.addEventListener('click', function () { b.closest('.modal').classList.remove('show'); }); });

  $('#qaCall').addEventListener('click', function () { startCall(ST.elderName, '👵'); });
  $('#btnBannerCall').addEventListener('click', function () { startCall(ST.elderName, '👵'); });
  $('#qaNote').addEventListener('click', function () { $('#secNotes').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { $('#noteTxt').focus(); }, 450); });
  $('#qaRem').addEventListener('click', function () { $('#secRems').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { $('#remTitle').focus(); }, 450); });
  $('#qaLoc').addEventListener('click', function () { $('#secLoc').scrollIntoView({ behavior: 'smooth' }); });
  $('#btnBannerSafe').addEventListener('click', async function () {
    await act('/api/safe');
    toast('Đã ghi nhận. Rất may mọi chuyện đều ổn 🙏');
  });

  /* ---------- Xem TK ong/ba ---------- */
  $('#btnGpInfo').addEventListener('click', function () {
    if (ST.gpLogin) {
      $('#giU').textContent = ST.gpLogin.u;
      $('#giP').textContent = ST.gpLogin.pin;
      $('#gpInfoModal').classList.add('show');
    }
  });
  $$('.copy').forEach(function (b) {
    b.addEventListener('click', function () { ABM.copyText($('#' + b.getAttribute('data-copy')).textContent); });
  });

  /* ---------- Khoi dong ---------- */
  poll();
})();
