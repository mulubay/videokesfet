import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const app = document.querySelector("#root");

const state = {
  view: "home",
  videos: [],
  categories: [],
  user: null,
  profile: null,
  myVideos: [],
  pointTransactions: [],
  isAdmin: false,
  selectedVideo: null,
  selectedCategory: "all",
  selectedVideoType: "all"
};



function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}
function youtubeId(url = "") {
  console.log(
    "YOUTUBE ID FONKSİYONU ÇALIŞTI:",
    url
  );
  
  try {
    const u = new URL(url);

    // youtu.be/VIDEO_ID
    if (u.hostname.includes("youtu.be")) {
      return u.pathname
        .split("/")
        .filter(Boolean)[0] || "";
    }

    // youtube.com/watch?v=VIDEO_ID
    const watchId =
      u.searchParams.get("v");

    if (watchId) {
      return watchId;
    }

    // youtube.com/shorts/VIDEO_ID
    if (
      u.pathname.startsWith("/shorts/")
    ) {
      return u.pathname
        .split("/")
        .filter(Boolean)[1] || "";
    }

    // youtube.com/embed/VIDEO_ID
    if (
      u.pathname.startsWith("/embed/")
    ) {
      return u.pathname
        .split("/")
        .filter(Boolean)[1] || "";
    }

    return "";

  } catch {
    return "";
  }

}

function videoCard(v) {

  const thumb =
    v.thumbnail_url ||
    `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;

  const isShorts =
    String(v.youtube_url || "")
      .includes("/shorts/");

  const creator =
    v.profiles?.display_name ||
    v.profiles?.username ||
    "İçerik üreticisi";

  const isOwnVideo =
    state.user &&
    v.user_id === state.user.id;

  return `
    <article class="card">

      <button
        class="video-card-button"
        data-video-id="${escapeHtml(v.youtube_id)}"
        data-video-title="${escapeHtml(
          v.title || "Video"
        )}"
      >

        <div class="video-card-thumb">

          <img
            src="${escapeHtml(thumb)}"
            alt=""
            loading="lazy"
          >

          ${
            isShorts
              ? `
                <span class="video-type-badge">
                  Shorts
                </span>
              `
              : ""
          }

        </div>

        <div class="card-body">

          <div class="video-card-meta">

            <span class="tag">
              ${escapeHtml(
                v.categories?.name || "Diğer"
              )}
            </span>

            ${
              !isOwnVideo
                ? `
                  <span class="points-badge">
                    +5 Puan
                  </span>
                `
                : `
                  <span class="video-owner-badge">
                    Senin videon
                  </span>
                `
            }

          </div>

          <h3>
            ${escapeHtml(
              v.title || "Başlıksız video"
            )}
          </h3>

          <p>
            ${escapeHtml(creator)}
          </p>

          ${
            !isOwnVideo
              ? `
                <small class="watch-reward">
                  30 saniye izle → +5 puan
                </small>
              `
              : ""
          }

          <span class="button">
            ▶ Videoyu İzle
          </span>

        </div>

      </button>

    </article>
  `;
}

function adminVideoCard(v) {
  const thumb =
    v.thumbnail_url ||
    `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;

  const date = v.created_at
    ? new Date(v.created_at).toLocaleString("tr-TR")
    : "";

  return `
    <article class="card admin-card">
      <img
        src="${escapeHtml(thumb)}"
        alt=""
        loading="lazy"
      >

      <div class="card-body">

        <span class="tag">
          ${escapeHtml(v.status || "pending")}
        </span>

        <h3>
          ${escapeHtml(v.title || "Başlıksız video")}
        </h3>

        <p>
          <strong>Kullanıcı:</strong>
          ${escapeHtml(
            v.profiles?.display_name ||
            v.profiles?.username ||
            "Bilinmeyen kullanıcı"
          )}
        </p>

        <p>
          <strong>Kategori:</strong>
          ${escapeHtml(v.categories?.name || "Diğer")}
        </p>

        <p>
          <strong>Tarih:</strong>
          ${escapeHtml(date)}
        </p>

        ${
          v.description
            ? `<p>${escapeHtml(v.description)}</p>`
            : ""
        }

        <div class="admin-actions">

          <a
            class="button secondary"
            href="${escapeHtml(v.youtube_url)}"
            target="_blank"
            rel="noopener"
          >
            YouTube'da Aç
          </a>

          <button
            class="button primary approve-video"
            data-id="${escapeHtml(v.id)}"
          >
            ✓ Onayla
          </button>

          <button
            class="button danger reject-video"
            data-id="${escapeHtml(v.id)}"
          >
            ✕ Reddet
          </button>

        </div>

        <div
          class="admin-message"
          id="message-${escapeHtml(v.id)}"
        ></div>

      </div>
    </article>
  `;
}

