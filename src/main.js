/import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const app = document.querySelector("#root");

const state = {
  view: "home",
  videos: [],
  categories: [],
  user: null
};

function youtubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function videoCard(v) {
  const thumb = v.thumbnail_url || `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;
  return `
    <article class="card">
      <img src="${escapeHtml(thumb)}" alt="" loading="lazy">
      <div class="card-body">
        <span class="tag">${escapeHtml(v.categories?.name || "Diğer")}</span>
        <h3>${escapeHtml(v.title)}</h3>
        <p>${escapeHtml(v.profiles?.display_name || "İçerik üreticisi")}</p>
        <a class="button" href="${escapeHtml(v.youtube_url)}" target="_blank" rel="noopener">YouTube'da İzle →</a>
      </div>
    </article>`;
}

async function loadData() {
  if (!supabase) return;
  const { data: cats } = await supabase.from("categories").select("*").order("name");
  const { data: vids } = await supabase
    .from("videos")
    .select("*, categories(name), profiles(display_name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  state.categories = cats || [];
  state.videos = vids || [];
  const { data: { user } } = await supabase.auth.getUser();
  state.user = user || null;
}

function render() {
  app.innerHTML = `
    <header class="header">
      <div class="container nav">
        <button class="logo" data-view="home">Video<span>Keşfet</span></button>
        <nav>
          <button data-view="home">Ana Sayfa</button>
          <button data-view="discover">Keşfet</button>
          <button data-view="submit">+ Video Ekle</button>
          ${state.user
            ? `<button data-view="profile">Profil</button><button id="logout">Çıkış</button>`
            : `<button data-view="login">Giriş / Kayıt</button>`}
        </nav>
      </div>
    </header>
    <main>${page()}</main>
    <footer><div class="container">VideoKeşfet 1.0 · Yeni videolar keşfet, yeni kanallar bul.</div></footer>
  `;
  bind();
}

function page() {
  if (state.view === "discover") return discoverPage();
  if (state.view === "submit") return submitPage();
  if (state.view === "login") return loginPage();
  if (state.view === "profile") return profilePage();
  return homePage();
}

function homePage() {
  const videos = state.videos.slice(0, 6);
  return `
    <section class="hero">
      <div class="container">
        <p class="eyebrow">YENİ İÇERİKLERİ KEŞFET</p>
        <h1>İlgi alanına göre<br><span>yeni videolar bul.</span></h1>
        <p class="lead">İçerik üreticilerini keşfet, kanalları incele ve gerçekten ilgini çeken videolara ulaş.</p>
        <div class="hero-actions">
          <button class="button primary" data-view="discover">Keşfetmeye Başla</button>
          <button class="button secondary" data-view="submit">Videonu Ekle</button>
        </div>
      </div>
    </section>
    <section class="container section">
      <div class="section-head"><h2>🔥 Yeni Videolar</h2><button data-view="discover" class="link">Tümünü gör →</button></div>
      <div class="grid">${videos.length ? videos.map(videoCard).join("") : emptyState()}</div>
    </section>`;
}

function discoverPage() {
  return `
    <section class="container section page-top">
      <p class="eyebrow">KEŞFET</p><h1>Yeni videolar bul.</h1>
      <div class="filters">
        <button class="filter active" data-category="all">Tümü</button>
        ${state.categories.map(c => `<button class="filter" data-category="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>`).join("")}
      </div>
      <div id="discover-grid" class="grid">${state.videos.map(videoCard).join("") || emptyState()}</div>
    </section>`;
}

function submitPage() {
  if (!state.user) return loginRequired("Video eklemek için giriş yapmalısın.");
  return `
    <section class="container narrow page-top">
      <p class="eyebrow">İÇERİK ÜRETİCİSİ</p><h1>Videonu ekle.</h1>
      <p class="lead">YouTube videonu VideoKeşfet'e gönder. İlk sürümde gönderiler moderasyondan geçer.</p>
      <form id="video-form" class="form">
        <label>YouTube bağlantısı<input name="url" required placeholder="https://youtube.com/watch?v=..." /></label>
        <label>Video başlığı<input name="title" required placeholder="Video başlığı" /></label>
        <label>Kategori<select name="category" required>
          <option value="">Seç...</option>
          ${state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
        </select></label>
        <label>Kısa açıklama<textarea name="description" rows="5" placeholder="Videonu kısaca anlat..."></textarea></label>
        <button class="button primary" type="submit">Videoyu Gönder</button>
        <div id="form-message"></div>
      </form>
    </section>`;
}

function loginPage() {
  if (!supabase) return `<section class="container narrow page-top"><div class="notice">Supabase bağlantısı henüz yapılandırılmadı. <code>.env</code> dosyasını oluştur.</div></section>`;
  return `
    <section class="container narrow page-top">
      <p class="eyebrow">HESABIN</p><h1>Giriş yap veya kayıt ol.</h1>
      <form id="auth-form" class="form">
        <label>E-posta<input name="email" type="email" required /></label>
        <label>Şifre<input name="password" type="password" minlength="6" required /></label>
        <button class="button primary" name="action" value="login">Giriş Yap</button>
        <button class="button secondary" name="action" value="signup">Hesap Oluştur</button>
        <div id="auth-message"></div>
      </form>
    </section>`;
}

function profilePage() {
  return `
    <section class="container narrow page-top">
      <p class="eyebrow">PROFİL</p><h1>${escapeHtml(state.user?.email || "")}</h1>
      <div class="profile-stat"><strong>0</strong><span>Puan</span></div>
      <p>Profil ve puan sistemi bir sonraki sürümde genişletilecek.</p>
    </section>`;
}

function loginRequired(message) {
  return `<section class="container narrow page-top"><div class="notice">${message}<br><button class="button primary" data-view="login">Giriş / Kayıt</button></div></section>`;
}
function emptyState() {
  return `<div class="empty">Henüz onaylanmış video yok. İlk videoyu sen ekleyebilirsin.</div>`;
}

function bind() {
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { state.view = b.dataset.view; render(); });
  document.querySelector("#logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    state.user = null; state.view = "home"; render();
  });

  document.querySelectorAll("[data-category]").forEach(b => b.onclick = () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const id = b.dataset.category;
    const list = id === "all" ? state.videos : state.videos.filter(v => String(v.category_id) === id);
    document.querySelector("#discover-grid").innerHTML = list.map(videoCard).join("") || emptyState();
  });

  document.querySelector("#auth-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const action = f.get("action");
    const email = f.get("email"), password = f.get("password");
    const box = document.querySelector("#auth-message");
    const result = action === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) box.textContent = result.error.message;
    else {
      await loadData();
      state.view = "home";
      render();
    }
  });

  document.querySelector("#video-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const id = youtubeId(f.get("url"));
    const box = document.querySelector("#form-message");
    const { error } = await supabase.from("videos").insert({
      user_id: state.user.id,
      youtube_url: f.get("url"),
      youtube_id: id,
      title: f.get("title"),
      description: f.get("description"),
      category_id: Number(f.get("category")),
      status: "pending"
    });
    if (error) box.textContent = error.message;
    else {
      e.target.reset();
      box.textContent = "Videon gönderildi. Moderasyon sonrası keşfette görünecek.";
    }
  });
}

(async () => {
  await loadData();
  render();
})();
