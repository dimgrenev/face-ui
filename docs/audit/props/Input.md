# Input — индивидуальный аудит

## Рабочая спецификация

Input — составное текстовое поле: native input/textarea, label, description,
error и опциональная очистка. Его пользовательская задача — ввод, проверка
и отправка значения формы. Владелец — canonical face-ui; JSX/JSON потребителей
app/site обновляются вместе, Defrictor получает generated snapshot.

Цель: каждый prop имеет явный сценарий и наблюдаемый эффект; стандартные
атрибуты и refs совместимы с native field. Нет пустых slots, неработающей
очистки, устаревших размеров или callback/ref leaks.

Решения для проверки и реализации:

- Удалить no-op stretchText: текстовое поле уже занимает доступную ширину.
- textLayout scroll/wrap заменить на multiline false/true: это выбор native
  input/textarea с разной семантикой Enter, а не косметический перенос текста.
- Стандартные role и aria-* заменить собственные ariaLabel/controlRole/aria*
  aliases. Остальные применимые native attributes/events направлять в control.
- Обычный ref должен возвращать native input/textarea; controlRef удалить как
  второй способ обращения к тому же control. className/style остаются стилями
  внешнего field layout, как у существующих product consumers. id/name и
  native events относятся к control. Это явно документируемая карта частей.
- onChange и onValueChange имеют разные полезные контракты: native event и
  сериализуемое значение. Ввод и очистка должны проходить один путь уведомления;
  parent updates и form reset не имитируют пользовательский ввод. В найденных
  73 JSX вызовах потребители управляют value через onChange: текущая очистка
  обходит его и потому не может очистить controlled field.
- autoGrow должен реагировать на значение, clear/reset, ширину, fonts и режим;
  предусмотреть rows для осмысленного размера multiline без autoGrow.
  Проверить native field-sizing и совместимое поведение поддерживаемых браузеров;
  нельзя объявить поддержку только по CSS.supports без geometry assertions.
- Добавить clearable и clearLabel для управления действием и локализации.
- Проверить и расширить применимые native text input types/attributes;
  не добавлять file/checkbox/radio/range в этот составной текстовый control.
- Слоты label/description/error/icon используют общее правило непустого
  содержимого. ARIA relationships с пользовательскими ids объединяются.

Состояния: пустое/заполненное, controlled/uncontrolled, focus/blur, disabled,
readOnly, required/invalid, multiline/autogrow, LTR/RTL, hidden и SSR/hydration.
Токены: uf-control typography/padding/height, uf-input-icon-size, membrane,
semantic foreground/error/focus colors. Defaults сверяются с JSON и галереей.

План: before unit/browser cases; implementation + per-prop table; type-positive
и negative cases; pnpm check React 18/19; full browser matrices в трёх браузерах;
package-sync после drift inspection; manifest и product migration tests;
app desktop:build, site build, Defrictor check:ui/build; package-sync/proof-pack/
production-isolation checks. Не редактировать source во время полной матрицы.
Heavy checks ограничивать по параллельности на этом 16 GB host.

Риск частичной миграции: исчезнувшая textarea/ARIA, ref с неверным DOM-типом,
неработающая controlled очистка, неверные form values и размеры. Откат включает
API, docs/contracts, product consumers и snapshots. Ниже добавляются фактические
решения и результаты; эта спецификация ещё не означает завершение Input.

## Решения по API