async function loadData() {
  if (!supabase) return;

  const { data: cats, error: categoryError } =
    await supabase
      .from("categories")
      .select("*")
      .order("name");

  if (categoryError) {
    console.error(
      "Category loading error:",
      categoryError
    );
  }

  state.categories = cats || [];

  const {
    data: { user }
  } = await supabase.auth.getUser();

  state.user = user || null;
  state.isAdmin = false;

  if (state.user) {
        const {
      data: dailyLoginReward,
      error: dailyLoginError
    } = await supabase.rpc(
      "claim_daily_login"
    );

    if (dailyLoginError) {
      console.error(
        "Daily login reward error:",
        dailyLoginError
      );
    } else if (dailyLoginReward) {
      console.log(
        "Günlük giriş ödülü: +2 puan"
      );
    }
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
       .select(
  "role, username, display_name, points, youtube_channel_url"
)
        .eq("id", state.user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Profile loading error:",
        profileError
      );
    }

    state.isAdmin = profile?.role === "admin";
    state.profile = profile || null;
const {
  data: pointTransactions,
  error: pointTransactionsError
} = await supabase
  .from("point_transactions")
  .select("amount, reason, created_at")
  .eq("user_id", state.user.id)
  .order("created_at", {
    ascending: false
  });

if (pointTransactionsError) {
  console.error(
    "Point transactions loading error:",
    pointTransactionsError
  );

  state.pointTransactions = [];
} else {
  state.pointTransactions =
    pointTransactions || [];
}
const { data: myVideos, error: myVideosError } =
  await supabase
    .from("videos")
    .select("*, categories(name)")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

if (myVideosError) {
  console.error(
    "My videos loading error:",
    myVideosError
  );

  state.myVideos = [];
} else {
  state.myVideos = myVideos || [];
}
  }

  let videoQuery = supabase
    .from("videos")
    .select(
      "*, categories(name), profiles(display_name, username)"
    )
    .order("created_at", {
      ascending: false
    });

  if (!state.isAdmin) {
    videoQuery = videoQuery.eq(
      "status",
      "approved"
    );
  }

  const { data: vids, error } =
    await videoQuery;

  if (error) {
    console.error(
      "Video loading error:",
      error
    );

    state.videos = [];
  } else {
    state.videos = vids || [];
  }
}
function captureReferralCode() {
  const ref =
    new URLSearchParams(
      window.location.search
    ).get("ref");

  if (ref) {
    localStorage.setItem(
      "referral_code",
      ref.toUpperCase()
    );

    console.log(
      "DAVET KODU KAYDEDİLDİ:",
      ref.toUpperCase()
    );
  }
}

captureReferralCode();
function render() {
  app.innerHTML = `

    <header class="header">

      <div class="container nav">

        <button
          class="logo"
          data-view="home"
        >
          Video<span>Keşfet</span>
        </button>

        <nav>

          <button data-view="home">
            Ana Sayfa
          </button>

          <button data-view="discover">
            Keşfet
          </button>

          <button data-view="submit">
            + Video Ekle
          </button>

          ${
            state.isAdmin
              ? `
                <button data-view="admin">
                  🛡️ Admin
                </button>
              `
              : ""
          }

          ${
            state.user
              ? `
                <button data-view="profile">
                  Profil
                </button>

                <button id="logout">
                  Çıkış
                </button>
              `
              : `
                <button data-view="login">
                  Giriş / Kayıt
                </button>
              `
          }

        </nav>

      </div>

    </header>

    <main>
      ${page()}
    </main>

    <footer>

      <div class="container">
        VideoKeşfet 1.0 · Yeni videolar keşfet,
        yeni kanallar bul.
      </div>

    </footer>
  `;

  bind();
    if (state.view === "watch") {
    initYouTubePlayer();
  }
}

function page() {

  if (state.view === "discover") {
    return discoverPage();
  }

  if (state.view === "watch") {
    return watchPage();
  }

  if (state.view === "submit") {
    return submitPage();
  }

  if (state.view === "login") {
    return loginPage();
  }

  if (state.view === "profile") {
    return profilePage();
  }

  if (state.view === "admin") {
    return adminPage();
  }

  return homePage();
}

function homePage() {

  const videos = state.videos
    .filter(
      (video) =>
   video.status === "approved" &&
      video.user_id !== state.user?.id
    )
    .slice(0, 6);

  return `

    <section class="hero">

      <div class="container">

        <p class="eyebrow">
          YENİ İÇERİKLERİ KEŞFET
        </p>

        <h1>
          İlgi alanına göre<br>
          <span>yeni videolar bul.</span>
        </h1>

        <p class="lead">
          İçerik üreticilerini keşfet,
          kanalları incele ve gerçekten ilgini
          çeken videolara ulaş.
        </p>

        <div class="hero-actions">

          <button
            class="button primary"
            data-view="discover"
          >
            Keşfetmeye Başla
          </button>

          <button
            class="button secondary"
            data-view="submit"
          >
            Videonu Ekle
          </button>

        </div>

      </div>

    </section>

    <section class="container section">

      <div class="section-head">

        <h2>
          🔥 Yeni Videolar
        </h2>

        <button
          data-view="discover"
          class="link"
        >
          Tümünü gör →
        </button>

      </div>

      <div class="grid">

        ${
          videos.length
            ? videos.map(videoCard).join("")
            : emptyState()
        }

      </div>

    </section>
  `;
}

