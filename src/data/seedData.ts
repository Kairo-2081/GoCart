import { Category, Customer, Admin, Seller, Product, Review, Order } from '../types';

export const initialCategories: Category[] = [
  { Category_ID: 'CAT-1', Name: 'Electronics & Gadgets' },
  { Category_ID: 'CAT-2', Name: 'Home & Living' },
  { Category_ID: 'CAT-3', Name: 'Fashion & Apparel' },
  { Category_ID: 'CAT-4', Name: 'Books & Stationery' },
];

export const initialSellers: Seller[] = [
  {
    Seller_ID: 'SEL-1',
    Name: 'Aura Tech Solutions',
    Email: 'contact@auratech.io',
    Number: '+1 (555) 901-2345',
    Address: {
      Street: '88 Innovation Way',
      House_Name: 'Suite 400',
      City: 'Austin',
      Postal_Code: '78701',
      Additional_Info: 'Building B, Loading Dock 2'
    },
    Logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    Description: 'Pioneering cutting-edge audio, wearables, and personal computing hardware with premium warranties.',
    Status: 'approved',
    Created_At: '2026-01-15T08:00:00.000Z'
  },
  {
    Seller_ID: 'SEL-2',
    Name: 'Artisan Home Krafts',
    Email: 'hello@artisanhome.com',
    Number: '+1 (555) 890-1234',
    Address: {
      Street: '42 Craftsman Blvd',
      House_Name: 'Studio 12',
      City: 'Portland',
      Postal_Code: '97201',
      Additional_Info: 'West Entrance'
    },
    Logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80',
    Description: 'Handcrafted ceramic stoneware, organic textiles, and sustainable home decor for modern spaces.',
    Status: 'approved',
    Created_At: '2026-02-20T10:30:00.000Z'
  },
  {
    Seller_ID: 'SEL-3',
    Name: 'Urban Thread Studio',
    Email: 'info@urbanthread.co',
    Number: '+1 (555) 789-0123',
    Address: {
      Street: '105 Garment Alley',
      House_Name: 'Loft 3A',
      City: 'Brooklyn',
      Postal_Code: '11201',
      Additional_Info: 'Freight elevator access'
    },
    Logo: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=200&auto=format&fit=crop&q=80',
    Description: 'Ethically manufactured organic apparel designed for urban active lifestyles.',
    Status: 'pending',
    Created_At: '2026-08-01T14:20:00.000Z'
  }
];

export const initialCustomers: Customer[] = [
  {
    Customer_ID: 'CUST-1',
    Name: 'Alice Smith',
    Email: 'alice@example.com',
    Number: '+1 (555) 234-5678',
    Address: {
      Street: '742 Evergreen Terrace',
      House_Name: 'Apt 4B',
      City: 'Springfield',
      Postal_Code: '97477',
      Additional_Info: 'Leave package at front porch'
    }
  },
  {
    Customer_ID: 'CUST-2',
    Name: 'Bob Johnson',
    Email: 'bob@example.com',
    Number: '+1 (555) 876-5432',
    Address: {
      Street: '123 Maple Street',
      House_Name: 'Unit 12',
      City: 'Seattle',
      Postal_Code: '98101',
      Additional_Info: 'Ring doorbell on arrival'
    }
  },
  {
    Customer_ID: 'CUST-3',
    Name: 'Carol White',
    Email: 'carol@example.com',
    Number: '+1 (555) 345-6789',
    Address: {
      Street: '456 Oak Avenue',
      House_Name: 'Suite 300',
      City: 'San Francisco',
      Postal_Code: '94107',
      Additional_Info: 'Call upon arrival'
    }
  }
];

export const initialAdmin: Admin = {
  Admin_ID: 'ADM-1',
  Name: 'Sarah Jenkins (Admin)',
  Email: 'admin@marketplace.com',
  Number: '+1 (800) 555-0199',
  Address: {
    Street: '1 Marketplace Way',
    House_Name: 'HQ Tower Floor 15',
    City: 'San Jose',
    Postal_Code: '95113',
    Additional_Info: 'Marketplace Operations Center'
  }
};