| Prop | Сценарий и решение | Проверка |
| --- | --- | --- |
| `value` | Родитель управляет значением; его обновление не вызывает callbacks. Неизменённый controlled value восстанавливается после попытки ввода. | Unit, browser |
| `defaultValue` | Начальное uncontrolled значение и точка возврата form reset; последующие изменения prop не стирают черновик. | Unit, browser |
| `onChange` | Native React event для форм и обработчиков, которым нужен control. Очистка теперь проходит тот же путь, что ввод. | Controlled ввод/clear в двух режимах |
| `onValueChange` | Уведомление сериализуемым `{value}` для state binding. Отличается от onChange полезной формой данных; сохранён. | Ровно одно уведомление на edit/clear; parent update/reset silent |
| `multiline` | Новый выбор textarea; заменяет `textLayout`. Native Enter/newlines вместо названия косметического layout. | Ввод, смена DOM control с сохранением значения, SSR |
| `type` | Native text/email/password/search/tel/url/number/date/time/datetime-local/month/week. Вид picker и поддержка отдельных native форматов остаются возможностями браузера. Textarea допускает только text. | Значение/атрибут каждого типа в трёх браузерах; type-negative cases |
| `rows` | Новый минимальный размер textarea; фиксированное число строк при autoGrow=false. Нормализуется до целого ≥1. | Измерения высоты, scrollHeight |
| `autoGrow` | Только multiline; рост и уменьшение при вводе/очистке/reset, ширине и типографике. | Native CSS и принудительный JS fallback, три браузера |
| `placeholder` | Подсказка пустого поля; не замена accessible name. | Native routing, gallery |
| `label` | Видимый native label; отсутствующий/пустой slot не создаёт строку или колонку. | Id/association, numeric zero, empty fragments, axe |
| `description` | Сопроводительный ReactNode, связанный с control. | Merged aria-describedby, layout, axe |
| `error` | ReactNode вместо только string, непустая ошибка включает aria-invalid. Явный native aria-invalid имеет приоритет. | Пустые slots, rich/scalar content, alert и ARIA override |
| `labelOrientation` | vertical/horizontal только при наличии label. Help/error теперь стоят под control в правильной колонке. | LTR/RTL × membrane, bounding boxes |
| `icon` | Декоративный registry icon или node; скрыт от accessibility tree, zero не теряется. | Slots, geometry, axe |
| `iconPosition` | start/end следует направлению текста, включая dir=auto. | Зеркальная геометрия и смена языка значения |
| `clearable` | Новый opt-out действия очистки; скрывает кнопку и освобождает её отступ. | Unit/browser, disabled/readOnly |
| `clearLabel` | Новая локализация accessible name; пустое имя заменяется default. | Очистка «Очистить», keyboard focus |
| `disabled` | Native запрет ввода/фокуса и исключение из FormData. | Unit/browser |
| `readOnly` | Сохраняет фокус, selection и FormData, запрещает изменения/clear. | Unit/browser |
| `required` | Native constraint validation + визуальная звёздочка; звёздочка aria-hidden. | validity.valueMissing, accessible name |
| `name`, native `form` | Ключ и владелец native FormData; form может быть вне внешнего layout. | Внутренняя и внешняя формы |
| `min`, `max`, `step` | Числовые/временные ограничения native input. Number/string union сохранён в извлечении; JSON schema v1 отображает его как any, не ложно как только number. | stepMismatch/rangeOverflow, type declarations |
| `pattern` | Native single-line validation; запрещён для textarea в TS и не утекает в её DOM. | patternMismatch, negative types |
| `list`, `multiple` | Native datalist и несколько email-адресов; допустимы только для single-line control. | Native routing/types; UI datalist определяется браузером |
| `minLength`, `maxLength` | Native текстовые ограничения; maxLength реально ограничивает набор. | Browser keyboard input |
| `autoComplete`, `spellCheck` | Native помощь вводу; браузер решает, когда показывать suggestions/spelling UI. | Передача в native control; визуальный UI браузера не эмулируется |
| `autoFocus` | Только native mount focus; удалён второй imperative effect. | Browser focus |
| `ref` | Native input/textarea, обычные object/callback refs. Удалён дополнительный controlRef. Общая композиция refs с Trigger сохраняет React 19 cleanup. | StrictMode, ref replacement/unmount, React 18/19 |
| `className`, `style` | Внешний field layout, как в существующих product integrations. Это исключение явно описано; native events/attrs/ref принадлежат control. | Unit, consumer builds |
| Native `role`, `aria-*`, `id`, `tabIndex`, `inputMode`, `enterKeyHint`, `title`, `data-*`, events | Используется платформа, удалены собственные ARIA aliases. Description ids объединяются, state overrides не пропадают. | Unit, keyboard, axe, SSR |
| `hidden`, `dir`, `lang` | Влияют на весь составной field и native control. | Hidden layout; LTR/RTL/auto |
| `membrane` | Та же стабильная Membrane, что у остальных компонентов; только пространство control. | Общая matrix, горизонтальная геометрия |
| Удалённый `stretchText` | Никакого потребителя data-атрибута в CSS и изменения поведения: собственная ширина поля уже 100%. | Source audit; negative type case |

Нет compatibility aliases: все owned JSX-потребители app/site мигрированы.
Остальные native HTML attributes остаются в React types и направляются в control;
это не утверждение, что проверен каждый браузерный autocomplete/picker/IME сценарий.

## Реализация и найденные дефекты

- Before: 8 новых unit cases падали; после изменения native event path, refs,
  ARIA и slots — проходят. Неизменённый controlled value уже восстанавливался
  корректно до правки; это не записано как исправленный дефект.
- Before: пустая textarea после clear сохраняла высоту 272 px. Теперь intrinsic
  `field-sizing: content` реагирует на содержимое/ширину/fonts; JS fallback
  измеряет committed value, width, resize и FontFaceSet loadingdone.
  В fallback сторонняя смена CSS-шрифта без React commit, resize или загрузки
  font не вызывает отдельный observer; современный native путь это покрывает.
- WebKit обнаружил ResizeObserver notification loop в первом fallback; запись
  размера перенесена на requestAnimationFrame с cleanup отменой.
- `aria-live=polite` удалён с `role=alert`: осталась одна согласованная семантика.
  Необработанный Escape больше не обещается в JSON keyboard contract.
- Native search cancel скрыт, чтобы поисковое поле не показывало вторую очистку.
- AST extractor теперь понимает локальные inherited interfaces, intersections,
  unions, single literals и never поля; defaults принадлежат самому компоненту.
  Сохранение mixed primitive union также исправило ошибочное сужение размеров
  Media/Panel/Scroll/Select/Skeleton в JSON. Их поведение этим не менялось.

