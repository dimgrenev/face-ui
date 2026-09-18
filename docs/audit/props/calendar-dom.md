# Calendar: DOM, naming, events and input types

## Рабочая спецификация

Цель: сделать Calendar применимым в именованных полях корпоративных форм и
встраиваемых панелях. Его публичные id/ref, className/style, hidden, dir/lang,
ARIA и native events должны относиться к одному существующему group root;
внутренняя grid остаётся именованной отображаемым месяцем. Внешние focus/blur
handlers не должны ломать внутреннее отслеживание фокуса. Native capture
handlers могут отменить действие до него; обычное bubble событие сообщает о
реальном событии и не становится вторым onValueChange.

Сохранить все существующие цивильные даты, controlled/uncontrolled состояния,
keyboard navigation и Date, использующий ту же CalendarGrid. Допустить null
для defaultValue, как уже делает runtime, и readonly disabledDates в Calendar
и Date: общий неизменяемый календарь выходных не должен требовать копирования
у вызывающего кода. Это типовая совместимость, а не второй способ управления.

Владелец — canonical face-ui: Calendar, shared CalendarGrid, тип Date props.
Calendar machine и обработчик выбора дня должны учитывать отменённый click;
это проверяется на переходе месяца и выборе даты, без отдельного veto prop.
Потребители — app/site/Defrictor через generated snapshots. Публичный API:
добавление стандартной DOM границы с фиксированной group role, без aliases
ariaLabel/rootRef/rootProps. Calendar не принимает children/raw HTML,
contentEditable, autoFocus на div или native onChange/onInput вместо
onValueChange. Сначала failing runtime/browser/types, затем реализация и
генерация Calendar/Date contracts и gallery. Новых dependencies/exports/CSS
entry points не планируется.