export const initialProducts: Product[] = [
  {
    Product_ID: 'PROD-1',
    Name: 'Wireless Noise-Canceling Headphones',
    Image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    Description: 'High-fidelity audio with active noise cancellation, custom EQ mode, and up to 40 hours of continuous battery playback.',
    Price: 199.99,
    Voucher: 'SAVE20',
    Stock: 25,
    Product_Status: 'active',
    Category_ID: 'CAT-1',
    Seller_ID: 'SEL-1',
    Review_ID: 'REV-1'
  },
  {
    Product_ID: 'PROD-2',
    Name: 'Smart Watch Pro Series 8',
    Image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    Description: 'Advanced health metrics tracker featuring ECG sensor, crystal-clear AMOLED display, built-in GPS, and 50m water resistance.',
    Price: 299.00,
    Voucher: 'TECH10',
    Stock: 14,
    Product_Status: 'active',
    Category_ID: 'CAT-1',
    Seller_ID: 'SEL-1',
    Review_ID: 'REV-4'
  },
  {
    Product_ID: 'PROD-3',
    Name: 'Ergonomic Mechanical Keyboard',
    Image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    Description: 'Customizable hot-swappable mechanical keyboard with silent tactile switches, per-key RGB backlighting, and solid aluminum casing.',
    Price: 129.50,
    Voucher: '',
    Stock: 8,
    Product_Status: 'active',
    Category_ID: 'CAT-1',
    Seller_ID: 'SEL-1'
  },
  {
    Product_ID: 'PROD-4',
    Name: 'Minimalist Ceramic Coffee Dripper & Pot',
    Image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    Description: 'Artisanal heat-resistant matte ceramic pour-over coffee set crafted for optimal extraction and sleek countertop aesthetic.',
    Price: 45.00,
    Voucher: 'BREW15',
    Stock: 30,
    Product_Status: 'active',
    Category_ID: 'CAT-2',
    Seller_ID: 'SEL-2',
    Review_ID: 'REV-3'
  },
  {
    Product_ID: 'PROD-5',
    Name: 'Nordic Linen Throw Blanket',
    Image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80',
    Description: '100% organic French flax linen throw blanket pre-washed for effortless softness and breathable year-round comfort.',
    Price: 68.00,
    Voucher: '',
    Stock: 18,
    Product_Status: 'active',
    Category_ID: 'CAT-2',
    Seller_ID: 'SEL-2'
  },
  {
    Product_ID: 'PROD-6',
    Name: 'Organic Heavyweight Fleece Hoodie',
    Image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    Description: 'Ultra-soft 450gsm organic cotton fleece hoodie with double-lined hood and reinforced drop-shoulder design.',
    Price: 55.00,
    Voucher: 'NEW20',
    Stock: 40,
    Product_Status: 'active',
    Category_ID: 'CAT-3',
    Seller_ID: 'SEL-3'
  }
];

export const initialReviews: Review[] = [
  {
    Review_ID: 'REV-1',
    Product_ID: 'PROD-1',
    Customer_ID: 'CUST-1',
    Customer_Name: 'Alice Smith',
    Rating: 5,
    Review_text: 'Outstanding noise cancellation! I wore these on a 10-hour flight and forgot I was on a plane. Battery life easily exceeded expectations.',
    Created_At: '2026-07-28T14:32:00.000Z'
  },
  {
    Review_ID: 'REV-2',
    Product_ID: 'PROD-1',
    Customer_ID: 'CUST-2',
    Customer_Name: 'Bob Johnson',
    Rating: 4,
    Review_text: 'Crisp high frequencies and smooth bass response. The ear cups fit tightly without pressing too hard on glasses.',
    Created_At: '2026-07-30T09:15:00.000Z'
  },
  {
    Review_ID: 'REV-3',
    Product_ID: 'PROD-4',
    Customer_ID: 'CUST-3',
    Customer_Name: 'Carol White',
    Rating: 5,
    Review_text: 'Gorgeous ceramic texture and brews a clean, aromatic cup of coffee every morning. Packaging was eco-friendly and sturdy.',
    Created_At: '2026-07-31T18:40:00.000Z'
  },
  {
    Review_ID: 'REV-4',
    Product_ID: 'PROD-2',
    Customer_ID: 'CUST-1',
    Customer_Name: 'Alice Smith',
    Rating: 5,
    Review_text: 'The health sensor accuracy and vibrant screen make this worth every penny. Syncs seamlessly with all my fitness apps!',
    Created_At: '2026-08-01T11:20:00.000Z'
  }
];

export const initialOrders: Order[] = [
  {
    Order_ID: 'ORD-1',
    Tracking_ID: 'TRK-9842-1049',
    Customer_ID: 'CUST-1',
    Items: [
      {
        Product_ID: 'PROD-1',
        Name: 'Wireless Noise-Canceling Headphones',
        Price: 199.99,
        Quantity: 1,
        Image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        Seller_ID: 'SEL-1'
      }
    ],
    Subtotal: 199.99,
    Shipping_Fee: 5.00,
    Status: 'delivered',
    Shipping_Address: {
      Street: '742 Evergreen Terrace',
      House_Name: 'Apt 4B',
      City: 'Springfield',
      Postal_Code: '97477',
      Additional_Info: 'Leave package at front porch'
    },
    Billing_Address: {
      Street: '742 Evergreen Terrace',
      House_Name: 'Apt 4B',
      City: 'Springfield',
      Postal_Code: '97477'
    },
    Order_Placed_At: '2026-07-28T14:30:00.000Z',
    Additional_Info: 'Standard delivery via Express Freight.'
  },
  {
    Order_ID: 'ORD-2',
    Tracking_ID: 'TRK-7410-5829',
    Customer_ID: 'CUST-2',
    Items: [
      {
        Product_ID: 'PROD-4',
        Name: 'Minimalist Ceramic Coffee Dripper & Pot',
        Price: 45.00,
        Quantity: 2,
        Image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
        Seller_ID: 'SEL-2'
      }
    ],
    Subtotal: 90.00,
    Shipping_Fee: 5.00,
    Status: 'shipped',
    Shipping_Address: {
      Street: '123 Maple Street',
      House_Name: 'Unit 12',
      City: 'Seattle',
      Postal_Code: '98101',
      Additional_Info: 'Ring doorbell on arrival'
    },
    Billing_Address: {
      Street: '123 Maple Street',
      House_Name: 'Unit 12',
      City: 'Seattle',
      Postal_Code: '98101'
    },
    Order_Placed_At: '2026-07-31T10:15:00.000Z',
    Additional_Info: 'Fragile ceramic item handle with care.'
  }
];
