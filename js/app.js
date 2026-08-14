const { api, getToken, setToken } = window.AcademyAPI;

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const state = {
  user: null,
  dashboard: null,
  studySessionId: null,
  sessionType: null,
  words: [],
  currentIndex: 0,
  originalWordCount: 0,
  retryQueue: [],
  results: null,
  sessionStats: null
};

function emptySessionStats() {
  return {
    correctFirstTry: 0,
    correctAfterRetry: 0,
    difficultCount: 0,
    starsEarned: 0,
    processedCount: 0,
    recoveredCount: 0,
    stillDifficultCount: 0,
    completedWordIds: new Set()
  };
}

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('academy_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) sessionStorage.setItem('academy_user', JSON.stringify(user));
    else sessionStorage.removeItem('academy_user');
  } catch {}
}
const icons = { home:'⌂', new:'🚀', review:'↻', difficult:'◇', progress:'◒', dictionary:'▤', settings:'⚙', logout:'↪' };

function escapeHTML(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function showToast(message, type='') { toast.textContent=message; toast.className=`toast show ${type}`; clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.className='toast', 3500); }
function buttonLoading(btn, on, label='Отправляем…') { if(!btn) return; if(on){btn.dataset.label=btn.innerHTML; btn.innerHTML=`<span class="spinner"></span>${label}`; btn.disabled=true;} else {btn.innerHTML=btn.dataset.label||btn.innerHTML; btn.disabled=false;} }
function displayName(){ return state.user?.displayName || state.user?.display_name || state.dashboard?.displayName || 'курсант'; }
function formatDate(value){ if(!value) return 'Дата пока не назначена'; const d=new Date(value); return Number.isNaN(d.valueOf())?'Дата пока не назначена':new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(d); }

function renderLogin(prefillLogin='', successMessage=''){
  app.innerHTML=`<section class="login-shell">
    <div class="login-story"><div class="brand"><span class="brand-mark">🚀</span><span>Космическая<br>академия слов</span></div><div class="robot-frame"><img src="./assets/illustrations/robot-guide.png" alt="Робот-проводник Академии"></div><div class="story-copy"><span class="eyebrow">ДОБРО ПОЖАЛОВАТЬ НА БОРТ</span><h1>Слова — это твоя<br><em>суперсила</em></h1><p>Тренируй память. Собирай звёзды.<br>Осваивай сложные слова.</p></div></div>
    <div class="login-panel"><form id="login-form" class="login-card"><div class="mini-planet">✦</div><span class="eyebrow">СИСТЕМА ГОТОВА</span><h2>Вход в академию</h2><p>Введи данные курсанта, чтобы продолжить миссию.</p>${successMessage?`<div class="form-error" style="color:#7ee6bd;border-color:rgba(126,230,189,.35);background:rgba(126,230,189,.08)">${escapeHTML(successMessage)}</div>`:''}<label>Логин<input name="login" autocomplete="username" required placeholder="Твой логин" value="${escapeHTML(prefillLogin)}"></label><label>Пароль<div class="password-wrap"><input name="password" type="password" autocomplete="current-password" required placeholder="Твой пароль"><button type="button" class="eye" aria-label="Показать пароль">◉</button></div></label><div id="login-error" class="form-error" role="alert"></div><button class="cta wide" type="submit">Войти в академию <span>→</span></button><button type="button" id="open-register" style="width:100%;margin-top:12px;padding:11px 14px;border:1px solid rgba(126,160,236,.28);border-radius:12px;background:rgba(126,160,236,.06);color:#c7d4f4;font:inherit;font-weight:700;cursor:pointer">Впервые здесь? Зарегистрироваться</button></form></div>
  </section>`;
  bindPasswordEyes();
  document.querySelector('#login-form').onsubmit=login;
  document.querySelector('#open-register').onclick=renderRegister;
}

function bindPasswordEyes(){
  document.querySelectorAll('.eye').forEach(button=>{
    button.onclick=e=>{
      const input=e.currentTarget.previousElementSibling;
      input.type=input.type==='password'?'text':'password';
    };
  });
}

