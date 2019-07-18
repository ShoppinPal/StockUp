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
    icon: 'icon-location-pin',
    roles: ['orgAdmin']
  },
  {
    title: true,
    name: 'Orders',
    roles: ['orgAdmin', 'storeManager']
  },
  {
    name: 'Stock Orders',
    url: '/orders/stock-orders',
    icon: 'icon-close',
    roles: ['orgAdmin', 'storeManager']
  },
  {
    title: true,
    name: 'Suppliers',
    roles: ['orgAdmin']
  },
  {
    name: 'Suppliers',
    url: '/suppliers',
    icon: 'icon-close',
    roles: ['orgAdmin']
  },
  // {
  //   name: 'Stuck Orders',
  //   url: '/orders/stuck-orders',
  //   icon: 'icon-close',
  //   roles: ['orgAdmin']
  // },
  {
    title: true,
    name: 'Settings',
    roles: ['orgAdmin']
  },
  /*{
   name: 'Syncing with Vend',
   url: '/sync-with-vend',
   icon: 'icon-refresh'
   },*/
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
  }
  /*,
   {
   name: 'Worker Settings',
   url: '/worker-settings',
   icon: 'icon-settings'
   }*/
  ,
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
    icon: 'icon-calculator',
    roles: ['orgAdmin']
  }
  /*,
   {
   name: 'Payments',
   url: '/payments',
   icon: 'icon-settings'
   }*/
];
