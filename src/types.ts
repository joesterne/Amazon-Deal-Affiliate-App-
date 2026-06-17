export interface Deal {
  productName: string;
  description: string;
  department: string;
  dealPrice: string;
  originalPrice: string;
  amazonUrl: string;
}

export interface ScanResult {
  category: string;
  timestamp: string;
  products: Deal[];
}
