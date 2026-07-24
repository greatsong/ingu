// ============================================================
// 우리 동네 인구 구조 워크샵 작품 갤러리 — app.js
// 빌드 없는 정적 SPA. config.js 에 SUPABASE_URL/KEY 가 비어 있으면
// 자동으로 데모 모드(메모리 내 샘플 데이터)로 동작한다.
// ============================================================

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 0. 금지어 필터 — 한국어 비속어 기본 목록 + 쉽게 추가 가능한 배열
  //    필요하면 아래 BANNED_WORDS 배열에 단어만 추가하면 된다.
  // ---------------------------------------------------------
  const BANNED_WORDS = [
    "시발", "씨발", "씨팔", "시팔", "쓰발", "ㅅㅂ", "ㅆㅂ",
    "개새끼", "개새", "새끼", "병신", "ㅄ", "지랄", "좆", "좃",
    "존나", "존나게", "졸라", "닥쳐", "미친놈", "미친년", "쳐죽",
    "죽어", "꺼져", "걸레", "창녀", "년아", "놈아", "fuck", "shit",
    "bitch", "asshole", "damn", "faggot", "니미", "느그", "애미",
    "애비", "썅", "씹", "좇", "간나", "빙신", "새꺄", "새키",
  ];

  function findBannedWord(text) {
    if (!text) return null;
    const normalized = String(text).toLowerCase().replace(/\s+/g, "");
    for (const word of BANNED_WORDS) {
      if (normalized.includes(word.toLowerCase())) return word;
    }
    return null;
  }

  // ---------------------------------------------------------
  // 1. 모드 판별 (데모 vs 실제)
  // ---------------------------------------------------------
  const cfg = window.APP_CONFIG || {};
  const hasRealConfig = !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY &&
    cfg.SUPABASE_URL.trim() && cfg.SUPABASE_KEY.trim());

  const DEMO_MODE = !hasRealConfig;

  let supabaseClient = null;
  if (!DEMO_MODE) {
    try {
      supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    } catch (e) {
      console.error("Supabase 클라이언트 생성 실패, 데모 모드로 대체:", e);
    }
  }
  const useSupabase = !DEMO_MODE && !!supabaseClient;

  // ---------------------------------------------------------
  // 2. 데모 데이터 (메모리 전용, 새로고침 시 초기화)
  // ---------------------------------------------------------
  let demoIdSeq = 1000;
  function nextDemoId() { return "demo-" + (demoIdSeq++); }

  const demoApps = [
    {
      id: nextDemoId(), nickname: "은행나무",
      url: "https://example.com/demo-population-1",
      description: "우리 동네 인구 피라미드와 고령화 지수를 한눈에 담았어요", likes: 9,
      feedback: [{ nickname: "물결", content: "피라미드 색이 한눈에 들어와서 좋아요" }],
    },
    {
      id: nextDemoId(), nickname: "골목대장",
      url: "https://example.com/demo-population-2",
      description: "동 단위 인구 지도를 눌러보며 우리 학교 학군 이야기를 담았어요", likes: 12,
      feedback: [
        { nickname: "은하수", content: "지도에서 우리 동네 찾는 재미가 있어요" },
        { nickname: "별똥별", content: "수업에 바로 써보고 싶은 아이디어예요" },
      ],
    },
    {
      id: nextDemoId(), nickname: "새벽공기",
      url: "https://example.com/demo-population-3",
      description: "10년 뒤 우리 동네 인구를 상상해보는 카드형 앱이에요", likes: 6,
      feedback: [],
    },
  ];

  // ---------------------------------------------------------
  // 3. 데이터 레이어 (데모 / 실제 공통 인터페이스)
  // ---------------------------------------------------------
  let appsCache = []; // 실제 모드에서 feedback을 합쳐 캐싱

  async function loadApps() {
    if (!useSupabase) {
      // 데모: likes 내림차순 정렬은 하지 않고 등록순 유지(참신함)
      appsCache = demoApps;
      return demoApps;
    }
    const { data: apps, error: appsErr } = await supabaseClient
      .from("ingu_apps")
      .select("*")
      .order("created_at", { ascending: false });
    if (appsErr) throw appsErr;

    const { data: fbRows, error: fbErr } = await supabaseClient
      .from("ingu_feedback")
      .select("*")
      .order("created_at", { ascending: true });
    if (fbErr) throw fbErr;

    const fbByApp = {};
    (fbRows || []).forEach((row) => {
      if (!fbByApp[row.app_id]) fbByApp[row.app_id] = [];
      fbByApp[row.app_id].push({ nickname: row.nickname, content: row.content });
    });

    appsCache = (apps || []).map((a) => ({ ...a, feedback: fbByApp[a.id] || [] }));
    return appsCache;
  }

  async function insertApp(payload) {
    if (!useSupabase) {
      const newApp = {
        id: nextDemoId(),
        nickname: payload.nickname,
        url: payload.url,
        description: payload.description,
        likes: 0,
        feedback: [],
      };
      demoApps.unshift(newApp);
      return newApp;
    }
    const { data, error } = await supabaseClient
      .from("ingu_apps")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    data.feedback = [];
    appsCache.unshift(data);
    return data;
  }

  async function likeApp(appId) {
    if (!useSupabase) {
      const app = demoApps.find((a) => a.id === appId);
      if (!app) throw new Error("app not found");
      app.likes += 1;
      return app.likes;
    }
    const { data, error } = await supabaseClient.rpc("increment_ingu_likes", { p_app_id: appId });
    if (error) throw error;
    const app = appsCache.find((a) => a.id === appId);
    if (app) app.likes = data;
    return data;
  }

  async function insertFeedback(appId, nickname, content) {
    if (!useSupabase) {
      const app = demoApps.find((a) => a.id === appId);
      if (!app) throw new Error("app not found");
      app.feedback.push({ nickname, content });
      return;
    }
    const { error } = await supabaseClient
      .from("ingu_feedback")
      .insert([{ app_id: appId, nickname, content }]);
    if (error) throw error;
    const app = appsCache.find((a) => a.id === appId);
    if (app) app.feedback.push({ nickname, content });
  }

  // ---------------------------------------------------------
  // 4. 좋아요 중복 방지 (같은 브라우저에서 같은 카드 재클릭 방지)
  // ---------------------------------------------------------
  const LIKED_KEY = "ingu_gallery_liked_ids";
  function getLikedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function saveLiked(id) {
    const s = getLikedSet();
    s.add(id);
    try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch (e) { /* noop */ }
  }

  // ---------------------------------------------------------
  // 6. DOM 유틸
  // ---------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function isHttpsUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------
  // 7. 렌더링
  // ---------------------------------------------------------
  const gridEl = $("#galleryGrid");
  const emptyEl = $("#galleryEmpty");
  const countEl = $("#galleryCount");
  const cardTemplate = $("#cardTemplate");
  const likedSet = getLikedSet();

  function renderGallery() {
    const filtered = appsCache;

    gridEl.innerHTML = "";
    countEl.textContent = `총 ${filtered.length}개 작품`;
    emptyEl.hidden = filtered.length > 0;

    filtered.forEach((app) => {
      const node = cardTemplate.content.cloneNode(true);

      node.querySelector(".card-nickname").textContent = app.nickname;
      node.querySelector(".card-desc").textContent = app.description;

      const goBtn = node.querySelector(".btn-go");
      goBtn.href = app.url;

      const likeBtn = node.querySelector(".btn-like");
      const likeCountEl = node.querySelector(".like-count");
      likeCountEl.textContent = app.likes;
      if (likedSet.has(app.id)) {
        likeBtn.classList.add("liked");
        likeBtn.disabled = true;
      }
      likeBtn.addEventListener("click", async () => {
        if (likedSet.has(app.id)) return;
        likeBtn.disabled = true;
        try {
          const newCount = await likeApp(app.id);
          likeCountEl.textContent = newCount;
          likeBtn.classList.add("liked");
          likedSet.add(app.id);
          saveLiked(app.id);
        } catch (e) {
          console.error(e);
          likeBtn.disabled = false;
          alert("좋아요 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        }
      });

      const fbCountEl = node.querySelector(".fb-count");
      const fbListEl = node.querySelector(".fb-list");
      fbCountEl.textContent = `(${app.feedback.length})`;
      renderFeedbackList(fbListEl, app.feedback);

      const fbForm = node.querySelector(".fb-form");
      const fbMsg = node.querySelector(".fb-msg");
      fbForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nickInput = fbForm.querySelector(".fb-nickname");
        const contentInput = fbForm.querySelector(".fb-content");
        const nickname = nickInput.value.trim();
        const content = contentInput.value.trim();

        fbMsg.hidden = true;
        fbMsg.className = "fb-msg";

        if (!nickname || !content) {
          showFbMsg(fbMsg, "닉네임과 피드백을 모두 입력해주세요.", "error");
          return;
        }
        const banned = findBannedWord(nickname) || findBannedWord(content);
        if (banned) {
          showFbMsg(fbMsg, "부적절한 표현이 포함되어 있어 등록할 수 없어요.", "error");
          return;
        }

        const submitBtn = fbForm.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        try {
          await insertFeedback(app.id, nickname, content);
          // insertFeedback()이 이미 app.feedback에 반영하므로 여기서 다시 push하지 않는다.
          fbCountEl.textContent = `(${app.feedback.length})`;
          renderFeedbackList(fbListEl, app.feedback);
          nickInput.value = "";
          contentInput.value = "";
          showFbMsg(fbMsg, "피드백을 남겼어요. 고마워요!", "ok");
        } catch (err) {
          console.error(err);
          showFbMsg(fbMsg, "등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.", "error");
        } finally {
          submitBtn.disabled = false;
        }
      });

      gridEl.appendChild(node);
    });
  }

  function showFbMsg(el, text, type) {
    el.textContent = text;
    el.hidden = false;
    el.className = "fb-msg " + type;
  }

  function renderFeedbackList(listEl, feedback) {
    listEl.innerHTML = "";
    if (!feedback.length) {
      const li = document.createElement("li");
      li.className = "fb-empty";
      li.textContent = "아직 피드백이 없어요. 첫 피드백을 남겨보세요!";
      listEl.appendChild(li);
      return;
    }
    feedback.forEach((f) => {
      const li = document.createElement("li");
      const nickSpan = document.createElement("span");
      nickSpan.className = "fb-nick";
      nickSpan.textContent = f.nickname;
      li.appendChild(nickSpan);
      li.appendChild(document.createTextNode(f.content));
      listEl.appendChild(li);
    });
  }

  // ---------------------------------------------------------
  // 8. 탭 & 필터 이벤트
  // ---------------------------------------------------------
  function initTabs() {
    $all(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $all(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const view = btn.dataset.view;
        $all(".view").forEach((v) => v.classList.remove("active"));
        $("#view-" + view).classList.add("active");
      });
    });
  }

  // ---------------------------------------------------------
  // 9. 제출 폼
  // ---------------------------------------------------------
  function initSubmitForm() {
    const form = $("#submitForm");
    const msgEl = $("#formMsg");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msgEl.hidden = true;
      msgEl.className = "form-msg";

      const nickname = $("#f-nickname").value.trim();
      const url = $("#f-url").value.trim();
      const description = $("#f-desc").value.trim();

      if (!nickname || !url || !description) {
        return showFormMsg("모든 필수 항목(*)을 입력해주세요.", "error");
      }
      if (!isHttpsUrl(url)) {
        return showFormMsg("앱 URL은 https:// 로 시작하는 올바른 주소여야 해요.", "error");
      }
      if (nickname.length > 20 || description.length > 80) {
        return showFormMsg("입력 길이가 너무 길어요. 조금 줄여주세요.", "error");
      }

      const bannedHit = findBannedWord(nickname) || findBannedWord(description);
      if (bannedHit) {
        return showFormMsg("닉네임·소개 중 부적절한 표현이 포함되어 있어요. 확인 후 다시 제출해주세요.", "error");
      }

      const submitBtn = form.querySelector(".btn-primary");
      submitBtn.disabled = true;
      try {
        await insertApp({
          nickname,
          url,
          description,
        });
        form.reset();
        showFormMsg("게시 완료! 갤러리 탭에서 확인해보세요.", "ok");
        renderGallery();
      } catch (err) {
        console.error(err);
        showFormMsg("게시 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });

    function showFormMsg(text, type) {
      msgEl.textContent = text;
      msgEl.hidden = false;
      msgEl.className = "form-msg " + type;
    }
  }

  // ---------------------------------------------------------
  // 10. 모드 배지
  // ---------------------------------------------------------
  function renderModeBadge() {
    // 모드 배지는 화면에 표시하지 않는다 (요청에 따라 제거)
  }

  // ---------------------------------------------------------
  // 11. 시작
  // ---------------------------------------------------------
  // 5초마다 새 작품을 받아온다. 다만 화면을 다시 그리면 사용자가 하던 일이 끊기므로
  // (입력 중 · 피드백 펼침 · 제출 탭) 지금 건드리면 안 되는 상황이면 이번 회차는 건너뛴다.
  const REFRESH_MS = 5000;

  function busyNow() {
    if (document.visibilityState !== "visible") return true;      // 다른 탭 보는 중
    if (document.querySelector(".tab.active")?.dataset.view !== "gallery") return true;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true; // 입력 중
    if (gridEl.querySelector("details[open]")) return true;        // 피드백 펼쳐 둠
    return false;
  }

  // 내용이 그대로면 다시 그리지 않는다 (깜빡임 방지)
  function snapshot() {
    return appsCache.map((a) => a.id + ":" + a.likes + ":" + (a.feedback ? a.feedback.length : 0)).join("|");
  }

  function startAutoRefresh() {
    if (!useSupabase) return; // 데모 모드는 받아올 곳이 없다
    let last = snapshot();
    setInterval(async () => {
      if (busyNow()) return;
      try {
        await loadApps();
      } catch (e) {
        return; // 잠깐 끊긴 것일 수 있으니 조용히 넘기고 다음 회차에 다시 시도
      }
      const now = snapshot();
      if (now === last) return;
      last = now;
      renderGallery();
    }, REFRESH_MS);
  }

  async function init() {
    initTabs();
    initSubmitForm();
    renderModeBadge();
    try {
      await loadApps();
    } catch (e) {
      console.error("데이터 로딩 실패:", e);
      countEl.textContent = "데이터를 불러오지 못했어요. Supabase 설정(config.js)을 확인해주세요.";
    }
    renderGallery();
    startAutoRefresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// ── 사용성 보강 (2026-07-18 점검 반영) ──
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-go-submit]");
  if (!btn) return;
  const tab = [...document.querySelectorAll(".tab")].find(b => (b.dataset.view || "") === "submit");
  if (tab) { tab.click(); window.scrollTo({ top: 0, behavior: "smooth" }); }
});
// 닉네임/팀명이 최대 길이에 닿으면 조용히 잘리지 않게 안내
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.maxLength || el.maxLength < 0 || el.tagName !== "INPUT") return;
  if (el.value.length >= el.maxLength) {
    let hint = el.parentElement.querySelector(".len-hint");
    if (!hint) {
      hint = document.createElement("span");
      hint.className = "len-hint";
      el.parentElement.appendChild(hint);
    }
    hint.textContent = `최대 ${el.maxLength}자까지 쓸 수 있어요.`;
  } else {
    const hint = el.parentElement.querySelector(".len-hint");
    if (hint) hint.remove();
  }
});
