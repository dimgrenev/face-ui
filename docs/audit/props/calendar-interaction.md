# Calendar interaction state — working spec, 2026-09-13

Goal: express two distinct corporate UI states. disabled suspends selection and
month navigation and removes descendant controls from Tab. readOnly preserves
browsing/focus and the visible selected value while forbidding user value
changes. Neither discards selection or controlled month/value updates. Live
state changes must not steal outside focus; disabled dominates readOnly.

Owner: canonical face-ui Calendar, shared CalendarGrid/calendar.machine.
Consumers: app, site, Defrictor snapshots; Date shares the internal grid and must
keep its existing unavailable field/popup behavior. No independent Date flags
or alternate calendar mechanism. Public API: exactly disabled?: boolean and
readOnly?: boolean, names aligned with Date/Input. Existing min/max/disabledDates
remain day availability constraints and do not duplicate whole-widget state.
No aria-disabled/aria-readonly aliases; state derives ARIA. Existing div root
and composed ref preserved, no wrapper. Imports/CSS entries/dependencies unchanged.

Implementation intent: shared machine selection guard owns disabled/readOnly;
month and keyboard movement guard disabled. Native disabled on all internal
buttons for disabled, grid read-only semantics and focusable disabled-action day
buttons for readOnly. Keep constraints visually distinct from readOnly. Root
state data attributes permit styling. No aria-readonly on role=group.
External updates remain quiet; no internal default reinitialization on toggles.

Verification: before/after unit user events and machine-direct sends; positive
and negative TypeScript API; 3-browser true pointer/keyboard/Tab and live-state
matrices for single/range, controlled/refusal, constraints, themes/directions,
React18+19; existing Calendar/Date navigation, civil arithmetic, DOM/action
regressions. pnpm check, contracts:sync/gallery:sync when needed and inventory.
Before Face-only sync inspect every drift; rebuild both product package dist,
compiled package smoke in all3browsers/themes/widths, manifests, app typecheck,
app desktop build, site build, Def UI plus private standalone Def build, source
parity, package-sync/proof-pack/isolation. No need unrelated full browser suites
if no shared primitive changes; all impacted calendar/date suites required.

Rollback: stale snapshots/types could accept a state prop without inhibiting
runtime interaction. Sync and consumer verification are part of this change.
Sources consulted: https://react-aria.adobe.com/Calendar documents distinct
immutable-value and disabled states; https://www.w3.org/WAI/ARIA/apg/patterns/grid/
describes roving focus and grid state. These inform the design, not copied API.
Manual screen-reader proof remains separate from DOM/axe/browser coverage.

Range-interior unavailable dates/localized action names are next independent
questions; do not change their semantics incidentally in this phase.

## Решения и проверенные сценарии

| API | Зачем нужен | Поведение |
| --- | --- | --- |
| disabled | Временно приостановить весь календарь, например до получения разрешения или ограничений с сервера | Нативно отключает day/nav buttons, убирает их из Tab, блокирует выбор и навигацию в общей машине. Имеет приоритет над readOnly. |
| readOnly | Показывать согласованную дату или период с возможностью просмотра соседних месяцев | Запрещает пользовательский выбор мышью, Enter и Space; сохраняет spatial focus, month navigation и onViewDateChange. Доступные даты остаются читаемыми, без disabled opacity. |
| value/viewDate | Обновление из приложения при любом interaction state | Продолжает принимать controlled значения без пользовательского callback. Снятие состояния не перечитывает defaultValue и не теряет незавершённый диапазон. |
| min/max/disabledDates | Ограничения отдельных дат | Не заменяют whole-widget state. После снятия disabled/readOnly остаются действующими. Отдельное ограничение адаптера тоже не теряется. |
| ARIA | Сообщить реальное состояние | group получает derived aria-disabled; grid — aria-readonly; readOnly day buttons остаются focusable с aria-disabled. Отдельные публичные ARIA aliases не добавлены. |

Названия `disabled` и `readOnly` совпадают с Date и другими полями системы.
`readOnly` запрещает пользовательское изменение, а не обновление из приложения.
Оба пропса имеют default false в TypeScript implementation и JSON-контрактах.
DOM wrapper, dependencies и отдельный механизм Calendar не добавлены.
Правка CSS ниже устраняет повторное применение disabled opacity.
Общий `isDateSelectable` используется машиной и Grid перед callback. Date
сохраняет собственную модель недоступного поля и общий механизм сетки.