function renderRegister(){
  app.innerHTML=`<section class="login-shell">
    <div class="login-story"><div class="brand"><span class="brand-mark">🚀</span><span>Космическая<br>академия слов</span></div><div class="robot-frame"><img src="./assets/illustrations/robot-guide.png" alt="Робот-проводник Академии"></div><div class="story-copy"><span class="eyebrow">ПЕРВЫЙ ВЫХОД НА ОРБИТУ</span><h1>Стань курсантом<br><em>Академии</em></h1><p>Введи код класса от учителя<br>и создай свои данные для входа.</p></div></div>
    <div class="login-panel"><form id="register-form" class="login-card"><div class="mini-planet">✦</div><span class="eyebrow">РЕГИСТРАЦИЯ КУРСАНТА</span><h2>Создать аккаунт</h2><p>Код класса выдаёт учитель. Логин и пароль придумай сам.</p><label>Имя<input name="displayName" autocomplete="name" required minlength="2" maxlength="64" placeholder="Например, Маша"></label><label>Код класса<input name="joinCode" autocomplete="off" required minlength="4" maxlength="32" placeholder="Например, 6A-KOSMOS" style="text-transform:uppercase"></label><label>Логин<input name="login" autocomplete="username" required minlength="3" maxlength="64" placeholder="Придумай логин"></label><label>Пароль<div class="password-wrap"><input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="Не меньше 8 символов"><button type="button" class="eye" aria-label="Показать пароль">◉</button></div></label><label>Повтори пароль<div class="password-wrap"><input name="passwordRepeat" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="Повтори пароль"><button type="button" class="eye" aria-label="Показать пароль">◉</button></div></label><div id="register-error" class="form-error" role="alert"></div><button class="cta wide" type="submit">Зарегистрироваться <span>→</span></button><button type="button" id="back-login" style="width:100%;margin-top:12px;padding:11px 14px;border:1px solid rgba(126,160,236,.28);border-radius:12px;background:rgba(126,160,236,.06);color:#c7d4f4;font:inherit;font-weight:700;cursor:pointer">← Уже есть аккаунт</button></form></div>
  </section>`;
  bindPasswordEyes();
  const form=document.querySelector('#register-form');
  const codeInput=form.elements.joinCode;
  codeInput.addEventListener('input',()=>{ codeInput.value=codeInput.value.toUpperCase().replace(/\s+/g,''); });
  form.onsubmit=register;
  document.querySelector('#back-login').onclick=()=>renderLogin();
}

async function register(e){
  e.preventDefault();
  const btn=e.submitter;
  const error=document.querySelector('#register-error');
  error.textContent='';
  const fd=new FormData(e.currentTarget);
  const displayNameValue=String(fd.get('displayName')||'').trim().replace(/\s+/g,' ');
  const joinCodeValue=String(fd.get('joinCode')||'').trim().toUpperCase();
  const loginValue=String(fd.get('login')||'').trim();
  const password=String(fd.get('password')||'');
  const passwordRepeat=String(fd.get('passwordRepeat')||'');

  if(password!==passwordRepeat){
    error.textContent='Пароли не совпадают.';
    return;
  }

  buttonLoading(btn,true,'Создаём аккаунт…');
  try {
    const data=await api('/register',{
      method:'POST',
      body:JSON.stringify({
        displayName:displayNameValue,
        joinCode:joinCodeValue,
        login:loginValue,
        password,
        passwordRepeat
      })
    });
    const registeredLogin=data.user?.login||loginValue;
    renderLogin(registeredLogin,data.message||'Регистрация завершена. Теперь войди в академию.');
    showToast('Аккаунт создан. Теперь войди в академию.','success');
  } catch(err){
    error.textContent=err.message;
    buttonLoading(btn,false);
  }
}

async function login(e){ e.preventDefault(); const btn=e.submitter; const error=document.querySelector('#login-error'); error.textContent=''; buttonLoading(btn,true,'Проверяем доступ…'); const fd=new FormData(e.currentTarget); try { const data=await api('/login',{method:'POST',body:JSON.stringify({login:fd.get('login').trim(),password:fd.get('password')})}); const token=data.token||data.accessToken||data.sessionToken; if(!token) throw new Error('Сервер не вернул токен доступа.'); setToken(token); state.user=data.user||{displayName:data.displayName}; setStoredUser(state.user); await loadDashboard(); } catch(err){error.textContent=err.message; buttonLoading(btn,false);} }

