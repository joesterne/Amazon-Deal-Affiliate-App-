export interface PriceHistoryItem {
  date: string;
  price: number;
}

export interface Deal {
  productName: string;
  description: string;
  department: string;
  dealPrice: string;
  originalPrice: string;
  amazonUrl: string;
}
