import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Menu,
  Pause,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { hoverLift } from "./lib/anime-effects.js";

const SnapodScrollModel = lazy(() => import("./SnapodScrollModel.jsx")
  .then((module) => ({ default: module.SnapodScrollModel })));

const BRAND_NAME = "Tuliko";
const BRAND_LOGO_SRC = "/assets/brand/tuliko-logo.png";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const segment = (progress, start, end) => ease((progress - start) / (end - start));
const windowed = (progress, enterStart, enterEnd, exitStart, exitEnd) =>
  segment(progress, enterStart, enterEnd) * (1 - segment(progress, exitStart, exitEnd));

const navItems = [
  { label: "製品", href: "#product" },
  { label: "素材・性能", href: "#material" },
  { label: "構造解析", href: "#exploded" },
  { label: "導入シーン", href: "#spaces" },
  { label: "お問い合わせ", href: "#contact" },
];

const chapters = [
  { number: "01", label: "集中", at: 0.18 },
  { number: "02", label: "多層構造", at: 0.45 },
  { number: "03", label: "カラー", at: 0.72 },
  { number: "04", label: "フォルム", at: 0.92 },
];

function CornerFrame() {
  return (
    <div className="corner-frame" aria-hidden="true">
      <Plus className="corner corner--tl" size={14} strokeWidth={1.35} />
      <Plus className="corner corner--tr" size={14} strokeWidth={1.35} />
      <Plus className="corner corner--bl" size={14} strokeWidth={1.35} />
      <Plus className="corner corner--br" size={14} strokeWidth={1.35} />
    </div>
  );
}

function BrandLogo({ className = "", decorative = false }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src={BRAND_LOGO_SRC}
      alt={decorative ? "" : BRAND_NAME}
      aria-hidden={decorative || undefined}
    />
  );
}

function IntroLoader({ active, progress, complete }) {
  if (!active) return null;

  return (
    <div
      className={`intro-loader ${complete ? "is-complete" : ""}`}
      role="status"
      aria-label={`ページを読み込んでいます。${progress}パーセント`}
      style={{ "--loader-progress": progress / 100 }}
    >
      <div className="intro-loader__meter">
        <div className="intro-loader__meta" aria-hidden="true">
          <span>読み込み中</span>
          <output>{String(progress).padStart(3, "0")}%</output>
        </div>
        <div
          className="intro-loader__track"
          role="progressbar"
          aria-label="ページ読み込み進捗"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <i className="intro-loader__fill" />
        </div>
      </div>
    </div>
  );
}