Разделение browsing и immutable user selection сопоставлено с
[Calendar React Aria](https://react-aria.adobe.com/Calendar), а focus/ARIA — с
[WAI grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
Это ориентиры при проектировании; названия и сценарии согласованы с Face UI.
Автоматические DOM/axe проверки не заменяют ручную проверку screen readers.

## Доказательства

До реализации **7/9 unit** случаев падали; два случая только внешнего обновления
проходили и раньше. TypeScript отклонял оба новых meaningful props. Целевой
browser прогон дал **21/21 failed** на state/interaction assertions. Первый
ошибочно запущенный общий browser прогон был остановлен; он не считается
полной проверкой. Перед after-run исправлен locator выбранной ячейки: её
кнопка находится в Membrane, поэтому проверяется ancestor td, а не wrapper.

Первое исправление прошло **43/43** targeted unit (9 новых + 34 Calendar
DOM/value), типы и **21/21** новых browser cases. Проверены single/range,
RTL/LTR, light/dark, реальные pointer и keyboard, Tab, controlled refusal,
live transitions, внешний focus и contrast текста readOnly не ниже 4.5:1.

При review общей функции дополнительно обнаружена потеря day adapter override:
`aria-disabled=true` мог сочетаться с активирующим onClick. Новый direct-adapter
unit воспроизвёл нежелательный callback; восстановлен guard `day.isDisabled`.
Десять новых unit cases проверяют и эту границу, и direct machine sends.

Финальные проверки после этой коррекции:
- React18 `pnpm check`: **605 passed + 8 React19-only skips = 613**, 50 suites.
- React19 `pnpm check`: **613/613**, 50 suites.
- Все Calendar/Date browser suites: **456/456 на каждой версии React**,
  Chromium/Firefox/WebKit, 3 workers, последовательные версии.
- Contracts/gallery/types/build/smoke/pack проходят; inventory
  **108 API types / 904 library occurrences / 10913 platform occurrences**.

Логи: /tmp/face-ui-calendar-interaction-unit-before.log,
/tmp/face-ui-calendar-interaction-types-before.log,
/tmp/face-ui-calendar-interaction-browser-target-before.log,
/tmp/face-ui-calendar-interaction-adapter-before.log,
/tmp/face-ui-calendar-interaction-check-final.log,
/tmp/face-ui-calendar-interaction-react19-check-final.log,
/tmp/face-ui-calendar-interaction-regressions-confirmed.log,
/tmp/face-ui-calendar-interaction-react19-regressions-confirmed.log.

Проверки compiled consumers и product builds после sync фиксируются отдельно
в execution log. Ни общий goal, ни весь Calendar не объявляются завершёнными:
остаются range-interior unavailable dates, локализация действий, alignment,
ручная AT проверка и индивидуальные платформенные props.

В одном промежуточном повторе React18 прошли 455/456: старый тест Date
переключал date→time после нативного form.reset(), но до отложенного reset
компонента. FormData уже показывала исходную дату, а Calendar ещё содержал
старый выбор. Этот native-only assert не являлся достаточным ожиданием.
Тест теперь ждёт aria-selected исходной даты, затем выполняет следующее
действие; Date runtime не менялся. Сценарий проверен 30 раз (10×3 браузера),
затем повторены оба 456-case прогона. Trace и snapshot первоначальной ошибки
сохранены в .artifacts/calendar-interaction-reset-race; промежуточный failure
не стирается и не выдаётся за pass.

## Визуальное согласование disabled с токеном

Первый compiled consumer прогон подтвердил поведение, но визуальный review
выявил двойную прозрачность: общий disabled root и нативные disabled buttons
приглушались независимо. При стандартном токене 0.6 кнопки получали 0.36.
Измерение ancestor opacity с custom token 0.5 воспроизвело **0.3 вместо 0.5
во всех 6 disabled случаях**. Это не считается корректным визуальным результатом.

Одна scoped CSS rule оставляет прозрачность на группе и сбрасывает повторную
прозрачность её нативно отключённых кнопок. Токен применяется один раз к дням,
навигации и заголовку; добавлять независимый disabled color/opacity prop не нужно.
JavaScript, ARIA и readOnly поведение не менялись. После коррекции оба
`pnpm check` прошли с теми же 613 случаями; **42/42 Calendar DOM + interaction
browser cases на каждой версии React** проверяют final CSS, включая custom
token, contrast и live transitions. Предыдущие 456-case matrices подтверждают
тот же неизменённый JavaScript; последний CSS subset явно отделён от них.

Логи: /tmp/face-ui-calendar-interaction-opacity-before.log,
/tmp/face-ui-calendar-interaction-check-opacity.log,
/tmp/face-ui-calendar-interaction-react19-check-opacity.log,
/tmp/face-ui-calendar-interaction-opacity-after.log,
/tmp/face-ui-calendar-interaction-react19-opacity-after.log.
Последующий final sync, rebuilt consumers, 4 screenshot reviews и product
builds фиксируются в execution log. Первые consumer/product попытки сохранены
отдельно; продуктовая сборка не объявляется зелёной при внешних изменениях.
