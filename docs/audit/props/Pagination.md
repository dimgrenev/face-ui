# Pagination — индивидуальный аудит

Владелец shared API/runtime/CSS — canonical face-ui. Потребители — app/site и
Defrictor через генерируемые снимки. Интеграция последней правки Accordion завершена. Предыдущий goal turn — progress:
исправление мембраны доведено до трёх продуктов, воспроизведены ошибки Pagination.
Текущая спецификация записана до runtime-изменений Pagination.

Цель: отображаемая страница, пользовательские переходы и callback должны выражать
одно состояние. Каждый prop проверяется отдельно и вместе с изменением total,
pageSize, controlled/uncontrolled, disabled, compact picker и общей Membrane.

| Prop | Смысл и первоначальное решение |
| --- | --- |
| page | Управляемая страница с 1; имеет приоритет над defaultPage. Внешнее изменение тихое. Пользователь получает предложение; непринятое предложение не меняет отображение. |
| defaultPage | Только начальное неуправляемое намерение. Не второй способ управления. |
| total | Число записей. Из него и pageSize вычисляются границы; не число страниц. Изменение границ не вызывает пользовательский callback. |
| pageSize | Число записей на странице; не управление размером/геометрией Pagination. |
| siblingCount | Число соседей вокруг текущей страницы. Остаётся ограниченным по памяти; уточнить контракт около начала/конца и для 0. |
| disabled | Запрещает переходы и открытие picker; живое изменение при открытом picker должно оставлять возможность закрыть его. |
| onPageChange | Один вызов на фактическое предложение другой отображаемой страницы; повторное нажатие текущей не действие. |
| className | Класс того же nav, который отдаётся через ref. |
| membrane | Единая Membrane общих Button; проверить padding click, focus, identity и все контролы, включая picker. Не создавать собственный алгоритм. |
| surfaceTitle | Название picker dialog; уже согласовано с другими popup API. Не дублировать в labels. Описание «compact only» неверно: picker есть и на desktop. |
| native nav API (пробел) | id/style/dir/lang/hidden/aria/data/ref/events нужны для интеграции; children/contentEditable/defaultValue/autoFocus не обещать для контейнера с собственной разметкой. Capture cancellation должна уважаться дочерними действиями. |
| labels (пробел) | Нужен локализуемый набор внутренних действий/полей. Точные поля решаются после инвентаризации всех пользовательских строк; не дублировать surfaceTitle или native aria-label. |

Сначала доказательства: scratch React cases уменьшения total/увеличения pageSize
на странице 50, повторного выбора отображаемой страницы, controlled reject/accept,
нативных props и отмены capture. Затем браузеры: реальная клавиатура/мембрана,
hover/selected/disabled, длинные подписи, RTL и 360/1000px, picker focus/validation.
Числа за пределами safe integers и неверные типы проверяются до выбора нормализации;
coercion объекта не должен исполнять пользовательский valueOf.

API-изменения после доказательств: обновить JSDoc/контракты/gallery/inventory; не
добавлять aliases, provider, ссылки/href или серверную загрузку без сценария.
Exports/CSS entry points остаются прежними; новый тип labels экспортируется рядом
с PaginationProps, если добавляется. Никаких ручных правок снимков.

Проверки: pnpm check (React18/19), pnpm exec playwright test -c
scripts/browser/playwright.config.ts <Pagination/затронутые группы> --workers=3,
полные matrices по риску изменений, actual compiled app/site consumers. Перед
sync: node .artifacts/select-inspect-sync.mjs check и actual diffs всех drift files.
Затем pnpm --dir .. sync:face-ui --force, rebuild обоих Face dist, runtime manifest,
app typecheck/desktop:build, site build, Defrictor check:ui и private build,
package-sync:check/proof-pack:check/production-isolation:check.

Риск неполного sync — типы, metadata и runtime расходятся, либо продукт использует
старый dist. Держать последнюю принятую интеграцию и before evidence для сравнения.
Коммиты/push/deployment не выполняются. Accordion auto/CSS-only direction и ручное
AT остаются открытыми, не объявлять весь аудит завершённым.

Источники для семантики (прочитаны 2026-09-13):
- https://design-system.w3.org/components/pagination.html — отдельный named nav, aria-current=page; ссылочный пример не требует добавлять href для действий над локальной таблицей.
- https://www.w3.org/WAI/tutorials/page-structure/labels/ — несколько nav должны различаться доступным именем; поддержка aria-label/aria-labelledby необходима.
- https://www.w3.org/TR/selectors-4/#the-dir-pseudo — :dir() учитывает семантическое направление и dir=auto, но не CSS direction. Это открытая граница Accordion, требующая решения и отдельной проверки compiled CSS.

