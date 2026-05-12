import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Panel — collapsible side panel navigation.
 *
 * Flat API: all items rendered from `items` prop.
 * Supports nested groups, expand/collapse, and item selection.
 *
 * `<Panel items={[{ id: 'home', label: 'Home', icon: <HomeIcon /> }]} />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useIsCompactViewport, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { sidebarMachine, connectSidebar } from '../assets/machines/sidebar.machine';
import { cn } from '../assets/utils';
import { Bar } from '../Bar/Bar';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
import { Tree } from '../Tree/Tree';
function PanelItemRenderer(props) {
    const { item, api, collapsed } = props;
    const hasChildren = Array.isArray(item.items) && item.items.length > 0;
    if (!hasChildren) {
        const itemProps = api.getItemProps({ id: item.id, disabled: item.disabled });
        const handleClick = () => {
            var _a;
            itemProps.onClick();
            (_a = item.onClick) === null || _a === void 0 ? void 0 : _a.call(item);
        };
        if (item.href) {
            return (_jsxs("a", Object.assign({}, itemProps, { href: item.href, className: cn('uf-sidebar-item', itemProps.className), onClick: (e) => {
                    handleClick();
                    if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                    }
                }, children: [item.icon && _jsx("span", { "data-scope": "sidebar", "data-part": "itemIcon", children: item.icon }), !collapsed && (_jsx("span", { "data-scope": "sidebar", "data-part": "itemLabel", className: "uf-text-body", children: item.label }))] })));
        }
        return (_jsxs("div", Object.assign({}, itemProps, { className: cn('uf-sidebar-item', itemProps.className), onClick: handleClick, children: [item.icon && _jsx("span", { "data-scope": "sidebar", "data-part": "itemIcon", children: item.icon }), !collapsed && (_jsx("span", { "data-scope": "sidebar", "data-part": "itemLabel", className: "uf-text-body", children: item.label }))] })));
    }
    // Group with sub-items
    const groupLabelProps = api.getGroupLabelProps({ id: item.id });
    return (_jsxs("div", Object.assign({}, api.getGroupProps({ id: item.id }), { children: [_jsxs("div", Object.assign({}, groupLabelProps, { className: cn('uf-sidebar-item', groupLabelProps.className), children: [item.icon && _jsx("span", { "data-scope": "sidebar", "data-part": "itemIcon", children: item.icon }), !collapsed && (_jsx("span", { "data-scope": "sidebar", "data-part": "itemLabel", className: "uf-text-body", children: item.label }))] })), !collapsed && (_jsx("div", { "data-scope": "sidebar", "data-part": "groupContent", children: item.items.map((child) => (_jsx(PanelItemRenderer, { item: child, api: api, collapsed: collapsed }, child.id))) }))] })));
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Panel = forwardRef(function Panel(props, ref) {
    const { items: rawItems, collapsed, defaultCollapsed = false, onCollapsedChange, selectedId, defaultSelectedId, onSelectedChange, width = 260, collapsedWidth = 60, className, previewPreset, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, open, defaultOpen = false, onOpenChange, trigger, surfaceTitle, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const isCompactViewport = useIsCompactViewport(surfaceBreakpoint);
    const isSheetSurface = surface === 'sheet' || (surface === 'auto' && isCompactViewport);
    const machineCollapsed = useControllableMachineProp(collapsed, defaultCollapsed);
    const machineSelectedId = useControllableMachineProp(selectedId, defaultSelectedId !== null && defaultSelectedId !== void 0 ? defaultSelectedId : null);
    const [sheetOpen, setSheetOpen] = useControllableOpenState(open, defaultOpen, onOpenChange);
    useBodyScrollLock(isSheetSurface && sheetOpen);
    const { state, send } = useMachine(sidebarMachine, {
        collapsed: machineCollapsed,
        selectedId: machineSelectedId,
        width,
        collapsedWidth,
        onCollapsedChange: onCollapsedChange !== null && onCollapsedChange !== void 0 ? onCollapsedChange : null,
        onSelectedChange: onSelectedChange !== null && onSelectedChange !== void 0 ? onSelectedChange : null,
    });
    const api = connectSidebar(state, send);
    const isCollapsed = isSheetSurface ? false : api.collapsed;
    const previewSections = [
        {
            title: 'Workspace',
            items: [
                { id: 'overview', label: 'Overview', icon: 'panel' },
                { id: 'components', label: 'Components', icon: 'component' },
                { id: 'tokens', label: 'Tokens', icon: 'props' },
            ],
        },
        {
            title: 'Tools',
            items: [
                { id: 'search', label: 'Search', icon: 'search' },
                { id: 'themes', label: 'Themes', icon: 'theme' },
                { id: 'settings', label: 'Settings', icon: 'settings' },
            ],
        },
    ];
    const renderWorkspacePreview = (showHeaderBar) => {
        const toggleProps = api.getToggleProps();
        return (_jsxs("div", { className: "uf-sidebar-preview", children: [showHeaderBar ? (_jsxs(Bar, { className: "uf-sidebar-preview-bar", children: [_jsx(Bar.LeftEllipsis, { children: _jsx(Text, { as: "span", variant: "label", fullWidth: true, children: isCollapsed ? 'UF' : 'FaceUI React' }) }), _jsx(Bar.Right, { children: _jsx(Button, Object.assign({}, toggleProps, { icon: _jsx(Icon, { name: isCollapsed ? 'right' : 'left' }), iconOnly: true, fullWidth: false, variant: "default", className: "uf-sidebar-preview-toggle", "aria-label": isCollapsed ? 'Expand panel' : 'Collapse panel' })) })] })) : null, _jsxs("div", { className: "uf-sidebar-preview-body", children: [previewSections.map((section) => (_jsxs("section", { className: "uf-sidebar-preview-section", children: [!isCollapsed ? (_jsx(Text, { as: "div", variant: "label", fullWidth: true, className: "uf-sidebar-preview-sectionTitle", children: section.title })) : null, _jsx("div", { className: "uf-sidebar-preview-items", children: section.items.map((item) => {
                                        const isSelected = api.selectedId === item.id;
                                        return (_jsx(Button, { icon: _jsx(Icon, { name: item.icon }), iconOnly: isCollapsed, text: isCollapsed ? undefined : item.label, fullWidth: true, align: "left", stretchText: true, membrane: true, variant: "default", "data-selected": isSelected ? '' : undefined, className: "uf-sidebar-preview-item", onClick: () => {
                                                send({ type: 'SELECT', id: item.id });
                                                if (isSheetSurface)
                                                    setSheetOpen(false);
                                            } }, item.id));
                                    }) })] }, section.title))), !isCollapsed ? (_jsxs("section", { className: "uf-sidebar-preview-section uf-sidebar-preview-section--tree", children: [_jsx(Text, { as: "div", variant: "label", fullWidth: true, className: "uf-sidebar-preview-sectionTitle", children: "Structure" }), _jsx(Tree, { className: "uf-sidebar-preview-tree", defaultExpandedIds: ['workspace'], items: [
                                        {
                                            id: 'workspace',
                                            label: 'Workspace',
                                            children: [
                                                { id: 'overview-screen', label: 'Overview' },
                                                { id: 'components-screen', label: 'Components' },
                                                { id: 'tokens-screen', label: 'Tokens' },
                                            ],
                                        },
                                    ] })] })) : null] })] }));
    };
    const renderPanelItems = () => (_jsxs(_Fragment, { children: [_jsx("div", Object.assign({}, api.getHeaderProps(), { children: _jsx("button", Object.assign({}, api.getToggleProps())) })), _jsx("div", Object.assign({}, api.getContentProps(), { children: items.map((item) => (_jsx(PanelItemRenderer, { item: item, api: api, collapsed: isCollapsed }, item.id))) })), _jsx("div", Object.assign({}, api.getFooterProps()))] }));
    if (isSheetSurface) {
        const triggerNode = trigger !== null && trigger !== void 0 ? trigger : (_jsx(Button, { icon: "panel", iconOnly: true, fullWidth: false, variant: "ghost", "aria-label": "Open panel" }));
        return (_jsxs("div", { className: cn('uf-sidebar-sheetHost', className), children: [_jsx("span", { className: "uf-sidebar-sheetTrigger", style: { display: 'inline-flex' }, onClick: () => setSheetOpen(true), children: triggerNode }), _jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": sheetOpen ? 'open' : 'closed', onClick: () => setSheetOpen(false) }), _jsxs("div", { className: "uf-responsive-panel uf-sidebar-sheet", "data-state": sheetOpen ? 'open' : 'closed', "data-placement": "left", style: { '--face-runtime-sidebar-sheet-w': typeof width === 'number' ? `${width}px` : String(width) }, children: [_jsx(ResponsiveSheetHeader, { title: surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : 'Panel', onClose: () => setSheetOpen(false) }), _jsx("nav", { className: cn('uf-sidebar', previewPreset === 'workspace' && 'uf-sidebar--workspace'), children: previewPreset === 'workspace' ? renderWorkspacePreview(false) : renderPanelItems() })] })] }));
    }
    if (previewPreset === 'workspace') {
        return (_jsx("nav", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-sidebar', 'uf-sidebar--workspace', className), children: renderWorkspacePreview(true) })));
    }
    return (_jsx("nav", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-sidebar', className), children: renderPanelItems() })));
});
export const Sidebar = Panel;
