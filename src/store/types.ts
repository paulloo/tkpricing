import type { ProductSlice } from './product-slice';
import type { ShopSlice } from './shop-slice';

export type AppState = ShopSlice & ProductSlice;
