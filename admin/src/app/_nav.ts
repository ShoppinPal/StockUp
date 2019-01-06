export const navigation = [
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
  /*
  {
    title: true,
    name: 'Suppliers'
  },
  {
    name: 'Suppliers',
    url: '/suppliers',
    icon: 'icon-close',
    badge: {
      variant: 'success',
      text: 'new'
    }
  },
  {
    title: true,
    name: 'Orders'
  },
  {
    name: 'Stuck Orders',
    url: '/orders/stuck-orders',
    icon: 'icon-close',
    badge: {
      variant: 'success',
      text: 'new'
    }
  },*/
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
  /*,
   {
   name: 'Stores',
   url: '/stores',
   icon: 'icon-settings'
   },
   {
   name: 'Payments',
   url: '/payments',
   icon: 'icon-settings'
   }*/
];