Источники: [React DOM events](https://react.dev/reference/react-dom/components/common)
и [APG date grid](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).
Распределение name между существующими group и grid — контракт этой библиотеки;
источники не заменяют проверки реального accessibility tree.

Проверки: VITEST_MAX_WORKERS=1 pnpm test для новых контрактов; pnpm test:types;
Playwright Chromium/Firefox/WebKit на production CSS с live attributes, ref,
external name/description, capture cancellation, focus/blur, disabled fieldset,
pointer/keyboard, RTL и native form absence. Затем pnpm contracts:sync,
pnpm gallery:sync, node scripts/audit-props.mjs, полный pnpm check и browser
matrices React18/19 последовательно, три workers, React19 pnpm check.

Sync: полный drift node .artifacts/select-inspect-sync.mjs check, Face-only
sync после проверки stale generated files, rebuild обоих Face dist. Compiled
app/site consumers до production builds; manifest/check/typecheck app,
desktop:build, site build, Defrictor check:ui/build в собственной временной
копии, checksum parity, package-sync/proof-pack/production-isolation checks.
Риск неполного sync — типы обещают props, которые старый snapshot теряет;
риск реализации — замена внутренних listeners или семантики group/grid.

Вне завершённости этой проверки: отдельный disabled/readOnly API, общая
локализация navigation/actions, range-interior constraints и manual AT.
Их отсутствие здесь не означает завершения полного Calendar или goal.

## Решения по API

| Параметры | Сценарий и решение | Проверка |
| --- | --- | --- |
| id / ref | Внешняя адресация и измерение одного Calendar; существующий div с role=group | ref === group, id на том же узле, сохранение узла после обновления |
| className / style | Встроить календарь в панель с её шириной и оформлением | Класс сохраняет uf-calendar; computed width 280→300 px, четыре dir/theme сочетания |
| hidden | Временно скрыть календарь без сброса выбора | Нет видимой/accessible grid и её Tab stops; после показа выбор сохранён |
| dir / lang | Нативное направление и язык DOM | RTL меняет реальное направление стрелок; lang адресует группу. Формат дат и начало недели продолжает задавать отдельный locale |
| aria-label / aria-labelledby | Дать календарю имя задачи: период релиза, окно доставки | Именуется существующая group; labelledby имеет нативный приоритет, live label обновляется |
| aria-describedby | Связать ограничения/пояснение с календарём | Accessible description из внешнего элемента |
| tabIndex | Явный программный фокус на группе при необходимости | ref.focus с -1; по умолчанию отдельной Tab остановки группы нет |
| onFocus / onBlur и capture | Наблюдать вход/выход без перезаписи внутренних обработчиков | currentTarget — group; отмена default в focus listener не ломает переход через границу месяца и не забирает фокус после ухода |
| onClick / onKeyDown и capture | Нативные события календаря и veto до действия | Capture отменяет выбор/месяц; снятие отмены работает сразу; onValueChange остаётся единственным сообщением о выборе |
| defaultValue=null | Nullable данные сервера без преобразования null в undefined | Пустые single/range defaults; поздние defaults не сбрасывают выбор; positive type cases |
| readonly disabledDates | Единый неизменяемый массив выходных в Calendar и Date | Замороженные массивы не мутируются; constraints работают; readonly type cases |

Общий CalendarRootAttributes задаёт одну границу для standalone Calendar и
shared CalendarGrid. Нативные атрибуты передаются существующему корню, без
rootProps/rootRef/ariaLabel aliases и дополнительной обёртки. Calendar владеет
структурой и role=group: children, raw HTML, contentEditable, div autoFocus и
native input-change API не предлагаются. ARIA состояния внутреннего выбора
не перенесены на структурную group.

Calendar не объявляет себя native form field: в FormData нет скрытых значений;
Date остаётся компонентом для поля/формы. Обычный fieldset disabled блокирует
кнопки и реальную активацию Calendar. Это проверенный способ композиции,
не завершённое решение обо всех сценариях будущего disabled/readOnly API.

## Доказательства

Новые unit cases до исправлений: 3 failed /3 passed (6 total); типизация —
6 ошибок для DOM attrs, null defaults и readonly arrays. Browser before:
19 failed /2 passed (21 total), из которых одна ошибка WebKit была неверным
ожиданием Tab на внешнюю native кнопку стенда без явного tabIndex. Внешние
кнопки получили tabIndex=0, как в существующем Date fixture; этот сбой не
классифицируется как дефект Calendar. Остальные 18 случаев проверяли потерянные
атрибуты/события. После исправлений: unit34/34 (новые + existing values),
types passed, browser102/102 (новые21 + existing civil regressions).

Сверка generator обнаружила исчезнувший selection.default после изменения
формы destructuring. Явный default single восстановлен; callback narrowing
остаётся по props.selection, без casts. Selection metadata и readonly array
representation проверены непосредственно в сгенерированных JSON; native
HTML attrs остаются общей платформенной границей, не копируются в каждый
компонентный JSON. Три новых ARIA описания присутствуют в Calendar contract.

Финальный pnpm check: React 18 — 595 passed + 8 React19-only skips / 603,
React 19 — 603/603, 49 suites. Полные browser matrices: по 1160 passed +
4 emulation skips / 1164 на React 18 и 19. Types, contracts, gallery,
ESM/CJS/declarations, smoke и npm pack прошли. Inventory: 108 public API types,
902 library occurrences, 10913 inherited platform occurrences; это не процент
завершения. Product validation следует отдельно по workspace workflow.

Логи: /tmp/face-ui-calendar-dom-unit-before.log,
/tmp/face-ui-calendar-dom-types-before.log,
/tmp/face-ui-calendar-dom-browser-before.log,
/tmp/face-ui-calendar-dom-unit-after.log,
/tmp/face-ui-calendar-dom-browser-after.log,
/tmp/face-ui-calendar-dom-check-final.log,
/tmp/face-ui-calendar-dom-browser-all.log,
/tmp/face-ui-calendar-dom-react19-browser-all.log,
/tmp/face-ui-calendar-dom-react19-check.log.

## Остаток аудита

Calendar native boundary, null defaults и readonly day constraints закрываются
перечисленными сценариями. Не объявляются закрытыми полный Calendar API,
все native event types, отдельные disabled/readOnly сценарии, localization
navigation/actions, range-interior unavailable days, весь alignment и manual AT.
Глобальный goal остаётся открытым.

## Визуальная проверка и исправление стенда

Первый compiled consumer прогон дал 24/24 по событиям, именам, axe и overflow,
но просмотр снимка показал неразличимый Calendar в dark: тестовая страница
оставалась белой при светлом тексте. Это ошибка оформления стенда: прозрачный
Calendar использует поверхность родителя. Первоначальный dark screenshot
не считается визуальным подтверждением. Runtime ради него не менялся.

Новая независимая проверка фактического foreground/background воспроизвела
контраст **1:1 во всех 6 dark случаях**. Она измеряет цвет текстового label
и последовательность solid backgrounds; неподдерживаемые opacity, images,
filters и blending отклоняются явно. Обычный axe scan этого случая не выявил,
поэтому один зелёный accessibility scan не используется как достаточное
доказательство видимости текста.

Оба стенда теперь окрашивают родительский canvas токенами выбранной темы.
Порог текста — **4.5:1**. После этой коррекции прошли root pnpm check и по
**21/21** Calendar DOM случаев на React 18/19 с проверкой фактического label.
Полные 1160-case matrices выше относятся к тому же неизменённому runtime;
последняя коррекция затронула только этот HTML fixture и его проверки, и
покрыта целевыми прогонами обеих версий. Логи:
/tmp/face-ui-calendar-dom-contrast-before.log,
/tmp/face-ui-calendar-dom-check-canvas.log,
/tmp/face-ui-calendar-dom-label-contrast-final.log,
/tmp/face-ui-calendar-dom-react19-label-contrast-final.log.
Обновлённые compiled consumers и product snapshots проверяются повторно
после заключительного sync; результаты фиксируются в журнале выполнения.
