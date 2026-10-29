// 浏览器端 API 客户端：统一解析 { success, data, error } 信封

import type {
  ApiResponse,
  CreateProductInput,
  CreateShopInput,
  CreateSkuInput,
  ProductDTO,
  ShopDTO,
  SkuDTO,
  UpdateProductInput,
  UpdateShopInput,
  UpdateSkuInput,
} from '@/domain/contracts';
import type { Backup } from '@/domain/backup';
import type { ShopPreset, SiteInfo } from '@/domain/presets';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, '网络连接失败，请检查服务是否在运行');
  }
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, `服务器返回了无法解析的响应（${res.status}）`);
  }
  if (!body.success) throw new ApiError(res.status, body.error);
  return body.data;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface RestoreResult {
  shops: number;
  products: number;
  skus: number;
}

export const api = {
  presets: () => request<{ sites: SiteInfo[]; presets: ShopPreset[] }>('/api/presets'),

  listShops: () => request<ShopDTO[]>('/api/shops'),
  createShop: (input: CreateShopInput) => send<ShopDTO>('POST', '/api/shops', input),
  updateShop: (id: string, input: UpdateShopInput) => send<ShopDTO>('PATCH', `/api/shops/${id}`, input),
  deleteShop: (id: string) => send<{ id: string }>('DELETE', `/api/shops/${id}`),

  listProducts: (shopId: string) => request<ProductDTO[]>(`/api/shops/${shopId}/products`),
  createProduct: (shopId: string, input: CreateProductInput) =>
    send<ProductDTO>('POST', `/api/shops/${shopId}/products`, input),
  importProducts: (shopId: string, products: CreateProductInput[]) =>
    send<{ products: number; skus: number }>('POST', `/api/shops/${shopId}/import`, { products }),
  updateProduct: (id: string, input: UpdateProductInput) => send<ProductDTO>('PATCH', `/api/products/${id}`, input),
  deleteProduct: (id: string) => send<{ id: string }>('DELETE', `/api/products/${id}`),

  createSku: (productId: string, input: CreateSkuInput) =>
    send<SkuDTO>('POST', `/api/products/${productId}/skus`, input),
  updateSku: (id: string, input: UpdateSkuInput) => send<SkuDTO>('PATCH', `/api/skus/${id}`, input),
  deleteSku: (id: string) => send<{ id: string }>('DELETE', `/api/skus/${id}`),

  exportShop: (shopId: string) => request<Backup>(`/api/shops/${shopId}/export`),
  exportAll: () => request<Backup>('/api/backup'),
  restore: (backup: unknown) => send<RestoreResult>('POST', '/api/backup', backup),
};