function shell(content, active='home'){
  return `<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">🚀</span><span>Космическая<br>академия слов</span></div><nav>${nav(active)}</nav><div class="sidebar-orbit"><span></span><p>Учебная станция<br><b>онлайн</b></p></div></aside><section class="viewport"><header class="topbar"><button class="mobile-menu" aria-label="Открыть меню">☰</button><div class="crumb"><span class="live-dot"></span> Учебная станция активна</div><div class="top-actions"><div class="stars">⭐ <b>${Number(state.dashboard?.stars||0).toLocaleString('ru-RU')}</b></div><button class="profile" aria-expanded="false"><span class="avatar">${escapeHTML(displayName().charAt(0).toUpperCase())}</span><span><b>${escapeHTML(displayName())}</b><small>Курсант</small></span><i>⌄</i></button></div><div class="profile-menu"><button data-route="home">Кабинет</button><button data-route="settings">Настройки</button><button data-action="logout">Выйти</button></div></header><main class="content">${content}</main></section><div class="mobile-overlay"></div></div>`;
}
function nav(active){ return [['home','Главная'],['new','Новые слова'],['review','Повторение'],['difficult','Сложные слова'],['progress','Мой прогресс'],['dictionary','Словарь'],['settings','Настройки'],['logout','Выйти']].map(([id,label],i)=>`${i===6?'<div class="nav-separator"></div>':''}<button class="nav-item nav-${id} ${active===id?'active':''}" data-${id==='logout'?'action':'route'}="${id}"><span>${icons[id]}</span>${label}</button>`).join(''); }

function bindShell(){
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>route(b.dataset.route));
  document.querySelectorAll('[data-action="logout"]').forEach(b=>b.onclick=logout);
  const profile=document.querySelector('.profile'), menu=document.querySelector('.profile-menu'); if(profile) profile.onclick=()=>{const open=profile.getAttribute('aria-expanded')==='true';profile.setAttribute('aria-expanded',String(!open));menu.classList.toggle('open',!open);};
  const menuBtn=document.querySelector('.mobile-menu'), overlay=document.querySelector('.mobile-overlay'); if(menuBtn) menuBtn.onclick=()=>document.querySelector('.app-shell').classList.add('menu-open'); if(overlay) overlay.onclick=()=>document.querySelector('.app-shell').classList.remove('menu-open');
}

