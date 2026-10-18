/* ================= Элементы страницы (ищем один раз) ================= */
const корневойЭлемент = document.documentElement;
const кнопкаТемы = document.getElementById('theme-toggle');
const шапка = document.querySelector('.header');
const первыйБлок = document.getElementById('hero');
const текстОбоМне = document.querySelector('.about__text');
const ссылкиМеню = document.querySelectorAll('.nav__link');
const бургер = document.getElementById('burger');
const менюНавигации = document.getElementById('nav');
const линияПрогресса = document.getElementById('scroll-progress');
const годВФутере = document.getElementById('footer-year');
const списокПроектов = document.querySelector('.projects__list');
const кнопкаНазад = document.getElementById('projects-prev');
const кнопкаВперёд = document.getElementById('projects-next');

// Один объект на всю страницу: браузер сам обновляет .matches при изменении ширины окна
const мобильныйЭкран = window.matchMedia('(max-width: 768px)');

/* ================= Тема ================= */
function применитьТему(тема) {
    корневойЭлемент.dataset.theme = тема;
    localStorage.setItem('theme', тема);
}

кнопкаТемы.addEventListener('click', () => {
    const новаяТема = корневойЭлемент.dataset.theme === 'dark' ? 'light' : 'dark';

    const анимацияОтключена = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const браузерПоддерживает = typeof document.startViewTransition === 'function';

    // Запасной вариант: без анимации, но всё равно синхронно
    if (!браузерПоддерживает || анимацияОтключена) {
        применитьТему(новаяТема);
        return;
    }

    // Центр кнопки — откуда расходится круг
    const рамкаКнопки = кнопкаТемы.getBoundingClientRect();
    const центрX = рамкаКнопки.left + рамкаКнопки.width / 2;
    const центрY = рамкаКнопки.top + рамкаКнопки.height / 2;

    // Радиус до самого дальнего угла экрана, чтобы круг накрыл всю страницу
    const конечныйРадиус = Math.hypot(
        Math.max(центрX, window.innerWidth - центрX),
        Math.max(центрY, window.innerHeight - центрY)
    );

    // Пока идёт анимация, отключаем обычные transition (hover и т.д.)
    корневойЭлемент.classList.add('theme-switching');

    const переход = document.startViewTransition(() => применитьТему(новаяТема));

    переход.ready.then(() => {
        корневойЭлемент.animate(
            {
                clipPath: [
                    `circle(0px at ${центрX}px ${центрY}px)`,
                    `circle(${конечныйРадиус}px at ${центрX}px ${центрY}px)`
                ]
            },
            {
                duration: 600,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    });

    переход.finished.then(() => {
        корневойЭлемент.classList.remove('theme-switching');
    });
});

/* ================= Бургер-меню (мобильная версия) ================= */
function менюОткрыто() {
    return менюНавигации.classList.contains('nav--open');
}

function переключитьМеню(открыть) {
    менюНавигации.classList.toggle('nav--open', открыть);
    бургер.classList.toggle('burger--open', открыть);
    бургер.setAttribute('aria-expanded', String(открыть));
    бургер.setAttribute('aria-label', открыть ? 'Закрыть меню' : 'Открыть меню');
}

бургер.addEventListener('click', () => {
    переключитьМеню(!менюОткрыто());
});

// Выбрал пункт — меню закрывается
ссылкиМеню.forEach((ссылка) => {
    ссылка.addEventListener('click', () => переключитьМеню(false));
});

// Escape закрывает меню
document.addEventListener('keydown', (событие) => {
    if (событие.key === 'Escape') переключитьМеню(false);
});

// Окно растянули до десктопа — меню сбрасываем
мобильныйЭкран.addEventListener('change', (событие) => {
    if (!событие.matches) переключитьМеню(false);
});

/* ================= Активный пункт меню ================= */
// Пары «секция + её ссылка» в порядке следования на странице.
// Ссылки на несуществующие секции пропускаем.
const пунктыМеню = [];
ссылкиМеню.forEach((ссылка) => {
    const секция = document.querySelector(ссылка.getAttribute('href'));
    if (секция) пунктыМеню.push({ секция, ссылка });
});

let активнаяСсылка = null;

function обновитьАктивныйПункт() {
    if (пунктыМеню.length === 0) return;

    // Линия отсчёта: 35% высоты экрана сверху
    const линияОтсчёта = window.innerHeight * 0.35;

    // По умолчанию активна первая секция (это и есть «мы вверху страницы»)
    let нужныйПункт = пунктыМеню[0];

    // Активна последняя секция, чей верх уже выше линии отсчёта
    пунктыМеню.forEach((пункт) => {
        if (пункт.секция.getBoundingClientRect().top <= линияОтсчёта) {
            нужныйПункт = пункт;
        }
    });

    // Страница долистана до самого низа: последняя секция может быть слишком короткой
    const долисталиДоНиза =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (долисталиДоНиза) {
        нужныйПункт = пунктыМеню[пунктыМеню.length - 1];
    }

    // Обновляем DOM только если что-то изменилось
    if (активнаяСсылка === нужныйПункт.ссылка) return;

    ссылкиМеню.forEach((ссылка) => ссылка.classList.remove('nav__link--active'));
    нужныйПункт.ссылка.classList.add('nav__link--active');
    активнаяСсылка = нужныйПункт.ссылка;
}

/* ================= Шапка: когда прятать ================= */
function нужноСпрятатьШапку() {
    // Телефон: прячем, когда текст «Обо мне» целиком появился на экране.
    // scrollY > 40 не даёт спрятать шапку в самом верху страницы.
    if (мобильныйЭкран.matches && текстОбоМне) {
        const текстВиденЦеликом = текстОбоМне.getBoundingClientRect().bottom <= window.innerHeight;
        return window.scrollY > 40 && текстВиденЦеликом;
    }

    // Компьютер: прячем, когда прошли первый блок (низ героя минус высота шапки)
    const границаПервогоБлока = первыйБлок.offsetHeight - шапка.offsetHeight;
    return window.scrollY > границаПервогоБлока;
}

function обновитьШапку() {
    const спрятать = нужноСпрятатьШапку();

    шапка.classList.toggle('header--hidden', спрятать);

    // Шапка уехала вверх — открытое меню уезжать вместе с ней не должно
    if (спрятать && менюОткрыто()) переключитьМеню(false);
}

/* ================= Линия прогресса прокрутки ================= */
function обновитьЛиниюПрогресса() {
    const всегоПрокрутки = document.documentElement.scrollHeight - window.innerHeight;
    const доля = всегоПрокрутки > 0 ? window.scrollY / всегоПрокрутки : 0;

    линияПрогресса.style.transform = `scaleX(${доля})`;
}

/* ================= Слайдер проектов ================= */
function шагСлайдера() {
    const карточка = списокПроектов.querySelector('.project-card');
    const промежуток = parseFloat(getComputedStyle(списокПроектов).columnGap) || 0;
    return карточка.offsetWidth + промежуток;
}

function обновитьКнопкиСлайдера() {
    const прокрутка = списокПроектов.scrollLeft;
    const максимум = списокПроектов.scrollWidth - списокПроектов.clientWidth;

    кнопкаНазад.disabled = прокрутка <= 1;
    кнопкаВперёд.disabled = прокрутка >= максимум - 1;
}

кнопкаНазад.addEventListener('click', () => {
    списокПроектов.scrollBy({ left: -шагСлайдера(), behavior: 'smooth' });
});
кнопкаВперёд.addEventListener('click', () => {
    списокПроектов.scrollBy({ left: шагСлайдера(), behavior: 'smooth' });
});

// Свайп пальцем тоже меняет состояние стрелок
списокПроектов.addEventListener('scroll', обновитьКнопкиСлайдера, { passive: true });

/* ================= Год в футере ================= */
if (годВФутере) {
    годВФутере.textContent = new Date().getFullYear();
}

/* ================= Один обработчик на прокрутку и ресайз ================= */
let ожидаетКадра = false;

function обновитьВсёПриПрокрутке() {
    обновитьШапку();
    обновитьАктивныйПункт();
    обновитьЛиниюПрогресса();
    ожидаетКадра = false;
}

// requestAnimationFrame: не чаще одного раза за кадр, чтобы не тормозить страницу
function запланироватьОбновление() {
    if (ожидаетКадра) return;
    ожидаетКадра = true;
    requestAnimationFrame(обновитьВсёПриПрокрутке);
}

window.addEventListener('scroll', запланироватьОбновление, { passive: true });
window.addEventListener('resize', () => {
    запланироватьОбновление();
    обновитьКнопкиСлайдера();
});

// Первый расчёт при загрузке страницы
обновитьВсёПриПрокрутке();
обновитьКнопкиСлайдера();

/* ================= Cookie-баннер и Яндекс Метрика ================= */
// const НОМЕР_СЧЁТЧИКА = 0;               // впишу номер из Метрики
// const КЛЮЧ_СОГЛАСИЯ = 'cookie-consent';

// const баннерCookie = document.getElementById('cookie-banner');
// const кнопкаПринять = document.getElementById('cookie-accept');
// const кнопкаОтклонить = document.getElementById('cookie-decline');
// const кнопкаНастроекCookie = document.getElementById('cookie-settings');

// let метрикаЗагружена = false;

// function прочитатьВыбор() {
//     try { return localStorage.getItem(КЛЮЧ_СОГЛАСИЯ); } catch { return null; }
// }

// function сохранитьВыбор(значение) {
//     try { localStorage.setItem(КЛЮЧ_СОГЛАСИЯ, значение); } catch { /* хранилище недоступно */ }
// }

// // Код Метрики подключается только здесь, то есть только после согласия
// function загрузитьМетрику() {
//     if (метрикаЗагружена || !НОМЕР_СЧЁТЧИКА) return;
//     метрикаЗагружена = true;

//     window.ym = window.ym || function () {
//         (window.ym.a = window.ym.a || []).push(arguments);
//     };
//     window.ym.l = Date.now();

//     const скрипт = document.createElement('script');
//     скрипт.async = true;
//     скрипт.src = 'https://mc.yandex.ru/metrika/tag.js';
//     document.head.appendChild(скрипт);

//     window.ym(НОМЕР_СЧЁТЧИКА, 'init', {
//         clickmap: true,
//         trackLinks: true,
//         accurateTrackBounce: true,
//         webvisor: false
//     });
// }

// // Если человек передумал, чистим куки Метрики (имена начинаются с _ym)
// function удалитьКукиМетрики() {
//     document.cookie.split(';').forEach((запись) => {
//         const имя = запись.split('=')[0].trim();
//         if (имя.startsWith('_ym')) {
//             document.cookie = `${имя}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
//         }
//     });
// }

// кнопкаПринять.addEventListener('click', () => {
//     сохранитьВыбор('accepted');
//     баннерCookie.hidden = true;
//     загрузитьМетрику();
// });

// кнопкаОтклонить.addEventListener('click', () => {
//     const былоСогласие = метрикаЗагружена;
//     сохранитьВыбор('declined');
//     баннерCookie.hidden = true;
//     удалитьКукиМетрики();
//     if (былоСогласие) location.reload();   // чтобы уже запущенный счётчик остановился
// });

// // Ссылка в футере снова открывает баннер
// кнопкаНастроекCookie.addEventListener('click', () => {
//     баннерCookie.hidden = false;
// });

// // При загрузке страницы: согласие уже есть, запускаем; выбора нет, показываем баннер
// const прежнийВыбор = прочитатьВыбор();
// if (прежнийВыбор === 'accepted') {
//     загрузитьМетрику();
// } else if (прежнийВыбор !== 'declined') {
//     баннерCookie.hidden = false;
// }