function discoverPage() {

  const approvedVideos =
    state.videos.filter(
      (video) =>
        video.status === "approved" &&
        video.user_id !== state.user?.id
    );  

  return `

    <section
      class="container section page-top"
    >

      <p class="eyebrow">
        KEŞFET
      </p>

      <h1>
        Yeni videolar bul.
      </h1>
<div class="discover-search">
  <input
    id="video-search"
    type="search"
    placeholder="Video veya kanal ara..."
    autocomplete="off"
  >
</div>
      <div class="filters">

        <button
          class="filter active"
          data-category="all"
        >
          Tümü
        </button>

        ${
          state.categories
            .map(
              (c) => `
                <button
                  class="filter"
                  data-category="${escapeHtml(c.id)}"
                >
                  ${escapeHtml(c.name)}
                </button>
              `
            )
            .join("")
        }

      </div>
<div class="filters video-type-filters">

  <button
    class="filter video-type-filter active"
    data-video-type="all"
  >
    Tümü
  </button>

  <button
    class="filter video-type-filter"
    data-video-type="video"
  >
    🎬 Videolar
  </button>

  <button
    class="filter video-type-filter"
    data-video-type="shorts"
  >
    📱 Shorts
  </button>

</div>
      <div
        id="discover-grid"
        class="grid"
      >

        ${
          approvedVideos.length
            ? approvedVideos
                .map(videoCard)
                .join("")
            : emptyState()
        }

      </div>

    </section>
  `;
}

function watchPage() {
  const video = state.selectedVideo;

  if (!video) {
    return `
      <section class="container narrow page-top">
        <div class="notice">
          Video bulunamadı.
          <br><br>

          <button
            class="button primary"
            data-view="discover"
          >
            Keşfet'e Dön
          </button>
        </div>
      </section>
    `;
  }

  const embedId =
    youtubeId(video.youtube_url) ||
    video.youtube_id;

  return `
    <section
      class="container narrow page-top"
    >

      <button
        class="link"
        data-view="discover"
      >
        ← Keşfet'e dön
      </button>

      <div class="video-player">

        <div class="video-frame">

          <div
            id="youtube-player"
            data-video-id="${escapeHtml(embedId)}"
          ></div>

        </div>

      </div>

      <div
        id="watch-progress"
        class="watch-progress"
      >
        Video hazırlanıyor...
      </div>

      <span class="tag">
        ${escapeHtml(
          video.categories?.name ||
          "Diğer"
        )}
      </span>

      <h1>
        ${escapeHtml(
          video.title ||
          "Başlıksız video"
        )}
      </h1>

      <p class="lead">
        ${escapeHtml(
          video.profiles?.display_name ||
          video.profiles?.username ||
          "İçerik üreticisi"
        )}
      </p>

      ${
        video.description
          ? `
            <p>
              ${escapeHtml(
                video.description
              )}
            </p>
          `
          : ""
      }

    <button
  id="youtube-external-link"
  class="button secondary"
  type="button"
  disabled
  data-youtube-url="${escapeHtml(
    video.youtube_url
  )}"
>
  🔒 YouTube'da Aç
</button>

    </section>
  `;
}

function submitPage() {

  if (!state.user) {
    return loginRequired(
      "Video eklemek için giriş yapmalısın."
    );
  }

  return `

    <section
      class="container narrow page-top"
    >

      <p class="eyebrow">
        İÇERİK ÜRETİCİSİ
      </p>

      <h1>
        Videonu ekle.
      </h1>

      <p class="lead">
        YouTube videonu VideoKeşfet'e gönder.
        İlk sürümde gönderiler moderasyondan geçer.
      </p>

      <form
        id="video-form"
        class="form"
      >

        <label>
          YouTube bağlantısı

          <input
            name="url"
            required
            placeholder="https://youtube.com/watch?v=..."
          />
        </label>

        <label>
          Video başlığı

          <input
            name="title"
            required
            placeholder="Video başlığı"
          />
        </label>

        <label>
          Kategori

          <select
            name="category"
            required
          >

            <option value="">
              Seç...
            </option>

            ${
              state.categories
                .map(
                  (c) => `
                    <option
                      value="${escapeHtml(c.id)}"
                    >
                      ${escapeHtml(c.name)}
                    </option>
                  `
                )
                .join("")
            }

          </select>

        </label>

        <label>
          Kısa açıklama

          <textarea
            name="description"
            rows="5"
            placeholder="Videonu kısaca anlat..."
          ></textarea>
        </label>

        <button
          class="button primary"
          type="submit"
        >
          Videoyu Gönder
        </button>

        <div id="form-message"></div>

      </form>

    </section>
  `;
}

