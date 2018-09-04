export const navigation = [
  {
    title: true,
    name: 'Products'
  },
  {
    name: 'Bin Locations',
    url: '/products/bin-locations',
    icon: 'icon-location-pin'
  }
  ,
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
  },
  {
    title: true,
    name: 'Settings'
  },
  {
    name: 'Syncing with Vend',
    url: '/sync-with-vend',
    icon: 'icon-refresh'
  },
  {
    name: 'Connect ERP/POS',
    url: '/connect',
    icon: 'icon-refresh'
  },
  {
    name: 'Worker Settings',
    url: '/worker-settings',
    icon: 'icon-settings'
  }
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