async function loadDashboard(){ app.innerHTML=`<div class="loading-screen"><div class="loader-planet">🪐</div><b>Связываемся с учебной станцией…</b></div>`; try { state.user=state.user||getStoredUser(); state.dashboard=await api('/dashboard'); renderDashboard(); } catch(err){showToast(err.message,'error'); if(!getToken()) renderLogin(); else renderError(err.message); } }
function renderDashboard(){
  const d=state.dashboard||{}, studied=(+d.learnedCount||0)+(+d.masteredCount||0), total=+d.totalActiveWords||0, percent=total?Math.min(100,Math.round(studied/total*100)):0;
  let mission={title:'На сегодня всё выполнено!',text:`Следующее повторение: ${formatDate(d.nextReviewAt)}`,type:null,label:null};
  if(+d.reviewDueCount>0) mission={title:'Сегодняшняя миссия',text:'Пора проверить, что осталось в памяти.',type:'review',label:'Повторить слова'}; else if(+d.difficultCount>0) mission={title:'Сегодняшняя миссия',text:'Есть слова, которым нужна дополнительная тренировка.',type:'difficult',label:'Отработать сложные'}; else if(+d.newCount>0) mission={title:'Сегодняшняя миссия',text:'Изучи новые слова и заработай звёзды.',type:'new',label:'Начать миссию'};
  const content=`<div class="dashboard-head"><div><span class="eyebrow">БОРТОВОЙ КОМПЬЮТЕР • ГЛАВНАЯ</span><h1>Космическая академия слов</h1><p>Привет, ${escapeHTML(displayName())}! Выбери сегодняшнюю миссию.</p></div><div class="level-pill"><span>✦</span><div><small>СТАТУС</small><b>Курсант Академии</b></div></div></div>
  <section class="mission-card"><div class="mission-copy"><span class="eyebrow">🚀 ЦЕНТР УПРАВЛЕНИЯ</span><h2>${mission.title}</h2><p>${mission.text}</p>${mission.type?`<button class="cta" data-start="${mission.type}">${mission.label}<span>→</span></button>`:`<div class="complete-chip">✓ Миссия выполнена</div>`}<div class="mission-dots"><i></i><i></i><i></i><span>Траектория знаний проложена</span></div></div><img src="./assets/illustrations/robot-guide.png" alt="Робот-помощник машет рукой"></section>
  <section class="action-grid">${actionCard('new','✦','Новые слова',d.newCount,'Изучай значение и правильное написание.',d.newCount?'Начать':'Новое задание скоро','blue',!d.newCount)}${actionCard('review','↻','Повторение',d.reviewDueCount,d.reviewDueCount?'Слова, срок повторения которых наступил.':`Следующее: ${formatDate(d.nextReviewAt)}`,d.reviewDueCount?'Повторить':'Пока отдыхай','teal',!d.reviewDueCount)}${actionCard('difficult','◇','Сложные слова',d.difficultCount,'Тренировка слов, в которых было две ошибки.',d.difficultCount?'Отработать':'Всё под контролем','pink',!d.difficultCount)}</section>
  <section class="lower-grid"><article class="panel progress-panel"><div class="panel-title"><div><span class="eyebrow">ТВОЯ ЗВЁЗДНАЯ КАРТА</span><h2>Общий прогресс</h2></div><strong>${percent}%</strong></div><div class="progress-track"><span style="width:${percent}%"></span></div><div class="progress-labels"><b>${studied} из ${total}</b><span>цель: освоить все активные слова</span></div><div class="stats"><div><span>◉</span><p>Изучено<b>${+d.learnedCount||0}</b></p></div><div><span>★</span><p>Полностью освоено<b>${+d.masteredCount||0}</b></p></div><div><span>◎</span><p>Всего активно<b>${total}</b></p></div></div></article><article class="panel next-panel"><div class="clock">◷</div><span class="eyebrow">БЛИЖАЙШАЯ ТОЧКА</span><h2>Следующее повторение</h2><b>${formatDate(d.nextReviewAt)}</b><p>Слово появится автоматически, когда наступит время.</p><div class="orbit-line"><i></i><i></i><i></i></div></article></section>`;
  app.innerHTML=shell(content); bindShell(); document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startSession(b.dataset.start,b));
}
function actionCard(type,icon,title,count,text,label,color,disabled){return `<article class="action-card ${color}"><div class="card-top"><span class="card-icon">${icon}</span><span class="signal">${disabled?'○ НЕТ ЗАДАНИЙ':'● ДОСТУПНО'}</span></div><h2>${title}</h2><strong>${+count||0}</strong><p>${text}</p><button data-start="${type}" ${disabled?'disabled':''}>${label}<span>→</span></button></article>`;}


function resetLessonState(){
  state.studySessionId=null;
  state.sessionType=null;
  state.words=[];
  state.currentIndex=0;
  state.originalWordCount=0;
  state.retryQueue=[];
  state.results=null;
  state.sessionStats=emptySessionStats();
}

function renderSpelling(w){
  const word=String(w.word||'');
  const stressPosition=Number(w.stressPosition??w.stress_position??0);
  const risks=Array.isArray(w.riskPositions)?w.riskPositions:
    String(w.risk_positions||'').split(',').map(v=>Number(v.trim())).filter(Boolean);

  return Array.from(word).map((ch,index)=>{
    const pos=index+1;
    const stressed=pos===stressPosition ? `${ch}\u0301` : ch;
    return risks.includes(pos) ? `<span class="risk-letter">${escapeHTML(stressed)}</span>` : escapeHTML(stressed);
  }).join('');
}

function renderPracticeMask(mask){
  let prepared=String(mask||'');
  let counter=0;
  const gapTokens=[];

  const addGapToken=()=>{
    counter+=1;
    const token=`@@ACADEMY_GAP_${counter}@@`;
    gapTokens.push(token);
    return token;
  };

  // Сначала заменяем пропуски служебными маркерами.
  // Это позволяет найти всё слово с пропуском и запретить перенос внутри него.
  prepared=prepared.replace(/\{(\d+)\}/g,()=>addGapToken());

  if(counter===0){
    prepared=prepared.replace(/\[\s*\]/g,()=>addGapToken());
  }

  const renderAnswerPart=(partNumber)=>
    `<input class="answer-part" data-part="${partNumber}" aria-label="Введи пропущенные буквы" autocomplete="off" spellcheck="false" placeholder="•••">`;

  const html=prepared.split(/(\s+)/).map(part=>{
    if(/^\s+$/.test(part)) return escapeHTML(part);

    let partHTML=escapeHTML(part);
    let hasGap=false;

    gapTokens.forEach((token,index)=>{
      if(partHTML.includes(token)){
        hasGap=true;
        partHTML=partHTML.split(token).join(renderAnswerPart(index+1));
      }
    });

    return hasGap ? `<span class="masked-word">${partHTML}</span>` : partHTML;
  }).join('');

  return {html,count:counter};
}