Основания выбора: [React input](https://react.dev/reference/react-dom/components/input),
[React textarea](https://react.dev/reference/react-dom/components/textarea),
[callback refs](https://react.dev/reference/react-dom/components/common#ref-callback),
[MDN field-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing).

## Проверки

Локальные результаты и финальная синхронизация дописываются после полной матрицы.
Предварительно: `pnpm check` — 358 passed / 3 React-19-only skips;
focused browser — 60/60 (Chromium, Firefox, WebKit), включая SSR и axe light/dark.
Это checkpoint Input, не завершение индивидуального аудита всех компонентов.

## Дополнительные находки интеграции и визуальной проверки

- Help/error текст был смещён относительно внутренней границы control.
  Добавлен общий logical inset; browser test измеряет именно text Range,
  а не только рамку контейнера, в обоих labelOrientation и LTR/RTL.
- Реальный app CodeEditor fallback: 32 px textarea внутри viewport 350 px,
  control span 524×374 в контейнере 500×350, неверный font 14 px/sans-serif.
  Scoped product CSS теперь задаёт border-box control и применяет native part
  правила с достаточной специфичностью: 11 px mono, заполнение viewport,
  внутренний scroll, стабильный размер после edit. Добавлены accessible
  name по filePath и clearable=false для редактора кода.
- Реальный site TypeRenderCut показывал 14 px при выбранных 64 px. Исправлена
  специфичность textarea part; verified 64→240 px, width growth и clear.
  Safe center сохраняет доступ к началу oversized текста при scrollTop=0.
- App legacy lightweight props extractor принимал InputSharedProps за публичный
  контракт и урезал результат уже работающего semantic parser. Для известного
  неподдерживаемого composed public alias он теперь отдаёт выбор semantic parser.
  Владелец изменения — существующий app runtime helper; публичный engine API и
  generated engine snapshots не менялись. Regression test читает именно
  product-local Input.tsx и проверяет каждый опубликованный JSON prop, defaults
  и union options. Нового дублирующего union parser в приложении нет.
- Test doubles app мигрированы на native aria-label. Старое переименование Tile
  data-disabled→data-primary-disabled также отражено в оставшейся CSS assertion.
  Product source behavior ради зелёного теста не изменялось.

Проверки app: 237/237 в 33 файлах UI; отдельные extractor/integration cases
11/11. Actual CodeEditor/TypeRenderCut — Chromium/Firefox/WebKit; локальный лог
`/tmp/face-ui-input-products-browser-final.log`. Снимки light/dark находятся
в `.artifacts/input-light.png` и `.artifacts/input-dark.png` (локальные артефакты).

## Итоговая контрольная точка

- React 18 `pnpm check`: **358 passed, 3 React-19-only skips**, 36 test files.
- React 19 `pnpm check`: **361/361**, включая callback-ref cleanup; оба check
  включают tokens/contracts/gallery, ESM/CJS/types, type cases, npm smoke/pack.
- Полная browser matrix после последнего изменения выравнивания:
  **462/462 для каждой версии React**, Chromium/Firefox/WebKit, workers=3.
- App UI **237/237**, app parsers **11/11**; реальные CodeEditor и TypeRenderCut
  проверены в трёх браузерах. Light/dark screenshots просмотрены после правки.
- App `desktop:build`, site `build`, Defrictor `check:ui` и `build`: exit 0.
- App runtime manifest regenerated: `sha256:5502bb1a77dfe2e3d1a737ef`.
- Инвентаризация: **107 публичных типов, 872 библиотечных вхождения,
  9667 унаследованных платформенных вхождений**. Оставшиеся компоненты не
  объявлены проверенными на основании общих smoke tests.

Основные логи:
`/tmp/face-ui-input-check-verified.log`,
`/tmp/face-ui-input-react19-check-verified.log`,
`/tmp/face-ui-input-browser-verified.log`,
`/tmp/face-ui-input-react19-browser-verified.log`,
`/tmp/face-ui-input-app-tests-final2.log`,
`/tmp/face-ui-input-authoring-tests-final.log`,
`/tmp/face-ui-input-app-build-final.log`,
`/tmp/face-ui-input-site-build-final.log`,
`/tmp/face-ui-input-defrictor-final.log`.

В локальной сборке сайта остаются сообщения о local storage в production mode
и пропуске registerFonts без DATABASE_URL. Это конфигурация окружения;
сборка не доказывает готовность deployment storage/database. Секреты и
production-настройки в этом этапе не менялись.

Финальная документация переносится штатным package-sync, затем восстанавливаются
app/site dist штатной сборкой Face. Логи: `/tmp/face-ui-input-docs-sync-final.log`,
`/tmp/face-ui-input-app-dist-final.log`, `/tmp/face-ui-input-site-dist-final.log`,
`/tmp/face-ui-input-gates-final.log`. Следующая индивидуальная спецификация — Radio
в next-layout-findings.md; общий goal остаётся активным.