function loginPage() {

  if (!supabase) {

    return `
      <section
        class="container narrow page-top"
      >

        <div class="notice">
          Supabase bağlantısı henüz yapılandırılmadı.
        </div>

      </section>
    `;
  }

  return `

    <section
      class="container narrow page-top"
    >

      <p class="eyebrow">
        HESABIN
      </p>

      <h1>
        Giriş yap veya kayıt ol.
      </h1>

      <form
        id="auth-form"
        class="form"
      >

        <label>
          E-posta

          <input
            name="email"
            type="email"
            required
          />
        </label>

        <label>
          Şifre

          <input
            name="password"
            type="password"
            minlength="6"
            required
          />
        </label>

        <button
          class="button primary"
          name="action"
          value="login"
        >
          Giriş Yap
        </button>

        <button
          class="button secondary"
          name="action"
          value="signup"
        >
          Hesap Oluştur
        </button>

        <div id="auth-message"></div>

      </form>

    </section>
  `;
}

  function profilePage() {
  const points = state.profile?.points ?? 0;

  const username =
    state.profile?.username || "";

  const displayName =
    state.profile?.display_name || "";

  return `
    <section class="container narrow page-top">

      <p class="eyebrow">
        PROFİL
      </p>

      <h1>
        ${escapeHtml(
          displayName ||
          username ||
          state.user?.email ||
          "Kullanıcı"
        )}
      </h1>

      <p class="muted">
        @${escapeHtml(username)}
      </p>

      <div class="profile-stats">

        <div class="profile-stat">
          <strong>${points}</strong>
          <span>Puan</span>
        </div>

      </div>

      <div class="profile-edit-card">

        <div class="section-head">
          <h2>Profil Bilgileri</h2>
        </div>

        <form id="profile-form">

          <label>
            Görünen Ad

            <input
              id="profile-display-name"
              type="text"
              value="${escapeHtml(displayName)}"
              placeholder="Adınız veya görünen adınız"
              maxlength="80"
              required
            >
          </label>

          <label>
            Kullanıcı Adı

            <input
              id="profile-username"
              type="text"
              value="${escapeHtml(username)}"
              placeholder="kullaniciadi"
              maxlength="30"
              required
            >
          </label>
<label>
  YouTube Kanalım

  <input
    id="profile-youtube-channel"
    type="url"
    value="${escapeHtml(
      state.profile?.youtube_channel_url || ""
    )}"
    placeholder="https://www.youtube.com/@kanaliniz"
  >

  <small class="muted">
    Kendi YouTube kanalınızın adresini girin.
  </small>
</label>
          <button
            class="button primary"
            type="submit"
          >
            Profili Kaydet
          </button>

          <div
            id="profile-message"
            class="form-message"
          ></div>

        </form>

      </div>
<div class="profile-edit-card">

  <div class="section-head">
    <h2>🎁 Arkadaşlarını Davet Et</h2>
  </div>

  <p class="muted">
    Arkadaşını davet et, ikiniz de puan kazanın.
  </p>

  <div class="referral-rewards">

    <div>
      <strong>+20</strong>
      <span>Sen kazanırsın</span>
    </div>

    <div>
      <strong>+40</strong>
      <span>Arkadaşın kazanır</span>
    </div>

  </div>

  <div class="referral-box">

    <p class="muted">
      Davet kodun
    </p>

    <strong
      id="referral-code"
      class="referral-code"
    >
      Yükleniyor...
    </strong>

    <button
      id="copy-referral-link"
      class="button primary"
      type="button"
      disabled
    >
      🔗 Davet Linkini Kopyala
    </button>

    <div
      id="referral-message"
      class="form-message"
    ></div>

  </div>

  <p
    id="referral-count"
    class="muted"
  >
    Başarılı davetlerin: yükleniyor...
  </p>

</div>
<div class="profile-edit-card">

  <div class="section-head">
    <h2>🏆 Puan Nasıl Kazanılır?</h2>
  </div>

  <div class="point-rules">

    <div class="point-rule">
      <div>
        <strong>30 saniye video izle</strong>
        <span>Bir videoyu en az 30 saniye izle.</span>
      </div>
      <strong class="point-amount">+5</strong>
    </div>

    <div class="point-rule">
      <div>
        <strong>Günlük giriş yap</strong>
        <span>Her gün hesabına giriş yap.</span>
      </div>
      <strong class="point-amount">+2</strong>
    </div>

    <div class="point-rule">
      <div>
        <strong>Arkadaşını davet et</strong>
        <span>Arkadaşın kayıt olup daveti tamamladığında.</span>
      </div>
      <strong class="point-amount">+20</strong>
    </div>

    <div class="point-rule">
      <div>
        <strong>Davet koduyla kayıt ol</strong>
        <span>Bir arkadaşının davet koduyla kayıt olduğunda.</span>
      </div>
      <strong class="point-amount">+40</strong>
    </div>

  </div>

</div>
      <div class="section-head">
        <h2>Puan Geçmişi</h2>
      </div>

      <div class="point-history">

        ${
          state.pointTransactions?.length
            ? state.pointTransactions
                .map((transaction) => {

                  const amount =
                    Number(transaction.amount);

                  const sign =
                    amount > 0 ? "+" : "";

                  const date =
                    new Date(
                      transaction.created_at
                    ).toLocaleString("tr-TR");

                  return `
                    <div class="point-history-item">

                      <div>
                        <strong>
                          ${escapeHtml(
                            transaction.reason
                          )}
                        </strong>

                        <small>
                          ${escapeHtml(date)}
                        </small>
                      </div>

                      <span class="point-amount">
                        ${sign}${amount} puan
                      </span>

                    </div>
                  `;
                })
                .join("")
            : `
              <div class="empty">
                Henüz puan hareketi yok.
              </div>
            `
        }

      </div>

      <div class="section-head">
        <h2>Videolarım</h2>
      </div>

      ${
        state.myVideos?.length
          ? `
            <div class="grid">

              ${state.myVideos
                .map((video) => {

                  const status =
                    video.status || "pending";

                  return `
                    <article class="card my-video-card">

  <div class="video-card-thumb">

    ${
      video.thumbnail_url
        ? `
          <img
            src="${escapeHtml(
              video.thumbnail_url
            )}"
            alt=""
            loading="lazy"
          >
        `
        : `
          <div class="video-thumb-placeholder">
            Video
          </div>
        `
    }

  </div>

  <div class="card-body">

    <div class="video-card-meta">

      <span class="tag">
        ${escapeHtml(status)}
      </span>

      ${
        video.categories?.name
          ? `
            <span class="tag">
              ${escapeHtml(
                video.categories.name
              )}
            </span>
          `
          : ""
      }

    </div>

    <h3>
      ${escapeHtml(
        video.title ||
        "Başlıksız video"
      )}
    </h3>

    ${
      video.youtube_url
        ? `
          <a
            class="button secondary"
            href="${escapeHtml(
              video.youtube_url
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ YouTube'da Aç
          </a>
        `
        : ""
    }

  </div>

</article>
                  `;
                })
                .join("")}

            </div>
          `
          : `
            <div class="empty">
              Henüz video göndermediniz.
            </div>
          `
      }

    </section>
  `;
}