function collectAnswer(){
  return Array.from(document.querySelectorAll('.answer-part'))
    .map(input=>input.value.trim().toLocaleLowerCase('ru-RU'))
    .join('');
}

function markProcessed(wordId){
  const stats=state.sessionStats;
  if(!stats) return;
  const key=String(wordId);
  if(!stats.completedWordIds.has(key)){
    stats.completedWordIds.add(key);
    stats.processedCount+=1;
  }
}

function applyCheckToStats(data,w){
  const s=state.sessionStats;
  if(!s) return;
  const action=data.action;

  if(action==='learned_first_try'){
    s.correctFirstTry+=1;
    s.starsEarned+=Number(data.starsAwarded||0);
    markProcessed(w.wordId??w.word_id);
  } else if(action==='learned_after_retry'){
    s.correctAfterRetry+=1;
    s.starsEarned+=Number(data.starsAwarded||0);
    markProcessed(w.wordId??w.word_id);
  } else if(action==='mark_difficult' || action==='review_mark_difficult'){
    s.difficultCount+=1;
    markProcessed(w.wordId??w.word_id);
  } else if(action==='review_correct'){
    s.correctFirstTry+=1;
    markProcessed(w.wordId??w.word_id);
  } else if(action==='review_correct_after_retry'){
    s.correctAfterRetry+=1;
    markProcessed(w.wordId??w.word_id);
  } else if(action==='difficult_recovered'){
    s.recoveredCount+=1;
    markProcessed(w.wordId??w.word_id);
  } else if(action==='difficult_still_wrong'){
    s.stillDifficultCount+=1;
    s.difficultCount+=1;
    markProcessed(w.wordId??w.word_id);
  }
}

