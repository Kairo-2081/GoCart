export interface Address {
  Street: string;
  House_Name: string;
  City: string;
  Postal_Code: string;
  Additional_Info?: string;
}

export interface Customer {
  Customer_ID: string;
  Username?: string;
  Name: string;
  Email: string;
  Password?: string;
  Number: string;
  Address: Address;
}

export interface Admin {
  Admin_ID: string;
  Username?: string;
  Name: string;
  Email: string;
  Password?: string;
  Number: string;
  Address: Address;
}

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Seller {
  Seller_ID: string;
  Username?: string;
  Name: string;
  Email: string;
  Password?: string;
  Number: string;
  Address: Address;
  Logo: string;
  Description: string;
  Status: SellerStatus;
  Created_At: string;
}

export interface Category {
  Category_ID: string;
  Name: string;
}

export type ProductStatus = 'active' | 'inactive' | 'deactivated';

export interface Product {
  Product_ID: string;
  Name: string;
  Image: string;
  Description: string;
  Price: number;
  Voucher: string; // e.g. "SAVE10", "15% OFF", or ""
  Stock: number;
  Product_Status: ProductStatus;
  Category_ID: string;
  Seller_ID: string;
  Review_ID?: string; // FK to latest or primary review
}

export interface CartItem {
  Cart_ID: string;
  Customer_ID: string;
  Product_ID: string;
  Quantity: number;
  Product?: Product;
}

export interface OrderItem {
  Product_ID: string;
  Name: string;
  Price: number;
  Quantity: number;
  Image: string;
  Seller_ID: string;
}

export type OrderStatus = 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  Order_ID: string;
  Tracking_ID: string;
  Customer_ID: string;
  Items: OrderItem[];
  Subtotal: number;
  Shipping_Fee: number;
  Status: OrderStatus;
  Shipping_Address: Address;
  Billing_Address: Address;
  Order_Placed_At: string;
  Additional_Info?: string;
}

export interface Review {
  Review_ID: string;
  Product_ID: string;
  Customer_ID: string;
  Customer_Name: string;
  Review_text: string;
  Rating: number; // 1 to 5
  Created_At: string;
}

export type UserRole = 'customer' | 'seller' | 'admin';

export interface CurrentUser {
  role: UserRole;
  customer?: Customer;
  seller?: Seller;
  admin?: Admin;
}
