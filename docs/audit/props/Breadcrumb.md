# Breadcrumb — аудит API и поведения

Breadcrumb показывает путь от корня до текущего места. Видимый и скрытый пункт
должны сохранять одну семантику и одно действие. Компонент владеет структурой пути,
сворачиванием и разделителем; Button, Popover и Membrane владеют общими механизмами.

Владелец — canonical Face UI. Потребители — app/site/Defrictor snapshots;
прямой продуктовый адаптер — Defrictor AdminBreadcrumbs. Синхронизация только через
workspace package-sync после проверки каждого отличия. Риск неполной миграции —
старые props, неожиданная навигация preview и двойной router переход.

## Решения по каждому параметру

| Параметр | Сценарий и решение | Наблюдаемая проверка |
| --- | --- | --- |
| items | readonly путь, последний пункт текущий; пустой путь не создаёт landmark | frozen array, empty/absent, live collapse, текущая семантика |
| item.label | непустое неинтерактивное React-содержимое | rich content сохраняется; пустые/невалидные labels отклоняются |
| item.href | настоящий адрес; отсутствие не заменяется # | обычная и модифицированная навигация в строке и popup; current href остаётся ссылкой |
| item.onClick | native React MouseEvent фактического anchor/button | callback получает currentTarget; preventDefault и capture cancellation работают одинаково в строке и popup |
| item.key | стабильная string/finite number identity для динамического пути; без key исходный индекс | перестановка сохраняет DOM; дубли и неверные типы отклоняются; key не попадает в DOM |
| separator | декоративный ReactNode; / — общий slash Icon, empty content удаляет slot | rich separator, null/false/empty, aria-hidden, отсутствие лишнего разделителя после current |
| membrane | внешние отступы пунктов и trigger; popup сохраняет собственные отступы | toggle без замены anchor, клики/hover на padding, membrane=false убирает расширенную область |
| maxItems | максимум видимых позиций вместе с overflow; default 4, safe integer >=3, null показывает всё | 3/4/5/null, live change, крайние/невалидные числа, сохранение корня и хвоста |
| overflowLabel | одно локализуемое имя trigger и dialog; blank использует Show path | доступные имена обоих узлов, fallback и неверный тип |
| className / style | оформление root nav | находятся на том же узле с forwarded ref и id |
| hidden | скрытие всего пути, включая уже открытый портал | popup закрывается, reveal не открывает его повторно |
| aria-label / aria-labelledby | имя nav отдельно от имени overflow | переопределение default Breadcrumb; локализованный landmark |
| dir / lang / data-* / events / ref | стандартный native nav contract | атрибуты/ref на nav; dir/lang также на portaled content; capture/bubbling композиция |
| allowNavigation | удалён: sandbox policy принадлежит preview | native href работает без opt-in; галерея сама отменяет переходы |
| collapseAfter | заменён на maxItems без alias | TypeScript запрещает старое имя; null явно отключает сворачивание |

Native HTMLAttributes остаётся стандартной поверхностью React. Индивидуальные
механизмы всех унаследованных ARIA/event атрибутов не объявляются проверенными по
одному spread. Исключены children, dangerouslySetInnerHTML, contentEditable,
suppressContentEditableWarning, autoFocus, defaultValue/defaultChecked: они
противоречат управляемой структуре пути либо относятся к полям ввода.

label должен быть неинтерактивным; содержимое произвольного пользовательского
React-компонента не исполняется для валидации. Перемещение label из строки в портал
меняет React-поддерево и не обещает сохранения его локального state.

## Поведение и общие исправления

Один renderCrumb создаёт anchor при href, button type=button при одном onClick,
иначе span. onClick сам по себе не отменяет ссылку. Router вызывает preventDefault
только для обычного клика, который он обработал. Текущий пункт имеет aria-current.
После обычного выбора скрытого пункта popup закрывается, включая router-handled
действие; modified click и capture cancellation сохраняют его состояние.