async function startSession(type,btn){ if(btn) buttonLoading(btn,true,'Запускаем…'); resetLessonState(); try { let data; if(type==='difficult') data=await api('/start-difficult-session',{method:'POST',body:JSON.stringify({})}); else data=await api('/start-session',{method:'POST',body:JSON.stringify({mode:type})}); if(data.noWords||!data.wordCount){showToast('В этой миссии пока нет слов.'); await loadDashboard(); return;} state.studySessionId=data.studySessionId||data.sessionId; state.sessionType=data.sessionType||(type==='new'?'learning':type); const wordsData=await api('/words'); state.sessionType=wordsData.sessionType||state.sessionType; state.words=Array.isArray(wordsData)?wordsData:(wordsData.words||[]); state.originalWordCount=state.words.length; state.currentIndex=0; if(!state.words.length) throw new Error('В этой миссии пока нет слов.'); renderWord(); } catch(err){showToast(err.message,'error'); if(btn) buttonLoading(btn,false);} }
function currentWord(){return state.words[state.currentIndex];}
function renderWord(){ const w=currentWord(); if(!w){finishSession();return;} const isCard=state.sessionType!=='review' && !w._showTask; if(isCard) renderWordCard(w); else renderTask(w); }
// Медиафайлы хранятся в assets/words и привязаны к wordId:
// ./assets/words/images/word-1.png и ./assets/words/audio/word-1.mp3 и т. д.
function renderWordCard(w){ const wordHTML=renderSpelling(w); const plainWord=escapeHTML(w.word||'Новое слово'); const wordId=w.wordId??w.word_id; const imageSrc=wordId!=null?`./assets/words/images/word-${wordId}.png`:'./assets/illustrations/word-magic.png'; const audioSrc=wordId!=null?`./assets/words/audio/word-${wordId}.mp3`:null; const content=`<div class="lesson-top"><button class="back-link" data-route="home">← В кабинет</button><div class="lesson-progress"><span>Слово ${Math.min(state.currentIndex+1,state.originalWordCount)} из ${state.originalWordCount}</span><div><i style="width:${state.originalWordCount?Math.min(100,(state.sessionStats.processedCount/state.originalWordCount)*100):0}%"></i></div></div><span class="mode-chip">${state.sessionType==='difficult'?'СЛОЖНЫЕ СЛОВА':'НОВЫЕ СЛОВА'}</span></div><section class="word-card word-card-premium"><div class="word-copy"><div class="ambient-orbit" aria-hidden="true"><i></i><i></i><i></i></div><div class="card-step"><span>ШАГ 1 ИЗ 2</span><b>ЗАПОМНИ СЛОВО</b></div><div class="word-stage"><div class="stage-shine" aria-hidden="true"></div><span class="eyebrow">СЛОВО ТВОЕЙ МИССИИ</span><h1 data-word="${plainWord}">${wordHTML}</h1><div class="word-underline" aria-hidden="true"><i></i><i></i><i></i></div></div><div class="meaning"><span class="meaning-icon">✦</span><div><b>Что это значит</b><p>${escapeHTML(w.meaning||'Запомни правильное написание этого слова.')}</p></div></div><div class="word-actions">${audioSrc?'<button class="sound" id="sound">🔊 Послушать</button>':''}<button class="cta" id="to-task">Готов проверить себя <span>→</span></button></div></div><div class="word-art"><div class="poster-glow"></div><img src="${escapeHTML(imageSrc)}" alt="Учебный постер к слову ${plainWord}" onerror="this.onerror=null;this.src='./assets/illustrations/word-magic.png'"><div class="art-label">✦ ПОСТЕР ЗНАНИЙ</div></div></section>`; app.innerHTML=shell(content,state.sessionType==='learning'?'new':state.sessionType);bindShell();document.querySelector('#to-task').onclick=()=>{w._showTask=true;renderTask(w);}; const sound=document.querySelector('#sound');if(sound)sound.onclick=()=>new Audio(audioSrc).play().catch(()=>showToast('Не удалось воспроизвести аудио','error')); const card=document.querySelector('.word-card-premium');if(card&&matchMedia('(hover:hover) and (pointer:fine)').matches){card.onpointermove=e=>{const r=card.getBoundingClientRect();card.style.setProperty('--mx',`${((e.clientX-r.left)/r.width)*100}%`);card.style.setProperty('--my',`${((e.clientY-r.top)/r.height)*100}%`);card.style.setProperty('--ry',`${(((e.clientX-r.left)/r.width)-.5)*7}deg`);card.style.setProperty('--rx',`${(.5-((e.clientY-r.top)/r.height))*5}deg`);};card.onpointerleave=()=>{card.style.setProperty('--ry','0deg');card.style.setProperty('--rx','0deg');};} }
function renderTask(w){ const rendered=renderPracticeMask(w.practiceMask||w.practice_mask||''); if(!rendered.count){showToast('Сервер не передал корректную маску упражнения','error');return;} const modeLabel=state.sessionType==='review'?'ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ':state.sessionType==='difficult'?'ОТРАБОТКА СЛОЖНОГО СЛОВА':'ПРОВЕРЯЕМ НАПИСАНИЕ'; const content=`<div class="lesson-top"><button class="back-link" id="back-card">${state.sessionType==='review'?'← В кабинет':'← К карточке'}</button><div class="lesson-progress"><span>Задание ${Math.min(state.currentIndex+1,state.originalWordCount)} из ${state.originalWordCount}</span><div><i style="width:${state.originalWordCount?Math.min(100,(state.sessionStats.processedCount/state.originalWordCount)*100):0}%"></i></div></div><span class="mode-chip">${modeLabel}</span></div><section class="task-card task-game"><div class="task-stars" aria-hidden="true"><i>✦</i><i>·</i><i>✧</i><i>·</i><i>✦</i></div><aside class="task-robot"><div class="robot-message"><span>СООБЩЕНИЕ ОТ БОРТА</span><b>Расшифруй слово!</b><small>Я верю в тебя 🚀</small></div><img src="./assets/illustrations/robot-guide.png" alt="Робот-помощник"></aside><div class="task-console"><div class="task-orbit">✦</div><span class="eyebrow">КОСМИЧЕСКИЙ ДЕШИФРАТОР</span><div class="mission-label"><span>МИССИЯ ${state.sessionStats.processedCount+1}</span><i></i><b>ВСТАВЬ БУКВЫ</b></div><h1>${rendered.html}</h1><p>Вспомни слово целиком и восстанови потерянную часть.</p><div id="feedback" class="feedback" role="status"></div><button class="cta" id="check">Проверить ответ <span>→</span></button><small>↵ Можно нажать Enter</small></div></section>`; app.innerHTML=shell(content,state.sessionType==='learning'?'new':state.sessionType);bindShell(); const inputs=Array.from(document.querySelectorAll('.answer-part')); inputs[0]?.focus(); document.querySelector('#check').onclick=()=>checkAnswer(w); inputs.forEach((input,index)=>input.onkeydown=e=>{if(e.key==='Enter'){if(index<inputs.length-1)inputs[index+1].focus();else checkAnswer(w);}}); document.querySelector('#back-card').onclick=()=>{ if(state.sessionType==='review')loadDashboard();else renderWordCard(w); }; }
async function checkAnswer(w){ const inputs=Array.from(document.querySelectorAll('.answer-part')), btn=document.querySelector('#check'), feedback=document.querySelector('#feedback'); const answer=collectAnswer(); if(!answer||inputs.some(i=>!i.value.trim())){inputs.find(i=>!i.value.trim())?.focus();feedback.className='feedback error visible';feedback.textContent='Введи все пропущенные буквы.';return;} buttonLoading(btn,true,'Проверяем…'); try { const data=await api('/check',{method:'POST',body:JSON.stringify({wordId:w.wordId??w.word_id,answer})}); applyCheckToStats(data,w); const correct=data.correct===true; const days=data.nextReviewInDays; const stars=Number(data.starsAwarded||0); const messages={learned_first_try:`Верно! ⭐ +${stars}`,repeat_later:'Есть ошибка. Слово отправлено в «Сложные».',learned_after_retry:`Верно со второй попытки! ⭐ +${stars}`,mark_difficult:'Слово отправлено в «Сложные». Мы вернёмся к нему отдельно.',difficult_recovered:`Отлично! Слово возвращено в обычный цикл.${days?` Повторение через ${days} дн.`:''}`,difficult_still_wrong:'Слово пока остаётся в разделе «Сложные».',review_correct:`Верно!${days?` Следующее повторение через ${days} дн.`:''}`,review_correct_after_retry:`Верно со второй попытки!${days?` Следующее повторение через ${days} дн.`:''}`,review_repeat_later:'Есть ошибка. Слово отправлено в «Сложные».',review_mark_difficult:'Слово отправлено в «Сложные».'}; feedback.className=`feedback ${correct?'success':'error'} visible`; feedback.textContent=messages[data.action]||data.message||(correct?'Верно!':'Есть ошибка.'); inputs.forEach(i=>i.disabled=true); btn.innerHTML=`Продолжить <span>→</span>`;btn.disabled=false;btn.onclick=()=>advance(data,w); } catch(err){feedback.className='feedback error visible';feedback.textContent=err.message;buttonLoading(btn,false);} }
function advance(data,w){ const needsRetry=data.action==='repeat_later'||data.action==='review_repeat_later'; if(needsRetry){w._showTask=true; const insertAt=Math.min(state.currentIndex+4,state.words.length); state.words.splice(insertAt,0,w);} state.currentIndex++; renderWord(); }
async function finishSession(){ app.innerHTML=`<div class="loading-screen"><div class="loader-planet">⭐</div><b>Подводим итоги миссии…</b></div>`; try { await api('/finish-session',{method:'POST',body:JSON.stringify({studySessionId:state.studySessionId})}); state.results={...state.sessionStats,completedWordIds:undefined}; renderResults(); } catch(err){renderError(err.message,true);} }
function renderResults(){const r=state.results||{}, title=state.sessionType==='learning'?'МИССИЯ ЗАВЕРШЕНА':state.sessionType==='review'?'ПОВТОРЕНИЕ ЗАВЕРШЕНО':'ОТРАБОТКА ЗАВЕРШЕНА'; const items=state.sessionType==='difficult'?[['Вернулись в цикл',r.recoveredCount??0],['Остались сложными',r.stillDifficultCount??0],['Обработано',r.processedCount??0]]:[state.sessionType==='review'?['Сразу верно',r.correctFirstTry??0]:['С первой попытки',r.correctFirstTry??0],['После второй попытки',r.correctAfterRetry??0],['Сложные слова',r.difficultCount??0]]; const content=`<section class="result-card"><div class="result-star">★</div><span class="eyebrow">${title}</span><h1>Отличная работа,<br>${escapeHTML(displayName())}!</h1>${state.sessionType==='learning'?`<div class="earned">⭐ +${r.starsEarned??0}</div>`:''}<div class="result-stats">${items.map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><button class="cta" id="home">Вернуться в кабинет <span>→</span></button></section>`;app.innerHTML=shell(content);bindShell();document.querySelector('#home').onclick=loadDashboard;}


