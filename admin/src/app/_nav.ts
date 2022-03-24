interface NavAttributes {
  [propName: string]: any;
}
interface NavWrapper {
  attributes: NavAttributes;
  element: string;
}
interface NavBadge {
  text: string;
  variant: string;
}
interface NavLabel {
  class?: string;
  variant: string;
}

export interface NavData {
  name?: string;
  url?: string;
  icon?: string;
  roles: Array<string>;
  badge?: NavBadge;
  title?: boolean;
  children?: NavData[];
  variant?: string;
  attributes?: NavAttributes;
  divider?: boolean;
  class?: string;
  label?: NavLabel;
  wrapper?: NavWrapper;
}

export const navItems: NavData[] = [
  {
    title: true,
    name: 'Products',
    roles: ['orgAdmin']
  },
  {
    name: 'Bin Locations',
    url: '/products/bin-locations',
    icon: 'icon-location-pin',
    roles: ['orgAdmin']
  },
  {
    name: 'Categories',
    url: '/products/categories',
    icon: 'icon-pie-chart',
    roles: ['orgAdmin']
  },
  {
    title: true,
    name: 'Orders',
    roles: ['orgAdmin', 'orderManager']
  },
  {
    name: 'Create Order',
    url: '/orders/create-order',
    icon: 'icon-plus',
    roles: ['orgAdmin', 'orderManager']
  },
  {
    name: 'Import Order',
    url: '/orders/import-order',
    icon: 'icon-plus',
    roles: ['orgAdmin', 'orderManager']
  },
  {
    name: 'Stock Orders',
    url: '/orders/stock-orders',
    icon: 'icon-basket',
    roles: ['orgAdmin', 'orderManager']
  },
  {
    title: true,
    name: 'Suppliers',
    roles: ['orgAdmin']
  },
  {
    name: 'Suppliers',
    url: '/suppliers',
    icon: 'icon-notebook',
    roles: ['orgAdmin']
  },
  {
    title: true,
    name: 'Settings',
    roles: ['orgAdmin']
  },
  {
    name: 'Connect ERP/POS',
    url: '/connect',
    icon: 'icon-refresh',
    roles: ['orgAdmin']
  },
  {
    name: 'User Management',
    url: '/users',
    icon: 'icon-people',
    roles: ['orgAdmin']
  },
  {
    name: 'Stores',
    url: '/stores',
    icon: 'icon-settings',
    roles: ['orgAdmin']
  },
  {
    name: 'Reorder Points',
    url: '/reorder-points',
    icon: 'icon-calculator',
    roles: ['orgAdmin']
  },
  {
    name: 'File Imports',
    url: '/file-imports',
    icon: 'icon-cloud-upload',
    roles: ['orgAdmin']
  },
  {
    name: 'Scheduled Tasks',
    url: '/schedules',
    icon: 'icon-loop',
    roles: ['orgAdmin']
  },
  {
    title: true,
    name: 'Reporting',
    roles: ['orgAdmin', 'discrepancyManager']
  },
  {
    name: 'Historical Orders',
    url: '/reporting/historical-orders',
    icon: 'icon-clock',
    roles: ['orgAdmin', 'discrepancyManager']
  },
];