function Header({ menuOpen, onMenuToggle, searchOpen, onSearchToggle }) {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label={`${BRAND_NAME} ホームページ`}>
          <BrandLogo className="brand-logo--header" decorative />
          <small>静けさを設計する</small>
        </a>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-button"
            type="button"
            aria-label={searchOpen ? "検索を閉じる" : "サイト内検索"}
            aria-expanded={searchOpen}
            aria-controls="site-search"
            onClick={onSearchToggle}
          >
            <Search size={18} strokeWidth={1.35} />
            <span>検索</span>
          </button>
          <button
            className="icon-button menu-button"
            type="button"
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            onClick={onMenuToggle}
          >
            {menuOpen ? <X size={20} strokeWidth={1.35} /> : <Menu size={20} strokeWidth={1.35} />}
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu__inner">
          <p>メニュー</p>
          {navItems.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onMenuToggle}
              tabIndex={menuOpen ? 0 : -1}
            >
              <span>0{index + 1}</span>
              {item.label}
              <ArrowRight size={22} strokeWidth={1.25} />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const items = [
    { label: "SPD01 パーソナルブース", detail: "製品 / 1名用の集中空間", href: "#product" },
    { label: "吸音・換気構造", detail: "素材・性能 / フェルト、ガラス、換気", href: "#material" },
    { label: "爆発図で見る構造", detail: "構造解析 / フレーム、吸音パネル、外装パネル", href: "#exploded" },
    { label: "導入シーン", detail: "ラウンジ、アトリウム、ライブラリー", href: "#spaces" },
    { label: "お問い合わせ", detail: "導入・お見積もりのご相談", href: "#contact" },
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase("ja");
  const filtered = items.filter((item) =>
    `${item.label} ${item.detail}`.toLocaleLowerCase("ja").includes(normalizedQuery));

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  return (
    <section id="site-search" className={`search-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="search-panel__inner">
        <p>{BRAND_NAME} サイト内検索</p>
        <label htmlFor="site-search-input">何をお探しですか？</label>
        <div className="search-panel__field">
          <Search size={28} strokeWidth={1.2} aria-hidden="true" />
          <input
            ref={inputRef}
            id="site-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="「吸音性能」「導入シーン」など"
            tabIndex={open ? 0 : -1}
          />
          <button type="button" onClick={onClose} aria-label="検索を閉じる" tabIndex={open ? 0 : -1}>
            <X size={24} strokeWidth={1.25} />
          </button>
        </div>
        <div className="search-panel__results" aria-live="polite">
          {filtered.length ? filtered.map((item, index) => (
            <a key={item.label} href={item.href} onClick={onClose} tabIndex={open ? 0 : -1}>
              <span>0{index + 1}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              <ArrowRight size={20} strokeWidth={1.2} />
            </a>
          )) : <p className="search-panel__empty">該当する項目が見つかりません。別のキーワードをお試しください。</p>}
        </div>
      </div>
    </section>
  );
}

function ScrollRail({ stageRef }) {
  const jumpTo = (amount) => {
    const stage = stageRef.current;
    if (!stage) return;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(0, stage.offsetHeight - window.innerHeight);
    window.scrollTo({ top: top + distance * amount, behavior: "smooth" });
  };

  return (
    <aside className="scroll-rail" aria-label="製品ストーリーの章">
      <span className="scroll-rail__eyebrow">製品ストーリー</span>
      <div className="scroll-rail__track">
        <span className="scroll-rail__fill" />
      </div>
      <div className="scroll-rail__chapters">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.number}
            type="button"
            className={`rail-chapter rail-chapter--${index + 1}`}
            onClick={() => jumpTo(chapter.at)}
          >
            <span>{chapter.number}</span>
            {chapter.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function AudioWaveBackground({ stageRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return undefined;

    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time = 0) => {
      const styles = getComputedStyle(stage);
      const progress = Number.parseFloat(styles.getPropertyValue("--progress")) || 0;
      const light = Number.parseFloat(styles.getPropertyValue("--light")) || 0;
      const tone = light > 0.5 ? "18, 20, 18" : "238, 239, 234";
      const center = height * (0.55 - progress * 0.025);
      const pulse = 0.84 + Math.sin(time * 0.0017) * 0.16;

      context.clearRect(0, 0, width, height);
      context.lineCap = "round";

      for (let band = 0; band < 5; band += 1) {
        const amplitude = height * (0.018 + band * 0.008) * pulse * (0.82 + progress * 0.28);
        const frequency = 0.009 + band * 0.00135;
        const speed = 0.00042 + band * 0.0001;
        const offset = (band - 2) * height * 0.012;
        context.beginPath();

        for (let x = 0; x <= width; x += 3) {
          const envelope = 0.22 + Math.pow(Math.sin((Math.PI * x) / width), 1.5) * 0.78;
          const carrier = Math.sin(x * frequency + time * speed + progress * 8.5);
          const harmonic = Math.sin(x * frequency * 0.43 - time * speed * 1.7) * 0.34;
          const y = center + offset + (carrier + harmonic) * amplitude * envelope;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.strokeStyle = `rgba(${tone}, ${0.085 + band * 0.025})`;
        context.lineWidth = band === 2 ? 1.4 : 0.8;
        context.stroke();
      }

      context.strokeStyle = `rgba(${tone}, ${0.08 + progress * 0.035})`;
      context.lineWidth = 1;
      const bars = 56;
      for (let index = 0; index < bars; index += 1) {
        const x = width * (0.12 + (index / (bars - 1)) * 0.76);
        const envelope = Math.sin((Math.PI * index) / (bars - 1));
        const signal = Math.abs(Math.sin(index * 0.61 + time * 0.0021 + progress * 9));
        const barHeight = height * (0.012 + signal * 0.045) * envelope;
        context.beginPath();
        context.moveTo(x, center - barHeight);
        context.lineTo(x, center + barHeight);
        context.stroke();
      }

      if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [stageRef]);

  return <canvas ref={canvasRef} className="audio-wave-canvas" aria-hidden="true" />;
}

function StoryStage({ stageRef }) {
  return (
    <section className="story-stage" id="product" ref={stageRef} aria-label="スクロールで見る製品ストーリー">
      <div className="story-sticky">
        <CornerFrame />
        <ScrollRail stageRef={stageRef} />
        <AudioWaveBackground stageRef={stageRef} />

        <div className="product-visual" aria-hidden="true">
          <div className="product-shadow" />
          <img className="pod-image pod-image--dark" src="/assets/products/pod-green-cutout-v2.png" alt="" />
          <img className="pod-image pod-image--green" src="/assets/products/pod-green-cutout-v2.png" alt="" />
          <img className="pod-image pod-image--sand" src="/assets/products/pod-sand-cutout-v2.png" alt="" />
          <img className="pod-image pod-image--coral" src="/assets/products/pod-coral-cutout-v2.png" alt="" />
        </div>

        <div className="exploded-progress-video" aria-hidden="true">
          <Suspense fallback={(
            <div className="snapod-scroll-model snapod-scroll-model--module-loading">
              <img src="/assets/products/pod-exploded-cutout.png" alt="" />
              <div className="snapod-scroll-model__loading"><span>3D MODEL</span><b>000%</b></div>
            </div>
          )}>
            <SnapodScrollModel stageRef={stageRef} />
          </Suspense>
        </div>

        <div className="chapter chapter--hero">
          <p className="chapter__eyebrow">空間の中に、もうひとつの静かな空間を。</p>
          <h1>静けさを、<br />設計する。</h1>
          <button
            className="pill-button pill-button--ghost"
            type="button"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              window.scrollTo({
                top: stage.offsetTop + (stage.offsetHeight - window.innerHeight) * 0.2,
                behavior: "smooth",
              });
            }}
          >
            製品ストーリーを見る <ArrowDown size={17} strokeWidth={1.4} />
          </button>
        </div>

        <article className="chapter chapter--focus">
          <p className="chapter__eyebrow">01 / 集中</p>
          <h2>ひとりで、深く<br />集中できる空間。</h2>
          <p className="chapter__copy">
            周囲とのつながりを保ちながら、会話やオンライン会議に集中しやすいパーソナルブースです。
          </p>
        </article>

        <article className="chapter chapter--layers" id="material">
          <p className="chapter__eyebrow">02 / 多層構造</p>
          <h2>静けさは、内側から<br />つくられる。</h2>
          <p className="chapter__copy">
            吸音フェルト、強化ガラス、換気システムを一体化。快適に過ごしやすいブース環境を支えます。
          </p>
          <div className="material-note material-note--a"><span>01</span> 吸音フェルト</div>
          <div className="material-note material-note--b"><span>02</span> 強化ガラス</div>
          <div className="material-note material-note--c"><span>03</span> 静音換気システム</div>
        </article>

        <article className="chapter chapter--finish">
          <p className="chapter__eyebrow">03 / カラー</p>
          <h2>空間になじむ、<br />3つのカラー。</h2>
          <p className="chapter__copy">セージ、サンド、コーラル。オフィスの雰囲気に合わせてお選びいただけます。</p>
          <div className="swatches" aria-label="カラーバリエーション">
            <span className="swatch swatch--sage">セージ</span>
            <span className="swatch swatch--sand">サンド</span>
            <span className="swatch swatch--coral">コーラル</span>
          </div>
        </article>

        <article className="chapter chapter--form">
          <p className="chapter__eyebrow">04 / SPD01</p>
          <h2>ひとり用の<br />集中ブース。</h2>
          <div className="spec-line">
            <span><b>1名</b> 使用目安</span>
            <span><b>最大30 dB</b> 音声低減※</span>
            <span><b>最短5分</b> 組立目安※</span>
          </div>
          <p className="spec-note">※測定環境・設置条件により異なります。</p>
          <a className="pill-button pill-button--solid" href="#spaces">
            導入シーンを見る <ArrowRight size={17} strokeWidth={1.4} />
          </a>
        </article>

      </div>
    </section>
  );
}

function FeatureStrip() {
  const features = [
    ["最大30 dB", "音声低減の目安※", "通話やオンライン会議に集中しやすい環境づくりをサポートします。※測定条件により異なります。"],
    ["40 m³/h", "連続換気", "ブース内の空気を継続的に入れ替え、快適性に配慮した設計です。"],
    ["電源 / USB", "すぐに使える", "電源・USBポートとワークテーブルを一体化。設置後すぐに使い始めやすい構成です。"],
  ];

  return (
    <section className="feature-strip" aria-label="製品仕様">
      {features.map(([value, label, description]) => (
        <article key={label}>
          <strong>{value}</strong>
          <div>
            <h3>{label}</h3>
            <p>{description}</p>
          </div>
          <Check size={20} strokeWidth={1.25} aria-hidden="true" />
        </article>
      ))}
    </section>
  );
}

function ExplodedSection() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      setIsPlaying(false);
    }

    return undefined;
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
  };

  return (
    <section className="exploded-section" id="exploded" aria-labelledby="exploded-title">
      <div className="exploded-heading">
        <div>
          <p className="section-kicker">静けさを支える構造</p>
          <h2 id="exploded-title">中身まで、<br />見せられる設計。</h2>
        </div>
        <p>
          フレーム、吸音パネル、外装パネルを順に分解・再構成。
          静かな集中空間を支える主要部材を、6秒の映像で確認できます。
          <small>※映像は構造を分かりやすく示したイメージです。</small>
        </p>
      </div>

      <figure className="exploded-showcase">
        <div className="exploded-video">
          <video
            ref={videoRef}
            src="/assets/video/snapod-story-exploded-v2.mp4"
            poster="/assets/video/snapod-story-exploded-v2-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            aria-label={`${BRAND_NAME} SPD01の主要部材を分解して見せる爆発図動画`}
          />
          <div className="exploded-video__meta" aria-hidden="true">
            <span>STRUCTURE / 01</span>
            <span>6 SEC</span>
          </div>
          <button
            className="exploded-video__control"
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? "爆発図動画を一時停止" : "爆発図動画を再生"}
          >
            {isPlaying ? <Pause size={16} strokeWidth={1.4} /> : <Play size={16} strokeWidth={1.4} />}
            <span>{isPlaying ? "一時停止" : "再生"}</span>
          </button>
        </div>
        <figcaption>
          <span><b>01</b> フレーム</span>
          <span><b>02</b> 吸音パネル</span>
          <span><b>03</b> 外装パネル</span>
        </figcaption>
      </figure>
    </section>
  );
}

function SpacesSection() {
  return (
    <section className="spaces-section" id="spaces">
      <div className="section-heading">
        <div>
          <p className="section-kicker">置くだけで、空間に静けさを。</p>
          <h2>働く場所に、<br />静かな場所を。</h2>
        </div>
        <p>
          ラウンジ、アトリウム、ライブラリーなど、既存空間を大きく変えずに設置しやすいコンパクト設計です。
        </p>
      </div>

      <div className="spaces-grid">
        <figure className="space-card space-card--wide">
          <video
            src="/assets/video/snapod-story.mp4"
            poster="/assets/scenes/lounge.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`ラウンジに設置した${BRAND_NAME} SPD01の使用イメージ動画`}
          />
          <figcaption><span>01</span> ラウンジ / 落ち着いて集中</figcaption>
        </figure>
        <figure className="space-card">
          <img src="/assets/scenes/atrium.webp" alt="明るいオフィスアトリウムに設置された防音ブース" loading="lazy" />
          <figcaption><span>02</span> アトリウム / 空間の中の小さな個室</figcaption>
        </figure>
        <figure className="space-card">
          <img src="/assets/scenes/library.webp" alt="モダンなライブラリー空間に設置された防音ブース" loading="lazy" />
          <figcaption><span>03</span> ライブラリー / 必要なときに集中</figcaption>
        </figure>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <CornerFrame />
      <div className="footer-main">
        <p>オフィスが騒がしいと感じたら。</p>
        <h2>静けさのための<br />場所をつくる。</h2>
        <a className="pill-button pill-button--light" href="mailto:hello@example.com">
          導入について相談する <ArrowRight size={18} strokeWidth={1.35} />
        </a>
      </div>
      <div className="footer-meta">
        <span>{BRAND_NAME.toUpperCase()} / 静けさを設計する</span>
        <span>プロトタイプ 2026</span>
        <a href="#top">ページ上部へ</a>
      </div>
    </footer>
  );
}

export function App() {
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const buttons = shellRef.current?.querySelectorAll(".pill-button");
    if (!buttons?.length) return undefined;

    return hoverLift(buttons, {
      distance: 2,
      scale: 1.01,
      duration: 260,
      ease: "outCubic",
    });
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hash = window.location.hash;
    const shouldPlay = !reducedMotion && window.scrollY < 8 && (!hash || hash === "#top");

    if (!shouldPlay) {
      setLoadProgress(100);
      setIntroReady(true);
      setIntroActive(false);
      return undefined;
    }

    window.scrollTo(0, 0);
    document.body.classList.add("intro-locked");

    let cancelled = false;
    let animationFrame = 0;
    let targetProgress = 3;
    let displayedProgress = 0;

    const loadImage = (src) => new Promise((resolve) => {
      const image = new Image();
      const timeout = window.setTimeout(resolve, 5000);
      const finish = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      image.src = src;
    });

    const loadVideoMetadata = (src) => new Promise((resolve) => {
      const video = document.createElement("video");
      const timeout = window.setTimeout(finish, 5000);
      function finish() {
        window.clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", finish);
        video.removeEventListener("error", finish);
        video.removeAttribute("src");
        video.load();
        resolve();
      }
      video.preload = "metadata";
      video.muted = true;
      video.addEventListener("loadedmetadata", finish, { once: true });
      video.addEventListener("error", finish, { once: true });
      video.src = src;
      video.load();
    });

    const loadBinary = (src) => fetch(src, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Asset request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .catch(() => undefined);

    const assetTasks = [
      "/assets/products/pod-green-cutout-v2.png",
      "/assets/products/pod-sand-cutout-v2.png",
      "/assets/products/pod-coral-cutout-v2.png",
      "/assets/scenes/lounge.webp",
      "/assets/scenes/atrium.webp",
      "/assets/scenes/library.webp",
      "/assets/products/pod-exploded-cutout.png",
      "/assets/video/snapod-story-exploded-v2-poster.webp",
    ].map(loadImage);

    assetTasks.push(
      loadVideoMetadata("/assets/video/snapod-story.mp4"),
      loadVideoMetadata("/assets/video/snapod-story-exploded-v2.mp4"),
      loadBinary("/assets/models/snapod-assembly.glb"),
      document.fonts?.ready ?? Promise.resolve(),
    );

    let completedTasks = 0;
    assetTasks.forEach((task) => {
      Promise.resolve(task).finally(() => {
        if (cancelled) return;
        completedTasks += 1;
        targetProgress = 4 + (completedTasks / assetTasks.length) * 91;
      });
    });

    const animateProgress = () => {
      if (cancelled) return;
      const distance = targetProgress - displayedProgress;
      if (distance > 0) {
        displayedProgress += Math.min(distance, Math.max(0.14, distance * 0.09));
      }
      if (targetProgress >= 100 && 100 - displayedProgress < 0.42) {
        displayedProgress = 100;
      }
      setLoadProgress(Math.min(100, Math.round(displayedProgress)));
      if (displayedProgress === 100) {
        setIntroReady(true);
        return;
      }
      animationFrame = window.requestAnimationFrame(animateProgress);
    };

    animationFrame = window.requestAnimationFrame(animateProgress);
    const minimumDisplay = new Promise((resolve) => window.setTimeout(resolve, 1050));
    Promise.allSettled([...assetTasks, minimumDisplay]).then(() => {
      if (!cancelled) targetProgress = 100;
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      document.body.classList.remove("intro-locked");
    };
  }, []);

  useEffect(() => {
    if (!introActive || !introReady) return undefined;
    const timeout = window.setTimeout(() => {
      document.body.classList.remove("intro-locked");
      setIntroActive(false);
    }, 3850);

    return () => window.clearTimeout(timeout);
  }, [introActive, introReady]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    let frame = 0;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / distance);

      const light = segment(progress, 0.24, 0.38);
      const ivory = [237, 236, 230];
      const dark = [8, 10, 9];
      const bg = dark.map((value, index) => Math.round(lerp(value, ivory[index], light)));
      const ink = Math.round(lerp(238, 19, light));

      const compact = window.innerWidth <= 900;
      let x = 0;
      let y = compact ? 14 : 66;
      let scale = compact ? 1.02 : 1.38;
      let rotation = 45;

      if (progress < 0.22) {
        const t = segment(progress, 0, 0.22);
        const focusShift = segment(progress, 0.1, 0.2);
        x = lerp(0, compact ? -16 : -27, focusShift);
        y = lerp(compact ? 14 : 66, 4, t);
        scale = lerp(compact ? 1.02 : 1.38, compact ? 0.86 : 0.98, t);
        rotation = lerp(45, -1.5, t);
      } else if (progress < 0.34) {
        const t = segment(progress, 0.22, 0.34);
        x = lerp(compact ? -16 : -27, compact ? -14 : -24, t);
        y = lerp(4, -1, t);
        scale = lerp(compact ? 0.86 : 0.98, compact ? 0.98 : 1.15, t);
        rotation = lerp(-1.5, -5, t);
      } else if (progress < 0.4) {
        const t = segment(progress, 0.34, 0.4);
        x = lerp(compact ? -14 : -24, compact ? 14 : 27, t);
        y = lerp(-1, -4, t);
        scale = lerp(compact ? 0.98 : 1.15, compact ? 0.92 : 1, t);
        rotation = lerp(-5, 3, t);
      } else if (progress < 0.61) {
        x = compact ? 14 : 27;
        y = -4;
        scale = compact ? 0.92 : 1;
        rotation = 3;
      } else if (progress < 0.69) {
        const t = segment(progress, 0.61, 0.69);
        x = lerp(compact ? 14 : 27, compact ? -10 : -19, t);
        y = lerp(-4, 1, t);
        scale = lerp(compact ? 0.92 : 1, compact ? 0.84 : 0.9, t);
        rotation = lerp(3, -2, t);
      } else if (progress < 0.83) {
        const t = segment(progress, 0.69, 0.83);
        x = lerp(compact ? -10 : -19, compact ? -9 : -16, t);
        y = lerp(1, 0, t);
        scale = lerp(compact ? 0.84 : 0.9, compact ? 0.74 : 0.78, t);
        rotation = lerp(-2, 0, t);
      } else {
        const t = segment(progress, 0.83, 1);
        x = compact ? -9 : -16;
        y = 0;
        scale = lerp(compact ? 0.74 : 0.78, compact ? 0.69 : 0.72, t);
        rotation = 0;
      }

      const sand = windowed(progress, 0.68, 0.72, 0.77, 0.81);
      const coral = segment(progress, 0.78, 0.83) * (1 - segment(progress, 0.88, 0.92));
      const green = clamp(1 - sand - coral);
      const explodedIn = segment(progress, 0.33, 0.405);
      const explodedOut = 1 - segment(progress, 0.59, 0.625);
      const exploded = explodedIn * explodedOut;
      const explodedSeparation = segment(progress, 0.39, 0.45) * (1 - segment(progress, 0.55, 0.6));
      const explodedAnchorX = compact ? x : x - 20;
      const explodedAnchorY = y + (compact ? -7 : -4);
      const explodedSettle = segment(progress, 0.405, 0.45);
      const explodedReturn = segment(progress, 0.55, 0.6);
      const explodedX = progress < 0.45
        ? lerp(explodedAnchorX, 0, explodedSettle)
        : lerp(0, explodedAnchorX, explodedReturn);
      const explodedY = progress < 0.45
        ? lerp(explodedAnchorY, 0, explodedSettle)
        : lerp(0, explodedAnchorY, explodedReturn);

      stage.style.setProperty("--progress", progress.toFixed(4));
      stage.style.setProperty("--progress-pct", `${(progress * 100).toFixed(2)}%`);
      stage.style.setProperty("--scene-bg", `rgb(${bg.join(",")})`);
      stage.style.setProperty("--scene-ink", `rgb(${ink},${ink},${ink})`);
      stage.style.setProperty("--light", light.toFixed(4));
      stage.style.setProperty("--product-x", `${x.toFixed(2)}vw`);
      stage.style.setProperty("--product-y", `${y.toFixed(2)}vh`);
      stage.style.setProperty("--product-scale", scale.toFixed(4));
      stage.style.setProperty("--product-rotate", `${rotation.toFixed(2)}deg`);
      stage.style.setProperty("--exploded-o", exploded.toFixed(4));
      stage.style.setProperty("--exploded-t", explodedSeparation.toFixed(4));
      stage.style.setProperty("--exploded-x", `${explodedX.toFixed(2)}vw`);
      stage.style.setProperty("--exploded-y", `${explodedY.toFixed(2)}vh`);
      stage.style.setProperty("--exploded-scale", lerp(compact ? 1.12 : 1.18, 1, explodedSeparation).toFixed(4));
      stage.style.setProperty("--exploded-note-y", `${lerp(8, 0, explodedSeparation).toFixed(2)}px`);
      stage.style.setProperty("--hero-o", (1 - segment(progress, 0.08, 0.16)).toFixed(4));
      stage.style.setProperty("--focus-o", windowed(progress, 0.14, 0.2, 0.3, 0.37).toFixed(4));
      stage.style.setProperty("--layers-o", windowed(progress, 0.36, 0.42, 0.54, 0.61).toFixed(4));
      stage.style.setProperty("--finish-o", windowed(progress, 0.61, 0.67, 0.77, 0.84).toFixed(4));
      stage.style.setProperty("--form-o", segment(progress, 0.82, 0.9).toFixed(4));
      stage.style.setProperty("--focus-rail-o", (0.32 + windowed(progress, 0.14, 0.2, 0.3, 0.37) * 0.68).toFixed(4));
      stage.style.setProperty("--layers-rail-o", (0.32 + windowed(progress, 0.36, 0.42, 0.54, 0.61) * 0.68).toFixed(4));
      stage.style.setProperty("--finish-rail-o", (0.32 + windowed(progress, 0.61, 0.67, 0.77, 0.84) * 0.68).toFixed(4));
      stage.style.setProperty("--form-rail-o", (0.32 + segment(progress, 0.82, 0.9) * 0.68).toFixed(4));
      stage.style.setProperty("--green-o", green.toFixed(4));
      stage.style.setProperty("--sand-o", sand.toFixed(4));
      stage.style.setProperty("--coral-o", coral.toFixed(4));
      stage.style.setProperty("--dark-o", (1 - light).toFixed(4));
      stage.style.setProperty("--green-vis", (light * green).toFixed(4));
      stage.style.setProperty("--sand-vis", (light * sand).toFixed(4));
      stage.style.setProperty("--coral-vis", (light * coral).toFixed(4));

      document.body.dataset.storyTone = light > 0.55 ? "light" : "dark";
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

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
    <div
      ref={shellRef}
      id="top"
      className={`site-shell ${introActive ? "is-intro" : ""} ${introReady ? "is-intro-ready" : ""}`}
    >
      <IntroLoader active={introActive} progress={loadProgress} complete={introReady} />
      <a className="skip-link" href="#product">製品ストーリーへ移動</a>
      <Header
        menuOpen={menuOpen}
        searchOpen={searchOpen}
        onMenuToggle={() => {
          setMenuOpen((value) => !value);
          setSearchOpen(false);
        }}
        onSearchToggle={() => {
          setSearchOpen((value) => !value);
          setMenuOpen(false);
        }}
      />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main>
        <StoryStage stageRef={stageRef} />
        <FeatureStrip />
        <ExplodedSection />
        <SpacesSection />
      </main>
      <Footer />
    </div>
  );
}