async function renderDictionary(){
  app.innerHTML=`<div class="loading-screen"><div class="loader-planet">▤</div><b>Открываем бортовой журнал…</b></div>`;

  try {
    const data=await api('/dictionary');
    const words=Array.isArray(data)?data:(data.words||[]);

    const cards=words.map((w,index)=>{
      const wordId=w.wordId??w.word_id;
      const imageSrc=wordId!=null?`./assets/words/images/word-${wordId}.png`:'./assets/illustrations/word-magic.png';
      const audioSrc=wordId!=null?`./assets/words/audio/word-${wordId}.mp3`:null;

      return `<article class="panel" style="padding:18px;display:grid;grid-template-columns:76px 1fr auto;gap:16px;align-items:center;min-height:104px">
        <img src="${escapeHTML(imageSrc)}" alt="" style="width:76px;height:76px;object-fit:cover;border-radius:14px" onerror="this.onerror=null;this.src='./assets/illustrations/word-magic.png'">
        <div>
          <small style="opacity:.65">СЛОВО ${index+1}</small>
          <h2 style="margin:4px 0 6px;font-size:25px">${renderSpelling(w)}</h2>
          <p style="margin:0;opacity:.78;line-height:1.45">${escapeHTML(w.meaning||'Словарное слово')}</p>
        </div>
        ${audioSrc?`<button type="button" class="sound" data-audio="${escapeHTML(audioSrc)}" aria-label="Послушать слово">🔊</button>`:''}
      </article>`;
    }).join('');

    const content=`<div class="simple-head" style="margin-bottom:22px">
      <span class="eyebrow">СЛОВАРЬ</span>
      <h1>Бортовой журнал</h1>
      <p>Здесь собраны все слова текущего словаря. Их можно посмотреть до и после миссии.</p>
    </div>
    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px">
      ${cards||'<article class="panel" style="padding:24px">Словарь пока пуст.</article>'}
    </section>`;

    app.innerHTML=shell(content,'dictionary');
    bindShell();

    document.querySelectorAll('[data-audio]').forEach(button=>{
      button.onclick=()=>new Audio(button.dataset.audio).play().catch(()=>showToast('Не удалось воспроизвести аудио','error'));
    });
  } catch(err){
    renderError(err.message);
  }
}