function adminPage() {

  if (!state.user) {
    return loginRequired(
      "Admin paneline girmek için giriş yapmalısın."
    );
  }

  if (!state.isAdmin) {

    return `
      <section
        class="container narrow page-top"
      >

        <div class="notice">
          Bu sayfaya erişim yetkin yok.
        </div>

      </section>
    `;
  }

  const pendingVideos =
    state.videos.filter(
      (video) =>
        video.status === "pending"
    );

  return `

    <section
      class="container section page-top"
    >

      <p class="eyebrow">
        YÖNETİM
      </p>

      <h1>
        Admin Paneli
      </h1>

      <p class="lead">
        Bekleyen videoları incele ve yayın
        durumlarını yönet.
      </p>

      <div class="section-head">

        <h2>
          Bekleyen Videolar
          (${pendingVideos.length})
        </h2>

      </div>

      <div
        id="admin-grid"
        class="grid"
      >

        ${
          pendingVideos.length
            ? pendingVideos
                .map(adminVideoCard)
                .join("")
            : `
              <div class="empty">
                Bekleyen video yok.
              </div>
            `
        }

      </div>

    </section>
  `;
}

function loginRequired(message) {

  return `

    <section
      class="container narrow page-top"
    >

      <div class="notice">

        ${escapeHtml(message)}

        <br><br>

        <button
          class="button primary"
          data-view="login"
        >
          Giriş / Kayıt
        </button>

      </div>

    </section>
  `;
}

function emptyState() {

  return `
    <div class="empty">
      Henüz onaylanmış video yok.
      İlk videoyu sen ekleyebilirsin.
    </div>
  `;
}

async function refreshAndRender(
  view = state.view
) {
  await loadData();

  state.view = view;

  render();
}

function bind() {

  document
    .querySelectorAll(".video-card-button")
    .forEach((button) => {

      button.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          const videoId =
            button.dataset.videoId;

          if (!videoId) return;

          const selectedVideo =
            state.videos.find(
              (video) =>
                video.youtube_id === videoId
            );

          if (!selectedVideo) return;

          state.selectedVideo =
            selectedVideo;

          state.view = "watch";

          render();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

        }
      );

    });


  document
    .querySelectorAll("[data-view]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        async (event) => {

          event.preventDefault();

          const targetView =
            button.getAttribute(
              "data-view"
            );

          if (!targetView) return;

          state.view = targetView;

          if (
            targetView === "profile" &&
            state.user
          ) {
            await loadData();
          }

          render();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

        }
      );

    });


  document
    .querySelector("#logout")
    ?.addEventListener(
      "click",
      async () => {

        if (!supabase) return;

        await supabase.auth.signOut();

        state.user = null;
        state.isAdmin = false;
        state.selectedVideo = null;
        state.view = "home";
        state.videos = [];

        await loadData();

        render();

      }
    );

// ARAMA + KATEGORİ FİLTRELEME

function applyDiscoverFilters() {

  const searchInput =
    document.querySelector("#video-search");

  const search =
    searchInput?.value
      .trim()
      .toLocaleLowerCase("tr-TR") || "";

  const category =
    state.selectedCategory || "all";
  const videoType =
  state.selectedVideoType || "all";

  const approvedVideos =
    state.videos.filter(
      (video) =>
      video.status === "approved" &&
      video.user_id !== state.user?.id
    );

  const list =
    approvedVideos.filter((video) => {

      const categoryMatch =
        category === "all" ||
        String(video.category_id) ===
          String(category);
const videoTypeMatch =
  videoType === "all" ||
  (
    videoType === "shorts" &&
    String(video.youtube_url || "")
      .includes("/shorts/")
  ) ||
  (
    videoType === "video" &&
    !String(video.youtube_url || "")
      .includes("/shorts/")
  );
      const title =
        String(
          video.title || ""
        ).toLocaleLowerCase("tr-TR");

      const creator =
        String(
          video.profiles?.display_name ||
          video.profiles?.username ||
          ""
        ).toLocaleLowerCase("tr-TR");

      const description =
        String(
          video.description || ""
        ).toLocaleLowerCase("tr-TR");

      const searchMatch =
        !search ||
        title.includes(search) ||
        creator.includes(search) ||
        description.includes(search);

  return (
  categoryMatch &&
  videoTypeMatch &&
  searchMatch
);
    });

  const grid =
    document.querySelector(
      "#discover-grid"
    );

  if (grid) {
    grid.innerHTML =
      list
        .map(videoCard)
        .join("") ||
      `
        <div class="empty">
          Aramanızla eşleşen video bulunamadı.
        </div>
      `;
  }
}


