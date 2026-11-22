/* ============ ongba.js — app ben Ong/Ba (du lieu tu server) ============ */
(function () {
  'use strict';
  var $ = ABM.$, $$ = ABM.$$, esc = ABM.esc, hm = ABM.hm, when = ABM.when, toast = ABM.toast;

  var ST = null, lastRev = -1;

  /* ---------- Dong bo voi server (poll 4 giay) ---------- */
  function applyState(s, silent) {
    var changed = s.rev !== lastRev;
    ST = s; lastRev = s.rev;
    if (changed || !silent) renderAll();
  }
  async function poll() {
    try {
      var s = await ABM.get('/api/state');
      applyState(s, true);
    } catch (e) { /* mat ket noi — thu lan sau */ }
  }
  async function act(p, body) {
    var s = await ABM.api(p, body || {});
    if (s && s.ok) applyState(s);
    return s;
  }
  setInterval(poll, 4000);

  /* ---------- Header ---------- */
  $('#btnSwitch').addEventListener('click', function () { ABM.switchRole(); });
  $('#btnLogout').addEventListener('click', function () { ABM.logout(); });

  /* ---------- Chuyen man ---------- */
  function gshow(id) {
    $$('.gp-screen').forEach(function (s) { s.hidden = (s.id !== id); });
    $('#appBody').scrollTop = 0;
    if (id === 'gpXQ') { if (!XQ.inited) xqInit(); else xqRender(); }
    if (id === 'gpMem') { if (!MEM.inited) memInit(); }
  }
  $$('.js-gpback').forEach(function (b) { b.addEventListener('click', function () { gshow('gpHome'); }); });
  $('#appBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'call') $('#gpCallModal').classList.add('show');
    else if (a === 'msg') { gshow('gpMsgs'); renderThread($('#gpMsgList'), 'gp'); }
    else if (a === 'ai') { gshow('gpAI'); renderAI(); }
    else if (a === 'games') gshow('gpGames');
    else if (a === 'xq') gshow('gpXQ');
    else if (a === 'mem') gshow('gpMem');
  });

  /* ---------- Loi chao ---------- */
  function updateGreet() {
    if (!ST) return;
    var d = new Date(), h = d.getHours(), g = 'buổi tối';
    if (h < 11) g = 'buổi sáng'; else if (h < 14) g = 'buổi trưa'; else if (h < 18) g = 'buổi chiều';
    $('#gpGreet').textContent = 'Chào ' + ST.elderName + ' 👋 Chúc bạn ' + g + ' tốt lành!';
    $('#gpDate').textContent = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' • ' + hm(d);
  }
  setInterval(function () { if (ST) updateGreet(); }, 30000);

  /* ---------- Render trang chinh ---------- */
  function renderAll() {
    if (!ST) return;
    $('#famChip').textContent = 'Gia đình ' + ST.code;
    updateGreet();

    var notes = (ST.notes || []).slice(0, 4);
    $('#gpNotes').innerHTML = notes.length
      ? notes.map(function (n) {
          return '<div class="note-gp"><span class="from">💌 ' + esc(n.from) + ' · ' + when(n.t) + '</span>' + esc(n.txt) + '</div>';
        }).join('')
      : '<div class="empty-gp">Chưa có lời nhắn nào. Con cháu gửi lời nhắn sẽ hiện ngay tại đây!</div>';

    var list = (ST.rems || []).filter(function (r) { return !r.done; })
      .slice().sort(function (a, b) { return a.time.localeCompare(b.time); });
    $('#gpRems').innerHTML = list.length
      ? list.map(function (r) {
          return '<div class="rem-gp"><span class="rem-time">🕐 ' + esc(r.time) + '</span><span>' + esc(r.title) + '</span><button class="rem-done" data-id="' + r.id + '">✓ Xong</button></div>';
        }).join('')
      : '<div class="empty-gp">Hôm nay không có việc gì phải nhớ cả. Thư giãn nhé ạ! ☕</div>';
  }

  /* ---------- Nut TOI ON + SOS ---------- */
  $('#btnOk').addEventListener('click', async function () {
    var b = $('#btnOk');
    b.classList.remove('burst'); void b.offsetWidth; b.classList.add('burst');
    b.textContent = '✓ ĐANG GỬI...';
    var s = await act('/api/ok');
    b.textContent = s && s.ok ? '✓ ĐÃ BÁO RỒI' : '✅ TÔI ỔN';
    if (s && s.ok) toast('❤️ Đã báo cho con cháu: “vẫn khỏe!”');
    setTimeout(function () { b.textContent = '✅ TÔI ỔN'; }, 2000);
  });
  $('#btnSos').addEventListener('click', async function () {
    await act('/api/sos');
    $('#sosOv').classList.add('show');
  });
  $('#btnSosSafe').addEventListener('click', async function () {
    $('#sosOv').classList.remove('show');
    await act('/api/safe');
    toast('Phù, may quá ạ! 🥰');
  });

  /* ---------- Danh dau viec da lam ---------- */
  $('#gpRems').addEventListener('click', function (e) {
    var b = e.target.closest('.rem-done'); if (!b) return;
    act('/api/rem/done', { id: b.getAttribute('data-id') });
    toast('Tốt lắm ạ! 👏 Con cháu rất vui');
  });

  /* ---------- Goi dien mo phong ---------- */
  var callTimer = null, callInt = null;
  function startCall(name, ava) {
    $('#callName').textContent = name; $('#callAva').textContent = ava;
    var st = $('#callState'); st.textContent = 'Đang gọi...';
    $('#callModal').classList.add('show');
    clearTimeout(callTimer); clearInterval(callInt);
    callTimer = setTimeout(function () {
      var s = 0;
      st.textContent = 'Đang nói chuyện (mô phỏng)';
      callInt = setInterval(function () { s++; st.textContent = 'Đang nói chuyện — 0' + Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }, 1000);
    }, 2000);
  }
  function endCall() { clearTimeout(callTimer); clearInterval(callInt); $('#callModal').classList.remove('show'); }
  $('#btnCallEnd').addEventListener('click', endCall);
  $('#callModal').addEventListener('click', function (e) { if (e.target === this) endCall(); });
  $$('.contact').forEach(function (c) {
    c.addEventListener('click', function () {
      $('#gpCallModal').classList.remove('show');
      startCall(c.getAttribute('data-name'), c.getAttribute('data-ava'));
    });
  });
  $$('.js-mclose').forEach(function (b) { b.addEventListener('click', function () { b.closest('.modal').classList.remove('show'); }); });
  $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); }); });

  /* ---------- Tin nhan 2 chieu ---------- */
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
    if (s && s.ok) { renderThread($('#gpMsgList'), 'gp'); }
  }
  $$('.gp-chip').forEach(function (b) { b.addEventListener('click', function () { sendMsg(b.getAttribute('data-text')); }); });

  /* ---------- Tro ly AI (mo phong, chay tai may) ---------- */
  var AI = [];
  var AI_RULES = [
    [/thuốc|uống/i, 'Dạ bà nhớ uống thuốc đúng giờ, sau khi ăn nhẹ nhé! Con đã ghi ở phần “Việc cần làm” rồi ạ 💊'],
    [/thời tiết|trời/i, 'Dạ hôm nay trời nắng nhẹ, nhiệt độ khoảng 27 độ. Bà nhớ uống đủ nước và đội nón khi đi dạo nhé ạ ☀️'],
    [/cười|chuyện|kể/i, 'Dạ có chú quạ học nói cả tuần mới được câu “Chào ông cháu đi chợ về!”, ai nghe cũng phải bật cười ạ 😄'],
    [/gọi|gặp|minh|hương/i, 'Dạ bà muốn gặp con cháu à? Bà bấm nút “Gọi con cháu” ở trang chính là gọi được ngay ạ 📞'],
    [/ốm|mệt|đau|khỏe/i, 'Dạ bà có thấy mệt chỗ nào không ạ? Nếu khó chịu, bà hãy bấm NÚT ĐỎ “KHẨN CẤP” dưới màn hình, con cháu sẽ biết ngay ạ ❤️'],
    [/cờ|chơi|game/i, 'Dạ vào mục “Trò chơi” có cờ tướng và trò ghép đôi vui lắm đó bà! Chơi nhẹ cho vui trí nhớ nhé ạ ♟️'],
    [/cảm ơn/i, 'Dạ không có gì ạ, giúp bà là niềm vui của con mà ạ 😊❤️']
  ];
  var AI_FALLBACK = [
    'Dạ con nghe bà đây ạ! Bà muốn nhắc thuốc, xem thời tiết hay nghe chuyện vui ạ?',
    'Dạ con là trợ lý của AloBaMa, luôn bên bà ạ. Bà cứ hỏi con bất cứ điều gì nhé ❤️',
    'Câu này con chưa biết trả lời, nhưng con chắc chắn con cháu bà rất thương bà ạ 🥰'
  ];
  var aiFi = 0;
  function aiReply(q) {
    for (var i = 0; i < AI_RULES.length; i++) { if (AI_RULES[i][0].test(q)) return AI_RULES[i][1]; }
    var t = AI_FALLBACK[aiFi % AI_FALLBACK.length]; aiFi++; return t;
  }
  function renderAI() {
    var el = $('#aiList');
    el.innerHTML = AI.map(function (m) {
      return '<div class="msg ' + (m.who === 'ai' ? 'them' : 'me') + '">' + esc(m.text) + '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
  }
  function sendAI(q) {
    q = String(q || '').trim(); if (!q) return;
    AI.push({ who: 'gp', text: q }); renderAI();
    var list = $('#aiList');
    var ty = document.createElement('div');
    ty.className = 'msg them typing'; ty.innerHTML = '<span></span><span></span><span></span>';
    list.appendChild(ty); list.scrollTop = list.scrollHeight;
    setTimeout(function () { AI.push({ who: 'ai', text: aiReply(q) }); renderAI(); }, 950);
  }
  $$('.ai-chip').forEach(function (b) { b.addEventListener('click', function () { sendAI(b.getAttribute('data-q')); }); });

  /* ================== CO TUONG ================== */
  var XQ = { b: null, turn: 'r', sel: null, over: false, inited: false };
  var CH = { r: { K: '帥', A: '仕', B: '相', N: '傌', R: '俥', C: '炮', P: '兵' }, b: { K: '將', A: '士', B: '象', N: '馬', R: '車', C: '砲', P: '卒' } };
  function xqInit() {
    XQ.b = []; for (var r = 0; r < 10; r++) { XQ.b.push([null, null, null, null, null, null, null, null, null]); }
    var back = ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'];
    for (var i = 0; i < 9; i++) { XQ.b[0][i] = { t: back[i], c: 'b' }; XQ.b[9][i] = { t: back[i], c: 'r' }; }
    XQ.b[2][1] = { t: 'C', c: 'b' }; XQ.b[2][7] = { t: 'C', c: 'b' };
    XQ.b[7][1] = { t: 'C', c: 'r' }; XQ.b[7][7] = { t: 'C', c: 'r' };
    [0, 2, 4, 6, 8].forEach(function (i) { XQ.b[3][i] = { t: 'P', c: 'b' }; XQ.b[6][i] = { t: 'P', c: 'r' }; });
    XQ.turn = 'r'; XQ.sel = null; XQ.over = false; XQ.inited = true;
    $('#xqOver').hidden = true; xqRender();
  }
  function inPalace(r, c, col) { return c >= 3 && c <= 5 && (col === 'b' ? (r <= 2) : (r >= 7)); }
  function kingsFace() {
    var K = null, k = null;
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = XQ.b[r][c]; if (!p) continue;
      if (p.t === 'K') K = [r, c]; if (p.t === 'k') k = [r, c];
    }
    if (!K || !k) return false;
    if (K[1] !== k[1]) return false;
    for (var rr = Math.min(K[0], k[0]) + 1; rr < Math.max(K[0], k[0]); rr++) { if (XQ.b[rr][K[1]]) return false; }
    return true;
  }
  function leavesFace(r, c, rr, cc) {
    var p = XQ.b[r][c], cap = XQ.b[rr][cc];
    XQ.b[rr][cc] = p; XQ.b[r][c] = null;
    var f = kingsFace();
    XQ.b[r][c] = p; XQ.b[rr][cc] = cap;
    return f;
  }
  function legalMoves(r, c) {
    var p = XQ.b[r][c]; if (!p) return [];
    var res = [];
    function push(rr, cc) {
      if (rr < 0 || rr > 9 || cc < 0 || cc > 8) return;
      var q = XQ.b[rr][cc]; if (q && q.c === p.c) return;
      if (leavesFace(r, c, rr, cc)) return;
      res.push([rr, cc]);
    }
    var i, d, rr, cc, q;
    if (p.t === 'R') {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (i = 0; i < 4; i++) { d = dirs[i]; rr = r + d[0]; cc = c + d[1];
        while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) { q = XQ.b[rr][cc];
          if (!q) { res.push([rr, cc]); } else { if (q.c !== p.c) res.push([rr, cc]); break; }
          rr += d[0]; cc += d[1]; } }
    } else if (p.t === 'C') {
      var dirs2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (i = 0; i < 4; i++) { d = dirs2[i]; rr = r + d[0]; cc = c + d[1]; var jump = false;
        while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) { q = XQ.b[rr][cc];
          if (!jump) { if (!q) res.push([rr, cc]); else jump = true; }
          else { if (q) { if (q.c !== p.c) res.push([rr, cc]); break; } }
          rr += d[0]; cc += d[1]; } }
    } else if (p.t === 'N') {
      var H = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];
      for (i = 0; i < H.length; i++) {
        rr = r + H[i][0]; cc = c + H[i][1];
        if (rr < 0 || rr > 9 || cc < 0 || cc > 8) continue;
        var lr = r + H[i][2], lc = c + H[i][3];
        if (lr < 0 || lr > 9 || lc < 0 || lc > 8) continue;
        if (!XQ.b[lr][lc]) push(rr, cc);
      }
    } else if (p.t === 'B') {
      var E = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
      for (i = 0; i < E.length; i++) {
        rr = r + E[i][0]; cc = c + E[i][1];
        if (rr < 0 || rr > 9 || cc < 0 || cc > 8) continue;
        if (p.c === 'r' && rr < 5) continue; if (p.c === 'b' && rr > 4) continue;
        if (XQ.b[r + E[i][0] / 2][c + E[i][1] / 2]) continue;
        push(rr, cc);
      }
    } else if (p.t === 'A') {
      var A = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (i = 0; i < A.length; i++) { rr = r + A[i][0]; cc = c + A[i][1]; if (inPalace(rr, cc, p.c)) push(rr, cc); }
    } else if (p.t === 'K') {
      var K2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (i = 0; i < K2.length; i++) { rr = r + K2[i][0]; cc = c + K2[i][1]; if (inPalace(rr, cc, p.c)) push(rr, cc); }
    } else if (p.t === 'P') {
      var fwd = p.c === 'r' ? -1 : 1;
      push(r + fwd, c);
      var crossed = p.c === 'r' ? r <= 4 : r >= 5;
      if (crossed) { push(r, c - 1); push(r, c + 1); }
    }
    return res;
  }
  function xqRender() {
    var box = $('#xqPieces'); if (!box) return;
    var html = '';
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = XQ.b[r][c]; if (!p) continue;
      var left = ((50 + c * 100) / 9).toFixed(3), top = (5 + r * 10).toFixed(1);
      var sel = (XQ.sel && XQ.sel[0] === r && XQ.sel[1] === c) ? ' sel' : '';
      html += '<button class="pc ' + p.c + sel + '" style="left:' + left + '%;top:' + top + '%" data-r="' + r + '" data-c="' + c + '" aria-label="quân cờ">' + CH[p.c][p.t] + '</button>';
    }
    if (XQ.sel && !XQ.over) {
      var mv = legalMoves(XQ.sel[0], XQ.sel[1]);
      for (var i = 0; i < mv.length; i++) {
        var rr2 = mv[i][0], cc2 = mv[i][1];
        var l2 = ((50 + cc2 * 100) / 9).toFixed(3), t2 = (5 + rr2 * 10).toFixed(1);
        html += '<button class="dot' + (XQ.b[rr2][cc2] ? ' cap' : '') + '" style="left:' + l2 + '%;top:' + t2 + '%" data-r="' + rr2 + '" data-c="' + cc2 + '" aria-label="nước đi"></button>';
      }
    }
    box.innerHTML = html;
    var tu = $('#xqTurn');
    if (tu) tu.textContent = XQ.over ? '🏁 Ván đã kết thúc' : (XQ.turn === 'r' ? '🔴 Lượt của ĐỎ (bên dưới)' : '⚫ Lượt của ĐEN (bên trên)');
  }
  $('#xqPieces').addEventListener('click', function (e) {
    var btn = e.target.closest('button'); if (!btn || XQ.over) return;
    var r = +btn.getAttribute('data-r'), c = +btn.getAttribute('data-c');
    if (btn.classList.contains('dot')) { xqMove(r, c); return; }
    var p = XQ.b[r][c]; if (!p) return;
    if (p.c === XQ.turn) { XQ.sel = (XQ.sel && XQ.sel[0] === r && XQ.sel[1] === c) ? null : [r, c]; xqRender(); return; }
    if (XQ.sel) {
      var mv = legalMoves(XQ.sel[0], XQ.sel[1]);
      for (var i = 0; i < mv.length; i++) { if (mv[i][0] === r && mv[i][1] === c) { xqMove(r, c); return; } }
    }
  });
  function xqMove(rr, cc) {
    var r = XQ.sel[0], c = XQ.sel[1];
    var p = XQ.b[r][c], cap = XQ.b[rr][cc];
    XQ.b[rr][cc] = p; XQ.b[r][c] = null; XQ.sel = null;
    if (cap && cap.t === 'K') {
      XQ.over = true; xqRender();
      $('#xqOver').hidden = false;
      $('#xqOverMsg').textContent = p.c === 'r' ? '🎉 ĐỎ THẮNG! Đã bắt được Tướng đen' : '🎉 ĐEN THẮNG! Đã bắt được Tướng đỏ';
      return;
    }
    XQ.turn = (XQ.turn === 'r') ? 'b' : 'r'; xqRender();
  }
  $('#btnXQNew').addEventListener('click', xqInit);
  $('#btnXQAgain').addEventListener('click', xqInit);

  /* ================== TRO GHEP DOI ================== */
  var MEM = { deck: [], open: [], lock: false, moves: 0, inited: false };
  var MEMO = ['🌸', '🍊', '🐥', '🎸', '☕', '🌳'];
  function memInit() {
    var all = MEMO.concat(MEMO).map(function (e) { return { e: e, open: false, done: false }; });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = all[i]; all[i] = all[j]; all[j] = x; }
    MEM.deck = all; MEM.open = []; MEM.lock = false; MEM.moves = 0; MEM.inited = true;
    $('#memMoves').textContent = 'Lượt lật: 0'; memRender();
  }
  function memRender() {
    $('#memGrid').innerHTML = MEM.deck.map(function (c, i) {
      return '<button class="mem' + ((c.open || c.done) ? ' flip' : '') + (c.done ? ' done' : '') + '" data-i="' + i + '">' +
        '<span class="face back">❓</span><span class="face front">' + c.e + '</span></button>';
    }).join('');
  }
  $('#memGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.mem'); if (!b || MEM.lock) return;
    var i = +b.getAttribute('data-i'), card = MEM.deck[i];
    if (card.done || card.open) return;
    card.open = true; MEM.open.push(i); memRender();
    if (MEM.open.length === 2) {
      MEM.moves++; $('#memMoves').textContent = 'Lượt lật: ' + MEM.moves; MEM.lock = true;
      var a1 = MEM.deck[MEM.open[0]], a2 = MEM.deck[MEM.open[1]];
      setTimeout(function () {
        if (a1.e === a2.e) { a1.done = true; a2.done = true; }
        else { a1.open = false; a2.open = false; }
        MEM.open = []; MEM.lock = false; memRender();
        if (MEM.deck.every(function (x) { return x.done; })) toast('🎉 Giỏi quá! Hoàn thành trong ' + MEM.moves + ' lượt');
      }, 650);
    }
  });
  $('#btnMemNew').addEventListener('click', memInit);

  /* ---------- Khoi dong ---------- */
  poll();
})();