Popover заменяет Menu, который терял href и event скрытых пунктов. Фокус после
раскрытия попадает на первый доступный пункт, Escape возвращает его на trigger.
При live сворачивании сфокусированного ancestor фокус переходит на overflow;
при показе всего пути — на тот же inline ancestor. Чужой фокус не перехватывается.
Общий overlay click connector теперь уважает capture defaultPrevented.

Membrane padding реальной ссылки раньше пересылал синтетический click: WebKit
не открывал новую вкладку с Meta. В общем CSS Membrane native anchor получил
прозрачное расширение области попадания на отступ. Геометрия контрола прежняя;
отключённая мембрана и disabled ancestors не получают расширения. Добавлять
window.open/location.assign в Breadcrumb не потребовалось. Контекстное меню
получает настоящий anchor по hit testing; ручные команды меню отдельно не проверены.

Поверхность общего FloatingOverlay раньше выпадала из типографики roots из-за
своего data-part=content и наследовала браузерный serif. Она подключена к тому же
типографическому baseline. Проверены фактические font-family, size, weight,
line-height и letter-spacing одного ancestor до и после переноса в popup.

## Миграция потребителей

- collapseAfter → maxItems; значения ниже 3 для отключения сворачивания → null.
- allowNavigation удаляется. Галерея Face UI отменяет link click/auxclick на своём
  bubbling boundary, включая порталы. Остальные элементы продолжают работать.
- Defrictor AdminBreadcrumbs получает localized nav/overflow labels и item keys.
  Router adapter пропускает модификаторы, проверяет defaultPrevented/button и
  отменяет обычный переход перед router.push.
- Контракты, сценарии, gallery и inventory обновляются генераторами. Импорты,
  exports и CSS entry points сохраняются. Engine в этой партии не меняется.

## Проверки и ограничения

До исправлений: 8 failed / 2 passed unit probes (включая Popover capture),
12 failed / 6 passed начальных browser cases; native modifier после исправления
harness — 8 passed / 1 failed, только WebKit Membrane padding. Отдельная проверка
типографики воспроизвела несовпадение во всех трёх движках.

После исправлений: 46 постоянных unit cases Breadcrumb; 66/66 его browser cases
на Chromium/Firefox/WebKit. Проверены клавиатура, native modifiers, cancellation,
live props/focus, dark/light, LTR/RTL, русские длинные пути на 360px, bounds и axe.
Снимки просмотрены: строка и popup light 1000px/dark RTL 360px. Библиотека не красит
body: тестовая страница явно использует фон темы. Полупрозрачная popup surface
сохраняет существующие токены дизайн-системы.

Первый общий check выявил два устаревших CSS selector assertions; обновлены только
селекторы под общую label-структуру, требования geometry/hover сохранены.
Финальный React 18 pnpm check: 891 passed + 8 React19-only skips, 55 suites;
types, tokens, contracts, gallery, build, smoke и pack dry run прошли.
React 19 pnpm check: 899/899, те же 55 suites. Полные browser matrices:
по 1397 passed + 4 emulation skips на обеих версиях, 3 workers.
Первый полный прогон имел 1396 passed / 1 failed / 4 skipped: Pagination после
resize сравнивал высоты двумя отдельными RPC. 12 повторений прошли; сравнение
переведено на один атомарный DOM замер, затем обе полные matrices прошли.
Runtime Pagination не менялся. Native new-tab тест использует ControlOrMeta,
чтобы соответствовать Cmd на macOS и Ctrl на Linux CI.
Результаты сборок, синхронизации и настоящих product consumers ведутся в
.artifacts/breadcrumb-integration.md. Они не подменяются исходными browser tests.
Подробный execution journal — .artifacts/breadcrumb-recovery.txt; старые этапы и
исправления harness — .artifacts/breadcrumb-implementation-journal.md.

Ручной аудит screen reader и полный индивидуальный аудит наследуемых native props
остаются открытыми. Число тестов не является процентом готовности общего goal.

Семантические основания:
[WAI-ARIA Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)
и [HTML anchor semantics](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element).