document
  .querySelector("#video-search")
  ?.addEventListener(
    "input",
    applyDiscoverFilters
  );
  document
    .querySelectorAll("[data-category]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".filter")
            .forEach((filter) => {
              filter.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );

          const id =
            button.dataset.category;
state.selectedCategory = id;
applyDiscoverFilters();
        }
      );

    });
document
  .querySelectorAll("[data-video-type]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".video-type-filter"
          )
          .forEach((filter) => {
            filter.classList.remove(
              "active"
            );
          });

        button.classList.add(
          "active"
        );

        state.selectedVideoType =
          button.dataset.videoType;

        applyDiscoverFilters();
      }
    );

  });
// VİDEO TÜRÜ FİLTRESİ

document
  .querySelectorAll("[data-video-type]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".video-type-filter"
          )
          .forEach((filter) => {
            filter.classList.remove(
              "active"
            );
          });

        button.classList.add(
          "active"
        );

        state.selectedVideoType =
          button.dataset.videoType;

        applyDiscoverFilters();

      }
    );

  });
  
  bindVideoCards();


  /*
   * PROFİL FORMU
   */

 const profileForm =
  document.querySelector("#profile-form");

if (profileForm) {

  profileForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (!supabase || !state.user) {
        return;
      }

      const displayName =
        document
          .querySelector("#profile-display-name")
          ?.value
          .trim();
const youtubeChannelUrl =
  document.querySelector(
    "#profile-youtube-channel"
  ).value.trim();
      const username =
        document
          .querySelector("#profile-username")
          ?.value
          .trim()
          .toLowerCase();

      const message =
        document.querySelector(
          "#profile-message"
        );

      if (!displayName || !username) {

        if (message) {
          message.textContent =
            "Lütfen tüm alanları doldurun.";
        }

        return;
      }

      if (message) {
        message.textContent =
          "Profil kaydediliyor...";
      }

   const { error } =
  await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username: username,
      youtube_channel_url:
        youtubeChannelUrl || null
    })
    .eq(
      "id",
      state.user.id
    );

      if (error) {

        console.error(
          "Profile update error:",
          error
        );

        if (message) {
          message.textContent =
            `Profil kaydedilemedi: ${error.message}`;
        }

        return;
      }

      state.profile = {
        ...state.profile,
        display_name: displayName,
        username: username
      };

      const {
        data: rewardGranted,
        error: rewardError
      } = await supabase.rpc(
        "complete_profile"
      );

      if (rewardError) {

        console.error(
          "Profile reward error:",
          rewardError
        );

        if (message) {
          message.textContent =
            "Profil kaydedildi ancak puan ödülü alınamadı.";
        }

      } else if (rewardGranted) {

        if (message) {
          message.textContent =
            "Profil tamamlandı! +10 puan kazandınız. 🎉";
        }

      } else {

        if (message) {
          message.textContent =
            "Profiliniz başarıyla güncellendi.";
        }

      }

      await loadData();

      state.view = "profile";

      render();

    }
  );

}
if (state.view === "profile" && state.user) {
  loadReferralProfile();
}
  /*
   * GİRİŞ / KAYIT
   */

  document
    .querySelector("#auth-form")
    ?.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        if (!supabase) return;

        const form =
          new FormData(event.target);
const action =
  event.submitter?.value ||
  form.get("action");

console.log(
  "AUTH ACTION:",
  action
);

        const email =
          form.get("email");

        const password =
          form.get("password");

        const message =
          document.querySelector(
            "#auth-message"
          );

        message.textContent =
          "İşleniyor...";

       const referralCode =
  new URLSearchParams(
    window.location.search
  ).get("ref");

const result =
  action === "signup"
    ? await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            referral_code:
              referralCode || null
          }
        }
      })
    : await supabase.auth.signInWithPassword({
        email,
        password
      });
        if (result.error) {

          message.textContent =
            result.error.message;

          return;

        }

console.log(
  "REFERRAL BLOĞUNA GELDİ",
  action,
  result.data?.user?.id
);

if (
  action === "signup" &&
  result.data?.user
) {
  const referralCode =
    localStorage.getItem(
      "referral_code"
    );

  console.log(
    "SIGNUP REFERRAL CODE:",
    referralCode
  );

  if (referralCode) {
    const {
      data: referralResult,
      error: referralError
    } = await supabase.rpc(
      "register_referral",
      {
        p_code: referralCode
      }
    );

    console.log(
      "Davet sonucu:",
      referralResult,
      referralError
    );

    if (
      referralResult === true &&
      !referralError
    ) {
      localStorage.removeItem(
        "referral_code"
      );

      console.log(
        "Davet başarıyla işlendi."
      );
    }
  }
}

        await loadData();

        state.view =
          "home";

        render();

      }
    );


  /*
   * VİDEO FORMU
   */

  document
    .querySelector("#video-form")
    ?.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        if (
          !supabase ||
          !state.user
        ) {
          return;
        }

        const form =
          new FormData(event.target);

        const url =
          form.get("url");

        const title =
          form.get("title");

        const category =
          form.get("category");

        const description =
          form.get("description");
   const message =
          document.querySelector(
            "#form-message"
          );
        const id =
          youtubeId(url);
    const channelUrl =
  state.profile?.youtube_channel_url?.trim();

