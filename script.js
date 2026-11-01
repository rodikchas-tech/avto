// ================= НАСТРОЙКИ МАШИН =================
// folder — папка с кадрами, frames — сколько кадров в папке
const CARS = [
    {
        folder: 'models1', frames: 120,
        brand: 'KOENIGSEGG', tag: 'HYBRID HYPERCAR', name: 'Koenigsegg Regera', watermark: 'REGERA',
        subtitle: 'Искусство скорости и гибридных технологий.',
        bg: '#121110', accent: '#cda851', scale: 1, mScale: 1,
        specs: [['410', 'км/ч', 'Максимальная скорость'], ['2.8', 'сек', 'Разгон до 100 км/ч'],
                ['1500', 'л.с.', 'Мощность двигателя'], ['$1,890,000', '', 'Стоимость автомобиля']]
    },
    {
        folder: 'models2', frames: 120,
        brand: 'BUGATTI', tag: 'TRACK HYPERCAR', name: 'Bugatti Bolide', watermark: 'BOLIDE',
        subtitle: 'W16 для трека: 1850 л.с. при массе в 1240 кг.',
        bg: '#0c1220', accent: '#4c8dff', scale: 1.35, mScale: 1.1,
        specs: [['500+', 'км/ч', 'Максимальная скорость'], ['2.17', 'сек', 'Разгон до 100 км/ч'],
                ['1850', 'л.с.', 'Мощность двигателя'], ['$4,700,000', '', 'Стоимость автомобиля']]
    }
];
const SWITCH_MS = 1200;
// Один и тот же критерий «телефон / планшет вертикально» используется и в JS, и в CSS
const mq = window.matchMedia('(max-width: 768px) and (min-height: 501px), (max-width: 1100px) and (orientation: portrait)');
const saveData = !!(navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || '')));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smoothness = 0.08;
const pad = n => String(n).padStart(4, '0');

// ================= СЧЁТЧИКИ ЦИФР =================
// Из строки вроде '$1,890,000' или '500+' достаём приставку, число и окончание
function parseSpec(str) {
    const m = str.match(/^(\D*)([\d.,]+)(\D*)$/);
    if (!m) return null;                          // не число: оставляем как есть
    const body = m[2];
    const group = body.includes(',');             // запятая = разделитель тысяч
    return {
        pre: m[1], suf: m[3], group,
        value: parseFloat(body.replace(/,/g, '')),
        dec: group ? 0 : (body.split('.')[1] || '').length
    };
}

// frac от 0 до 1: какую часть числа показать
function formatSpec(spec, frac) {
    const v = spec.value * frac;
    const text = spec.group ? Math.round(v).toLocaleString('en-US') : v.toFixed(spec.dec);
    return spec.pre + text + spec.suf;
}

// Плавно доводим число до нужной доли (1 = полное значение, 0 = ноль)
function countTo(numEl, toFrac, ms) {
    const spec = numEl._spec;
    if (!spec || reduceMotion) return;
    cancelAnimationFrame(numEl._raf);
    const from = numEl._frac;
    const t0 = performance.now();
    const step = now => {
        const k = Math.min((now - t0) / ms, 1);
        const eased = 1 - Math.pow(1 - k, 3);     // быстро в начале, мягко в конце
        numEl._frac = from + (toFrac - from) * eased;
        numEl.textContent = formatSpec(spec, numEl._frac);
        if (k < 1) numEl._raf = requestAnimationFrame(step);
    };
    numEl._raf = requestAnimationFrame(step);
}

// ================= СОЗДАНИЕ СЦЕН =================
const root = document.getElementById('scenes');
const logo = document.getElementById('logo');
const fxBar = document.querySelector('.fx-bar');

// Кадры грузятся один раз: первая машина сразу, остальные после загрузки страницы
function loadCar(car) {
    if (car.loaded) return;
    car.loaded = true;
    car.done = 0;                                  // сколько кадров уже загрузилось
    for (let i = 1; i <= car.frames; i++) {
        const img = new Image();
        const count = () => { car.done++; };
        img.onload = count;
        img.onerror = count;                       // битый кадр тоже считаем, чтобы загрузчик не завис
        img.src = `${car.folder}/${pad(i)}.webp`;
        car.images.push(img);
    }
}

