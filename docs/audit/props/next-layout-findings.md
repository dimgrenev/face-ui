# Следующая партия: незавершённые наблюдения

Состояние после контрольных точек Card, Bar, Tile и Membrane. Подтверждённые исправления и проверки находятся в соответствующих документах; они не означают завершение всей библиотеки.

- Bar переведён на единую настоящую секцию Bar.Section/BarSection. Решения и проверки — в Bar.md; проверки React 18/19, трёх браузеров и сборок потребителей завершены; включая ранее пропущенный отдельный UI-пакет сайта.
- Card и Bar используют единый resolver дескрипторов. Остались ограничения authoring-контракта: ограниченный реестр, отсутствие runtime-диагностики неизвестных имён, тип дополнительных полей unknown. Не выдавать его за универсальный React renderer.
- Tile.selector/selectorOpen мигрированы в chevron/aria-expanded; исправления собственных props и потребителей записаны в Tile.md. Проверки этой контрольной точки и повторные матрицы после общего изменения Membrane завершены.
- iconPosition переведён в start/end во всей семье Button/Text/Tile/Input; CSS, tokens и product consumers согласованы, полные browser matrices 426/426 на React 18 и 19. См. Unicode-direction.md. Это не закрывает align и trailing text slots.
- Membrane: потеря DOM/state/focus при смене membrane устранена общим стабильным wrapper; проверки identity/selection/state, forwarding/hover/fullWidth в композиции завершены (Membrane.md). Индивидуальные параметры остальных компонентов этим не закрыты.
- Avatar Unicode initials исправлены через единое разбиение графем; unit, SSR/hydration без Intl.Segmenter и live name changes проходят. См. Unicode-direction.md.

Оставшиеся компоненты и поля: полный список в inventory.json. Общая зелёная проверка не закрывает их индивидуально.

## Input: индивидуальная контрольная точка

Решения по собственным props, before evidence и проверки перенесены в Input.md.
Удалены no-op stretchText и ARIA/ref aliases; multiline заменил textLayout.
Исправлены clear/onChange, refs, slots, descriptions и autoGrow; добавлены rows,
clearable/clearLabel и применимые native attributes. Проверки включают реальный
CodeEditor fallback и TypeRenderCut, а также live app props parser.
Это не закрывает произвольные browser-native picker/autocomplete/IME сценарии;
ограничения fallback sizing перечислены в Input.md.

Отдельные незавершённые вопросы семьи: `align` left/right фактически смешивает
physical text-align и logical flex justification; Button/Tile `rightText`
относится к trailing content. Нужны RTL-геометрия actual text range при
stretch/truncate и осмысленное общее API-решение. Анатомия Radio теперь
разделяет visual item и native input; решения и доказательства — в Radio.md.

План проверки: pnpm check и type-negative cases, full browser matrix React
18/19 в трёх браузерах, targeted product tests, app desktop:build, site build,
Defrictor check:ui/build, workspace package-sync/proof-pack/production-isolation.
До forced sync сравнивать drift и сохранять product-owned edits. Не редактировать
source/fixtures во время matrices. Heavy builds и две browser matrices лучше
запускать последовательно либо с ограниченными workers на этом 16 GB host.

Риск частичной миграции — расхождение props/JSON, потеря фокуса/refs, stale
form values и размеров. Откат должен включать canonical API и product consumers
со snapshots. Эти наблюдения и план не означают завершение оставшихся компонентов.


## Контрольная точка Radio

Индивидуальные решения по RadioProps, RadioOption и native forwarding записаны
в Radio.md. Исправлены empty-value focus, native change/cancellation, refs,
autoFocus, external form validation и layout длинных labels. Удалены ARIA
aliases и фиктивные JSON defaults, required/name связаны в публичном типе.
Проверки: 510/510 browser cases на каждой React 18/19; сборки app/site/Defrictor
прошли. Заключительный перенос журнала и workspace gates описаны в Radio.md.

Следующий индивидуальный компонент — Checkbox: проверить собственные props,
tri-state semantics, native form/reset/defaultChecked, group/item labeling,
индикацию disabled и forwarding native attrs/events/ref. Общие runtime-проверки
предыдущих этапов не закрывают его собственный API; before evidence ещё требуется.

Отдельное наблюдение для аудита зависимостей: Vite fixtures, импортирующие общий
index, выводят browser-externalization warnings для path/fs/url/source-map-js.
Полные matrices проходят, но это не означает отсутствия лишних browser
зависимостей. Чтением установленного кода прослежена цепочка index.ts → Markdown →
sanitize-html 2.17.4 (index.js:6) → PostCSS 8.5.14 → input/previous-map и Node
path/fs/url/source-map-js. Markdown уже задаёт parseStyleAttributes: false,
но sanitize-html импортирует PostCSS на уровне модуля. Осталось измерить
production bundle/tree shaking и выбрать исправление, сохраняющее sanitizer
и SSR semantics. Наличие цепочки ещё не доказывает её стоимость во всех
production entry points.

## Наблюдение из Checkbox

В rich label plain HTML anchor остаётся consumer-owned: browser blue плохо
читается на тёмной Face surface. В Checkbox не добавлен локальный тематический
reset для ссылок. Нужен общий контракт inline links для rich slots (Text/Radio/
Checkbox и других), сохраняющий native navigation/focus и границу consumer CSS.
Визуальный Checkbox fixture явно задаёт ссылке color:inherit; это не считается
решением общей foundation-задачи.

## Контрольная точка Checkbox

Собственные props и consumer corrections завершены и описаны в Checkbox.md.
Следующий индивидуальный аудит — Switcher; рабочая спецификация в Switcher.md.
Остались общие вопросы logical align/rightText, inline-link foundations и browser
dependencies. PropsEditor проверен как собранный browser entry; Node-only modules
в unbundled engine barrel всё ещё требуют отдельного dependency/exports аудита.

- Switcher checkpoint обнаружил и исправил nested-theme alias inheritance в
  canonical token sources и production CSS RTL specificity для Switcher. Browser
  matrix теперь включает отдельный production bundle, чтобы dev CSS не скрывал
  ошибки minification/lowering. См. Switcher.md.
- Product Setting root disabled сейчас документирован как dim/pointer block;
  полноценная semantics/control propagation для сложных слотов требует отдельного
  product-pattern аудита. В текущей партии исправлено native naming одиночных
  controls; descriptor/custom/compound naming boundaries зафиксированы явно.