## Начальные доказательства

Scratch React: 6 failed + 2 passed, /tmp/face-ui-pagination-react-before.log.
После изменения total или pageSize Previous оставляет видимую страницу 5 вместо 4.
Выбор уже видимой страницы ошибочно вызывает callback; controlled режим предлагает
5 вместо 4. Native identity/accessibility/capture не поддержаны — это пробел API,
не нарушение ранее обещанного контракта. Обычный controlled accept и default-once
проходили до изменений. Baseline runtime/CSS: .artifacts/pagination-before/.

Перед исправлением CSS проверяются браузером: переполнение, текущая кнопка при
hover тела/мембраны, геометрия относительно обычного Button и disabled opacity.

## Решения перед реализацией

- page/defaultPage — положительные safe integers; total — неотрицательный safe
  integer; pageSize — положительный safe integer. Значения страниц выше текущего
  количества разрешены как намерение для меняющихся данных и проецируются в границы.
  Default читается только при начальном uncontrolled mount. Неверные числовые типы,
  дроби, бесконечность и unsafe integers отклоняются RangeError, без Number(object).
- siblingCount — целое 0–20. Ранее существовавший защитный предел 20 становится явной
  границей API; значения выше больше не молча превращаются в 20. Диапазон включает
  first/last и заменяет пропуски ellipsis; около краёв свободные слоты заполняются
  доступными страницами. Верхний предел защищает компонент от огромных DOM-списков.
- Внешнее изменение границ тихо, raw намерение сохраняется до пользовательского
  перехода. Каждое действие сравнивается с видимой страницей; повторный выбор текущей
  страницы — no-op, а Previous вычитает из проекции. Смена total/pageSize не вызывает
  загрузку данных через onPageChange самовольно.
- labels: previousPage, nextPage, page, choosePage, pageNumber, goToPage, close.
  Видимые previous/next подписи совпадают с доступными именами. page — строковый
  шаблон ровно с одним {page}, допускающий любой порядок слов и числа. Неверный
  шаблон отклоняется; общие immutable словари читаются без мутации, лишние поля
  не распространяются в DOM. Пустые строки используют осмысленные defaults.
- surfaceTitle остаётся названием dialog. При отсутствии берётся labels.choosePage;
  это один default для открытия/заголовка, с возможностью дать длинный заголовок и
  краткое имя кнопки. Native aria-label/aria-labelledby управляют самим nav.
- Для полной локализации закрытия нужен Modal.closeLabel: отдельная строка для
  единственного внутреннего действия Modal, аналогичная ResponsiveSheetHeader.
  Владение — canonical Modal; импорт/экспорт компонента не меняется. Проверить
  default, override, whitespace fallback, неверный тип и фактическое закрытие.
  Общий resolver строк переносится из date-labels.ts в runtime/labels.ts без
  изменения поведения Date/Calendar; все три компонента используют одну реализацию.
- membrane относится к наружным кнопкам навигации. Содержимое Modal сохраняет
  собственную геометрию. Disabled принадлежит действиям, не nav: браузер уже доказал
  двойное затухание 0.36 вместо 0.6 обычного Button. Уже открытый dialog должен
  оставаться закрываемым; Input и submit блокируются при disabled.
- CSS повторно задаёт font:inherit и превращает 500 в 400; это подтверждено во всех
  трёх движках. Hover мембраны теряет активные цвета из-за конфликтующего ghost
  варианта. Используются штатные Button primary/ghost; дублирующие геометрия,
  цвета, obsolete active/menu-item selectors удаляются. Layout остаётся владельцем
  Pagination, общая Membrane не меняется.

Before browser: первоначально 12 failed + 6 passed. Проверка hover уточнена:
сравнивается со штатным primary Button при таком же hover, а не с неподвижным
цветом до hover. Исходный лог сохранён; исправленный before-прогон выполняется
до runtime правок. 360px с английскими default и закрытие после disabled уже
проходят — эти поведения не выдаются за исправленные дефекты.

Для native capture Pagination проверяется и портальный picker: React сохраняет
распространение через логического родителя. Прямые Modal trigger/close handlers
не проверяют defaultPrevented; новые два scratch случая проверяют отмену открытия
и закрытия до правки. Если подтверждается, исправление принадлежит connector Modal,
не отдельным обходным обработчикам Pagination. Shared outside-layer не меняется.