const scenes = CARS.map((car, idx) => {
    car.images = [];
    const el = document.createElement('div');
    el.className = 'scene';
    el.innerHTML = `
        <div class="bg-watermark">${car.watermark}</div>
        <div class="car-holder"><img class="car-viewer" src="${car.folder}/0001.webp" alt="${car.name}"></div>
        <div class="content-left">
            <div class="brand-tag">${car.tag}</div>
            <h1>${car.name}</h1>
            <p class="subtitle">${car.subtitle}</p>
        </div>
        <div class="fixed-specs-aside">
            ${car.specs.map(s => `<div class="stat-box"><span class="stat-value"><span class="num">${s[0]}</span>${s[1] ? ` <small>${s[1]}</small>` : ''}</span><span class="stat-label">${s[2]}</span></div>`).join('')}
        </div>`;
    root.appendChild(el);

    const boxes = [...el.querySelectorAll('.stat-box')];
    boxes.forEach(b => {
        const num = b.querySelector('.num');
        num._spec = parseSpec(num.textContent);
        num._frac = 0;
        if (num._spec && !reduceMotion) num.textContent = formatSpec(num._spec, 0);  // стартуем с нуля
        b._num = num;
        b._on = false;
    });

    return {
        el, car, cur: 0, target: 0,
        img: el.querySelector('.car-viewer'),
        title: el.querySelector('.content-left'),
        mark: el.querySelector('.bg-watermark'),
        boxes,
        lastFrame: 0,
        hidden: idx !== 0
    };
});

// Неактивные сцены спрятаны за экраном
scenes.forEach((s, i) => { if (i !== 0) { s.el.style.opacity = 0; s.el.style.transform = 'translateY(100vh)'; } });
applyTheme(CARS[0]);
loadCar(CARS[0]);
// На медленном интернете / в режиме экономии трафика следующая машина грузится только при переключении
if (!saveData) window.addEventListener('load', () => CARS.slice(1).forEach(loadCar));

let active = 0;
let isAnimated = false;
let lockUntil = 0;

// Открытие сразу нужной машины: index.html?car=1
const startIdx = Math.min(Math.max(parseInt(new URLSearchParams(location.search).get('car')) || 0, 0), CARS.length - 1);
if (startIdx > 0) {
    scenes[0].el.style.opacity = 0;
    scenes[0].el.style.transform = 'translateY(-100vh)';
    scenes[startIdx].el.style.opacity = 1;
    scenes[startIdx].el.style.transform = 'translateY(0)';
    active = startIdx;
    applyTheme(CARS[startIdx]);
    loadCar(CARS[startIdx]);
}

function applyTheme(car) {
    document.documentElement.style.setProperty('--accent', car.accent);
    document.documentElement.style.setProperty('--bg', car.bg);
    logo.textContent = car.brand;
    document.title = car.name;
}

// ================= ЭКРАН ЗАГРУЗКИ =================
const loaderEl = document.getElementById('loader');
const loaderNum = document.getElementById('loader-num');
const loaderFill = document.getElementById('loader-fill');
const useLoader = loaderEl && !document.documentElement.classList.contains('no-loader');

function startLoader(car) {
    const MIN_MS = 800;       // минимум показываем, чтобы не мелькал
    const MAX_MS = 8000;      // на очень медленном интернете не держим дольше (кадры догрузятся сами)
    const t0 = performance.now();
    let shown = 0;
    lockUntil = Infinity;     // пока грузится, прокрутка заблокирована

    const tick = now => {
        const elapsed = now - t0;
        const real = elapsed > MAX_MS ? 1 : car.done / car.frames;
        shown += (real - shown) * 0.12;            // число догоняет реальный прогресс плавно
        if (real === 1 && 1 - shown < 0.002) shown = 1;

        loaderNum.textContent = Math.round(shown * 100);
        loaderFill.style.transform = `scaleX(${shown})`;

        if (shown >= 1 && elapsed >= MIN_MS) {
            finishLoader();
        } else {
            requestAnimationFrame(tick);
        }
    };
    requestAnimationFrame(tick);
}

function finishLoader() {
    try { sessionStorage.setItem('hc_loaded', '1'); } catch (e) {}
    loaderEl.classList.add('done');                // шторка уезжает вверх
    setTimeout(() => loaderEl.remove(), 1000);
    lockUntil = performance.now() + 700;
}

if (useLoader) startLoader(CARS[active]);
else if (loaderEl) loaderEl.remove();