function route(name){ if(name==='home')return loadDashboard(); if(['new','review','difficult'].includes(name)){const count={new:state.dashboard.newCount,review:state.dashboard.reviewDueCount,difficult:state.dashboard.difficultCount}[name];if(count>0)return startSession(name);showToast('Сейчас для этой миссии нет доступных слов.');return;} if(name==='progress')return renderInfo('Мой прогресс','Твоя звёздная траектория',`Изучено: ${+state.dashboard.learnedCount||0}<br>Полностью освоено: ${+state.dashboard.masteredCount||0}`,'progress'); if(name==='dictionary')return renderDictionary(); if(name==='settings')return renderInfo('Настройки','Профиль курсанта',`Имя: ${escapeHTML(displayName())}<br>Для безопасности данные входа здесь не показываются.`,'settings'); }
function renderInfo(eyebrow,title,text,active){app.innerHTML=shell(`<div class="simple-head"><span class="eyebrow">${eyebrow.toUpperCase()}</span><h1>${title}</h1><p>${text}</p><button class="cta" data-route="home">Вернуться на главную <span>→</span></button></div>`,active);bindShell();}
function renderError(message,canRetry=false){app.innerHTML=`<div class="loading-screen error-state"><div class="loader-planet">⚠</div><b>Связь прервалась</b><p>${escapeHTML(message)}</p>${canRetry?'<button class="cta" id="retry">Повторить</button>':'<button class="cta" id="retry">В кабинет</button>'}</div>`;document.querySelector('#retry').onclick=canRetry?finishSession:loadDashboard;}
async function logout(){ try{await api('/logout',{method:'POST'});}catch(err){console.error('Logout:',err);}finally{setToken(null);setStoredUser(null);state.user=null;state.dashboard=null;resetLessonState();renderLogin();} }
window.addEventListener('academy:unauthorized',()=>{setStoredUser(null);state.user=null;state.dashboard=null;resetLessonState();renderLogin();});
state.user=getStoredUser();
getToken()?loadDashboard():renderLogin();
