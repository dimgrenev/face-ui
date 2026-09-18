# Фокус при обновлении содержимого открытого слоя

## Рабочая спецификация

Цель: проверить удаление, скрытие и отключение активного действия внутри
открытого Date/Modal. Если DOM-обновление теряет фокус, восстановить его в
действующей модальной границе. Сохранять существующий валидный фокус,
программный фокус на заголовке с tabIndex=-1, nested portals, возврат при
закрытии и autoFocusOnOpen=false до первого входа пользователя в окно.

Владелец — canonical face-ui, общий assets/runtime/layers.ts и адаптер
useLayer. Потребители — app, site, Defrictor. Публичных props, aliases,
dependencies, CSS/import entry points не добавлять. Date.presets/showNow/
showClear и Modal.children/actions должны безопасно обновляться в открытом
состоянии. Конкретные бизнес-переходы по-прежнему могут явно фокусировать
свой следующий control; общий механизм не должен перехватывать такой фокус.

Сначала failing browser evidence, затем общее исправление. Основание для
модальной границы — [WAI-ARIA APG Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Выбор резервного элемента после обновления — решение библиотеки, которое
проверяется отдельно; APG не задаёт алгоритм обработки MutationObserver.

План проверки: targeted Playwright в Chromium/Firefox/WebKit на Date и Modal,
включая autoFocus=false, вложенные окна/порталы, закрытие, пустое содержимое,
сохранение фокуса на существующем элементе. Затем VITEST_MAX_WORKERS=1 pnpm
check и полные pnpm test:browser --workers=3 на React 18/19 последовательно,
React 19 pnpm check; compiled app/site consumers перед product builds.

Sync: инспекция полного drift через node .artifacts/select-inspect-sync.mjs
check; pnpm --dir .. sync:face-ui --force только для подтверждённых stale
generated snapshots; восстановить dist обоих Face пакетов. Проверить app
manifest/check/typecheck/desktop:build, site build, Defrictor check:ui и build
в собственной временной копии, package-sync:check, proof-pack:check,
production-isolation:check. Риск неполного sync — разные правила фокуса в
продуктах; риск реализации — перехват фокуса при закрытии, вложенном окне
или намеренно отключённом autofocus. Ручная проверка всех AT остаётся вне
этой ограниченной проверки.

## Подтверждённые дефекты и решение

Date: пять сценариев × три браузера падали до исправления — удаление preset,
его отключение min, скрытие Now/Clear и очистка controlled value при фокусе
на Clear. Focus оставался на body или недоступном элементе без следующего Tab.

Modal: после исправления неверного тестового имени Close→Close modal все
24 проверки удаления/disabled/fieldset/hidden/aria-hidden/class/style и
вложенного modal также падали. Ошибки первого стенда не считаются доказательством.
Дополнительный child autofocus до регистрации слоя воспроизведён в трёх
браузерах; explicit replacement focus / deliberate blur уже проходили.

Единственный runtime owner — assets/runtime/layers.ts. Слой помнит последний
сфокусированный элемент и его portal root для действующей modal-границы.
Имеющийся MutationObserver проверяет изменения состава и доступности;
вычисление Tab-последовательности отложено до реальной необходимости.
Общая проверка доступности используется для Tab stops и recovery, но
табуляция и программный tabIndex=-1 не смешиваются.

При потере элемента выбирается первый доступный Tab stop того же сохранившегося
portal root, затем focusable root/modal. Сохраняются valid current focus,
программный заголовок, явная передача фокуса, deliberate blur доступного
контрола, autoFocusOnOpen=false до входа пользователя, child autofocus до
регистрации, nested modal/nonmodal portals и обычный Escape/return-focus.
Публичных props, aliases, dependencies, CSS entry points не добавлено.

Целевые проверки после окончательного runtime: 57/57. Первый расширенный
прогон включая прежние quality/Date focus:159/159, до дополнения early focus.
Финальная pnpm check React18:589 passed + 8 React19-only skips / 597, 48 suites.
Полные browser matrices React 18/19: по 1139 passed + 4 emulation skips,
1143 total. React 19 pnpm check: 597/597, 48 suites; build, types, contracts,
gallery, smoke и npm pack прошли.

## Ограничения

Закрыта потеря фокуса после DOM/attribute-обновлений внутри действующей
модальной границы. Это не полный аудит Modal/Popover API. Standalone nonmodal
popup, удалённый return-focus trigger, CSS-only media-query transitions и
shadow roots требуют отдельных сценариев; этот отчёт не утверждает их
исправление или дефект. Manual AT остаётся открытой проверкой.

Логи: /tmp/face-ui-layer-focus-before.log (Date),
/tmp/face-ui-layer-focus-modal-before.log (исправленный Modal стенд),
/tmp/face-ui-layer-focus-child-before.log (early child autofocus),
/tmp/face-ui-layer-focus-targeted-final.log,
/tmp/face-ui-layer-focus-check-final.log,
/tmp/face-ui-layer-focus-browser-all.log,
/tmp/face-ui-layer-focus-react19-browser-all.log,
/tmp/face-ui-layer-focus-react19-check.log. Последующая проверка snapshots,
compiled consumers и products фиксируется в журнале выполнения; она не
подменяется canonical suite.