// ================= СМЕНА МАШИНЫ =================
// dir = 1: текущая уходит вверх, новая выезжает снизу; dir = -1: наоборот
function switchCar(dir) {
    const nextIdx = (active + dir + scenes.length) % scenes.length;
    const out = scenes[active], inn = scenes[nextIdx];
    loadCar(inn.car);

    inn.cur = inn.target = 0;                   // новая машина стартует с 1-го кадра
    inn.el.style.transition = 'none';
    inn.el.style.transform = `translateY(${dir * 100}vh)`;
    inn.el.style.opacity = 0;
    void inn.el.offsetWidth;                    // применить начальное положение
    inn.el.style.transition = '';

    out.el.style.transform = `translateY(${-dir * 100}vh)`;
    out.el.style.opacity = 0;
    inn.el.style.transform = 'translateY(0)';
    inn.el.style.opacity = 1;

    // Световая полоса пролетает вместе со сменой машин
    if (fxBar && !reduceMotion) {
        fxBar.animate(
            [{ transform: `translateY(${dir * 110}vh)` }, { transform: `translateY(${-dir * 110}vh)` }],
            { duration: SWITCH_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
        );
    }

    applyTheme(inn.car);
    active = nextIdx;
    isAnimated = false;
    lockUntil = performance.now() + SWITCH_MS + 300;
}

function forward() {
    const s = scenes[active];
    if (!isAnimated) { isAnimated = true; s.target = 1; lockUntil = performance.now() + 900; }
    else if (s.cur > 0.95) switchCar(1);
}
function backward() {
    const s = scenes[active];
    if (isAnimated) { isAnimated = false; s.target = 0; lockUntil = performance.now() + 900; }
    else switchCar(-1);
}
const locked = () => performance.now() < lockUntil;

// ================= УПРАВЛЕНИЕ =================
let lastWheel = 0;
window.addEventListener('wheel', e => {
    const now = performance.now();
    const fresh = now - lastWheel > 150;   // новый жест после паузы
    lastWheel = now;
    if (locked() || !fresh) return;
    if (e.deltaY > 0) forward(); else if (e.deltaY < 0) backward();
}, { passive: true });

let touchStartY = 0, touchStartX = 0;
window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchend', e => {
    if (locked()) return;
    const d = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(touchStartX - e.changedTouches[0].clientX) > Math.abs(d)) return; // горизонтальный свайп игнорируем
    if (d > 50) forward(); else if (d < -50) backward();
}, { passive: true });

// Клавиатура (ПК, планшет с клавиатурой)
window.addEventListener('keydown', e => {
    if (locked()) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) forward();
    else if (['ArrowUp', 'PageUp'].includes(e.key)) backward();
});

// ================= АНИМАЦИЯ =================
function animateSpec(el, on, isMobile) {
    el.style.opacity = on ? '1' : '0';
    el.style.transform = on ? (isMobile ? 'translateY(0)' : 'translateX(0)')
                            : (isMobile ? 'translateY(250px)' : 'translateX(450px)');
    el.style.transition = on
        ? 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease-out'
        : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-in';
}

function renderLoop() {
    const isMobile = mq.matches;
    scenes.forEach(s => {
        s.cur += (s.target - s.cur) * smoothness;
        const p = s.cur;

        let f = Math.max(1, Math.min(Math.floor(p * (s.car.frames - 1)) + 1, s.car.frames));
        if (f !== s.lastFrame) { s.img.src = `${s.car.folder}/${pad(f)}.webp`; s.lastFrame = f; }
        s.img.style.transform = isMobile
            ? `translateY(-40px) scale(${s.car.mScale})`
            : `translateY(${p * 60}px) scale(${s.car.scale})`;

        s.title.style.opacity = 1 - p;
        s.title.style.transform = isMobile
            ? `translate(-50%, calc(-50% - ${100 * p}px))`
            : `translateY(-50%) translateX(${-500 * p}px)`;

        s.mark.style.opacity = 0.02 * (1 - p);
        s.mark.style.transform = `translate(-50%, -50%) scale(${1 + p * 0.05})`;

        s.boxes.forEach((b, i) => {
            const on = p >= 0.2 * (i + 1);
            animateSpec(b, on, isMobile);
            // Когда плашка появляется, цифра разгоняется с нуля; когда прячется, быстро сбрасывается
            if (b._on !== on) {
                b._on = on;
                countTo(b._num, on ? 1 : 0, on ? 1500 : 400);
            }
        });
    });
    requestAnimationFrame(renderLoop);
}
renderLoop();
window.addEventListener('resize', () => scenes.forEach(s => s.done = false));