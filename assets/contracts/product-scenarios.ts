export interface ProductScenario {
  name: string
  props: Record<string, unknown>
}

type ProductScenarioPair = readonly [ProductScenario, ProductScenario]

export const PRODUCT_SCENARIOS: Record<string, ProductScenarioPair> = {
  Accordion: [
    {
      name: 'Product / Account Settings',
      props: {
        multiple: true,
        collapsible: true,
        defaultExpandedIds: ['profile', 'security'],
        items: [
          { value: 'profile', label: 'Profile and workspace', icon: 'account', content: 'Company details, workspace identity, and member preferences.' },
          { value: 'security', label: 'Security', icon: 'settings', content: 'Single sign-on, sessions, and recovery policies.' },
          { value: 'billing', label: 'Billing', icon: 'file', content: 'Plan, invoices, and payment methods.' },
        ],
      },
    },
    {
      name: 'Product / AI Run Details',
      props: {
        multiple: false,
        collapsible: true,
        defaultExpandedIds: ['reasoning'],
        items: [
          { value: 'reasoning', label: 'Reasoning summary', icon: 'component', content: 'The agent compared three implementation paths before selecting the safest migration.' },
          { value: 'tools', label: 'Tool activity', icon: 'props', content: 'Search, code inspection, and verification calls used for this run.' },
          { value: 'sources', label: 'Sources', icon: 'link', content: 'Documentation and repository references used in the answer.' },
        ],
      },
    },
  ],
  Avatar: [
    {
      name: 'Product / Team Member',
      props: {
        src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
        name: 'Maya Chen',
        fallback: 'MC',
        fallbackDelayMs: 150,
      },
    },
    {
      name: 'Product / AI Assistant',
      props: {
        name: 'Research assistant',
        icon: 'component',
        fallback: 'AI',
        fallbackDelayMs: 0,
      },
    },
  ],
  Badge: [
    {
      name: 'Product / Deployment Ready',
      props: { text: 'Ready to deploy', appearance: 'fill', tone: 'positive' },
    },
    {
      name: 'Product / Usage Warning',
      props: { text: '82% of quota used', appearance: 'outline', tone: 'warning' },
    },
  ],
  Bar: [
    {
      name: 'Product / Workspace Header',
      props: {
        orientation: 'horizontal',
        children: [
          { __componentName__: 'Text', text: 'Acme Workspace', truncate: true },
          { __componentName__: 'Bar.Right', children: [{ __componentName__: 'Button', text: 'Invite', icon: 'plus', fullWidth: false }] },
        ],
      },
    },
    {
      name: 'Product / AI Composer Tools',
      props: {
        orientation: 'horizontal',
        children: [
          { __componentName__: 'Button', icon: 'plus', iconOnly: true, fullWidth: false, 'aria-label': 'Attach file' },
          { __componentName__: 'Text', text: 'Agent mode', variant: 'muted', truncate: true },
          { __componentName__: 'Bar.Right', children: [{ __componentName__: 'Button', text: 'Run', variant: 'accent', fullWidth: false }] },
        ],
      },
    },
  ],
  Breadcrumb: [
    {
      name: 'Product / Repository Path',
      props: {
        separator: '/',
        membrane: true,
        collapseAfter: 4,
        allowNavigation: false,
        items: [
          { label: 'workspace' },
          { label: 'apps' },
          { label: 'dashboard' },
          { label: 'components' },
          { label: 'Button.tsx' },
        ],
      },
    },
    {
      name: 'Product / Checkout Flow',
      props: {
        separator: '/',
        membrane: true,
        collapseAfter: 5,
        allowNavigation: true,
        items: [
          { label: 'Cart', href: '#cart' },
          { label: 'Delivery', href: '#delivery' },
          { label: 'Payment', href: '#payment' },
          { label: 'Review' },
        ],
      },
    },
  ],
  Button: [
    {
      name: 'Product / Create Workspace',
      props: { text: 'Create workspace', icon: 'plus', variant: 'accent', fullWidth: false, align: 'left', membrane: true },
    },
    {
      name: 'Product / Revoke API Key',
      props: { text: 'Revoke key', icon: 'close', variant: 'destructive', fullWidth: false, loading: false, membrane: true },
    },
  ],
  Calendar: [
    {
      name: 'Product / Booking Range',
      props: {
        selection: 'range',
        defaultValue: { start: '2026-07-14', end: '2026-07-18' },
        min: '2026-07-01',
        max: '2026-08-31',
        locale: 'en-US',
        weekStartsOn: 1,
      },
    },
    {
      name: 'Product / Release Deadline',
      props: {
        selection: 'single',
        defaultValue: '2026-09-30',
        disabledDates: ['2026-09-26', '2026-09-27'],
        locale: 'en-GB',
        weekStartsOn: 1,
      },
    },
  ],
  Card: [
    {
      name: 'Product / Usage Summary',
      props: {
        title: 'API usage',
        content: '1.8M of 2M monthly tokens used across production agents.',
        padding: 'default',
        radius: 'lg',
        border: true,
        footerLayout: 'between',
        footer: { __componentName__: 'Button', text: 'View usage', icon: 'arrow-right', iconPosition: 'right', fullWidth: false },
      },
    },
    {
      name: 'Product / AI Approval',
      props: {
        title: 'Approve database migration?',
        description: 'Production change',
        content: 'The agent will add one index and backfill 24,600 records.',
        radius: 'lg',
        interactive: true,
        footerLayout: 'end',
        footer: [
          { __componentName__: 'Button', text: 'Review SQL', variant: 'outline', fullWidth: false },
          { __componentName__: 'Button', text: 'Approve', variant: 'accent', fullWidth: false },
        ],
      },
    },
  ],
  Carousel: [
    {
      name: 'Product / Product Tour',
      props: {
        ariaLabel: 'Product tour',
        loop: true,
        autoPlay: true,
        autoPlayInterval: 5000,
        slidesPerView: 1,
        slides: [
          { src: '/assets/media/examples/office-core/lobby-day.webp', alt: 'Workspace overview' },
          { src: '/assets/media/examples/office-core/lobby-glass-blocks.webp', alt: 'Team collaboration view' },
          { src: '/assets/media/examples/office-core/skyline-window-day.webp', alt: 'Analytics overview' },
        ],
      },
    },
    {
      name: 'Product / Customer Stories',
      props: {
        ariaLabel: 'Customer stories',
        loop: false,
        autoPlay: false,
        defaultIndex: 1,
        slidesPerView: 1,
        slides: [
          { src: '/assets/media/examples/office-core/lobby-glass-blocks.webp', alt: 'Customer team in a bright office' },
          { src: '/assets/media/examples/office-core/skyline-window-day.webp', alt: 'Enterprise team reviewing results' },
        ],
      },
    },
  ],
  Checkbox: [
    {
      name: 'Product / Terms Accepted',
      props: { label: 'I agree to the Terms of Service', defaultChecked: true, required: true, name: 'terms', membrane: true },
    },
    {
      name: 'Product / Partial Selection',
      props: { label: 'Select all team members', checked: 'indeterminate', name: 'members', membrane: true },
    },
  ],
  Code: [
    {
      name: 'Product / API Example',
      props: {
        title: 'request.ts',
        language: 'ts',
        showLineNumbers: true,
        highlight: [2, 3],
        code: "const response = await client.responses.create({\n  model: 'gpt-5',\n  input: 'Summarize this workspace'\n})",
      },
    },
    {
      name: 'Product / Build Log',
      props: {
        title: 'production-build.log',
        language: 'text',
        showLineNumbers: false,
        defaultCollapsed: true,
        collapsedHeight: 120,
        code: 'Installing dependencies...\nCompiling application...\nRunning tests...\nCreating optimized bundle...\nUploading source maps...\nDeployment completed.',
      },
    },
  ],
  Command: [
    {
      name: 'Product / AI Command Palette',
      props: {
        surface: 'inline',
        placeholder: 'Ask or run a command...',
        defaultValue: '',
        groups: [{ id: 'create', label: 'Create' }, { id: 'navigate', label: 'Navigate' }],
        items: [
          { id: 'new-agent', label: 'Create a new agent', keywords: ['assistant', 'bot'], group: 'create' },
          { id: 'new-workflow', label: 'Create workflow', keywords: ['automation'], group: 'create' },
          { id: 'settings', label: 'Open settings', keywords: ['preferences'], group: 'navigate' },
        ],
        emptyContent: 'No matching commands.',
      },
    },
    {
      name: 'Product / Documentation Search',
      props: {
        surface: 'dialog',
        defaultOpen: true,
        placeholder: 'Search documentation...',
        defaultValue: 'auth',
        items: [
          { id: 'oauth', label: 'OAuth setup', keywords: ['auth', 'login'] },
          { id: 'sso', label: 'Enterprise SSO', keywords: ['auth', 'saml'] },
          { id: 'tokens', label: 'API tokens', keywords: ['auth', 'key'] },
        ],
      },
    },
  ],
  Date: [
    {
      name: 'Product / Schedule Campaign',
      props: {
        mode: 'datetime',
        selection: 'single',
        defaultValue: '2026-08-12T09:30:00.000Z',
        valueFormat: 'iso',
        locale: 'en-US',
        timezone: 'UTC',
        label: 'Launch time',
        placeholder: 'Choose date and time',
        surface: 'popover',
        showNow: true,
        showClear: true,
        membrane: true,
        fullWidth: true,
      },
    },
    {
      name: 'Product / Analytics Period',
      props: {
        mode: 'date',
        selection: 'range',
        defaultValue: { start: '2026-07-01', end: '2026-07-31' },
        valueFormat: 'iso',
        locale: 'en-GB',
        weekStartsOn: 1,
        label: 'Reporting period',
        surface: 'sheet',
        showPresets: true,
        showClear: true,
      },
    },
  ],
  Icon: [
    {
      name: 'Product / Accessible Action',
      props: { name: 'search', label: 'Search workspace', title: 'Search workspace' },
    },
    {
      name: 'Product / Status Symbol',
      props: { name: 'radio-on', label: 'Online', title: 'Service is online' },
    },
  ],
  Input: [
    {
      name: 'Product / Work Email',
      props: {
        type: 'email',
        label: 'Work email',
        description: 'Used for security alerts and account recovery.',
        placeholder: 'name@company.com',
        autoComplete: 'email',
        required: true,
        name: 'email',
        membrane: true,
      },
    },
    {
      name: 'Product / AI Prompt',
      props: {
        type: 'text',
        label: 'System instruction',
        placeholder: 'Describe how the assistant should behave...',
        textLayout: 'wrap',
        autoGrow: true,
        maxLength: 4000,
        stretchText: true,
        membrane: true,
      },
    },
  ],
  Markdown: [
    {
      name: 'Product / AI Answer',
      props: {
        content: '## Migration plan\n\n1. Back up production data.\n2. Apply the schema change.\n3. Verify the health check.\n\n```sql\nCREATE INDEX CONCURRENTLY idx_events_created_at ON events(created_at);\n```',
        gfm: true,
        safeMode: true,
        allowRawHtml: false,
        linkTarget: '_self',
        membrane: true,
        fullWidth: true,
      },
    },
    {
      name: 'Product / Release Notes',
      props: {
        content: '# Version 2.4\n\n- Added workspace templates\n- Improved audit logs\n- Fixed SSO session renewal\n\n[Read the upgrade guide](https://example.com/upgrade).',
        gfm: true,
        safeMode: true,
        linkTarget: '_blank',
        linkRel: 'noopener noreferrer',
        membrane: false,
        fullWidth: true,
      },
    },
  ],
  Media: [
    {
      name: 'Product / Dashboard Screenshot',
      props: {
        type: 'image',
        src: '/assets/media/examples/office-core/lobby-day.webp',
        alt: 'Analytics dashboard overview',
        variant: 'rounded',
        loading: 'eager',
        decoding: 'async',
        objectFit: 'cover',
        width: '100%',
        height: 320,
        membrane: true,
      },
    },
    {
      name: 'Product / Customer Portrait',
      props: {
        type: 'image',
        src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
        alt: 'Customer profile portrait',
        variant: 'circle',
        loading: 'lazy',
        objectFit: 'cover',
        width: 96,
        height: 96,
        membrane: true,
      },
    },
  ],
  Menu: [
    {
      name: 'Product / Account Menu',
      props: {
        trigger: 'click',
        children: 'Account',
        surface: 'popover',
        align: 'end',
        sideOffset: 4,
        surfaceTitle: 'Account actions',
        items: [
          { value: 'profile', label: 'Profile settings' },
          { value: 'billing', label: 'Billing' },
          { type: 'separator' },
          { value: 'logout', label: 'Sign out' },
        ],
      },
    },
    {
      name: 'Product / Canvas Context Menu',
      props: {
        trigger: 'context',
        children: 'Right-click canvas',
        surface: 'popover',
        align: 'start',
        sideOffset: 2,
        items: [
          { value: 'duplicate', label: 'Duplicate' },
          { value: 'rename', label: 'Rename' },
          { value: 'archive', label: 'Archive' },
        ],
      },
    },
  ],
  Modal: [
    {
      name: 'Product / Create Project',
      props: {
        open: true,
        portal: false,
        placement: 'center',
        edge: 'inset',
        title: 'Create project',
        description: 'Start from a blank workspace or a template.',
        width: 520,
        closable: true,
        closeOnOverlayClick: true,
        actions: [{ label: 'Cancel', variant: 'outline' }, { label: 'Create project', variant: 'accent' }],
        children: 'Project name, region, and environment settings.',
      },
    },
    {
      name: 'Product / Record Inspector',
      props: {
        open: true,
        portal: false,
        placement: 'right',
        edge: 'flush',
        title: 'Customer details',
        description: 'Account health and recent activity',
        width: 420,
        closable: true,
        closeOnOverlayClick: true,
        actions: [{ label: 'Edit customer', variant: 'accent' }],
        children: 'Plan: Enterprise. Last active 12 minutes ago.',
      },
    },
  ],
  Navigation: [
    {
      name: 'Product / SaaS Top Navigation',
      props: {
        orientation: 'horizontal',
        surface: 'inline',
        defaultActiveId: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Dashboard', href: '#dashboard' },
          { id: 'projects', label: 'Projects', items: [{ id: 'active', label: 'Active projects' }, { id: 'archived', label: 'Archived projects' }] },
          { id: 'analytics', label: 'Analytics', href: '#analytics' },
          { id: 'settings', label: 'Settings', href: '#settings' },
        ],
      },
    },
    {
      name: 'Product / Mobile Product Navigation',
      props: {
        orientation: 'vertical',
        surface: 'sheet',
        defaultOpen: true,
        surfaceTitle: 'Navigate',
        defaultActiveId: 'agents',
        items: [
          { id: 'agents', label: 'Agents' },
          { id: 'runs', label: 'Runs' },
          { id: 'knowledge', label: 'Knowledge' },
          { id: 'settings', label: 'Settings' },
        ],
      },
    },
  ],
  Overlay: [
    {
      name: 'Product / Hover Help',
      props: { trigger: 'hover', children: 'API limits', content: 'Limits reset at the start of each billing cycle.', side: 'top', align: 'center', sideOffset: 4, openDelay: 250 },
    },
    {
      name: 'Product / Click Inspector',
      props: { trigger: 'click', children: 'Inspect run', content: 'Latency: 1.8s. Tokens: 2,460. Cache hit: 72%.', side: 'right', align: 'start', sideOffset: 6, interactive: true, open: true },
    },
  ],
  Pagination: [
    {
      name: 'Product / Search Results',
      props: { defaultPage: 4, total: 248, pageSize: 20, siblingCount: 2, membrane: true, surfaceTitle: 'Choose results page' },
    },
    {
      name: 'Product / Audit Log',
      props: { defaultPage: 18, total: 1260, pageSize: 50, siblingCount: 1, membrane: true, surfaceTitle: 'Choose audit page' },
    },
  ],
  Panel: [
    {
      name: 'Product / Admin Sidebar',
      props: {
        surface: 'inline',
        width: 280,
        defaultSelectedId: 'members',
        items: [
          { id: 'overview', label: 'Overview', icon: 'layout-sidebar-left-open' },
          { id: 'members', label: 'Members', icon: 'account' },
          { id: 'billing', label: 'Billing', icon: 'file' },
          { id: 'security', label: 'Security', icon: 'settings' },
        ],
      },
    },
    {
      name: 'Product / Collapsed Workspace Rail',
      props: {
        surface: 'inline',
        defaultCollapsed: true,
        collapsedWidth: 60,
        defaultSelectedId: 'agents',
        items: [
          { id: 'agents', label: 'Agents', icon: 'component' },
          { id: 'runs', label: 'Runs', icon: 'props' },
          { id: 'files', label: 'Files', icon: 'folder' },
          { id: 'settings', label: 'Settings', icon: 'settings' },
        ],
      },
    },
  ],
  Popover: [
    {
      name: 'Product / Filter Builder',
      props: { children: 'Add filter', content: 'Status is Active and owner is Current user.', interactive: true, side: 'bottom', align: 'start', sideOffset: 4, open: true },
    },
    {
      name: 'Product / AI Citation',
      props: { children: 'Source 3', content: 'Authentication guide, section 4.2: Session renewal.', interactive: true, side: 'right', align: 'center', sideOffset: 6, open: true },
    },
  ],
  Progress: [
    {
      name: 'Product / File Upload',
      props: { value: 68, max: 100, tone: 'neutral', shape: 'linear', showValue: true, label: 'Uploading dataset' },
    },
    {
      name: 'Product / Context Window',
      props: { value: 74, max: 100, tone: 'warning', shape: 'circle', showValue: true, label: 'Context used' },
    },
  ],
  Radio: [
    {
      name: 'Product / Billing Cadence',
      props: {
        orientation: 'horizontal',
        defaultValue: 'annual',
        name: 'billing-cadence',
        membrane: true,
        ariaLabel: 'Billing cadence',
        options: [{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual - save 20%' }],
      },
    },
    {
      name: 'Product / Model Quality',
      props: {
        orientation: 'vertical',
        defaultValue: 'balanced',
        name: 'model-quality',
        membrane: true,
        ariaLabel: 'Model quality',
        options: [
          { value: 'fast', label: 'Fast' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'quality', label: 'Highest quality' },
        ],
      },
    },
  ],
  Rating: [
    {
      name: 'Product / Customer Satisfaction',
      props: { defaultValue: 4, max: 5, allowHalf: false, label: 'How helpful was this answer?', ariaLabel: 'Answer helpfulness rating' },
    },
    {
      name: 'Product / Marketplace Score',
      props: { value: 4.5, max: 5, allowHalf: true, disabled: true, label: '4.5 average rating', ariaLabel: 'Marketplace rating: 4.5 out of 5' },
    },
  ],
  Scroll: [
    {
      name: 'Product / Activity Feed',
      props: {
        orientation: 'vertical',
        height: 240,
        ariaLabel: 'Recent workspace activity',
        children: '09:42 Deployment completed\n09:38 Smoke tests passed\n09:31 Build started\n09:27 Pull request approved\n09:16 Security scan passed\n09:04 Database backup completed\n08:55 Release candidate created',
      },
    },
    {
      name: 'Product / Wide Data Preview',
      props: {
        orientation: 'both',
        height: 180,
        ariaLabel: 'Dataset preview',
        children: 'timestamp,workspace,agent,model,input_tokens,output_tokens,latency_ms,status\n2026-07-10T09:41:00Z,production,research,gpt-5,2840,612,1842,completed',
      },
    },
  ],
  SegmentedControl: [
    {
      name: 'Product / Dashboard View',
      props: {
        selectionMode: 'single',
        orientation: 'horizontal',
        defaultValue: ['table'],
        ariaLabel: 'Dashboard view',
        membrane: true,
        items: [{ value: 'table', label: 'Table' }, { value: 'board', label: 'Board' }, { value: 'timeline', label: 'Timeline' }],
      },
    },
    {
      name: 'Product / Notification Channels',
      props: {
        selectionMode: 'multiple',
        orientation: 'horizontal',
        defaultValue: ['email', 'slack'],
        ariaLabel: 'Notification channels',
        membrane: true,
        items: [{ value: 'email', label: 'Email' }, { value: 'slack', label: 'Slack' }, { value: 'push', label: 'Push' }],
      },
    },
  ],
  Select: [
    {
      name: 'Product / AI Model Picker',
      props: {
        variant: 'side',
        type: 'select',
        label: 'Model',
        placeholder: 'Choose model',
        defaultValue: 'balanced',
        ariaLabel: 'AI model',
        surface: 'popover',
        surfaceTitle: 'Choose model',
        stretchText: true,
        membrane: true,
        options: [{ value: 'fast', label: 'Fast' }, { value: 'balanced', label: 'Balanced' }, { value: 'reasoning', label: 'Reasoning' }],
      },
    },
    {
      name: 'Product / Team Filter',
      props: {
        variant: 'default',
        type: 'multiselect',
        label: 'Teams',
        placeholder: 'All teams',
        defaultValue: ['design', 'engineering'],
        ariaLabel: 'Filter by team',
        surface: 'sheet',
        surfaceTitle: 'Filter teams',
        stretchText: true,
        membrane: true,
        options: [{ value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }, { value: 'sales', label: 'Sales' }],
      },
    },
  ],
  Separator: [
    {
      name: 'Product / Content Section',
      props: { orientation: 'horizontal', decorative: false, membrane: true },
    },
    {
      name: 'Product / Toolbar Divider',
      props: { orientation: 'vertical', decorative: true, membrane: true },
    },
  ],
  Skeleton: [
    {
      name: 'Product / User Avatar Loading',
      props: { variant: 'circle', width: 40, height: 40 },
    },
    {
      name: 'Product / Dashboard Card Loading',
      props: { variant: 'rect', width: '100%', height: 160 },
    },
  ],
  Slider: [
    {
      name: 'Product / Price Range',
      props: { variant: 'simple', label: 'Monthly price', defaultValue: [40, 180], min: 0, max: 250, step: 10, orientation: 'horizontal' },
    },
    {
      name: 'Product / AI Creativity',
      props: { variant: 'advanced', label: 'Creativity', defaultValue: [62], min: 0, max: 100, step: 1, leadingIcon: 'component', leadingText: 'Creative' },
    },
  ],
  Steps: [
    {
      name: 'Product / Workspace Onboarding',
      props: {
        defaultStep: 1,
        linear: true,
        items: [
          { label: 'Workspace', content: 'Choose a name and region.' },
          { label: 'Team', content: 'Invite owners and collaborators.' },
          { label: 'Integrations', content: 'Connect source control and notifications.' },
          { label: 'Review', content: 'Confirm configuration before launch.' },
        ],
      },
    },
    {
      name: 'Product / Deployment Pipeline',
      props: {
        step: 2,
        linear: false,
        items: [
          { label: 'Build', content: 'Application bundle created.' },
          { label: 'Test', content: 'Unit and integration checks passed.' },
          { label: 'Deploy', content: 'Production rollout is in progress.' },
          { label: 'Verify', content: 'Health checks will confirm the release.' },
        ],
      },
    },
  ],
  Switcher: [
    {
      name: 'Product / Auto Save',
      props: { label: 'Auto save', text: 'Save changes continuously', withText: true, defaultChecked: true, name: 'auto-save', value: 'enabled', membrane: true },
    },
    {
      name: 'Product / Analytics Consent',
      props: { label: 'Product analytics', text: 'Share anonymous usage data to improve recommendations and reliability.', withText: true, textWrap: 'wrap', defaultChecked: false, name: 'analytics', value: 'allowed', membrane: true },
    },
  ],
  Table: [
    {
      name: 'Product / Team Directory',
      props: {
        selectable: true,
        selectedRows: ['u2'],
        showRowNumbers: false,
        stickyHeader: true,
        showDividers: true,
        membrane: true,
        ariaLabel: 'Workspace members',
        rowKey: 'id',
        columns: [
          { id: 'name', header: 'Member', accessor: 'name', sortable: true, truncate: true },
          { id: 'role', header: 'Role', accessor: 'role' },
          { id: 'status', header: 'Status', accessor: 'status' },
        ],
        rows: [
          { id: 'u1', name: 'Maya Chen', role: 'Owner', status: 'Active' },
          { id: 'u2', name: 'Noah Williams', role: 'Developer', status: 'Invited' },
          { id: 'u3', name: 'Ava Patel', role: 'Analyst', status: 'Active' },
        ],
      },
    },
    {
      name: 'Product / Invoice Ledger',
      props: {
        sortColumn: 'date',
        sortDirection: 'desc',
        showRowNumbers: true,
        stickyHeader: true,
        showDividers: true,
        resizable: true,
        ariaLabel: 'Invoice ledger',
        rowKey: 'id',
        columns: [
          { id: 'invoice', header: 'Invoice', accessor: 'invoice', width: 160 },
          { id: 'date', header: 'Date', accessor: 'date', sortable: true, width: 140 },
          { id: 'amount', header: 'Amount', accessor: 'amount', align: 'right', width: 120 },
        ],
        rows: [
          { id: 'i1', invoice: 'INV-2048', date: '2026-07-01', amount: '$420.00' },
          { id: 'i2', invoice: 'INV-2017', date: '2026-06-01', amount: '$420.00' },
        ],
      },
    },
  ],
  Tabs: [
    {
      name: 'Product / Analytics Views',
      props: {
        orientation: 'horizontal',
        activationMode: 'automatic',
        defaultValue: 'overview',
        withLine: true,
        membrane: true,
        renderPanels: true,
        items: [
          { value: 'overview', label: 'Overview', content: 'Key metrics and recent trends.' },
          { value: 'funnels', label: 'Funnels', content: 'Conversion performance by journey.' },
          { value: 'retention', label: 'Retention', content: 'Cohort retention over time.' },
        ],
      },
    },
    {
      name: 'Product / Settings Sections',
      props: {
        orientation: 'vertical',
        activationMode: 'manual',
        defaultValue: 'general',
        withLine: false,
        wrap: true,
        membrane: true,
        renderPanels: true,
        items: [
          { value: 'general', label: 'General', content: 'Workspace identity and defaults.' },
          { value: 'security', label: 'Security', content: 'Authentication and session policies.' },
          { value: 'billing', label: 'Billing', content: 'Plan and invoice settings.' },
        ],
      },
    },
  ],
  Text: [
    {
      name: 'Product / Dashboard Heading',
      props: { text: 'Revenue overview', variant: 'h2', size: 'xl', as: 'h2', inset: 'control', fullWidth: true, align: 'left', membrane: true },
    },
    {
      name: 'Product / Keyboard Shortcut',
      props: { text: 'Cmd K', variant: 'kbd', size: 'sm', as: 'kbd', inset: 'none', fullWidth: false, align: 'center', membrane: true },
    },
  ],
  Tile: [
    {
      name: 'Product / Active Project',
      props: { text: 'Production API', rightText: 'Healthy', intent: 'default', tone: 'positive', icon: 'folder', active: true, fullWidth: true, align: 'left', actionVisibility: 'hover', membrane: true },
    },
    {
      name: 'Product / Collapsible Workspace',
      props: { text: 'Customer success', rightText: '12', intent: 'disclosure', tone: 'neutral', icon: 'folder', selector: true, selectorOpen: false, selectedDescendant: true, fullWidth: true, align: 'left', actionVisibility: 'reveal', membrane: true },
    },
  ],
  Toast: [
    {
      name: 'Product / Save Confirmation',
      props: {
        title: 'Workspace saved',
        description: 'Your changes are now visible to all collaborators.',
        tone: 'positive',
        dismissible: true,
        action: { label: 'View changes' },
      },
    },
    {
      name: 'Product / Background Sync',
      props: {
        title: 'Sync is taking longer than expected',
        description: 'You can keep working while the remaining records are processed.',
        tone: 'warning',
        dismissible: false,
        action: { label: 'Open activity' },
      },
    },
  ],
  Toc: [
    {
      name: 'Product / API Documentation',
      props: {
        withLine: true,
        lineSide: 'left',
        defaultActiveId: 'authentication',
        items: [
          { id: 'overview', label: 'Overview', level: 1 },
          { id: 'authentication', label: 'Authentication', level: 1 },
          { id: 'api-keys', label: 'API keys', level: 2 },
          { id: 'errors', label: 'Errors', level: 1 },
        ],
      },
    },
    {
      name: 'Product / Long Form Report',
      props: {
        withLine: true,
        lineSide: 'right',
        defaultActiveId: 'findings',
        items: [
          { id: 'summary', label: 'Executive summary', level: 1 },
          { id: 'findings', label: 'Findings', level: 1 },
          { id: 'security', label: 'Security risks', level: 2 },
          { id: 'recommendations', label: 'Recommendations', level: 1 },
        ],
      },
    },
  ],
  Toggle: [
    {
      name: 'Product / Editor Mode',
      props: { type: 'single', orientation: 'horizontal', defaultValue: ['visual'], membrane: true, items: [{ value: 'visual', label: 'Visual' }, { value: 'code', label: 'Code' }] },
    },
    {
      name: 'Product / Visible Layers',
      props: { type: 'multiple', orientation: 'horizontal', defaultValue: ['grid', 'guides'], membrane: true, items: [{ value: 'grid', label: 'Grid' }, { value: 'guides', label: 'Guides' }, { value: 'comments', label: 'Comments' }] },
    },
  ],
  Tooltip: [
    {
      name: 'Product / Keyboard Shortcut Hint',
      props: { children: 'Search', content: 'Search workspace - Cmd K', side: 'bottom', align: 'center', sideOffset: 2, openDelay: 300, closeDelay: 80, open: true },
    },
    {
      name: 'Product / Disabled Action Help',
      props: { children: 'Deploy', content: 'Resolve two failing checks before deploying.', side: 'top', align: 'end', sideOffset: 4, openDelay: 150, closeDelay: 100, open: true },
    },
  ],
  Tree: [
    {
      name: 'Product / Repository Explorer',
      props: {
        defaultExpandedIds: ['src', 'components'],
        defaultSelectedId: 'agent',
        items: [
          { id: 'src', label: 'src', icon: 'folder', children: [
            { id: 'components', label: 'components', icon: 'folder', kind: 'tile', children: [
              { id: 'agent', label: 'AgentPanel.tsx', icon: 'file' },
              { id: 'chat', label: 'ChatComposer.tsx', icon: 'file' },
            ] },
            { id: 'app', label: 'App.tsx', icon: 'file' },
          ] },
          { id: 'readme', label: 'README.md', icon: 'file' },
        ],
      },
    },
    {
      name: 'Product / Knowledge Base',
      props: {
        defaultExpandedIds: ['company', 'engineering'],
        defaultSelectedId: 'runbooks',
        items: [
          { id: 'company', label: 'Company wiki', icon: 'folder', kind: 'tile', children: [
            { id: 'policies', label: 'Policies', icon: 'folder', children: [{ id: 'security-policy', label: 'Security policy', icon: 'file' }] },
            { id: 'engineering', label: 'Engineering', icon: 'folder', children: [
              { id: 'runbooks', label: 'Runbooks', icon: 'file', rightText: '8' },
              { id: 'architecture', label: 'Architecture', icon: 'file' },
            ] },
          ] },
        ],
      },
    },
  ],
  Upload: [
    {
      name: 'Product / CSV Import',
      props: { accept: '.csv,text/csv', multiple: false, maxSize: 10485760, maxFiles: 1, disabled: false },
    },
    {
      name: 'Product / Product Media',
      props: {
        accept: 'image/png,image/jpeg,image/webp',
        multiple: true,
        maxSize: 5242880,
        maxFiles: 8,
        disabled: false,
        labels: {
          idle: 'Drop product images here',
          dragging: 'Release to add images',
          trigger: 'Choose images',
          remove: 'Remove',
        },
      },
    },
  ],
}