Проверка 360px по scrollWidth была слишком слабой: просмотр скриншота показал
внутреннее наложение подписей без внешнего overflow. Проверка границ label тоже
прошла: текст выходил за собственную коробку. Итоговая проверка использует Range
для границ фактически нарисованного текста, проверяет его вхождение в кнопку и
отсутствие пересечения подписей. Исправление layout: перенос диапазона на
собственную строку в узком контейнере, wrap для длинного диапазона и локализованных
действий. Все кнопки сохраняют DOM, порядок клавиатурной навигации и фокус; отдельный
compact API, скрытые страницы и дополнительный ResizeObserver не требуются.

Picker Tab: первоначальный тест ошибочно ожидал submit сразу после input. Реальный
промежуточный stop — встроенная кнопка Clear input (Input по умолчанию clearable).
Она не переведена и создаёт пустое, заведомо невалидное значение в окне перехода.
В этом потребителе clearable=false: ввод по-прежнему можно редактировать/удалять
нативно. Общий Input не меняется. Поэтому первоначальное падение picker Tab не
считается доказательством пропуска submit в WebKit; отдельное падение Tab на Prev
в WebKit действительно подтверждено. Навигационные кнопки имеют явный tabIndex.

Метаданные также исправлены: старое описание обещало Menu, Text-индикатор и переходы
стрелками, которых в runtime не было. Контракт теперь описывает Button/Modal/Input,
настоящую клавиатуру и локализацию. Не добавляется лишняя клавиатурная модель ради
устаревшего текста. Governance проверяет общий Button hover; отдельное дублирующее
правило Pagination больше не требуется, browser comparison доказывает наследование.

## Исправление потребителя Engine

При проверке потребителей найден однозначный конфликт в canonical Engine:
packages/engine/src/face-ui/patterns/crud-table.pattern.json, основной skeleton
показывает Showing 1-10 of 50, но передаёт total=5. total означает записи, поэтому
вместо пяти страниц получалась одна. Исправляется total=50 и явно pageSize=10.
Второй пример total=10 не имеет такого явного счётчика; его данные не выдумываются.

Владелец этой правки — userface-engine/packages/engine; потребители — app/site
снимки Engine. Проверены git status, целевой diff, package exports/files и graph
build-public: pattern JSON не участвует в public/runtime копировании, JS/TS siblings
и exports не меняются. До изменения target diff был пуст. Исходные независимые
изменения Engine сохраняются. Нужны engine build/smoke, существующие composition
тесты и проверка согласованности числа записей/страниц. Затем inspect engine drift,
штатный sync:engine --force и общие product builds вместе с Face UI sync.
Это необходимая часть интеграции исправленного API по root AGENTS.md; отдельного
изменения browser runtime или build scripts нет. Риск неполного sync — старый шаблон
останется в продукте. Коммиты не создаются.

## Проверки исходного пакета

47 постоянных unit cases Pagination проходят. Общий pnpm check: React18 —
845 passed + 8 React19-only skips; React19 — 853/853, по 54 suites. Первый
React19 check завершился timeout одного contract scan под одновременной нагрузкой
двух checks и browser matrix; отдельный повтор прошёл без изменения таймаутов.
Полные browser matrices — по 1331 passed + 4 явных emulation skips на React18/19,
включая 19 Pagination cases в каждом из Chromium, Firefox и WebKit.

Просмотрены светлые 1000px и тёмные RTL 360px navigation/picker: исправлены перенос
длинных подписей, равная высота Previous/Next и порядок числового диапазона через
bdi dir=ltr. IME Enter, пустой/дробный/выходящий за границы ввод, отмена capture,
живые disabled/hidden и controlled accept/reject проверены реальными действиями.
Engine build/smoke и 18 composition tests прошли; фактический шаблон с 50 записями
по 10 даёт пять кнопок страниц в собранном Face UI.

Логи этой проверки: /tmp/face-ui-pagination-check-final-r18.log,
/tmp/face-ui-pagination-check-r19-recheck.log,
/tmp/face-ui-pagination-browser-all-r18.log и
/tmp/face-ui-pagination-browser-all-r19.log. Результаты переноса снимков,
114 compiled app/site browser cases и product gates фиксируются отдельно в
.artifacts/pagination-recovery.txt; исходные матрицы не доказывают интеграцию.