if (!channelUrl) {
  message.textContent =
    "Önce Profil bölümünden YouTube kanalınızı kaydetmelisiniz.";
  return;
}

if (!id) {
  message.textContent =
    "Geçerli bir YouTube video bağlantısı girin.";
  return;
}

try {

  const oembedResponse =
    await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );

  if (!oembedResponse.ok) {
    throw new Error(
      "YouTube video bilgisi alınamadı."
    );
  }

  const oembed =
    await oembedResponse.json();

  const normalizeChannelUrl = (value) => {

    try {

      const parsed =
        new URL(value);

      return (
        parsed.origin +
        parsed.pathname
      )
        .replace(/\/+$/, "")
        .toLowerCase();

    } catch {
      return "";
    }
  };

  const savedChannel =
    normalizeChannelUrl(channelUrl);

  const videoChannel =
    normalizeChannelUrl(
      oembed.author_url
    );

  console.log(
    "Kayıtlı kanal:",
    savedChannel
  );

  console.log(
    "Videonun kanalı:",
    videoChannel
  );

  if (
    !savedChannel ||
    !videoChannel ||
    savedChannel !== videoChannel
  ) {

    message.textContent =
      "Bu video kayıtlı YouTube kanalınızla eşleşmiyor. Yalnızca kendi kanalınızdaki videoları ekleyebilirsiniz.";

    return;
  }

} catch (error) {

  console.error(
    "YouTube kanal kontrolü hatası:",
    error
  );

  message.textContent =
    "Video sahibi doğrulanamadı. Lütfen YouTube bağlantısını kontrol edin.";

  return;
}
console.log("URL:", url);
console.log("YOUTUBE ID:", id);

     

        message.textContent =
          "Gönderiliyor...";

        const { error } =
          await supabase
            .from("videos")
            .insert({
              user_id:
                state.user.id,

              youtube_url:
                url,

              youtube_id:
                id,

              title:
                title,

              description:
                description,

              category_id:
                Number(category),

              status:
                "pending"
            });

        if (error) {

          message.textContent =
            error.message;

          return;

        }

        event.target.reset();

        message.textContent =
          "Videon gönderildi. Moderasyon sonrası keşfette görünecek.";

      }
    );


  /*
   * ADMIN - ONAYLA
   */

  document
    .querySelectorAll(
      ".approve-video"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        async () => {

          await updateVideoStatus(
            button.dataset.id,
            "approved"
          );

        }
      );

    });


  /*
   * ADMIN - REDDET
   */

  document
    .querySelectorAll(
      ".reject-video"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        async () => {

          await updateVideoStatus(
            button.dataset.id,
            "rejected"
          );

        }
      );

    });

}
function initYouTubePlayer() {

  const playerElement =
    document.querySelector("#youtube-player");

  if (!playerElement) return;

  const videoId =
    playerElement.dataset.videoId;

  if (!videoId) return;

  const externalLink =
    document.querySelector(
      "#youtube-external-link"
    );

  const progressElement =
    document.querySelector(
      "#watch-progress"
    );

  let player = null;
  let interval = null;

  let watchedSeconds = 0;
  let unlocked = false;

  const REQUIRED_SECONDS = 30;

  function updateProgress() {

  if (unlocked) return;

  const watched =
    Math.min(
      watchedSeconds,
      REQUIRED_SECONDS
    );

  const remaining =
    Math.max(
      0,
      REQUIRED_SECONDS - watched
    );

  if (remaining <= 0) {

    unlocked = true;
    if (state.user) {

  supabase
    .rpc(
      "complete_video_view",
      {
        p_video_id:
          Number(state.selectedVideo.id)
      }
    )
    .then(({ data, error }) => {

      if (error) {

        console.error(
          "İzlenme kaydı hatası:",
          error
        );

        return;
      }

      console.log(
        "İzlenme kaydı sonucu:",
        data
      );

    });

}

    if (externalLink) {

      externalLink.disabled = false;

      externalLink.textContent =
        "YouTube'da Aç ↗";

      externalLink.onclick = () => {

        const url =
          externalLink.dataset.youtubeUrl;

        if (url) {

          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );

        }

      };

    }

    if (progressElement) {

      progressElement.textContent =
        "✅ 30 / 30 saniye izlendi — 🔓 YouTube bağlantısı artık açılabilir.";

    }

    stopTracking();

    return;
  }

  if (progressElement) {

    progressElement.textContent =
      `▶️ ${watched} / 30 saniye izlendi · 🔒 YouTube bağlantısı için ${remaining} saniye daha izle.`;

  }

}

  function startTracking() {

    if (interval || unlocked) return;

    console.log(
      "Video oynatma takibi başladı."
    );

    updateProgress();

    interval =
      setInterval(() => {

        watchedSeconds++;

        console.log(
          "Gerçek izleme süresi:",
          watchedSeconds
        );

        updateProgress();

      }, 1000);

  }

  function stopTracking() {

    if (!interval) return;

    clearInterval(interval);

    interval = null;

    console.log(
      "Video oynatma takibi durdu."
    );

  }

  function createPlayer() {

    if (player) return;

    console.log(
      "YouTube Player oluşturuluyor:",
      videoId
    );

    player =
      new YT.Player(
        "youtube-player",
        {

          videoId: videoId,

          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1
          },

          events: {

            onReady: (event) => {

              player = event.target;

              console.log(
                "YouTube Player hazır."
              );

              if (progressElement) {

                progressElement.textContent =
                  "▶ Videoyu oynatın.";

              }

            },

            onStateChange: (event) => {

              console.log(
                "YouTube Player durumu:",
                event.data
              );

              if (
                event.data ===
                YT.PlayerState.PLAYING
              ) {

                startTracking();

              } else {

                stopTracking();

              }

            },

            onError: (event) => {

              console.error(
                "YouTube Player hatası:",
                event.data
              );

              stopTracking();

              if (progressElement) {

                progressElement.textContent =
                  "Video oynatılamadı.";

              }

            }

          }

        }
      );

  }

  if (
    window.YT &&
    typeof window.YT.Player ===
      "function"
  ) {

    createPlayer();

    return;

  }

  let script =
    document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

  if (!script) {

    script =
      document.createElement(
        "script"
      );

    script.src =
      "https://www.youtube.com/iframe_api";

    document.head.appendChild(
      script
    );

  }

  let attempts = 0;

  const apiCheck =
    setInterval(() => {

      attempts++;

      if (
        window.YT &&
        typeof window.YT.Player ===
          "function"
      ) {

        clearInterval(apiCheck);

        createPlayer();

        return;

      }

      if (attempts >= 100) {

        clearInterval(apiCheck);

        console.error(
          "YouTube Iframe API yüklenemedi."
        );

        if (progressElement) {

          progressElement.textContent =
            "YouTube oynatıcı başlatılamadı.";

        }

      }

    }, 100);

}
async function loadReferralProfile() {

  if (!supabase || !state.user) {
    return;
  }

  const codeElement =
    document.querySelector(
      "#referral-code"
    );

  const countElement =
    document.querySelector(
      "#referral-count"
    );

  const copyButton =
    document.querySelector(
      "#copy-referral-link"
    );

  const messageElement =
    document.querySelector(
      "#referral-message"
    );

  if (
    !codeElement ||
    !countElement ||
    !copyButton
  ) {
    return;
  }

  // Kullanıcının davet kodunu getir
  const {
    data: referralCode,
    error: codeError
  } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (codeError) {

    console.error(
      "Davet kodu alınamadı:",
      codeError
    );

    codeElement.textContent =
      "Kod alınamadı";

    return;
  }

  if (!referralCode?.code) {

    codeElement.textContent =
      "Davet kodu bulunamadı";

    return;
  }

  const code =
    referralCode.code;

  codeElement.textContent =
    code;

  // Başarılı davet sayısı
  const {
    count,
    error: countError
  } = await supabase
    .from("referrals")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "inviter_id",
      state.user.id
    );

  if (countError) {

    console.error(
      "Davet sayısı alınamadı:",
      countError
    );

    countElement.textContent =
      "Başarılı davetlerin: 0 / 20";

  } else {

    countElement.textContent =
      `Başarılı davetlerin: ${
        count || 0
      } / 20`;
  }

  // Davet linki
  const referralLink =
    `${window.location.origin}/?ref=${encodeURIComponent(
      code
    )}`;

  copyButton.disabled = false;

  copyButton.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          referralLink
        );

        messageElement.textContent =
          "Davet linki kopyalandı!";

      } catch (error) {

        console.error(
          "Link kopyalanamadı:",
          error
        );

        messageElement.textContent =
          referralLink;
      }
    }
  );
}

