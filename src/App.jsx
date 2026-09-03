import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  FileText,
  Image as ImageIcon,
  Menu,
  Pause,
  Play,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { hoverLift } from "./lib/anime-effects.js";

const SnapodScrollModel = lazy(() => import("./SnapodScrollModel.jsx")
  .then((module) => ({ default: module.SnapodScrollModel })));

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const segment = (progress, start, end) => smooth((progress - start) / (end - start));
const windowed = (progress, enterStart, enterEnd, exitStart, exitEnd) =>
  segment(progress, enterStart, enterEnd) * (1 - segment(progress, exitStart, exitEnd));

const navItems = [
  { label: "製品", href: "#product" },
  { label: "構造と性能", href: "#structure" },
  { label: "導入シーン", href: "#spaces" },
  { label: "ストーリー", href: "#story" },
  { label: "お問い合わせ", href: "#contact" },
];

const chapters = [
  { number: "01", label: "静けさ", at: 0.22 },
  { number: "02", label: "つくり", at: 0.40 },
  { number: "03", label: "構造", at: 0.59 },
  { number: "04", label: "SPD01", at: 0.84 },
];
const STORY_SLIDE_STOPS = [0, ...chapters.map((chapter) => chapter.at)];

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.zip";
const ATTACHMENT_EXTENSION = /\.(png|jpe?g|webp|gif|pdf|docx?|xlsx?|pptx?|dwg|dxf|zip)$/i;

const formatAttachmentSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function CornerFrame() {
  return (
    <div className="corner-frame" aria-hidden="true">
      <Plus className="corner corner--tl" size={14} strokeWidth={1.25} />
      <Plus className="corner corner--tr" size={14} strokeWidth={1.25} />
      <Plus className="corner corner--bl" size={14} strokeWidth={1.25} />
      <Plus className="corner corner--br" size={14} strokeWidth={1.25} />
    </div>
  );
}

