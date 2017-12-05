export const navigation = [
  {
    title: true,
    name: 'Products'
  },
  {
    name: 'Bin Locations',
    url: '/products/bin-locations',
    icon: 'icon-location-pin',
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
    url: 'stuck-orders',
    icon: 'icon-close',
    badge: {
      variant: 'info',
      text: '5'
    }

  },
  {
    title: true,
    name: 'Settings'
  },
  {
    name: 'Stores',
    url: '/stores',
    icon: 'icon-location-pin'
  },
  {
    name: 'Payments',
    url: '/payments',
    icon: 'icon-credit-card'
  }
];