function bindVideoCards() {

  document
    .querySelectorAll(".video-card-button")
    .forEach((button) => {

      button.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          const videoId =
            button.dataset.videoId;

          if (!videoId) return;

          const selectedVideo =
            state.videos.find(
              (video) =>
                video.youtube_id === videoId
            );

          if (!selectedVideo) return;

          state.selectedVideo =
            selectedVideo;

          state.view = "watch";

          render();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

        }
      );

    });

}

 

async function updateVideoStatus(
  videoId,
  status
) {

  if (
    !supabase ||
    !state.isAdmin
  ) {
    return;
  }

  const message =
    document.querySelector(
      `#message-${videoId}`
    );

  if (message) {
    message.textContent =
      "Güncelleniyor...";
  }

  // Video onaylama işlemi artık
  // güvenli Supabase fonksiyonu üzerinden yapılacak.
  if (status === "approved") {

    const { data, error } =
      await supabase.rpc(
        "approve_video",
        {
          p_video_id: videoId
        }
      );

    if (error) {

      console.error(
        "Video approval error:",
        error
      );

      if (message) {
        message.textContent =
          `İşlem başarısız: ${error.message}`;
      }

      return;
    }

    if (data === false) {

      if (message) {
        message.textContent =
          "Video zaten onaylanmış.";
      }

      return;
    }

  } else {

    // Reddetme şimdilik mevcut sistemle devam ediyor.
    const { error } =
      await supabase
        .from("videos")
        .update({
          status
        })
        .eq("id", videoId);

    if (error) {

      console.error(
        "Video status update error:",
        error
      );

      if (message) {
        message.textContent =
          `İşlem başarısız: ${error.message}`;
      }

      return;
    }

  }

  await refreshAndRender("admin");
}

(async () => {

  await loadData();

  render();

})();