function MaskedLines({ as: Tag = "h2", lines, className = "" }) {
  const label = lines.join(" ");
  return (
    <Tag className={`masked-heading ${className}`} aria-label={label}>
      {lines.map((line) => (
        <span className="masked-line" key={line} aria-hidden="true">
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

function IntroLoader({ active, progress, complete }) {
  if (!active) return null;
  const status = complete ? "表示準備が整いました" : "画像・フォント・映像を準備しています";
  return (
    <div
      className={`intro-loader ${complete ? "is-complete" : ""}`}
      role="status"
      aria-label={`ページを読み込み中、${progress}%`}
      style={{
        "--loader-progress": progress / 100,
        "--loader-reveal": `${100 - progress}%`,
        "--loader-offset": `${(1 - progress / 100) * 20}px`,
      }}
    >
      <div className="intro-loader__brand" aria-hidden="true">
        <span className="wordmark">SNAPOD</span>
        <span>QUIET SPACE / SPD01</span>
      </div>
      <img
        className="intro-loader__product"
        src="/assets/products/pod-green-cutout-v2.png"
        alt=""
        decoding="async"
        fetchPriority="high"
      />
      <div className="intro-loader__status">
        <div className="intro-loader__status-top" aria-hidden="true">
          <span>PREPARING THE SPACE</span>
          <strong>{String(progress).padStart(3, "0")}<small>%</small></strong>
        </div>
        <div className="intro-loader__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <i className="intro-loader__fill" />
        </div>
        <div className="intro-loader__status-bottom" aria-hidden="true">
          <span>LOCAL ASSETS / SYSTEM CHECK</span>
          <span>{status}</span>
        </div>
      </div>
    </div>
  );
}

function Header({ menuOpen, searchOpen, onMenuToggle, onSearchToggle }) {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="SNAPOD ホーム">SNAPOD</a>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="header-actions">
          <button
            className={`search-trigger ${searchOpen ? "is-active" : ""}`}
            type="button"
            aria-label={searchOpen ? "検索を閉じる" : "サイト内検索"}
            aria-expanded={searchOpen}
            onClick={onSearchToggle}
          >
            <Search size={17} strokeWidth={1.35} />
            <span>検索</span>
          </button>
          <button
            className="menu-trigger"
            type="button"
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            onClick={onMenuToggle}
          >
            {menuOpen ? <X size={19} strokeWidth={1.25} /> : <Menu size={19} strokeWidth={1.25} />}
          </button>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <nav aria-label="モバイルナビゲーション">
          {navItems.map((item, index) => (
            <a href={item.href} key={item.href} tabIndex={menuOpen ? 0 : -1} onClick={onMenuToggle}>
              <span>{item.label}</span>
              {index === 0 || index === 1 ? <Plus size={18} strokeWidth={1.1} /> : <ArrowRight size={18} strokeWidth={1.1} />}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}

function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const items = [
    ["SPD01 パーソナルブース", "製品", "#product"],
    ["吸音・換気構造", "構造と性能", "#structure"],
    ["オフィス導入シーン", "導入シーン", "#spaces"],
    ["製品について相談", "お問い合わせ", "#contact"],
  ];
  const normalized = query.trim().toLocaleLowerCase("ja");
  const filtered = normalized
    ? items.filter((item) => `${item[0]} ${item[1]}`.toLocaleLowerCase("ja").includes(normalized))
    : [];

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  return (
    <section className={`search-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <form className="search-panel__form" onSubmit={(event) => event.preventDefault()}>
        <Search size={19} strokeWidth={1.25} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="SNAPODを検索"
          aria-label="サイト内検索"
          tabIndex={open ? 0 : -1}
        />
        <button type="button" onClick={onClose} aria-label="検索を閉じる" tabIndex={open ? 0 : -1}>
          <X size={18} strokeWidth={1.25} />
        </button>
      </form>
      {normalized && (
        <div className="search-panel__results" aria-live="polite">
          {filtered.length ? filtered.map(([label, detail, href]) => (
            <a key={label} href={href} onClick={onClose}>
              <span>{label}<small>{detail}</small></span>
              <ArrowRight size={17} strokeWidth={1.2} />
            </a>
          )) : <p>該当する項目はありません。</p>}
        </div>
      )}
    </section>
  );
}

function ScrollRail({ stageRef }) {
  const jumpTo = (amount) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.dispatchEvent(new CustomEvent("snapod:story-slide", { detail: amount }));
  };

  return (
    <aside className="scroll-rail" aria-label="製品ストーリーの章">
      <div className="scroll-rail__track"><span /></div>
      <div className="scroll-rail__chapters">
        {chapters.map((chapter, index) => (
          <button key={chapter.number} className={`rail-chapter rail-chapter--${index + 1}`} type="button" onClick={() => jumpTo(chapter.at)}>
            <span>{chapter.number}</span>{chapter.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function TechnicalField() {
  return (
    <div className="technical-field" aria-hidden="true">
      <i className="technical-ring technical-ring--1" />
      <i className="technical-ring technical-ring--2" />
      <i className="technical-ring technical-ring--3" />
      <i className="technical-ring technical-ring--4" />
      <Plus className="technical-cross technical-cross--top" size={14} strokeWidth={1.1} />
      <Plus className="technical-cross technical-cross--right" size={14} strokeWidth={1.1} />
      <Plus className="technical-cross technical-cross--bottom" size={14} strokeWidth={1.1} />
      <Plus className="technical-cross technical-cross--left" size={14} strokeWidth={1.1} />
    </div>
  );
}

function StoryStage({ stageRef }) {
  return (
    <section className="story-stage" id="product" ref={stageRef} aria-label="スクロールで見るSNAPOD製品ストーリー">
      <div className="story-sticky">
        <CornerFrame />
        <ScrollRail stageRef={stageRef} />
        <TechnicalField />

        <div className="story-product-anchor" aria-hidden="true">
          <div className="product-shadow" />
          <img className="story-product-image" src="/assets/products/pod-green-cutout-v2.png" alt="" />
          <div className="story-model">
            <Suspense fallback={<img className="model-fallback" src="/assets/products/pod-exploded-cutout.png" alt="" />}>
              <SnapodScrollModel stageRef={stageRef} />
            </Suspense>
          </div>
        </div>

        <article className="chapter chapter--hero">
          <p className="chapter__eyebrow">QUIET SPACE, RE-ENGINEERED.</p>
          <MaskedLines as="h1" className="hero-heading" lines={["静けさを、", "設計する。"]} />
          <button className="pill-button pill-button--ghost" type="button" onClick={() => {
            const stage = stageRef.current;
            if (!stage) return;
            window.scrollTo({ top: stage.offsetTop + (stage.offsetHeight - window.innerHeight) * 0.2, behavior: "smooth" });
          }}>
            製品ストーリーを見る <ArrowDown size={16} strokeWidth={1.35} />
          </button>
        </article>

        <article className="chapter chapter--performance">
          <p className="chapter__eyebrow">01 / PERFORMANCE</p>
          <MaskedLines lines={["静けさは、", "性能になる。"]} />
          <p className="chapter__copy">周囲のざわめきを抑えながら、声の明瞭さと快適な空気を保つ。集中と会話のための、小さな建築です。</p>
          <dl className="mini-specs">
            <div><dt>最大</dt><dd>30 dB*</dd></div>
            <div><dt>連続換気</dt><dd>40 m³/h</dd></div>
          </dl>
        </article>

        <article className="chapter chapter--craft">
          <p className="chapter__eyebrow">02 / CRAFT</p>
          <MaskedLines lines={["内部からつくる、", "静けさ。"]} />
          <p className="chapter__copy">吸音材、強化ガラス、換気経路。目に見えない層を精密に重ね、居心地を整えます。</p>
        </article>

        <article className="chapter chapter--structure" id="structure">
          <p className="chapter__eyebrow">03 / STRUCTURE</p>
          <MaskedLines lines={["構造が、", "静けさを支える。"]} />
          <p className="chapter__copy">実際のCAD装配関係をもとに、ベース、壁、ガラス、屋根、ドアを施工順に分解・復原します。</p>
          <div className="structure-labels" aria-hidden="true">
            <span>01 BASE</span><span>02 PANELS</span><span>03 GLASS</span><span>04 ROOF</span>
          </div>
        </article>

        <article className="chapter chapter--product">
          <p className="chapter__eyebrow">04 / SNAPOD SPD01</p>
          <MaskedLines lines={["ひとり用の、", "集中ブース。"]} />
          <p className="chapter__copy">W1000 × D1000 × H2300 mm。オフィスの余白に置ける、最小限の静かな部屋。</p>
          <a className="pill-button pill-button--solid" href="#spaces">導入シーンを見る <ArrowRight size={16} strokeWidth={1.35} /></a>
          <small>*測定環境・設置条件により異なります。</small>
        </article>
      </div>
    </section>
  );
}

function FeatureStrip() {
  const features = [
    ["30 dB*", "音声低減の目安", "会話やオンライン会議に集中しやすい音環境へ。"],
    ["40 m³/h", "連続換気", "ブース内の空気を継続的に入れ替えます。"],
    ["POWER / USB", "すぐに使える", "電源とUSBポート、ワークテーブルを一体化。"],
  ];
  return (
    <div className="feature-strip" role="group" aria-label="製品仕様">
      {features.map(([value, label, copy]) => (
        <article key={label}>
          <strong>{value}</strong>
          <div><h3>{label}</h3><p>{copy}</p></div>
          <Check size={18} strokeWidth={1.2} />
        </article>
      ))}
    </div>
  );
}

function OverviewSection() {
  return (
    <section className="overview-section information-page" aria-labelledby="overview-title">
      <FeatureStrip />
      <div className="overview-section__body">
        <div>
          <p className="section-kicker">MADE FOR FOCUS</p>
          <h2 id="overview-title">空間のノイズを、<br />静けさに変える。</h2>
        </div>
        <p>設置するだけで、オープンな場所にひとつの静かな居場所が生まれます。</p>
      </div>
    </section>
  );
}

function FilmSection() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  return (
    <section className="film-section information-page" id="story" aria-label="SNAPOD製品映像">
      <figure className="film-frame">
        <video
          ref={videoRef}
          src="/assets/video/snapod-story.mp4"
          poster="/assets/scenes/lounge.webp"
          autoPlay muted loop playsInline preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        />
        <figcaption><span>SNAPOD / PRODUCT FILM</span><span>00:18</span></figcaption>
        <button type="button" onClick={toggle} aria-label={playing ? "動画を一時停止" : "動画を再生"}>
          {playing ? <Pause size={16} strokeWidth={1.3} /> : <Play size={16} strokeWidth={1.3} />}
          {playing ? "PAUSE" : "PLAY FILM"}
        </button>
      </figure>
    </section>
  );
}

function SpacesSection() {
  const cards = [
    ["/assets/scenes/lounge.webp", "LOUNGE", "会話の近くに、集中の場所を。"],
    ["/assets/scenes/atrium.webp", "ATRIUM", "余白を、小さな個室へ。"],
    ["/assets/scenes/library.webp", "LIBRARY", "必要なときだけ、静かに。"],
  ];
  return (
    <section className="spaces-section information-page" id="spaces">
      <div className="section-heading">
        <div><p className="section-kicker">PLACED IN REAL SPACE</p><h2>置くだけで、<br />静かな場所を。</h2></div>
        <p>ラウンジ、アトリウム、ライブラリー。既存空間を大きく変えずに導入できます。</p>
      </div>
      <div className="spaces-grid">
        {cards.map(([src, label, copy], index) => (
          <figure className="space-card" key={label}>
            <img src={src} alt={`${label}に設置されたSNAPOD`} loading="lazy" />
            <figcaption><span>0{index + 1} / {label}</span><strong>{copy}</strong></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function StatementSection() {
  return (
    <section className="statement-section information-page" id="quiet-statement">
      <img
        className="statement-section__image"
        src="/assets/scenes/quiet-work-statement-v1.webp"
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <div className="statement-section__veil" />
      <div className="statement-section__content">
        <p>ENGINEERED QUIET</p>
        <h2>静けさは、<br />空間を前に進める。</h2>
        <a className="pill-button pill-button--light" href="#contact">製品について相談する <ArrowRight size={16} strokeWidth={1.35} /></a>
      </div>
    </section>
  );
}

function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const attachmentInputRef = useRef(null);

  const addAttachments = (fileList) => {
    const incoming = Array.from(fileList || []);
    const valid = [];
    let error = "";

    incoming.forEach((file) => {
      if (!file.type.startsWith("image/") && !ATTACHMENT_EXTENSION.test(file.name)) {
        error ||= "対応していないファイル形式が含まれています。";
        return;
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        error ||= "1ファイルあたり10MB以内で追加してください。";
        return;
      }
      valid.push(file);
    });

    const unique = [...attachments];
    valid.forEach((file) => {
      const duplicate = unique.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if (!duplicate) unique.push(file);
    });
    if (unique.length > MAX_ATTACHMENTS) error ||= "添付できるファイルは5点までです。";
    setAttachments(unique.slice(0, MAX_ATTACHMENTS));
    setAttachmentError(error);
  };

  const resetConsultation = () => {
    setSubmitted(false);
    setAttachments([]);
    setAttachmentError("");
  };

  return (
    <section className="contact-section information-page" id="contact">
      <img src="/assets/scenes/lounge.webp" alt="ラウンジに設置されたSNAPOD" loading="lazy" />
      <div className="contact-card">
        <div className="contact-card__header">
          <div className="contact-card__meta">
            <p className="section-kicker">START A QUIETER SPACE</p>
            <span>CONTACT / 01</span>
          </div>
          <h2>導入のご相談</h2>
          <p>設置場所やご希望をお聞かせください。レイアウト、仕様、概算のお見積もりまで、担当者がご案内します。</p>
        </div>
        {submitted ? (
          <div className="contact-success" role="status">
            <span className="contact-success__icon"><Check size={22} strokeWidth={1.3} /></span>
            <div>
              <small>REQUEST RECEIVED</small>
              <strong>お問い合わせを受け付けました。</strong>
              <p>ありがとうございます。内容を確認のうえ、担当者より1〜2営業日以内にご連絡します。</p>
            </div>
            <button type="button" onClick={resetConsultation}>別の相談を入力 <ArrowRight size={16} strokeWidth={1.3} /></button>
          </div>
        ) : (
          <form className="consultation-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <div className="consultation-form__row">
              <label className="consultation-form__field">
                <span><b>01</b> お名前 <em>必須</em></span>
                <input name="name" type="text" autoComplete="name" required placeholder="山田 太郎" />
              </label>
              <label className="consultation-form__field">
                <span><b>02</b> 会社名 <em>必須</em></span>
                <input name="company" type="text" autoComplete="organization" required placeholder="株式会社SNAPOD" />
              </label>
            </div>
            <label className="consultation-form__field consultation-form__field--full">
              <span><b>03</b> メールアドレス <em>必須</em></span>
              <input name="email" type="email" autoComplete="email" required placeholder="name@company.jp" />
            </label>
            <div className="consultation-form__row">
              <label className="consultation-form__field">
                <span><b>04</b> ご相談内容 <em>必須</em></span>
                <select name="topic" required defaultValue="">
                  <option value="" disabled>選択してください</option>
                  <option value="estimate">見積もり・価格</option>
                  <option value="layout">レイアウト・設置</option>
                  <option value="spec">仕様・性能</option>
                  <option value="other">その他</option>
                </select>
              </label>
              <label className="consultation-form__field">
                <span><b>05</b> 導入予定数</span>
                <select name="quantity" defaultValue="undecided">
                  <option value="undecided">未定</option>
                  <option value="1">1台</option>
                  <option value="2-5">2〜5台</option>
                  <option value="6+">6台以上</option>
                </select>
              </label>
            </div>
            <label className="consultation-form__field consultation-form__field--full">
              <span><b>06</b> ご要望・設置場所</span>
              <textarea name="message" rows="3" placeholder="設置予定の場所、時期、ご希望の仕様などをご記入ください。" />
            </label>
            <div className="consultation-form__upload">
              <div className="consultation-form__upload-heading">
                <span><b>07</b> 参考ファイル</span>
                <em>任意 / 最大5点</em>
              </div>
              <div
                className={`consultation-form__dropzone ${dragActive ? "is-dragging" : ""}`}
                role="button"
                tabIndex="0"
                aria-label="参考ファイルを選択"
                onClick={() => attachmentInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    attachmentInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  addAttachments(event.dataTransfer.files);
                }}
              >
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  onChange={(event) => {
                    addAttachments(event.target.files);
                    event.target.value = "";
                  }}
                />
                <span className="consultation-form__upload-icon"><Upload size={18} strokeWidth={1.3} /></span>
                <div>
                  <strong>図面・写真・資料を追加</strong>
                  <span>クリック、またはここにドラッグ＆ドロップ</span>
                </div>
                <small>JPG / PNG / PDF / OFFICE / DWG / DXF / ZIP　各10MBまで</small>
              </div>
              {attachmentError ? <p className="consultation-form__upload-error" role="alert">{attachmentError}</p> : null}
              {attachments.length > 0 ? (
                <ul className="consultation-form__files" aria-label="選択済みファイル">
                  {attachments.map((file) => (
                    <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                      {file.type.startsWith("image/") ? <ImageIcon size={15} strokeWidth={1.3} /> : <FileText size={15} strokeWidth={1.3} />}
                      <span><strong>{file.name}</strong><small>{formatAttachmentSize(file.size)}</small></span>
                      <button
                        type="button"
                        aria-label={`${file.name}を削除`}
                        onClick={() => {
                          setAttachments((current) => current.filter((item) => item !== file));
                          setAttachmentError("");
                        }}
                      ><X size={14} strokeWidth={1.3} /></button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <label className="consultation-form__privacy">
              <input type="checkbox" required />
              <span>プライバシーポリシーを確認し、個人情報の取り扱いに同意します。</span>
            </label>
            <div className="consultation-form__actions">
              <p><b>RESPONSE TIME</b> 通常1〜2営業日以内にご連絡します。</p>
              <button type="submit">相談内容を送信 <ArrowRight size={17} strokeWidth={1.3} /></button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  const groups = [
    ["PRODUCT", ["SPD01", "構造と性能", "カラー"]],
    ["DISCOVER", ["導入シーン", "ストーリー", "資料"]],
    ["SUPPORT", ["お問い合わせ", "設置について", "FAQ"]],
    ["FOLLOW", ["Instagram", "LinkedIn", "YouTube"]],
  ];
  return (
    <footer className="site-footer">
      <CornerFrame />
      <div className="footer-wordmark" aria-hidden="true">SNAPOD</div>
      <div className="footer-grid">
        <div className="footer-intro"><a className="wordmark" href="#top">SNAPOD</a><p>静けさを、設計する。</p></div>
        {groups.map(([title, links]) => (
          <div className="footer-group" key={title}><p>{title}</p>{links.map((link) => <a href="#top" key={link}>{link}</a>)}</div>
        ))}
      </div>
      <div className="footer-meta"><span>© 2026 SNAPOD</span><span>JAPAN / SHANGHAI</span><a href="#top">BACK TO TOP ↑</a></div>
    </footer>
  );
}

export function App() {
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const informationRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const targets = shellRef.current?.querySelectorAll(".pill-button");
    if (!targets?.length) return undefined;
    return hoverLift(targets, { distance: 2, scale: 1.01, duration: 260, ease: "outCubic" });
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldPlay = !reducedMotion && window.scrollY < 8 && (!window.location.hash || window.location.hash === "#top");
    if (!shouldPlay) {
      setLoadProgress(100);
      setIntroReady(true);
      setIntroActive(false);
      return undefined;
    }

    document.body.classList.add("intro-locked");
    let cancelled = false;
    let frame = 0;
    let target = 4;
    let displayed = 0;
    const sources = [
      "/assets/products/pod-green-cutout-v2.png",
      "/assets/scenes/lounge.webp",
      "/assets/scenes/atrium.webp",
      "/assets/scenes/library.webp",
      "/assets/video/snapod-exploded-seedance-a-poster.webp",
      "/assets/models/snapod-assembly.glb",
    ];
    const tasks = sources.map((src) => fetch(src, { cache: "force-cache" }).catch(() => undefined));
    tasks.push(document.fonts?.ready ?? Promise.resolve());
    let completed = 0;
    tasks.forEach((task) => Promise.resolve(task).finally(() => {
      completed += 1;
      target = 5 + (completed / tasks.length) * 90;
    }));

    const tick = () => {
      if (cancelled) return;
      displayed += Math.max(0.12, (target - displayed) * 0.08);
      if (target === 100 && 100 - displayed < 0.45) displayed = 100;
      setLoadProgress(Math.min(100, Math.round(displayed)));
      if (displayed === 100) setIntroReady(true);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    Promise.allSettled([...tasks, new Promise((resolve) => window.setTimeout(resolve, 800))]).then(() => { target = 100; });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      document.body.classList.remove("intro-locked");
    };
  }, []);

  useEffect(() => {
    if (!introActive || !introReady) return undefined;
    const timeout = window.setTimeout(() => {
      document.body.classList.remove("intro-locked");
      setIntroActive(false);
    }, 1850);
    return () => window.clearTimeout(timeout);
  }, [introActive, introReady]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const informationPages = informationRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let settleTimer = 0;
    let releaseTimer = 0;
    let slideLocked = false;

    const getStoryProgress = () => {
      const rect = stage.getBoundingClientRect();
      const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
      return clamp(-rect.top / distance);
    };

    const isStoryPinned = () => {
      const rect = stage.getBoundingClientRect();
      return rect.top <= 1 && rect.bottom >= window.innerHeight - 1;
    };

    const nearestSlideIndex = (progress) => STORY_SLIDE_STOPS.reduce((closest, stop, index) => (
      Math.abs(stop - progress) < Math.abs(STORY_SLIDE_STOPS[closest] - progress) ? index : closest
    ), 0);

    const updateSlideMarker = (progress) => {
      const slideIndex = nearestSlideIndex(progress);
      stage.dataset.storySlide = String(slideIndex);
      stage.querySelectorAll(".rail-chapter").forEach((button, index) => {
        if (index === slideIndex - 1) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    };

    const moveToStorySlide = (target) => {
      const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
      const stageTop = stage.getBoundingClientRect().top + window.scrollY;
      slideLocked = true;
      stage.classList.add("is-slide-turning");
      window.clearTimeout(releaseTimer);
      window.scrollTo({
        top: stageTop + distance * target,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      releaseTimer = window.setTimeout(() => {
        slideLocked = false;
        stage.classList.remove("is-slide-turning");
        settleStorySlide();
      }, reduceMotion ? 0 : 620);
    };

    const settleStorySlide = () => {
      if (slideLocked || !isStoryPinned()) return;
      const progress = getStoryProgress();
      const finalStop = STORY_SLIDE_STOPS.at(-1);
      if (progress > finalStop + 0.02) return;
      const nearest = STORY_SLIDE_STOPS[nearestSlideIndex(progress)];
      if (Math.abs(nearest - progress) > 0.012) moveToStorySlide(nearest);
    };

    const update = () => {
      const rect = stage.getBoundingClientRect();
      const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
      const p = clamp(-rect.top / distance);
      const mobile = window.innerWidth <= 760;
      updateSlideMarker(p);
      const light = segment(p, 0.18, 0.36);
      const dark = [5, 6, 6];
      const pale = [235, 237, 236];
      const bg = dark.map((value, index) => Math.round(lerp(value, pale[index], light)));
      const ink = Math.round(lerp(244, 18, light));

      let x;
      let y;
      let scale;
      let rotate;
      if (p < 0.09) {
        const t = segment(p, 0, 0.09);
        x = lerp(0, mobile ? -6 : -8, t);
        y = mobile ? 34 : 52;
        scale = mobile ? 1.12 : 1.32;
        rotate = lerp(-8, -4, t);
      } else if (p < 0.16) {
        const t = segment(p, 0.09, 0.16);
        x = lerp(mobile ? -6 : -8, mobile ? -14 : -21, t);
        y = lerp(mobile ? 34 : 52, mobile ? 9 : 7, t);
        scale = lerp(mobile ? 1.12 : 1.32, mobile ? 0.88 : 1.04, t);
        rotate = lerp(-4, 1, t);
      } else if (p < 0.30) {
        const t = segment(p, 0.16, 0.30);
        x = lerp(mobile ? -14 : -21, mobile ? -11 : -24, t);
        y = lerp(mobile ? 9 : 7, mobile ? 24 : 0, t);
        scale = lerp(mobile ? 0.88 : 1.04, mobile ? 1.02 : 1.16, t);
        rotate = lerp(1, -2, t);
      } else if (p < 0.38) {
        const t = segment(p, 0.30, 0.38);
        x = lerp(mobile ? -11 : -24, mobile ? 10 : 28, t);
        y = lerp(mobile ? 24 : 0, mobile ? 27 : 4, t);
        scale = lerp(mobile ? 1.02 : 1.16, mobile ? 0.84 : 1.08, t);
        rotate = lerp(-2, 2, t);
      } else if (p < 0.54) {
        const t = segment(p, 0.38, 0.54);
        x = lerp(mobile ? 10 : 28, mobile ? 10 : 24, t);
        y = lerp(mobile ? 27 : 4, mobile ? 21 : 1, t);
        scale = lerp(mobile ? 0.84 : 1.08, mobile ? 0.85 : 1.08, t);
        rotate = lerp(2, 0, t);
      } else if (p < 0.70) {
        x = mobile ? 10 : 24;
        y = mobile ? 21 : 1;
        scale = mobile ? 0.85 : 1.08;
        rotate = 0;
      } else {
        const t = segment(p, 0.70, 0.86);
        x = lerp(mobile ? 10 : 24, mobile ? -8 : -22, t);
        y = lerp(mobile ? 21 : 1, mobile ? 26 : 1, t);
        scale = lerp(mobile ? 0.85 : 1.08, mobile ? 0.70 : 0.88, t);
        rotate = lerp(0, -1, t);
      }

      const modelIn = segment(p, 0.48, 0.55);
      const modelOut = 1 - segment(p, 0.76, 0.82);
      const modelOpacity = modelIn * modelOut;
      const rasterOpacity = Math.max(1 - segment(p, 0.42, 0.48), segment(p, 0.82, 0.88));
      const explosion = segment(p, 0.52, 0.64) * (1 - segment(p, 0.68, 0.80));
      const hero = 1 - segment(p, 0.075, 0.14);
      const performance = windowed(p, 0.15, 0.22, 0.30, 0.37);
      const craft = windowed(p, 0.38, 0.44, 0.46, 0.52);
      const structure = windowed(p, 0.50, 0.57, 0.70, 0.77);
      const product = segment(p, 0.76, 0.84);
      const rings = windowed(p, 0.12, 0.23, 0.73, 0.84);

      const set = (name, value) => stage.style.setProperty(name, value);
      set("--progress", p.toFixed(4));
      set("--progress-pct", `${(p * 100).toFixed(2)}%`);
      set("--scene-bg", `rgb(${bg.join(",")})`);
      set("--scene-ink", `rgb(${ink},${ink},${ink})`);
      set("--light", light.toFixed(4));
      set("--product-x", `${x.toFixed(2)}vw`);
      set("--product-y", `${y.toFixed(2)}vh`);
      set("--product-scale", scale.toFixed(4));
      set("--product-rotate", `${rotate.toFixed(2)}deg`);
      set("--raster-o", rasterOpacity.toFixed(4));
      set("--model-o", modelOpacity.toFixed(4));
      set("--raster-blur", `${((1 - rasterOpacity) * 2).toFixed(2)}px`);
      set("--model-blur", `${(((1 - modelIn) + (1 - modelOut)) * 2).toFixed(2)}px`);
      set("--exploded-t", explosion.toFixed(4));
      set("--hero-o", hero.toFixed(4));
      set("--performance-o", performance.toFixed(4));
      set("--craft-o", craft.toFixed(4));
      set("--structure-o", structure.toFixed(4));
      set("--product-o", product.toFixed(4));
      set("--rings-o", rings.toFixed(4));
      set("--hero-y", `${lerp(0, -34, segment(p, 0.075, 0.14)).toFixed(2)}px`);
      set("--performance-y", `${lerp(28, 0, segment(p, 0.15, 0.22)).toFixed(2)}px`);
      set("--craft-y", `${lerp(30, 0, segment(p, 0.38, 0.44)).toFixed(2)}px`);
      set("--structure-y", `${lerp(30, 0, segment(p, 0.50, 0.57)).toFixed(2)}px`);
      set("--product-y-copy", `${lerp(30, 0, segment(p, 0.76, 0.84)).toFixed(2)}px`);
      const surface = document.elementFromPoint(window.innerWidth / 2, mobile ? 92 : 84);
      const darkSurface = surface?.closest?.(".statement-section, .site-footer");
      document.body.dataset.storyTone = darkSurface ? "dark" : (light > 0.55 ? "light" : "dark");
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleStorySlide, 130);
    };

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 2 || !isStoryPinned()) return;
      if (slideLocked) {
        event.preventDefault();
        return;
      }

      const progress = getStoryProgress();
      const direction = Math.sign(event.deltaY);
      const target = direction > 0
        ? STORY_SLIDE_STOPS.find((stop) => stop > progress + 0.012)
        : [...STORY_SLIDE_STOPS].reverse().find((stop) => stop < progress - 0.012);

      if (target === undefined) return;
      event.preventDefault();
      moveToStorySlide(target);
    };

    const onStorySlideRequest = (event) => {
      if (typeof event.detail === "number") moveToStorySlide(event.detail);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("snapod:story-slide", onStorySlideRequest);
    window.addEventListener("resize", schedule);
    informationPages?.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(releaseTimer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("wheel", onWheel);
      stage.removeEventListener("snapod:story-slide", onStorySlideRequest);
      window.removeEventListener("resize", schedule);
      informationPages?.removeEventListener("scroll", schedule);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={shellRef} id="top" className={`site-shell ${introActive ? "is-intro" : ""} ${introReady ? "is-intro-ready" : ""}`}>
      <IntroLoader active={introActive} progress={loadProgress} complete={introReady} />
      <a className="skip-link" href="#product">製品ストーリーへ移動</a>
      <Header
        menuOpen={menuOpen}
        searchOpen={searchOpen}
        onMenuToggle={() => { setMenuOpen((value) => !value); setSearchOpen(false); }}
        onSearchToggle={() => { setSearchOpen((value) => !value); setMenuOpen(false); }}
      />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main>
        <StoryStage stageRef={stageRef} />
        <div ref={informationRef} className="information-pages" aria-label="SNAPOD製品情報">
          <OverviewSection />
          <FilmSection />
          <SpacesSection />
          <StatementSection />
          <ContactSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
